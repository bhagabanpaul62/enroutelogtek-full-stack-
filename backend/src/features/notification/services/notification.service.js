/**
 * In-app notifications (the notification table) with a best-effort email copy.
 * Writers call notifyCompanies(); the dashboard header reads the list and the unread count.
 * Emails never block or fail the action that caused them: a failed send is only logged.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';
import { notification } from '#features/notification/schemas/index.js';
import { users } from '#features/auth/schemas/index.js';
import { sendEmail } from '#shared/services/email/email.service.js';

export const SYSTEM_ACTOR = 'system';
const DEFAULT_PAGE_LIMIT = 20;

const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const emailHtml = (title, message, link) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#15171c">
  <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7a5200;margin:0 0 8px">EnrouteLogTech</p>
  <h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h2>
  <p style="font-size:14px;line-height:1.5;margin:0 0 16px">${escapeHtml(message)}</p>
  ${link ? `<a href="${escapeHtml(link)}" style="display:inline-block;background:#fbbc0e;color:#1a1a1a;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:4px">Open in Enroute</a>` : ''}
</div>`;

/**
 * Creates one notification per active user of each company and emails each of them.
 * @param {object} args
 * @param {string[]} args.companyIds recipients, duplicates and empty values are ignored
 * @param {string} [args.actorUserId] who caused it; omitted for the clock job
 * @param {string} args.type machine type such as load.invited, bid.new, award.won
 * @param {string} args.title one line
 * @param {string} args.message one or two sentences
 * @param {object} [args.data] { loadId, loadNumber, awardId, link } for the frontend
 * @returns {Promise<number>} how many users were notified
 */
export const notifyCompanies = async ({ companyIds, actorUserId, type, title, message, data = {} }) => {
    const ids = [...new Set((companyIds ?? []).filter(Boolean))];
    if (ids.length === 0) return 0;

    const recipients = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(and(inArray(users.companyId, ids), eq(users.userStatus, 'active')));
    if (recipients.length === 0) return 0;

    await db.insert(notification).values(
        recipients.map((recipient) => ({
            recipientUserId: recipient.id,
            actorUserId: actorUserId ?? SYSTEM_ACTOR,
            type,
            title,
            message,
            data,
        })),
    );

    const link = data.link ? `${process.env.FRONTEND_URL ?? ''}${data.link}` : null;
    for (const recipient of recipients) {
        sendEmail({
            to: recipient.email,
            subject: `Enroute: ${title}`,
            html: emailHtml(title, message, link),
            text: `${title}\n\n${message}${link ? `\n\n${link}` : ''}`,
        }).catch((error) => console.error('Notification email failed:', error.message));
    }
    return recipients.length;
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
