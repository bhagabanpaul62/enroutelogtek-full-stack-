CREATE TYPE "public"."delivery_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_kind" AS ENUM('trial', 'paid');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending_payment', 'active', 'grace', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."submission_purpose" AS ENUM('new', 'renewal', 'extra_seats');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('submitted', 'approved', 'rejected');--> statement-breakpoint
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
ALTER TABLE "company_subscription" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription_plan" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "company_subscription" CASCADE;--> statement-breakpoint
DROP TABLE "subscription_plan" CASCADE;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "dedupe_key" varchar(200);--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE UNIQUE INDEX "notification_deliveries_unique_idx" ON "notification_deliveries" USING btree ("notification_id","channel");--> statement-breakpoint
CREATE INDEX "notification_deliveries_due_idx" ON "notification_deliveries" USING btree ("next_attempt_at") WHERE "notification_deliveries"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries" USING btree ("status","created_at");--> statement-breakpoint
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
CREATE UNIQUE INDEX "notification_dedupe_idx" ON "notification" USING btree ("recipient_user_id","dedupe_key") WHERE "notification"."dedupe_key" IS NOT NULL;--> statement-breakpoint
DROP TYPE "public"."payment_status";

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
