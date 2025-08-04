CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_duration_ms" integer,
	"event_data" jsonb,
	"error_message" text,
	"error_code" text,
	"retry_count" integer DEFAULT 0,
	"webhook_endpoint" text,
	"api_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_id_unique" UNIQUE("id"),
	CONSTRAINT "webhook_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_webhook_events_stripe_id" ON "webhook_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_type" ON "webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_processed" ON "webhook_events" USING btree ("processed_at");