
import { pgTable, serial, varchar , integer} from "drizzle-orm/pg-core";
import { timestamps } from "../schema.Helper.Colomus/columns.Hemper.js";

export const subscriptionPlane = pgTable('subscription_plan',{
    id:serial('id').primaryKey(),
    planeName:varchar('plane_name',{length:100}).notNull(),
    maxUser:integer('max_user').notNull(),
    monthlyPrice:integer('monthly_price').notNull(),
    ...timestamps,
})