import { sql } from 'drizzle-orm';
import { uuid, pgEnum, pgTable, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { timestamps } from '#shared/schemas/column.Helper.js';

export const connectionStatus = pgEnum('connection_status', [
    'pending',
    'accepted',
    'rejected',
    'blocked',
]);

export const companyConnections = pgTable(
    'company_connections',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        sourceCompanyId: uuid('source_company_id')
            .notNull()
            .references(() => companies.id),
        targetCompanyId: uuid('target_company_id')
            .notNull()
            .references(() => companies.id),

        connectionStatus: connectionStatus('connection_status').notNull().default('pending'),
        // Who blocked - only that company can unblock, and the blocked company never sees the row.
        blockedByCompanyId: uuid('blocked_by_company_id').references(() => companies.id),
        ...timestamps,
    },
    (table) => [
        // One row per pair of companies, whatever the direction (A→B and B→A are the same pair).
        // Also stops two requests created at the same moment from both getting in.
        uniqueIndex('company_connections_pair_unique').on(
            sql`least(${table.sourceCompanyId}, ${table.targetCompanyId})`,
            sql`greatest(${table.sourceCompanyId}, ${table.targetCompanyId})`,
        ),
        // List queries filter by one side + status and sort by newest first.
        index('company_connections_source_idx').on(
            table.sourceCompanyId,
            table.connectionStatus,
            table.createdAt,
        ),
        index('company_connections_target_idx').on(
            table.targetCompanyId,
            table.connectionStatus,
            table.createdAt,
        ),
        check(
            'company_connections_not_self',
            sql`${table.sourceCompanyId} <> ${table.targetCompanyId}`,
        ),
    ],
);
