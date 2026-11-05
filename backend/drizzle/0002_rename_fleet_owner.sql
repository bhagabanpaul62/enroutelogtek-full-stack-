-- Fix the "flee_owner" typo. RENAME VALUE keeps every existing row; nothing is rewritten.
ALTER TYPE "public"."company_type" RENAME VALUE 'flee_owner' TO 'fleet_owner';
