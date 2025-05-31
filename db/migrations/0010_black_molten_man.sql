CREATE TYPE "public"."age_range" AS ENUM('18-25', '26-35', '36-45', '46-55', '56-65', '66+');--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "age_range" "age_range" NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "accessibility_info" text;--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "age_recommendations";