import { uuid, varchar, pgTable, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';

export const userSessions = pgTable(
    'user_sessions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id').references(() => users.id),
        refreshToken: varchar('refresh_token', { length: 1000 }),
        deviceId: varchar('device_id', { length: 256 }),
        ipAddress: varchar('ip_address', { length: 50 }),
        userAgent: varchar('user_agent', { length: 255 }),
        isActive: boolean('is_active').default(true),
        // Why the session ended (logout, new_login, password_reset); null while active or when
        // ended by older code. Lets a signed-out device tell the person why.
        revokedReason: varchar('revoked_reason', { length: 30 }),
        lastActiveAt: timestamp('last_active_at'),
        expiresAt: timestamp('expires_at'),
        ...timestamps,
    },
    // Every login ends the user's active sessions, so look them up by user and state.
    (table) => [index('user_sessions_user_active_idx').on(table.userId, table.isActive)],
);
