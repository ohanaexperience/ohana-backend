CREATE TABLE "experience_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"days_of_week" integer[] NOT NULL,
	"time_slots" text[] NOT NULL,
	"max_capacity" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "experience_time_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" integer NOT NULL,
	"availability_id" integer NOT NULL,
	"slot_datetime" timestamp with time zone NOT NULL,
	"local_date" timestamp NOT NULL,
	"local_time" text NOT NULL,
	"max_capacity" integer NOT NULL,
	"booked_count" integer DEFAULT 0,
	"status" text DEFAULT 'available',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "timezone" text NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_availability" ADD CONSTRAINT "experience_availability_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_time_slots" ADD CONSTRAINT "experience_time_slots_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_time_slots" ADD CONSTRAINT "experience_time_slots_availability_id_experience_availability_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."experience_availability"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_time_slots_experience_datetime" ON "experience_time_slots" USING btree ("experience_id","slot_datetime");--> statement-breakpoint
CREATE INDEX "idx_time_slots_local_date" ON "experience_time_slots" USING btree ("local_date");--> statement-breakpoint
CREATE INDEX "idx_time_slots_status" ON "experience_time_slots" USING btree ("status");