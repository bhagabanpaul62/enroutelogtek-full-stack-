import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';

/**
 * A company's own roles. `permissions` holds keys from team.permissions.js; the Owner role keeps
 * it empty because it always holds everything. Each company has exactly one Owner role, and
 * role names are unique per company regardless of case.
 */
export const companyRoles = pgTable(
    'company_roles',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        companyId: uuid('company_id')
            .notNull()
            .references(() => companies.id),
        name: varchar('name', { length: 60 }).notNull(),
        description: varchar('description', { length: 255 }),
        permissions: text('permissions')
            .array()
            .notNull()
            .default(sql`'{}'::text[]`),
        isOwner: boolean('is_owner').notNull().default(false),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
    },
    (table) => [
        uniqueIndex('company_roles_company_name_idx').on(table.companyId, sql`lower(${table.name})`),
        uniqueIndex('company_roles_one_owner_idx')
            .on(table.companyId)
            .where(sql`${table.isOwner} = true`),
        index('company_roles_company_idx').on(table.companyId, table.createdAt),
    ],
);
