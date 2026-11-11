import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';

/**
 * History of team and role changes: who did what to whom. Written in the same transaction as
 * the change, so a change without its record cannot happen. `targetRoleId` has no foreign key
 * because a deleted role's history must stay; its name is kept in `details`.
 */
export const teamEvents = pgTable(
    'team_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        companyId: uuid('company_id')
            .notNull()
            .references(() => companies.id),
        actorUserId: uuid('actor_user_id')
            .notNull()
            .references(() => users.id),
        action: varchar('action', { length: 40 }).notNull(),
        targetUserId: uuid('target_user_id').references(() => users.id),
        targetRoleId: uuid('target_role_id'),
        details: jsonb('details'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => [index('team_events_company_idx').on(table.companyId, table.createdAt)],
);
