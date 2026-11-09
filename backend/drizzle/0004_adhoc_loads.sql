CREATE TYPE "public"."award_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."margin_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."load_kind" AS ENUM('ad_hoc', 'contract');--> statement-breakpoint
CREATE TYPE "public"."load_status" AS ENUM('draft', 'live', 'closed', 'expired', 'awarded', 'accepted', 'in_execution', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."price_basis" AS ENUM('per_vehicle', 'per_ton', 'per_km');--> statement-breakpoint
CREATE TABLE "awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"bid_id" uuid NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"awarded_by_user_id" uuid NOT NULL,
	"reason" varchar(300),
	"status" "award_status" DEFAULT 'pending' NOT NULL,
	"accept_by" timestamp NOT NULL,
	"responded_at" timestamp,
	"responded_by_user_id" uuid,
	"vehicle_number" varchar(20),
	"driver_name" varchar(100),
	"driver_phone" varchar(15),
	"assigned_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bid_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bid_id" uuid NOT NULL,
	"load_id" uuid NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"base_rate" numeric(12, 2) NOT NULL,
	"margin_type" "margin_type" NOT NULL,
	"margin_value" numeric(12, 2) NOT NULL,
	"final_amount" numeric(12, 2) NOT NULL,
	"rank_at_submit" integer,
	"submitted_by_user_id" uuid,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"attempts_used" integer DEFAULT 0 NOT NULL,
	"current_amount" numeric(12, 2) NOT NULL,
	"current_rank" integer,
	"last_attempt_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "commodities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "commodities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pin_codes" (
	"pin_code" varchar(6) PRIMARY KEY NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"body_type" varchar(30) NOT NULL,
	"capacity_tons" numeric(6, 2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "vehicle_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "loads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_seq" serial NOT NULL,
	"kind" "load_kind" DEFAULT 'ad_hoc' NOT NULL,
	"status" "load_status" DEFAULT 'draft' NOT NULL,
	"customer_company_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"last_step" integer DEFAULT 1 NOT NULL,
	"pickup_pin_code" varchar(6),
	"pickup_city" varchar(100),
	"pickup_state" varchar(100),
	"pickup_address" varchar(300),
	"drop_pin_code" varchar(6),
	"drop_city" varchar(100),
	"drop_state" varchar(100),
	"drop_address" varchar(300),
	"pickup_date" date,
	"pickup_time_from" varchar(5),
	"pickup_time_to" varchar(5),
	"flexibility_days" integer DEFAULT 0 NOT NULL,
	"expected_delivery_date" date,
	"commodity_id" uuid,
	"commodity_other" varchar(100),
	"weight_tons" numeric(10, 2),
	"packaging" varchar(30),
	"load_type" varchar(3) DEFAULT 'FTL' NOT NULL,
	"vehicle_type_id" uuid,
	"vehicle_count" integer DEFAULT 1 NOT NULL,
	"capacity_tons_per_vehicle" numeric(10, 2),
	"special_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"attachment_url" varchar(1000),
	"price_basis" "price_basis" DEFAULT 'per_vehicle' NOT NULL,
	"target_price" numeric(12, 2),
	"closes_at" timestamp,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"payment_terms" varchar(200),
	"auto_extend_once" boolean DEFAULT false NOT NULL,
	"invitee_company_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp,
	"closed_at" timestamp,
	"awarded_at" timestamp,
	"accepted_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"cancel_reason" varchar(300),
	"extension_count" integer DEFAULT 0 NOT NULL,
	"closing_soon_notified_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "loads_load_seq_unique" UNIQUE("load_seq"),
	CONSTRAINT "loads_vehicle_count_positive" CHECK ("loads"."vehicle_count" >= 1),
	CONSTRAINT "loads_max_attempts_positive" CHECK ("loads"."max_attempts" >= 1)
);
--> statement-breakpoint
CREATE TABLE "load_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_id" uuid NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"invited_by_user_id" uuid,
	"viewed_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_awarded_by_user_id_users_id_fk" FOREIGN KEY ("awarded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_attempts" ADD CONSTRAINT "bid_attempts_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_attempts" ADD CONSTRAINT "bid_attempts_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_attempts" ADD CONSTRAINT "bid_attempts_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_attempts" ADD CONSTRAINT "bid_attempts_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_customer_company_id_companies_id_fk" FOREIGN KEY ("customer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_vehicle_type_id_vehicle_types_id_fk" FOREIGN KEY ("vehicle_type_id") REFERENCES "public"."vehicle_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_invitations" ADD CONSTRAINT "load_invitations_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_invitations" ADD CONSTRAINT "load_invitations_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_invitations" ADD CONSTRAINT "load_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "awards_load_idx" ON "awards" USING btree ("load_id","status");--> statement-breakpoint
CREATE INDEX "awards_pending_idx" ON "awards" USING btree ("status","accept_by");--> statement-breakpoint
CREATE UNIQUE INDEX "bid_attempts_unique" ON "bid_attempts" USING btree ("bid_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "bids_load_transporter_unique" ON "bids" USING btree ("load_id","transporter_company_id");--> statement-breakpoint
CREATE INDEX "bids_load_amount_idx" ON "bids" USING btree ("load_id","current_amount");--> statement-breakpoint
CREATE INDEX "loads_customer_idx" ON "loads" USING btree ("customer_company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "loads_status_closes_idx" ON "loads" USING btree ("status","closes_at");--> statement-breakpoint
CREATE UNIQUE INDEX "load_invitations_unique" ON "load_invitations" USING btree ("load_id","transporter_company_id");--> statement-breakpoint
CREATE INDEX "load_invitations_transporter_idx" ON "load_invitations" USING btree ("transporter_company_id","created_at");