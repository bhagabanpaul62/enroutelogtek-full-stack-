ALTER TABLE "company_connections" ALTER COLUMN "source_company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "company_connections" ALTER COLUMN "target_company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "company_connections" ALTER COLUMN "connection_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "company_connections" ADD COLUMN "blocked_by_company_id" uuid;--> statement-breakpoint
ALTER TABLE "company_connections" ADD CONSTRAINT "company_connections_blocked_by_company_id_companies_id_fk" FOREIGN KEY ("blocked_by_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_connections_pair_unique" ON "company_connections" USING btree (least("source_company_id", "target_company_id"),greatest("source_company_id", "target_company_id"));--> statement-breakpoint
CREATE INDEX "company_connections_source_idx" ON "company_connections" USING btree ("source_company_id","connection_status","created_at");--> statement-breakpoint
CREATE INDEX "company_connections_target_idx" ON "company_connections" USING btree ("target_company_id","connection_status","created_at");--> statement-breakpoint
ALTER TABLE "company_connections" ADD CONSTRAINT "company_connections_not_self" CHECK ("company_connections"."source_company_id" <> "company_connections"."target_company_id");