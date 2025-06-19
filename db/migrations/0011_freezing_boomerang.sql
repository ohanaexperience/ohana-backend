-- ALTER TABLE "experience_availability" DROP CONSTRAINT "experience_availability_id_unique";--> statement-breakpoint
-- ALTER TABLE "experience_time_slots" DROP CONSTRAINT "experience_time_slots_id_unique";--> statement-breakpoint
-- ALTER TABLE "experiences" DROP CONSTRAINT "experiences_id_unique";--> statement-breakpoint
ALTER TABLE "experience_availability" DROP CONSTRAINT "experience_availability_experience_id_experiences_id_fk";
--> statement-breakpoint
ALTER TABLE "experience_time_slots" DROP CONSTRAINT "experience_time_slots_experience_id_experiences_id_fk";
--> statement-breakpoint
ALTER TABLE "experience_time_slots" DROP CONSTRAINT "experience_time_slots_availability_id_experience_availability_id_fk";
--> statement-breakpoint
ALTER TABLE "experiences" DROP CONSTRAINT "experiences_host_id_hosts_id_fk";
--> statement-breakpoint
DROP INDEX "idx_time_slots_experience_datetime";--> statement-breakpoint
DROP INDEX "idx_time_slots_local_date";--> statement-breakpoint
DROP INDEX "idx_time_slots_status";--> statement-breakpoint
ALTER TABLE "experience_availability" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "experience_availability" DROP COLUMN "experience_id";--> statement-breakpoint
ALTER TABLE "experience_time_slots" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "experience_time_slots" DROP COLUMN "experience_id";--> statement-breakpoint
ALTER TABLE "experience_time_slots" DROP COLUMN "availability_id";--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "experiences" DROP COLUMN "host_id";