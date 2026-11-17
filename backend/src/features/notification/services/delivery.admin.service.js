/** Platform-admin view of the email outbox, for diagnosing mail that did not go out. */
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';
import { notification, notificationDeliveries as d } from '#features/notification/schemas/index.js';
import { SUMMARY_DAYS } from '#features/notification/notification.constants.js';
import { kickDeliveryWorker } from '#features/notification/services/delivery.worker.js';

export const listDeliveries = async ({ status = 'failed', cursor, limit = 20 }) => {
    const conditions = [eq(d.channel, 'email'), eq(d.status, status)];
    if (cursor) {
        const { createdAt, id } = decodeCursor(cursor);
        conditions.push(sql`(${d.createdAt}, ${d.id}) < (${createdAt}::timestamp, ${id}::uuid)`);
    }
    const rows = await db
        .select({
            id: d.id,
            notificationId: d.notificationId,
            type: notification.type,
            title: notification.title,
            toEmail: d.toEmail,
            status: d.status,
            attempts: d.attempts,
            nextAttemptAt: d.nextAttemptAt,
            lastError: d.lastError,
            createdAt: d.createdAt,
            cursorCreatedAt: sql`${d.createdAt}::text`.mapWith(String),
        })
        .from(d)
        .innerJoin(notification, eq(notification.id, d.notificationId))
        .where(and(...conditions))
        .orderBy(desc(d.createdAt), desc(d.id))
        .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
        items: page.map(({ cursorCreatedAt, ...item }) => item),
        pagination: {
            limit,
            hasMore,
            nextCursor: hasMore ? encodeCursor({ createdAt: last.cursorCreatedAt, id: last.id }) : null,
        },
    };
};

/** Counts for the last 7 days; oldestPendingAt looks at every pending row, however old. */
export const deliverySummary = async () => {
    const since = new Date(Date.now() - SUMMARY_DAYS * 24 * 3600 * 1000);
    const counts = await db
        .select({ status: d.status, n: sql`count(*)::int`.mapWith(Number) })
        .from(d)
        .where(and(eq(d.channel, 'email'), gte(d.createdAt, since)))
        .groupBy(d.status);
    const [oldest] = await db
        .select({ at: sql`min(${d.createdAt})`.mapWith(d.createdAt) })
        .from(d)
        .where(and(eq(d.channel, 'email'), eq(d.status, 'pending')));
    const of = (status) => counts.find((c) => c.status === status)?.n ?? 0;
    return {
        pending: of('pending'),
        sent: of('sent'),
        failed: of('failed'),
        oldestPendingAt: oldest?.at ?? null,
    };
};

/** Puts a failed email back in the queue with a fresh budget. */
export const retryDelivery = async (id) => {
    const [row] = await db
        .update(d)
        .set({ status: 'pending', attempts: 0, nextAttemptAt: new Date(), updatedAt: new Date() })
        .where(and(eq(d.id, id), eq(d.channel, 'email'), eq(d.status, 'failed')))
        .returning({ id: d.id, status: d.status });
    if (!row) {
        const [exists] = await db.select({ id: d.id }).from(d).where(eq(d.id, id));
        throw exists
            ? new AppError('Only a failed email can be retried', 409)
            : new AppError('Delivery not found', 404);
    }
    kickDeliveryWorker();
    return row;
};
