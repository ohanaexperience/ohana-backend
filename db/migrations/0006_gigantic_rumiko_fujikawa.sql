ALTER TABLE "experiences" ADD COLUMN "duration_hours" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "is_public" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "availability";