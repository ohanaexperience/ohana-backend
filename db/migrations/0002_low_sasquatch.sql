ALTER TABLE "experiences" ADD COLUMN "meeting_location" jsonb;--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "meeting_instructions";--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "meeting_location_image_url";