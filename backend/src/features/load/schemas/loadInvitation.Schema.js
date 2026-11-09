import { index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { users } from '#features/auth/schemas/users.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';
import { loads } from './load.Schema.js';

/**
 * Who was invited to bid, taken as a snapshot when the load is published. A transporter sees
 * a load only through a row here. createdAt is the invitation time.
 */
export const loadInvitations = pgTable(
    'load_invitations',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        loadId: uuid('load_id')
            .notNull()
            .references(() => loads.id),
        transporterCompanyId: uuid('transporter_company_id')
            .notNull()
            .references(() => companies.id),
        invitedByUserId: uuid('invited_by_user_id').references(() => users.id),
        viewedAt: timestamp('viewed_at'),
        ...timestamps,
    },
    (table) => [
        uniqueIndex('load_invitations_unique').on(table.loadId, table.transporterCompanyId),
        // The transporter's Bids list: everything it was invited to, newest first.
        index('load_invitations_transporter_idx').on(table.transporterCompanyId, table.createdAt),
    ],
);
