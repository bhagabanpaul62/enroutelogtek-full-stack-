import { index, jsonb, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';
import { loads } from './load.Schema.js';

/**
 * The audit log of a load: one row per status change (created, published, extended, closed,
 * awarded, accepted, declined, assigned, completed, cancelled ...), with who did it. Rows are
 * only ever inserted, never changed. A null actor means the clock job (the system) did it.
 */
export const loadEvents = pgTable(
    'load_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        loadId: uuid('load_id')
            .notNull()
            .references(() => loads.id),
        type: varchar('type', { length: 50 }).notNull(),
        fromStatus: varchar('from_status', { length: 30 }),
        toStatus: varchar('to_status', { length: 30 }),
        actorUserId: uuid('actor_user_id').references(() => users.id),
        actorCompanyId: uuid('actor_company_id').references(() => companies.id),
        note: varchar('note', { length: 300 }),
        data: jsonb('data').notNull().default({}),
        ...timestamps,
    },
    (table) => [index('load_events_load_idx').on(table.loadId, table.createdAt)],
);
