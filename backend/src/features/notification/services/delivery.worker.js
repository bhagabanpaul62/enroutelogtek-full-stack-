/**
 * The email outbox worker. Claims due `notification_deliveries` rows (FOR UPDATE SKIP LOCKED, in small
 * batches, with a 5 minute lease so a crash only delays a row), sends them, and retries with backoff.
 * Nothing here can touch a business action: it only reads the outbox. The sender is injectable for tests.
 */
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { sendEmail } from '#shared/services/email/email.service.js';
import { users } from '#features/auth/schemas/index.js';
import { notification, notificationDeliveries } from '#features/notification/schemas/index.js';
import { BATCH_SIZE, LEASE_MS, WORKER_INTERVAL_MS } from '#features/notification/notification.constants.js';
import { failureOutcome, trimError } from '#features/notification/notification.rules.js';
import { buildEmail } from '#features/notification/notification.email.js';

const iso = (date) => date.toISOString();

/** One statement: pick due rows, lock them, move them forward by the lease, return them. */
const claimDue = async (now, limit) => {
    const { rows } = await db.execute(sql`
        UPDATE notification_deliveries d
        SET attempts = d.attempts + 1,
            next_attempt_at = ${iso(new Date(now.getTime() + LEASE_MS))}::timestamp,
            updated_at = ${iso(now)}::timestamp
        FROM (
            SELECT id FROM notification_deliveries
            WHERE channel = 'email' AND status = 'pending' AND next_attempt_at <= ${iso(now)}::timestamp
            ORDER BY next_attempt_at
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
        ) due
        WHERE d.id = due.id
        RETURNING d.id, d.notification_id AS "notificationId", d.to_email AS "toEmail", d.attempts`);
    return rows;
};

const markFailed = (id, lastError, now) =>
    db
        .update(notificationDeliveries)
        .set({ status: 'failed', lastError, nextAttemptAt: null, updatedAt: now })
        .where(eq(notificationDeliveries.id, id));

/**
 * Sends one claimed row. Never throws: every outcome is written to the row.
 * @returns {Promise<'sent'|'retry'|'failed'>}
 */
const deliverOne = async (claim, content, send, now) => {
    if (!content || content.userStatus !== 'active') {
        await markFailed(claim.id, 'RECIPIENT_INACTIVE', now);
        return 'failed';
    }
    try {
        await send({ to: claim.toEmail, ...buildEmail(content) });
        await db
            .update(notificationDeliveries)
            .set({ status: 'sent', sentAt: new Date(), lastError: null, nextAttemptAt: null, updatedAt: new Date() })
            .where(eq(notificationDeliveries.id, claim.id));
        return 'sent';
    } catch (error) {
        const outcome = failureOutcome(error, claim.attempts, new Date());
        await db
            .update(notificationDeliveries)
            .set({
                status: outcome.status,
                nextAttemptAt: outcome.nextAttemptAt,
                lastError: outcome.lastError,
                updatedAt: new Date(),
            })
            .where(eq(notificationDeliveries.id, claim.id));
        return outcome.status === 'failed' ? 'failed' : 'retry';
    }
};

let running = false;

/**
 * Handles one bounded batch of due emails.
 * @param {{ send?: Function, now?: Date, limit?: number }} [options] `send` replaces the real mailer in tests
 * @returns {Promise<{ claimed: number, sent: number, retry: number, failed: number }>}
 */
export const runDeliveryBatch = async ({ send = sendEmail, now = new Date(), limit = BATCH_SIZE } = {}) => {
    const result = { claimed: 0, sent: 0, retry: 0, failed: 0 };
    const claims = await claimDue(now, limit);
    result.claimed = claims.length;
    if (claims.length === 0) return result;

    const contents = await db
        .select({
            notificationId: notification.id,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            userStatus: users.userStatus,
        })
        .from(notification)
        .leftJoin(users, sql`${users.id}::text = ${notification.recipientUserId}`)
        .where(inArray(notification.id, claims.map((c) => c.notificationId)));
    const byId = new Map(contents.map((c) => [c.notificationId, c]));

    for (const claim of claims) {
        try {
            result[await deliverOne(claim, byId.get(claim.notificationId), send, now)]++;
        } catch (error) {
            // The row write itself failed; the lease expires and the row comes back.
            console.error('Delivery bookkeeping failed:', trimError(error));
        }
    }
    return result;
};

/** Runs batches until nothing is due. A second call while one is running is a no-op. */
export const drainDeliveries = async (options) => {
    if (running) return;
    running = true;
    try {
        for (let guard = 0; guard < 20; guard++) {
            const { claimed } = await runDeliveryBatch(options);
            if (claimed < BATCH_SIZE) break;
        }
    } catch (error) {
        console.error('Delivery worker failed:', trimError(error));
    } finally {
        running = false;
    }
};

/** Called after commit so mail normally leaves in seconds instead of waiting for the tick. */
export const kickDeliveryWorker = () => {
    try {
        setImmediate(() => drainDeliveries());
    } catch (error) {
        console.error('Delivery kick failed:', trimError(error));
    }
};

/** Starts the 30 s loop. Restart-safe: the queue lives in the database, not in memory. */
export const startDeliveryWorker = () => {
    const timer = setInterval(() => drainDeliveries(), WORKER_INTERVAL_MS);
    timer.unref?.();
    drainDeliveries();
    return timer;
};
