ALTER TYPE "public"."reservation_status" ADD VALUE 'held' BEFORE 'pending';--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"payment_intent_id" text NOT NULL,
	"charge_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"application_fee_amount" integer,
	"status" text NOT NULL,
	"captured_at" timestamp with time zone,
	"refunded_amount" integer DEFAULT 0,
	"refund_reason" text,
	"last_refund_id" text,
	"stripe_customer_id" text,
	"payment_method_id" text,
	"payment_method_type" text,
	"last4" text,
	"brand" text,
	"last_error_code" text,
	"last_error_message" text,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_id_unique" UNIQUE("id"),
	CONSTRAINT "payments_payment_intent_id_unique" UNIQUE("payment_intent_id"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "reservation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb NOT NULL,
	"user_id" text,
	"source" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_events_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "hold_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_events" ADD CONSTRAINT "reservation_events_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_payments_reservation" ON "payments" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_payment_intent" ON "payments" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_reservation_events_reservation" ON "reservation_events" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "idx_reservation_events_type" ON "reservation_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_reservation_events_created" ON "reservation_events" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_idempotency_key_unique" UNIQUE("idempotency_key");