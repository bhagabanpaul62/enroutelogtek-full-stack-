ALTER TYPE "public"."document_type" ADD VALUE 'permit';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'fitness';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'puc';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'licence';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'eway_bill';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'weighbridge';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'invoice_copy';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'discrepancy_photo';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'closure_sheet';--> statement-breakpoint
ALTER TYPE "public"."price_basis" ADD VALUE 'per_kg';--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(15) NOT NULL,
	"licence_number" varchar(30),
	"licence_expiry" date,
	"availability" varchar(20) DEFAULT 'available' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"years_experience" integer,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_company_id" uuid NOT NULL,
	"registration_number" varchar(20) NOT NULL,
	"vehicle_type_id" uuid,
	"capacity_tons" numeric(6, 2),
	"availability" varchar(20) DEFAULT 'available' NOT NULL,
	"rc_number" varchar(40),
	"rc_expiry" date,
	"insurance_number" varchar(40),
	"insurance_expiry" date,
	"permit_number" varchar(40),
	"permit_expiry" date,
	"fitness_number" varchar(40),
	"fitness_expiry" date,
	"puc_expiry" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "discrepancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"kind" varchar(10) NOT NULL,
	"quantity" numeric(10, 2),
	"unit" varchar(20),
	"note" text,
	"raised_by_user_id" uuid,
	"raised_by_company_id" uuid,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "placement_misses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"load_id" uuid NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"missed_at" timestamp DEFAULT now() NOT NULL,
	"decision" varchar(12),
	"decided_by_user_id" uuid,
	"decided_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"from_company_id" uuid NOT NULL,
	"to_company_id" uuid NOT NULL,
	"given_by_user_id" uuid,
	"stars" integer NOT NULL,
	"comment" varchar(500),
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "ratings_stars_range" CHECK ("ratings"."stars" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "trip_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"kind" varchar(12) NOT NULL,
	"amount_paise" bigint NOT NULL,
	"description" varchar(300),
	"status" varchar(10) DEFAULT 'proposed' NOT NULL,
	"proposed_by_user_id" uuid,
	"proposed_by_company_id" uuid,
	"decided_by_user_id" uuid,
	"decided_at" timestamp,
	"decision_note" varchar(300),
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "trip_charges_amount_positive" CHECK ("trip_charges"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "trip_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"type" varchar(40) NOT NULL,
	"from_status" varchar(20),
	"to_status" varchar(20),
	"actor_user_id" uuid,
	"actor_company_id" uuid,
	"note" varchar(500),
	"location_text" varchar(200),
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"award_id" uuid NOT NULL,
	"seq_no" integer NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"executor_company_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"driver_id" uuid,
	"status" varchar(20) DEFAULT 'planned' NOT NULL,
	"expected_placement_at" timestamp,
	"loaded_weight_kg" numeric(10, 2),
	"lr_number" varchar(40),
	"eway_bill_number" varchar(20),
	"eway_bill_valid_until" timestamp,
	"eta_at" timestamp,
	"delay_reason" varchar(300),
	"pod_condition" varchar(10),
	"pod_remarks" varchar(500),
	"cancel_reason" varchar(300),
	"reported_at" timestamp,
	"loading_started_at" timestamp,
	"loaded_at" timestamp,
	"departed_at" timestamp,
	"reached_drop_at" timestamp,
	"unloading_started_at" timestamp,
	"delivered_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"auto_complete_at" timestamp,
	"auto_complete_warned_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "trips_status_valid" CHECK ("trips"."status" in ('planned','reported','loading','loaded','in_transit','delayed','reached_drop','delivered','completed','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "entity_type" varchar(20);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "entity_id" uuid;--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "terms_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "terms_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "pickup_place_kind" varchar(10);--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "drop_place_kind" varchar(10);--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "pickup_is_oda" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "drop_is_oda" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "distance_km" integer;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "hazmat_class" varchar(2);--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "un_number" varchar(8);--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "declared_value_paise" bigint;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "invoice_number" varchar(50);--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "invoice_date" date;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "package_count" integer;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "package_dims" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "actual_weight_kg" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "volumetric_weight_kg" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "chargeable_weight_kg" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "stackable" boolean;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "handling" varchar(20);--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "free_time_loading_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "free_time_unloading_hours" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "detention_rate_paise_per_hour" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "labour_payable_by" varchar(12) DEFAULT 'consignor' NOT NULL;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "freight_payable_by" varchar(12) DEFAULT 'consignor' NOT NULL;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "toll_included" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_owner_company_id_companies_id_fk" FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_company_id_companies_id_fk" FOREIGN KEY ("owner_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicle_type_id_vehicle_types_id_fk" FOREIGN KEY ("vehicle_type_id") REFERENCES "public"."vehicle_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancies" ADD CONSTRAINT "discrepancies_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancies" ADD CONSTRAINT "discrepancies_raised_by_user_id_users_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discrepancies" ADD CONSTRAINT "discrepancies_raised_by_company_id_companies_id_fk" FOREIGN KEY ("raised_by_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_misses" ADD CONSTRAINT "placement_misses_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_misses" ADD CONSTRAINT "placement_misses_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_misses" ADD CONSTRAINT "placement_misses_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_misses" ADD CONSTRAINT "placement_misses_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_from_company_id_companies_id_fk" FOREIGN KEY ("from_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_to_company_id_companies_id_fk" FOREIGN KEY ("to_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_given_by_user_id_users_id_fk" FOREIGN KEY ("given_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_charges" ADD CONSTRAINT "trip_charges_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_charges" ADD CONSTRAINT "trip_charges_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_charges" ADD CONSTRAINT "trip_charges_proposed_by_company_id_companies_id_fk" FOREIGN KEY ("proposed_by_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_charges" ADD CONSTRAINT "trip_charges_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_actor_company_id_companies_id_fk" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_award_id_awards_id_fk" FOREIGN KEY ("award_id") REFERENCES "public"."awards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_executor_company_id_companies_id_fk" FOREIGN KEY ("executor_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_company_phone_idx" ON "drivers" USING btree ("owner_company_id","phone") WHERE "drivers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "drivers_owner_idx" ON "drivers" USING btree ("owner_company_id","availability");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_registration_idx" ON "vehicles" USING btree ("registration_number") WHERE "vehicles"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "vehicles_owner_idx" ON "vehicles" USING btree ("owner_company_id","availability");--> statement-breakpoint
CREATE INDEX "discrepancies_trip_idx" ON "discrepancies" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "placement_misses_transporter_idx" ON "placement_misses" USING btree ("transporter_company_id");--> statement-breakpoint
CREATE INDEX "placement_misses_trip_idx" ON "placement_misses" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_pair_load_idx" ON "ratings" USING btree ("load_id","from_company_id","to_company_id");--> statement-breakpoint
CREATE INDEX "trip_charges_trip_idx" ON "trip_charges" USING btree ("trip_id","status");--> statement-breakpoint
CREATE INDEX "trip_events_trip_idx" ON "trip_events" USING btree ("trip_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trips_load_seq_idx" ON "trips" USING btree ("load_id","seq_no");--> statement-breakpoint
CREATE INDEX "trips_transporter_idx" ON "trips" USING btree ("transporter_company_id","status");--> statement-breakpoint
CREATE INDEX "trips_executor_idx" ON "trips" USING btree ("executor_company_id","status");--> statement-breakpoint
CREATE INDEX "trips_clock_idx" ON "trips" USING btree ("status","auto_complete_at");--> statement-breakpoint
CREATE INDEX "documents_entity_idx" ON "documents" USING btree ("entity_type","entity_id");--> statement-breakpoint
-- Data step: existing companies get the new permission keys (Owner stores none; it holds all).
-- Co-admin: every applicable key. Trip manager: trips.update (+ fleet.manage for transporter / fleet owner).
UPDATE "company_roles" r
SET "permissions" = (
    SELECT array_agg(DISTINCT k) FROM unnest(
        r."permissions" || CASE c."company_type"
            WHEN 'broker' THEN ARRAY['trips.update']
            ELSE ARRAY['trips.update', 'fleet.manage']
        END
    ) AS k
)
FROM "companies" c
WHERE r."company_id" = c."id"
  AND c."company_type" IN ('transporter', 'fleet_owner', 'broker')
  AND r."name" IN ('Co-admin', 'Trip manager');
