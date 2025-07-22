ALTER TABLE "experiences" ADD COLUMN "is_featured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "featured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "featured_order" integer;--> statement-breakpoint
CREATE INDEX "idx_experiences_featured" ON "experiences" USING btree ("is_featured","featured_order","featured_at");