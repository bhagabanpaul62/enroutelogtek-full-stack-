import { integer, pgEnum, pgTable, serial } from 'drizzle-orm/pg-core';
import { companies } from './company.Schema.js';
import { timestamps } from '../schema.Helper.Colomus/columns.Hemper.js';

export const connectionType = pgEnum('connection_type', [
  'customer',
  'transposer',
  'broker',
  'fleetOwner',
]);
export const connectionStatus = pgEnum('connection_status', [
  'pending',
  'accepted',
  'rejected',
  'blocked',
]);

export const companyConnections = pgTable('company_connections', {
  id: serial('id').primaryKey(),
  sourceCompanyId: integer('source_company_id').references(() => companies.id),
  targetCompanyId: integer('target_company_id').references(() => companies.id),
  connectionType: connectionType('connection_type'),
  ...timestamps,
});
