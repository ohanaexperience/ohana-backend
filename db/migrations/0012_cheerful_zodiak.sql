ALTER TABLE "experience_availability" ADD COLUMN "id" uuid PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_availability" ADD COLUMN "experience_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_time_slots" ADD COLUMN "id" uuid PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_time_slots" ADD COLUMN "experience_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_time_slots" ADD COLUMN "availability_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "id" uuid PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "host_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "experience_availability" ADD CONSTRAINT "experience_availability_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_time_slots" ADD CONSTRAINT "experience_time_slots_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experience_time_slots" ADD CONSTRAINT "experience_time_slots_availability_id_experience_availability_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."experience_availability"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_host_id_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_time_slots_experience_datetime" ON "experience_time_slots" USING btree ("experience_id","slot_datetime");--> statement-breakpoint
CREATE INDEX "idx_time_slots_local_date" ON "experience_time_slots" USING btree ("local_date");--> statement-breakpoint
CREATE INDEX "idx_time_slots_status" ON "experience_time_slots" USING btree ("status");--> statement-breakpoint
ALTER TABLE "experience_availability" ADD CONSTRAINT "experience_availability_id_unique" UNIQUE("id");--> statement-breakpoint
ALTER TABLE "experience_time_slots" ADD CONSTRAINT "experience_time_slots_id_unique" UNIQUE("id");--> statement-breakpoint
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_id_unique" UNIQUE("id");