CREATE TYPE "public"."document_review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "company_document_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"status" "document_review_status" DEFAULT 'pending' NOT NULL,
	"expires_on" date,
	"replaced_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_document_reviews_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
ALTER TABLE "branch" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "branch" ADD COLUMN "deactivated_at" timestamp;--> statement-breakpoint
ALTER TABLE "company_document_reviews" ADD CONSTRAINT "company_document_reviews_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_document_reviews" ADD CONSTRAINT "company_document_reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_document_reviews" ADD CONSTRAINT "company_document_reviews_replaced_by_users_id_fk" FOREIGN KEY ("replaced_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;