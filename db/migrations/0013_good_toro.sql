ALTER TABLE "experience_availability" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "experience_time_slots" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "experiences" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();