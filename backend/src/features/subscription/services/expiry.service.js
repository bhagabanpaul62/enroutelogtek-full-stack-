/**
 * THE SUBSCRIPTION CLOCK. Every 10 minutes: moves status to grace / expired when the dates say so,
 * and sends the 7-day and 1-day reminders. Restart-safe and safe to run twice at once: what is due
 * is read from the database each time, every row has its own transaction with SKIP LOCKED, the
 * status update carries WHERE status = <old>, and notifications carry a dedupe key.
 * (The 402 gate does not depend on this job: it recomputes the state from the dates.)
 */
import { and, eq, gt, lte, or } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { companySubscriptions } from '../schemas/index.js';
import { DAY_MS, EVENT, EXPIRY_CLOCK_MS, REMINDER_DAYS } from '../subscription.constants.js';
import { clockTarget, reminderDue, reminderKey } from '../subscription.rules.js';
import { billingLink, notifyBilling } from './billingNotify.service.js';
import { writeEvent } from './subscription.service.js';

const BATCH = 50;
const day = (date) => date.toISOString().slice(0, 10);

const typeOf = async (companyId) => {
    const [c] = await db.select({ type: companies.companyType }).from(companies).where(eq(companies.id, companyId));
    return c?.type;
};

/** Claims one row, re-checks the target on the locked row, moves it. Returns the change or null. */
const advanceOne = async (id, now) =>
    db.transaction(async (tx) => {
        const [row] = await tx.select().from(companySubscriptions).where(eq(companySubscriptions.id, id)).for('update', { skipLocked: true });
        if (!row) return null;
        const target = clockTarget(row, now);
        if (!target) return null;
        const [moved] = await tx
            .update(companySubscriptions)
            .set({ status: target, updatedAt: now })
            .where(and(eq(companySubscriptions.id, id), eq(companySubscriptions.status, row.status)))
            .returning({ id: companySubscriptions.id });
        if (!moved) return null;
        await writeEvent(tx, {
            companyId: row.companyId,
            subscriptionId: row.id,
            eventType: EVENT.STATUS_CHANGED,
            details: { from: row.status, to: target, endsAt: row.endsAt },
        });
        return { row, target };
    });

const announce = async ({ row, target }) => {
    const link = billingLink(await typeOf(row.companyId));
    const ended = day(row.endsAt);
    if (target === 'grace') {
        return notifyBilling({
            companyIds: [row.companyId],
            type: 'billing.grace',
            title: 'Your plan has ended',
            message: `Your plan ended on ${ended}. You have full access until ${day(row.graceEndsAt)}. Renew to keep working.`,
            data: { link },
            dedupeKey: `grace:${row.id}:${ended}`,
        });
    }
    return notifyBilling({
        companyIds: [row.companyId],
        type: 'billing.readonly',
        title: 'Your account is read-only',
        message: 'Your plan and grace period have ended. You can view everything but cannot make changes until you renew.',
        data: { link },
        dedupeKey: `ro:${row.id}:${ended}`,
    });
};

/** One pass. Returns counts, for tests and logs. */
export const runSubscriptionClockOnce = async (now = new Date()) => {
    const due = await db
        .select({ id: companySubscriptions.id })
        .from(companySubscriptions)
        .where(
            or(
                and(eq(companySubscriptions.status, 'active'), lte(companySubscriptions.endsAt, now)),
                and(eq(companySubscriptions.status, 'grace'), lte(companySubscriptions.graceEndsAt, now)),
            ),
        )
        .limit(BATCH * 20);
    let moved = 0;
    for (const { id } of due) {
        try {
            const change = await advanceOne(id, now);
            if (change) {
                moved += 1;
                await announce(change);
            }
        } catch (error) {
            console.error(`Subscription clock: ${id} failed:`, error.message);
        }
    }

    const horizon = new Date(now.getTime() + Math.max(...REMINDER_DAYS) * DAY_MS);
    const soon = await db
        .select()
        .from(companySubscriptions)
        .where(and(eq(companySubscriptions.status, 'active'), gt(companySubscriptions.endsAt, now), lte(companySubscriptions.endsAt, horizon)));
    let reminded = 0;
    for (const sub of soon) {
        try {
            const days = reminderDue(sub, now);
            if (!days) continue;
            const left = days === 1 ? 'tomorrow' : `in ${days} days`;
            const sent = await notifyBilling({
                companyIds: [sub.companyId],
                type: 'billing.expiring',
                title: days === 1 ? 'Your plan ends tomorrow' : `Your plan ends in ${days} days`,
                message: `Your ${sub.kind === 'trial' ? 'trial' : 'plan'} ends ${left} (${day(sub.endsAt)}). Renew from Settings, Billing to avoid interruption.`,
                data: { link: billingLink(await typeOf(sub.companyId)) },
                dedupeKey: reminderKey(sub, days),
            });
            if (sent > 0) reminded += 1;
        } catch (error) {
            console.error(`Subscription clock: reminder ${sub.id} failed:`, error.message);
        }
    }
    return { moved, reminded };
};

let timer = null;
/** Runs now and every EXPIRY_CLOCK_MS. Returns a stop function. */
export const startSubscriptionClock = (intervalMs = EXPIRY_CLOCK_MS) => {
    const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
    };
    if (timer) return stop;
    const tick = () => runSubscriptionClockOnce().catch((error) => console.error('Subscription clock failed:', error.message));
    timer = setInterval(tick, intervalMs);
    timer.unref?.();
    tick();
    return stop;
};
