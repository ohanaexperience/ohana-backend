CREATE TYPE "public"."experience_cancellation_policy" AS ENUM('strict', 'moderate', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."experience_duration" AS ENUM('1-2 hours', '2-3 hours', '3-4 hours', '4-5 hours', '5-6 hours');--> statement-breakpoint
CREATE TYPE IF NOT EXISTS "public"."experience_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."experience_type" AS ENUM('indoor', 'outdoor', 'both');--> statement-breakpoint
CREATE TYPE "public"."experience_included_items" AS ENUM('food', 'drinks', 'transport', 'equipment');--> statement-breakpoint
CREATE TYPE "public"."experience_physical_requirements" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."host_verification_provider" AS ENUM('stripe_identity');--> statement-breakpoint
CREATE TYPE "public"."host_verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_auth_provider" AS ENUM('google', 'apple', 'email');--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_id" uuid NOT NULL,
	"title" text NOT NULL,
	"tagline" text NOT NULL,
	"category" jsonb NOT NULL,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"experience_type" "experience_type" NOT NULL,
	"description" text NOT NULL,
	"starting_location_address" text NOT NULL,
	"starting_location" "point" NOT NULL,
	"ending_location_address" text NOT NULL,
	"ending_location" "point" NOT NULL,
	"meeting_instructions" text NOT NULL,
	"meeting_location_image_url" text,
	"price_per_person" integer NOT NULL,
	"group_discounts" jsonb DEFAULT '{"enabled":false,"discountFor3Plus":null,"discountFor5Plus":null}'::jsonb,
	"early_bird_rate" jsonb DEFAULT '{"enabled":false,"discountPercentage":null,"daysInAdvance":null}'::jsonb,
	"cancellation_policy" "experience_cancellation_policy" NOT NULL,
	"group_size" jsonb,
	"cover_image_url" text NOT NULL,
	"gallery_image_urls" text[] DEFAULT '{}' NOT NULL,
	"included_items" "experience_included_items"[] DEFAULT '{}' NOT NULL,
	"what_to_bring" text NOT NULL,
	"physical_requirements" "experience_physical_requirements" NOT NULL,
	"age_recommendations" jsonb,
	"experience_duration" "experience_duration" NOT NULL,
	"availability" jsonb,
	"status" "experience_status" DEFAULT 'draft',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"auth_provider" "user_auth_provider" DEFAULT 'email' NOT NULL,
	"email" text,
	"phone_number" text,
	"first_name" text,
	"last_name" text,
	"profile_image_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number"),
	CONSTRAINT "users_profile_image_url_unique" UNIQUE("profile_image_url")
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
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_host_id_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hosts" ADD CONSTRAINT "hosts_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_verifications" ADD CONSTRAINT "host_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;