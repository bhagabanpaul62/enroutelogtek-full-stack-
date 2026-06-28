import { date, uuid, pgEnum, pgTable, timestamp } from "drizzle-orm/pg-core";
import { subscriptionPlane } from "./subscrptionPlan.Schema.js";

import { companies } from "../companies/company.Schema.js";
import { timestamps } from "../schema.Helper.Columns/column.Helper.js";

export const paymentStatus = pgEnum('payment_status', ['paid', 'pending', 'failed']);

export const companySubscription = pgTable('company_subscription', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  planId: uuid('plan_id').references(() => subscriptionPlane.id),
  startDate: timestamp('start_date').notNull(),
  expiryDate: date('expiry_date').notNull(),
  paymentStatus: paymentStatus('payment_status').notNull(),
  ...timestamps,
});