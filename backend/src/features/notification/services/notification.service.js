/**
 * In-app notifications (the notification table) plus a durable email outbox (notification_deliveries).
 * Writers call notifyCompanies(); the dashboard header reads the list and the unread count (notification
 * table only). Email is sent later by delivery.worker.js, so it never blocks or fails the action.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';
import { notification, notificationDeliveries } from '#features/notification/schemas/index.js';
import { users } from '#features/auth/schemas/index.js';
import { SYSTEM_ACTOR } from '#features/notification/notification.constants.js';
import { deliveryRows, normalizeDedupeKey } from '#features/notification/notification.rules.js';
import { kickDeliveryWorker } from '#features/notification/services/delivery.worker.js';

export { SYSTEM_ACTOR };
const DEFAULT_PAGE_LIMIT = 20;

/**
 * Writes the in-app row and the delivery rows for these recipients in ONE transaction (the caller's
 * `tx` when given, else its own). Email is only queued here; the delivery worker sends it, so a mail
 * outage never touches the business action.
 */
const writeNotifications = async ({ recipients, actorUserId, type, title, message, data = {}, dedupeKey, tx }) => {
    if (recipients.length === 0) return 0;
    const key = normalizeDedupeKey(dedupeKey);
    const now = new Date();
    const run = async (executor) => {
        const inserted = await executor
            .insert(notification)
            .values(
                recipients.map((recipient) => ({
                    recipientUserId: recipient.id,
                    actorUserId: actorUserId ?? SYSTEM_ACTOR,
                    type,
                    title,
                    message,
                    data,
                    dedupeKey: key,
                })),
            )
            .onConflictDoNothing({
                target: [notification.recipientUserId, notification.dedupeKey],
                where: sql`${notification.dedupeKey} IS NOT NULL`,
            })
            .returning({ id: notification.id, recipientUserId: notification.recipientUserId });
        const emailOf = new Map(recipients.map((recipient) => [recipient.id, recipient.email]));
        const rows = inserted.flatMap((row) => deliveryRows(row.id, emailOf.get(row.recipientUserId), now));
        if (rows.length > 0) await executor.insert(notificationDeliveries).values(rows);
        return inserted.length;
    };
    const count = tx ? await run(tx) : await db.transaction(run);
    // With the caller's tx the commit comes later; the worker's 30 s tick then picks the mail up.
    if (!tx && count > 0) kickDeliveryWorker();
    return count;
};

/**
 * Creates one notification per active user of each company and queues an email for each.
 * @param {object} args
 * @param {string[]} args.companyIds recipients, duplicates and empty values are ignored
 * @param {string} [args.actorUserId] who caused it; omitted for the clock job
 * @param {string} args.type machine type such as load.invited, bid.new, award.won
 * @param {string} args.title one line
 * @param {string} args.message one or two sentences
 * @param {object} [args.data] { loadId, loadNumber, awardId, link } for the frontend
 * @param {string} [args.dedupeKey] the same (user, key) is stored once, so a repeated action does not notify twice
 * @param {object} [args.tx] the caller's transaction: rows commit or roll back with the business change
 * @returns {Promise<number>} how many users were newly notified
 */
export const notifyCompanies = async ({ companyIds, tx, ...rest }) => {
    const ids = [...new Set((companyIds ?? []).filter(Boolean))];
    if (ids.length === 0) return 0;
    const recipients = await (tx ?? db)
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(and(inArray(users.companyId, ids), eq(users.userStatus, 'active')));
    return writeNotifications({ recipients, tx, ...rest });
};

/** Same as notifyCompanies for Enroute's own staff (root admins have no company). */
export const notifyPlatformAdmins = async ({ tx, ...rest }) => {
    const recipients = await (tx ?? db)
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(and(eq(users.userRole, 'root_admin'), eq(users.userStatus, 'active')));
    return writeNotifications({ recipients, tx, ...rest });
};

/** The user's notifications, newest first, cursor-paginated. */
export const listNotifications = async (userId, { cursor, limit = DEFAULT_PAGE_LIMIT, unreadOnly = false }) => {
    const conditions = [eq(notification.recipientUserId, userId)];
    if (unreadOnly) conditions.push(eq(notification.isRead, false));
    if (cursor) {
        const { createdAt, id } = decodeCursor(cursor);
        conditions.push(sql`(${notification.createdAt}, ${notification.id}) < (${createdAt}::timestamp, ${id}::uuid)`);
    }

    const rows = await db
        .select({
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            isRead: notification.isRead,
            readAt: notification.readAt,
            createdAt: notification.createdAt,
            cursorCreatedAt: sql`${notification.createdAt}::text`.mapWith(String),
        })
        .from(notification)
        .where(and(...conditions))
        .orderBy(desc(notification.createdAt), desc(notification.id))
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

export const unreadCount = async (userId) => {
    const [row] = await db
        .select({ count: sql`count(*)::int`.mapWith(Number) })
        .from(notification)
        .where(and(eq(notification.recipientUserId, userId), eq(notification.isRead, false)));
    return row?.count ?? 0;
};

export const markRead = async (userId, notificationId) => {
    const [row] = await db
        .update(notification)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notification.id, notificationId), eq(notification.recipientUserId, userId)))
        .returning({ id: notification.id });
    if (!row) throw new AppError('Notification not found', 404);
    return row;
};

export const markAllRead = async (userId) => {
    const rows = await db
        .update(notification)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notification.recipientUserId, userId), eq(notification.isRead, false)))
        .returning({ id: notification.id });
    return rows.length;
};
