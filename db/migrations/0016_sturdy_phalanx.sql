CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'refunded');--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"experience_id" uuid NOT NULL,
	"time_slot_id" uuid NOT NULL,
	"number_of_guests" integer NOT NULL,
	"total_price" integer NOT NULL,
	"original_price" integer NOT NULL,
	"discount_applied" integer DEFAULT 0,
	"discount_type" text,
	"status" "reservation_status" DEFAULT 'confirmed',
	"reservation_reference" text NOT NULL,
	"guest_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"guest_phone" text,
	"special_requests" text,
	"payment_intent_id" text,
	"payment_status" text DEFAULT 'pending',
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"refund_amount" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_id_unique" UNIQUE("id"),
	CONSTRAINT "reservations_reservation_reference_unique" UNIQUE("reservation_reference")
);
--> statement-breakpoint
ALTER TABLE "experience_time_slots" ALTER COLUMN "booked_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_time_slot_id_experience_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."experience_time_slots"("id") ON DELETE no action ON UPDATE no action;