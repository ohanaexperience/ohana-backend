ALTER TABLE "users" RENAME COLUMN "profile_image_url" TO "profile_image";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_profile_image_url_unique";