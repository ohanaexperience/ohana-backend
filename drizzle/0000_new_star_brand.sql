CREATE TYPE "public"."age_recommendation" AS ENUM('18-25', '26-35', '36-45', '46-55', '56-65', '66+');--> statement-breakpoint
CREATE TYPE "public"."experience_cancellation_policy" AS ENUM('strict', 'moderate', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."experience_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."experience_type" AS ENUM('indoor', 'outdoor', 'both');--> statement-breakpoint
CREATE TYPE "public"."host_verification_provider" AS ENUM('stripe_identity');--> statement-breakpoint
CREATE TYPE "public"."host_verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_auth_provider" AS ENUM('google', 'apple', 'email');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed', 'refunded');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sub_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "sub_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "experience_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"days_of_week" integer[],
	"time_slots" text[] NOT NULL,
	"max_capacity" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "experience_availability_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "experience_guest_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"icon" jsonb NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "experience_guest_requirements_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "experience_included_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"icon" jsonb NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "experience_included_items_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "experience_time_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"availability_id" uuid NOT NULL,
	"slot_datetime" timestamp with time zone NOT NULL,
	"local_date" timestamp NOT NULL,
	"local_time" text NOT NULL,
	"max_capacity" integer NOT NULL,
	"booked_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'available',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "experience_time_slots_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"title" text NOT NULL,
	"tagline" text NOT NULL,
	"category_id" integer NOT NULL,
	"sub_category_id" integer NOT NULL,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"experience_type" "experience_type" NOT NULL,
	"description" text NOT NULL,
	"starting_location_address" text NOT NULL,
	"starting_location" "point" NOT NULL,
	"ending_location_address" text NOT NULL,
	"ending_location" "point" NOT NULL,
	"meeting_location_instructions" text NOT NULL,
	"meeting_location_image" jsonb,
	"price_per_person" integer NOT NULL,
	"group_discounts_enabled" boolean DEFAULT false,
	"discount_percentage_for_3_plus" integer,
	"discount_percentage_for_5_plus" integer,
	"early_bird_enabled" boolean DEFAULT false,
	"early_bird_discount_percentage" integer,
	"early_bird_days_in_advance" integer,
	"cancellation_policy" "experience_cancellation_policy" NOT NULL,
	"min_guests" integer NOT NULL,
	"max_guests" integer NOT NULL,
	"auto_cancel_enabled" boolean DEFAULT false,
	"auto_cancel_hours" integer,
	"cover_image" jsonb,
	"gallery_images" jsonb,
	"physical_requirements" text,
	"age_recommendation" "age_recommendation",
	"duration_hours" integer NOT NULL,
	"timezone" text NOT NULL,
	"status" "experience_status" DEFAULT 'draft',
	"is_public" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "experiences_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "host_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "host_verification_provider" DEFAULT 'stripe_identity',
	"provider_data" jsonb,
	"status" "host_verification_status" DEFAULT 'pending',
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "host_verifications_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "hosts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bio" text,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"socials" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "hosts_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"auth_provider" "user_auth_provider" DEFAULT 'email' NOT NULL,
	"email" text,
	"phone_number" text,
	"first_name" text,
	"last_name" text,
	"profile_image" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
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
CREATE TABLE "verification_codes" (
	"phone_number" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_availability" ADD CONSTRAINT "experience_availability_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_guest_requirements" ADD CONSTRAINT "experience_guest_requirements_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_included_items" ADD CONSTRAINT "experience_included_items_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_time_slots" ADD CONSTRAINT "experience_time_slots_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_time_slots" ADD CONSTRAINT "experience_time_slots_availability_id_experience_availability_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."experience_availability"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_host_id_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_sub_category_id_sub_categories_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_verifications" ADD CONSTRAINT "host_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hosts" ADD CONSTRAINT "hosts_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_time_slot_id_experience_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."experience_time_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_time_slots_experience_datetime" ON "experience_time_slots" USING btree ("experience_id","slot_datetime");--> statement-breakpoint
CREATE INDEX "idx_time_slots_local_date" ON "experience_time_slots" USING btree ("local_date");--> statement-breakpoint
CREATE INDEX "idx_time_slots_status" ON "experience_time_slots" USING btree ("status");