import {
    boolean,
    index,
    json,
    jsonb,
    pgTable,
    text,
    timestamp,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';
import { timestamps } from '../schema.Helper.Columns/column.Helper';


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
    }),
);
