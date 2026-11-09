CREATE TABLE "load_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"from_status" varchar(30),
	"to_status" varchar(30),
	"actor_user_id" uuid,
	"actor_company_id" uuid,
	"note" varchar(300),
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "load_events" ADD CONSTRAINT "load_events_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_events" ADD CONSTRAINT "load_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_events" ADD CONSTRAINT "load_events_actor_company_id_companies_id_fk" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "load_events_load_idx" ON "load_events" USING btree ("load_id","created_at");