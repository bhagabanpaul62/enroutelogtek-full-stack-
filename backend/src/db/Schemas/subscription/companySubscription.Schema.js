
import { date, integer, pgEnum, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { subscriptionPlane } from "./subscrptionPlan.Schema.js";
import { timestamps } from "../schema.Helper.Colomus/columns.Hemper.js";
import { companies } from "../companies/company.Schema.js";



export const paymentStatus=pgEnum('payment_status',['paid','pending','failed'])

export const companySubscription = pgTable('company_subscription',{
    id:serial('id').primaryKey(),
    companyId:integer('company_id').references(()=> companies.id),
    planId:integer('plan_id').references(()=> subscriptionPlane.id),
    startDate:timestamp('startDate').notNull(),
    expiryDate:date('expiry_date').notNull(),
    paymentStatus:paymentStatus('payment_status').notNull(),
    ...timestamps,
})