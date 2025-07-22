CREATE TYPE "public"."collection_type" AS ENUM('featured', 'top_picks', 'near_you', 'trending', 'new_arrivals', 'seasonal', 'editor_choice', 'best_sellers', 'custom');--> statement-breakpoint
CREATE TABLE "experience_collection_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection_id" integer NOT NULL,
	"experience_id" uuid NOT NULL,
	"position" integer DEFAULT 0,
	"score" integer,
	"added_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "experience_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "collection_type" NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_public" boolean DEFAULT true,
	"metadata" jsonb,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "experience_collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DROP INDEX "idx_experiences_featured";--> statement-breakpoint
ALTER TABLE "experience_collection_items" ADD CONSTRAINT "experience_collection_items_collection_id_experience_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."experience_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_collection_items" ADD CONSTRAINT "experience_collection_items_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_collection_experience_unique" ON "experience_collection_items" USING btree ("collection_id","experience_id");--> statement-breakpoint
CREATE INDEX "idx_collection_items_position" ON "experience_collection_items" USING btree ("collection_id","position");--> statement-breakpoint
CREATE INDEX "idx_collection_items_expires" ON "experience_collection_items" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_collections_type" ON "experience_collections" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_collections_active" ON "experience_collections" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "is_featured";--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "featured_at";--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "featured_order";