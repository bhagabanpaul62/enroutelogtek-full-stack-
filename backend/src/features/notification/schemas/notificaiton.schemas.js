import {
    boolean,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { timestamps } from '#shared/schemas/column.Helper.js';

export const notification = pgTable(
    'notification',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        recipientUserId: varchar('recipient_user_id', { length: 255 }).notNull(),
        actorUserId: varchar('actor_user_id', { length: 255 }).notNull(),
        type: varchar('type', { length: 255 }),
        title: varchar('title', { length: 255 }).notNull(),
        message: text('message').notNull(),
        data: jsonb('data'),
        isRead: boolean('is_read').default(false),
        readAt: timestamp('read_at'),
        // Optional: the same (recipient, key) is stored once, so a retried or double-fired business
        // action cannot notify a person twice. Null = no guard.
        dedupeKey: varchar('dedupe_key', { length: 200 }),
        ...timestamps,
    },
    (table) => ({
        recipientCreateIdx: index('notification_recipient_create_idx').on(
            table.recipientUserId,
            table.createdAt,
        ),
        recipientReadIdx: index('notification_recipient_read_idx').on(
            table.recipientUserId,
            table.isRead,
        ),
        dedupeIdx: uniqueIndex('notification_dedupe_idx')
            .on(table.recipientUserId, table.dedupeKey)
            .where(sql`${table.dedupeKey} IS NOT NULL`),
    }),
);

export const deliveryChannel = pgEnum('delivery_channel', ['email', 'in_app']);
export const deliveryStatus = pgEnum('delivery_status', ['pending', 'sent', 'failed']);

/**
 * One row per notification per channel: the durable outbox. The notification (and its in_app
 * row, already `sent`) is written first; a worker sends the email row and retries it with backoff
 * (max 5 attempts) so a mail outage never touches the business action. Unique per
 * (notification, channel), so a retry can never create a second email for a recipient.
 * `toEmail` is copied when the row is written, so a retry goes to the address that was current then.
 * Unread counts read only the notification table and ignore this one.
 */
export const notificationDeliveries = pgTable(
    'notification_deliveries',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        notificationId: uuid('notification_id')
            .notNull()
            .references(() => notification.id, { onDelete: 'cascade' }),
        channel: deliveryChannel('channel').notNull(),
        status: deliveryStatus('status').notNull().default('pending'),
        toEmail: varchar('to_email', { length: 255 }),
        attempts: integer('attempts').notNull().default(0),
        // When the worker may pick it up. A claim pushes it forward, so a crashed worker is retried.
        nextAttemptAt: timestamp('next_attempt_at'),
        lastError: text('last_error'),
        sentAt: timestamp('sent_at'),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('notification_deliveries_unique_idx').on(table.notificationId, table.channel),
        index('notification_deliveries_due_idx')
            .on(table.nextAttemptAt)
            .where(sql`${table.status} = 'pending'`),
        index('notification_deliveries_status_idx').on(table.status, table.createdAt),
    ],
);
