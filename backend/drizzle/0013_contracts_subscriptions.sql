ALTER TABLE "company_subscription" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription_plan" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "company_subscription" CASCADE;--> statement-breakpoint
DROP TABLE "subscription_plan" CASCADE;--> statement-breakpoint
CREATE TYPE "public"."amendment_status" AS ENUM('proposed', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('active', 'amending', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."indent_status" AS ENUM('requested', 'acknowledged', 'declined', 'cancelled', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."delivery_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."lane_award_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."rfq_import_status" AS ENUM('previewed', 'confirmed', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."rfq_rate_basis" AS ENUM('per_vehicle', 'per_ton', 'per_kg');--> statement-breakpoint
CREATE TYPE "public"."rfq_status" AS ENUM('draft', 'open', 'closed', 'awarded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_kind" AS ENUM('trial', 'paid');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending_payment', 'active', 'grace', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."submission_purpose" AS ENUM('new', 'renewal', 'extra_seats');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "contract_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"proposed_by_company_id" uuid NOT NULL,
	"proposed_by_user_id" uuid NOT NULL,
	"status" "amendment_status" DEFAULT 'proposed' NOT NULL,
	"changes" jsonb NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"effective_from" date NOT NULL,
	"note" varchar(500),
	"decided_by_user_id" uuid,
	"decided_at" timestamp,
	"decision_note" varchar(300),
	"resulting_version" integer,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "contract_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"indent_id" uuid,
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
CREATE TABLE "contract_indents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indent_seq" serial NOT NULL,
	"contract_id" uuid NOT NULL,
	"contract_lane_id" uuid NOT NULL,
	"customer_company_id" uuid NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"status" "indent_status" DEFAULT 'requested' NOT NULL,
	"trucks" integer NOT NULL,
	"pickup_date" date NOT NULL,
	"pickup_time_from" varchar(5),
	"pickup_time_to" varchar(5),
	"pickup_address" varchar(300),
	"pickup_contact_name" varchar(100),
	"pickup_contact_phone" varchar(15),
	"drop_address" varchar(300),
	"drop_contact_name" varchar(100),
	"drop_contact_phone" varchar(15),
	"weight_tons" numeric(10, 2),
	"notes" text,
	"idempotency_key" varchar(64) NOT NULL,
	"over_volume_by" integer DEFAULT 0 NOT NULL,
	"rate_paise" bigint,
	"term_version" integer,
	"load_id" uuid,
	"requested_by_user_id" uuid NOT NULL,
	"responded_by_user_id" uuid,
	"responded_at" timestamp,
	"decline_reason" varchar(300),
	"cancel_reason" varchar(300),
	"fulfilled_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "contract_indents_indent_seq_unique" UNIQUE("indent_seq"),
	CONSTRAINT "contract_indents_trucks_positive" CHECK ("contract_indents"."trucks" >= 1)
);
--> statement-breakpoint
CREATE TABLE "contract_lane_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_lane_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"rate_paise" bigint NOT NULL,
	"monthly_volume_trucks" integer NOT NULL,
	"effective_from" date NOT NULL,
	"amendment_id" uuid,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "contract_lane_terms_positive" CHECK ("contract_lane_terms"."rate_paise" > 0 AND "contract_lane_terms"."monthly_volume_trucks" >= 1)
);
--> statement-breakpoint
CREATE TABLE "contract_lanes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"rfq_lane_id" uuid NOT NULL,
	"lane_no" integer NOT NULL,
	"origin_pin_code" varchar(6) NOT NULL,
	"origin_city" varchar(100) NOT NULL,
	"origin_state" varchar(100),
	"dest_pin_code" varchar(6) NOT NULL,
	"dest_city" varchar(100) NOT NULL,
	"dest_state" varchar(100),
	"vehicle_type_id" uuid NOT NULL,
	"rate_basis" "rfq_rate_basis" NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_seq" serial NOT NULL,
	"rfq_id" uuid NOT NULL,
	"customer_company_id" uuid NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"status" "contract_status" DEFAULT 'active' NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL,
	"terms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"payment_terms" varchar(200),
	"version" integer DEFAULT 1 NOT NULL,
	"accepted_by_user_id" uuid,
	"cancelled_at" timestamp,
	"cancelled_by_company_id" uuid,
	"cancel_reason" varchar(300),
	"cancel_notice_days" integer,
	"cancel_effective_on" date,
	"expired_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "contracts_contract_seq_unique" UNIQUE("contract_seq")
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" "delivery_channel" NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"to_email" varchar(255),
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp,
	"last_error" text,
	"sent_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rfq_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
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
CREATE TABLE "rfq_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_company_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"file_name" varchar(200),
	"content_hash" varchar(64) NOT NULL,
	"status" "rfq_import_status" DEFAULT 'previewed' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rfq_id" uuid,
	"confirmed_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rfq_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"invited_by_user_id" uuid,
	"viewed_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rfq_lane_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"lane_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"rate_paise" bigint NOT NULL,
	"status" "lane_award_status" DEFAULT 'pending' NOT NULL,
	"awarded_by_user_id" uuid NOT NULL,
	"reason" varchar(300),
	"accept_by" timestamp NOT NULL,
	"responded_at" timestamp,
	"responded_by_user_id" uuid,
	"decline_reason" varchar(300),
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rfq_lanes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"lane_no" integer NOT NULL,
	"origin_pin_code" varchar(6) NOT NULL,
	"origin_city" varchar(100) NOT NULL,
	"origin_state" varchar(100),
	"dest_pin_code" varchar(6) NOT NULL,
	"dest_city" varchar(100) NOT NULL,
	"dest_state" varchar(100),
	"vehicle_type_id" uuid NOT NULL,
	"monthly_volume_trucks" integer NOT NULL,
	"rate_basis" "rfq_rate_basis" DEFAULT 'per_vehicle' NOT NULL,
	"target_rate_paise" bigint,
	"notes" varchar(300),
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "rfq_lanes_volume_positive" CHECK ("rfq_lanes"."monthly_volume_trucks" >= 1)
);
--> statement-breakpoint
CREATE TABLE "rfq_quote_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"rate_paise" bigint NOT NULL,
	"note" varchar(300),
	"submitted_by_user_id" uuid,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rfq_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"lane_id" uuid NOT NULL,
	"transporter_company_id" uuid NOT NULL,
	"current_rate_paise" bigint NOT NULL,
	"revision_count" integer DEFAULT 1 NOT NULL,
	"last_submitted_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "rfq_quotes_rate_positive" CHECK ("rfq_quotes"."current_rate_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_seq" serial NOT NULL,
	"status" "rfq_status" DEFAULT 'draft' NOT NULL,
	"customer_company_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"title" varchar(150) NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"closes_at" timestamp,
	"terms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"payment_terms" varchar(200),
	"notes" text,
	"invitee_company_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp,
	"closed_at" timestamp,
	"awarded_at" timestamp,
	"cancelled_at" timestamp,
	"cancel_reason" varchar(300),
	"extension_count" integer DEFAULT 0 NOT NULL,
	"closing_soon_notified_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "rfqs_rfq_seq_unique" UNIQUE("rfq_seq"),
	CONSTRAINT "rfqs_period_order" CHECK ("rfqs"."valid_from" IS NULL OR "rfqs"."valid_to" IS NULL OR "rfqs"."valid_to" >= "rfqs"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "company_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"kind" "subscription_kind" NOT NULL,
	"status" "subscription_status" NOT NULL,
	"plan_id" uuid,
	"plan_name" varchar(100),
	"monthly_price_paise" integer,
	"extra_seat_price_paise" integer,
	"included_seats" integer DEFAULT 0 NOT NULL,
	"extra_seats" integer DEFAULT 0 NOT NULL,
	"period_months" integer,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"grace_ends_at" timestamp,
	"last_submission_id" uuid,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "company_subscriptions_seats_chk" CHECK ("company_subscriptions"."included_seats" >= 0 AND "company_subscriptions"."extra_seats" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"monthly_price_paise" integer NOT NULL,
	"included_seats" integer NOT NULL,
	"extra_seat_price_paise" integer NOT NULL,
	"billing_periods" integer[] DEFAULT '{1,3,12}'::integer[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "subscription_plans_money_chk" CHECK ("subscription_plans"."monthly_price_paise" >= 0 AND "subscription_plans"."extra_seat_price_paise" >= 0),
	CONSTRAINT "subscription_plans_seats_chk" CHECK ("subscription_plans"."included_seats" >= 1)
);
--> statement-breakpoint
CREATE TABLE "payment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"submitted_by_user_id" uuid NOT NULL,
	"purpose" "submission_purpose" NOT NULL,
	"plan_id" uuid NOT NULL,
	"period_months" integer NOT NULL,
	"extra_seats" integer DEFAULT 0 NOT NULL,
	"amount_paise" integer NOT NULL,
	"price_snapshot" jsonb NOT NULL,
	"proof_document_id" uuid NOT NULL,
	"reference_no" varchar(100) NOT NULL,
	"paid_on" date,
	"status" "submission_status" DEFAULT 'submitted' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp,
	"review_note" text,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "payment_submissions_amount_chk" CHECK ("payment_submissions"."amount_paise" >= 0 AND "payment_submissions"."extra_seats" >= 0),
	CONSTRAINT "payment_submissions_review_chk" CHECK ("payment_submissions"."status" = 'submitted' OR ("payment_submissions"."reviewed_by_user_id" IS NOT NULL AND "payment_submissions"."reviewed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "seat_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"submission_id" uuid,
	"reason" varchar(40) NOT NULL,
	"included_before" integer NOT NULL,
	"included_after" integer NOT NULL,
	"extra_before" integer NOT NULL,
	"extra_after" integer NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"subscription_id" uuid,
	"submission_id" uuid,
	"plan_id" uuid,
	"event_type" varchar(40) NOT NULL,
	"actor_user_id" uuid,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "awards" ALTER COLUMN "bid_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "contract_indent_id" uuid;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "contract_id" uuid;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "contract_lane_id" uuid;--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN "contract_indent_id" uuid;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "dedupe_key" varchar(200);--> statement-breakpoint
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_proposed_by_company_id_companies_id_fk" FOREIGN KEY ("proposed_by_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_events" ADD CONSTRAINT "contract_events_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_events" ADD CONSTRAINT "contract_events_indent_id_contract_indents_id_fk" FOREIGN KEY ("indent_id") REFERENCES "public"."contract_indents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_events" ADD CONSTRAINT "contract_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_events" ADD CONSTRAINT "contract_events_actor_company_id_companies_id_fk" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_indents" ADD CONSTRAINT "contract_indents_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_indents" ADD CONSTRAINT "contract_indents_contract_lane_id_contract_lanes_id_fk" FOREIGN KEY ("contract_lane_id") REFERENCES "public"."contract_lanes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_indents" ADD CONSTRAINT "contract_indents_customer_company_id_companies_id_fk" FOREIGN KEY ("customer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_indents" ADD CONSTRAINT "contract_indents_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_indents" ADD CONSTRAINT "contract_indents_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_indents" ADD CONSTRAINT "contract_indents_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_indents" ADD CONSTRAINT "contract_indents_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_lane_terms" ADD CONSTRAINT "contract_lane_terms_contract_lane_id_contract_lanes_id_fk" FOREIGN KEY ("contract_lane_id") REFERENCES "public"."contract_lanes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_lanes" ADD CONSTRAINT "contract_lanes_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_lanes" ADD CONSTRAINT "contract_lanes_rfq_lane_id_rfq_lanes_id_fk" FOREIGN KEY ("rfq_lane_id") REFERENCES "public"."rfq_lanes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_lanes" ADD CONSTRAINT "contract_lanes_vehicle_type_id_vehicle_types_id_fk" FOREIGN KEY ("vehicle_type_id") REFERENCES "public"."vehicle_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_company_id_companies_id_fk" FOREIGN KEY ("customer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_cancelled_by_company_id_companies_id_fk" FOREIGN KEY ("cancelled_by_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_events" ADD CONSTRAINT "rfq_events_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_events" ADD CONSTRAINT "rfq_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_events" ADD CONSTRAINT "rfq_events_actor_company_id_companies_id_fk" FOREIGN KEY ("actor_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_imports" ADD CONSTRAINT "rfq_imports_customer_company_id_companies_id_fk" FOREIGN KEY ("customer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_imports" ADD CONSTRAINT "rfq_imports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_imports" ADD CONSTRAINT "rfq_imports_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_invitations" ADD CONSTRAINT "rfq_invitations_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_invitations" ADD CONSTRAINT "rfq_invitations_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_invitations" ADD CONSTRAINT "rfq_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_lane_awards" ADD CONSTRAINT "rfq_lane_awards_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_lane_awards" ADD CONSTRAINT "rfq_lane_awards_lane_id_rfq_lanes_id_fk" FOREIGN KEY ("lane_id") REFERENCES "public"."rfq_lanes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_lane_awards" ADD CONSTRAINT "rfq_lane_awards_quote_id_rfq_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."rfq_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_lane_awards" ADD CONSTRAINT "rfq_lane_awards_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_lane_awards" ADD CONSTRAINT "rfq_lane_awards_awarded_by_user_id_users_id_fk" FOREIGN KEY ("awarded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_lane_awards" ADD CONSTRAINT "rfq_lane_awards_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_lanes" ADD CONSTRAINT "rfq_lanes_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_lanes" ADD CONSTRAINT "rfq_lanes_vehicle_type_id_vehicle_types_id_fk" FOREIGN KEY ("vehicle_type_id") REFERENCES "public"."vehicle_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quote_revisions" ADD CONSTRAINT "rfq_quote_revisions_quote_id_rfq_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."rfq_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quote_revisions" ADD CONSTRAINT "rfq_quote_revisions_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_lane_id_rfq_lanes_id_fk" FOREIGN KEY ("lane_id") REFERENCES "public"."rfq_lanes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_transporter_company_id_companies_id_fk" FOREIGN KEY ("transporter_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_customer_company_id_companies_id_fk" FOREIGN KEY ("customer_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_proof_document_id_documents_id_fk" FOREIGN KEY ("proof_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_changes" ADD CONSTRAINT "seat_changes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_changes" ADD CONSTRAINT "seat_changes_subscription_id_company_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."company_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_changes" ADD CONSTRAINT "seat_changes_submission_id_payment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."payment_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_changes" ADD CONSTRAINT "seat_changes_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_company_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."company_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_submission_id_payment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."payment_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_amendments_contract_idx" ON "contract_amendments" USING btree ("contract_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_amendments_one_open_unique" ON "contract_amendments" USING btree ("contract_id") WHERE "contract_amendments"."status" = 'proposed';--> statement-breakpoint
CREATE INDEX "contract_events_contract_idx" ON "contract_events" USING btree ("contract_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_indents_idem_unique" ON "contract_indents" USING btree ("contract_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "contract_indents_contract_idx" ON "contract_indents" USING btree ("contract_id","pickup_date");--> statement-breakpoint
CREATE INDEX "contract_indents_transporter_idx" ON "contract_indents" USING btree ("transporter_company_id","status","pickup_date");--> statement-breakpoint
CREATE INDEX "contract_indents_customer_idx" ON "contract_indents" USING btree ("customer_company_id","status","pickup_date");--> statement-breakpoint
CREATE INDEX "contract_indents_lane_idx" ON "contract_indents" USING btree ("contract_lane_id","pickup_date","status");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_lane_terms_unique" ON "contract_lane_terms" USING btree ("contract_lane_id","version");--> statement-breakpoint
CREATE INDEX "contract_lane_terms_effective_idx" ON "contract_lane_terms" USING btree ("contract_lane_id","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_lanes_unique" ON "contract_lanes" USING btree ("contract_id","rfq_lane_id");--> statement-breakpoint
CREATE INDEX "contract_lanes_contract_idx" ON "contract_lanes" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_rfq_transporter_unique" ON "contracts" USING btree ("rfq_id","transporter_company_id");--> statement-breakpoint
CREATE INDEX "contracts_customer_idx" ON "contracts" USING btree ("customer_company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "contracts_transporter_idx" ON "contracts" USING btree ("transporter_company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "contracts_expiry_idx" ON "contracts" USING btree ("status","valid_to");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_unique_idx" ON "notification_deliveries" USING btree ("notification_id","channel");--> statement-breakpoint
CREATE INDEX "notification_deliveries_due_idx" ON "notification_deliveries" USING btree ("next_attempt_at") WHERE "notification_deliveries"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "rfq_events_rfq_idx" ON "rfq_events" USING btree ("rfq_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_imports_hash_unique" ON "rfq_imports" USING btree ("customer_company_id","content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_invitations_unique" ON "rfq_invitations" USING btree ("rfq_id","transporter_company_id");--> statement-breakpoint
CREATE INDEX "rfq_invitations_transporter_idx" ON "rfq_invitations" USING btree ("transporter_company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_lane_awards_live_unique" ON "rfq_lane_awards" USING btree ("lane_id") WHERE "rfq_lane_awards"."status" IN ('pending', 'accepted');--> statement-breakpoint
CREATE INDEX "rfq_lane_awards_rfq_idx" ON "rfq_lane_awards" USING btree ("rfq_id","transporter_company_id","status");--> statement-breakpoint
CREATE INDEX "rfq_lane_awards_pending_idx" ON "rfq_lane_awards" USING btree ("status","accept_by");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_lanes_no_unique" ON "rfq_lanes" USING btree ("rfq_id","lane_no");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_quote_revisions_unique" ON "rfq_quote_revisions" USING btree ("quote_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "rfq_quotes_unique" ON "rfq_quotes" USING btree ("lane_id","transporter_company_id");--> statement-breakpoint
CREATE INDEX "rfq_quotes_rfq_idx" ON "rfq_quotes" USING btree ("rfq_id","transporter_company_id");--> statement-breakpoint
CREATE INDEX "rfqs_customer_idx" ON "rfqs" USING btree ("customer_company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "rfqs_status_closes_idx" ON "rfqs" USING btree ("status","closes_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_subscriptions_company_idx" ON "company_subscriptions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_subscriptions_clock_idx" ON "company_subscriptions" USING btree ("status","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plans_name_idx" ON "subscription_plans" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "payment_submissions_proof_idx" ON "payment_submissions" USING btree ("proof_document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_submissions_open_idx" ON "payment_submissions" USING btree ("company_id") WHERE "payment_submissions"."status" = 'submitted';--> statement-breakpoint
CREATE INDEX "payment_submissions_company_idx" ON "payment_submissions" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_submissions_review_idx" ON "payment_submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "seat_changes_company_idx" ON "seat_changes" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "subscription_events_company_idx" ON "subscription_events" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_events_approved_once_idx" ON "subscription_events" USING btree ("submission_id") WHERE "subscription_events"."event_type" = 'submission_approved';--> statement-breakpoint
CREATE INDEX "loads_contract_idx" ON "loads" USING btree ("contract_id","contract_indent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_dedupe_idx" ON "notification" USING btree ("recipient_user_id","dedupe_key") WHERE "notification"."dedupe_key" IS NOT NULL;--> statement-breakpoint
DROP TYPE "public"."payment_status";--> statement-breakpoint
-- Data step: existing companies get the contract permission keys (Owner stores none; it holds all).
-- Co-admin and Bid manager: customer -> rfqs.manage + contracts.manage; transporter -> quotes.submit + contracts.respond.
UPDATE "company_roles" r
SET "permissions" = (
    SELECT array_agg(DISTINCT k) FROM unnest(
        r."permissions" || CASE c."company_type"
            WHEN 'customer' THEN ARRAY['rfqs.manage', 'contracts.manage']
            ELSE ARRAY['quotes.submit', 'contracts.respond']
        END
    ) AS k
)
FROM "companies" c
WHERE r."company_id" = c."id"
  AND c."company_type" IN ('customer', 'transporter')
  AND r."name" IN ('Co-admin', 'Bid manager');
--> statement-breakpoint
-- Data step 1: existing Co-admin and Accounts roles get the new billing.manage key (Owner stores none; it holds all).
UPDATE "company_roles"
SET "permissions" = array_append("permissions", 'billing.manage')
WHERE "name" IN ('Co-admin', 'Accounts')
  AND "is_owner" = false
  AND NOT ('billing.manage' = ANY("permissions"));--> statement-breakpoint
-- Data step 2: every company approved before subscriptions existed starts the default trial now
-- (14 days, 3 seats; the same defaults as TRIAL_DAYS / TRIAL_SEATS in subscription.constants.js).
-- Existing users above 3 are kept; only adding more is blocked until a plan is approved.
INSERT INTO "company_subscriptions" ("company_id", "kind", "status", "included_seats", "extra_seats", "starts_at", "ends_at", "grace_ends_at")
SELECT c."id", 'trial', 'active', 3, 0, now(), now() + interval '14 days', now() + interval '21 days'
FROM "companies" c
WHERE c."company_status" = 'approved'
ON CONFLICT ("company_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "seat_changes" ("company_id", "subscription_id", "reason", "included_before", "included_after", "extra_before", "extra_after")
SELECT s."company_id", s."id", 'trial_started', 0, s."included_seats", 0, 0
FROM "company_subscriptions" s;--> statement-breakpoint
INSERT INTO "subscription_events" ("company_id", "subscription_id", "event_type", "details")
SELECT s."company_id", s."id", 'trial_started', jsonb_build_object('source', 'migration_0012', 'endsAt', s."ends_at")
FROM "company_subscriptions" s;
