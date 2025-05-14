CREATE TYPE "public"."experience_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."host_verification_provider" AS ENUM('stripe_identity');--> statement-breakpoint
CREATE TYPE "public"."host_verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_auth_provider" AS ENUM('google', 'apple', 'email');--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"duration" integer NOT NULL,
	"max_guests" integer NOT NULL,
	"status" "experience_status" DEFAULT 'draft',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hosts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bio" text NOT NULL,
	"languages" text[],
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
	"provider_verification_id" text,
	"session_client_secret" text NOT NULL,
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
	"bio" text,
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