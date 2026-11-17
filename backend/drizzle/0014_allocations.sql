CREATE TYPE "public"."allocation_status" AS ENUM('offered', 'accepted', 'declined', 'expired', 'withdrawn');--> statement-breakpoint
CREATE TABLE "allocation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"allocation_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"from_status" varchar(20),
	"to_status" varchar(20),
	"actor_user_id" uuid,
	"actor_company_id" uuid,
	"note" varchar(300),
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allocation_trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"allocation_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"depth" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"award_id" uuid NOT NULL,
	"load_id" uuid NOT NULL,
	"parent_allocation_id" uuid,
	"depth" integer DEFAULT 1 NOT NULL,
	"from_company_id" uuid NOT NULL,
	"to_company_id" uuid NOT NULL,
	"to_company_type" varchar(20) NOT NULL,
	"quantity" integer NOT NULL,
	"rate_per_truck_paise" bigint NOT NULL,
	"status" "allocation_status" DEFAULT 'offered' NOT NULL,
	"note" varchar(300),
	"respond_by" timestamp NOT NULL,
	"responded_at" timestamp,
	"responded_by_user_id" uuid,
	"decision_note" varchar(300),
	"created_by_user_id" uuid NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "allocations_quantity_positive" CHECK ("allocations"."quantity" >= 1),
	CONSTRAINT "allocations_rate_positive" CHECK ("allocations"."rate_per_truck_paise" > 0),
	CONSTRAINT "allocations_depth_valid" CHECK ("allocations"."depth" in (1, 2)),
	CONSTRAINT "allocations_not_self" CHECK ("allocations"."from_company_id" <> "allocations"."to_company_id"),
	CONSTRAINT "allocations_status_valid" CHECK ("allocations"."status" in ('offered','accepted','declined','expired','withdrawn'))
);
--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "executor_allocation_id" uuid;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "executor_rate_paise" bigint;--> statement-breakpoint
ALTER TABLE "allocation_events" ADD CONSTRAINT "allocation_events_allocation_id_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_events" ADD CONSTRAINT "allocation_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_events" ADD CONSTRAINT "allocation_events_actor_company_id_companies_id_fk" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_trips" ADD CONSTRAINT "allocation_trips_allocation_id_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_trips" ADD CONSTRAINT "allocation_trips_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_award_id_awards_id_fk" FOREIGN KEY ("award_id") REFERENCES "public"."awards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_parent_allocation_id_allocations_id_fk" FOREIGN KEY ("parent_allocation_id") REFERENCES "public"."allocations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_from_company_id_companies_id_fk" FOREIGN KEY ("from_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_to_company_id_companies_id_fk" FOREIGN KEY ("to_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "allocation_events_allocation_idx" ON "allocation_events" USING btree ("allocation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "allocation_trips_pair_unique" ON "allocation_trips" USING btree ("allocation_id","trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "allocation_trips_live_unique" ON "allocation_trips" USING btree ("trip_id","depth") WHERE "allocation_trips"."active";--> statement-breakpoint
CREATE INDEX "allocation_trips_trip_idx" ON "allocation_trips" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "allocations_award_idx" ON "allocations" USING btree ("award_id","status");--> statement-breakpoint
CREATE INDEX "allocations_from_idx" ON "allocations" USING btree ("from_company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "allocations_to_idx" ON "allocations" USING btree ("to_company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "allocations_pending_idx" ON "allocations" USING btree ("status","respond_by");
--> statement-breakpoint
-- Data step: existing Co-admin and Bid manager roles get the allocation keys (Owner stores none; it holds all).
-- transporter -> allocations.manage; fleet_owner -> offers.respond; broker -> both.
UPDATE "company_roles" r
SET "permissions" = (
    SELECT array_agg(DISTINCT k) FROM unnest(
        r."permissions" || CASE c."company_type"
            WHEN 'transporter' THEN ARRAY['allocations.manage']
            WHEN 'fleet_owner' THEN ARRAY['offers.respond']
            ELSE ARRAY['allocations.manage', 'offers.respond']
        END
    ) AS k
)
FROM "companies" c
WHERE r."company_id" = c."id"
  AND c."company_type" IN ('transporter', 'fleet_owner', 'broker')
  AND r."name" IN ('Co-admin', 'Bid manager');
