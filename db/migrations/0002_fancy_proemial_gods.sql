ALTER TABLE "hosts" ADD COLUMN "socials" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "hosts" DROP COLUMN "languages";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "bio";