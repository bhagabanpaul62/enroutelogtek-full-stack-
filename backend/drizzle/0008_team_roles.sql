CREATE TABLE "company_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"description" varchar(255),
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "team_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" varchar(40) NOT NULL,
	"target_user_id" uuid,
	"target_role_id" uuid,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_events" ADD CONSTRAINT "team_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_events" ADD CONSTRAINT "team_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_events" ADD CONSTRAINT "team_events_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_roles_company_name_idx" ON "company_roles" USING btree ("company_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "company_roles_one_owner_idx" ON "company_roles" USING btree ("company_id") WHERE "company_roles"."is_owner" = true;--> statement-breakpoint
CREATE INDEX "company_roles_company_idx" ON "company_roles" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "team_events_company_idx" ON "team_events" USING btree ("company_id","created_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_company_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."company_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_company_created_idx" ON "users" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
-- Preset roles for every existing company. Same names, descriptions and permissions as
-- PRESET_ROLES in src/features/team/team.permissions.js on 11 Nov 2026, so nobody's access
-- changes. The Owner stores no permissions: it always holds all of them. Safe to re-run.
WITH presets ("name", "description", "is_owner", "customer_permissions", "transporter_permissions", "other_permissions", "sort") AS (
    VALUES
        ('Owner', 'Runs the company account. Always has every permission.', true,
            '{}'::text[], '{}'::text[], '{}'::text[], 1),
        ('Co-admin', 'Helps run the account: everything except changing an Owner.', false,
            '{loads.manage,loads.award,network.manage,team.manage,roles.manage}'::text[],
            '{bids.submit,awards.respond,trips.assign,network.manage,team.manage,roles.manage}'::text[],
            '{network.manage,team.manage,roles.manage}'::text[], 2),
        ('Bid manager', 'Runs loads and bids day to day.', false,
            '{loads.manage,loads.award}'::text[],
            '{bids.submit,awards.respond,trips.assign}'::text[],
            '{}'::text[], 3),
        ('Trip manager', 'Follows trips. Read-only until you add permissions.', false,
            '{}'::text[], '{}'::text[], '{}'::text[], 4),
        ('Viewer', 'Can look at everything and change nothing.', false,
            '{}'::text[], '{}'::text[], '{}'::text[], 5),
        ('Accounts', 'Billing and finance. Read-only until you add permissions.', false,
            '{}'::text[], '{}'::text[], '{}'::text[], 6)
)
INSERT INTO "company_roles" ("company_id", "name", "description", "permissions", "is_owner", "created_at")
SELECT
    c."id",
    p."name",
    p."description",
    CASE c."company_type"
        WHEN 'customer' THEN p."customer_permissions"
        WHEN 'transporter' THEN p."transporter_permissions"
        ELSE p."other_permissions"
    END,
    p."is_owner",
    -- Spaced by a millisecond so the role list keeps the preset order.
    now() + (p."sort" * interval '1 millisecond')
FROM "companies" c
CROSS JOIN presets p
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Every company user gets the preset that replaces their old fixed role.
UPDATE "users" u
SET "role_id" = r."id"
FROM "company_roles" r
WHERE u."role_id" IS NULL
  AND u."company_id" = r."company_id"
  AND r."name" = CASE u."user_role"
        WHEN 'admin' THEN 'Owner'
        WHEN 'co-admin' THEN 'Co-admin'
        WHEN 'bid_manager' THEN 'Bid manager'
        WHEN 'trip_manager' THEN 'Trip manager'
        WHEN 'viewer' THEN 'Viewer'
        WHEN 'accounts' THEN 'Accounts'
    END;
