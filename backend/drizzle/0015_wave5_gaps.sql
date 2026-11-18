ALTER TABLE "drivers" ADD COLUMN "hazmat_endorsement" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "placement_misses" ADD COLUMN "source" varchar(16) DEFAULT 'late' NOT NULL;--> statement-breakpoint
ALTER TABLE "placement_misses" ADD COLUMN "reason" varchar(300);--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "received_by_name" varchar(150);--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "received_by_phone" varchar(15);--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "received_at" timestamp;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "gst_treatment" varchar(10);