import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { companies } from "./company.Schema.js";
import { timestamps } from "../schema.Helper.Columns/column.Helper.js";


export const rejectedCompany = pgTable('rejected_company',{
    id:uuid('id').defaultRandom().primaryKey(),
    companyId:uuid('company_id').references(()=>companies.id),
    message:varchar('message' ,{length : 300}).notNull(),
    ...timestamps,
})