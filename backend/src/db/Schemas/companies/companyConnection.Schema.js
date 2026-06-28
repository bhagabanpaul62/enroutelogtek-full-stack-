import { uuid, pgEnum, pgTable } from 'drizzle-orm/pg-core';
import { companies } from './company.Schema.js';
import { timestamps } from '../schema.Helper.Columns/column.Helper.js';


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
  id: uuid('id').defaultRandom().primaryKey(),
  sourceCompanyId: uuid('source_company_id').references(() => companies.id),
  targetCompanyId: uuid('target_company_id').references(() => companies.id),
  connectionType: connectionType('connection_type'),
  ...timestamps,
});
