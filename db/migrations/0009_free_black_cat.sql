ALTER TABLE "experiences" ADD COLUMN "group_discounts_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "discount_percentage_for_3_plus" integer;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "discount_percentage_for_5_plus" integer;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "early_bird_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "early_bird_discount_percentage" integer;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "early_bird_days_in_advance" integer;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "min_guests" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "max_guests" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "auto_cancel_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "auto_cancel_hours" integer;--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "group_size";