CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_payment_method_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"type" text NOT NULL,
	"last4" text,
	"brand" text,
	"exp_month" text,
	"exp_year" text,
	"holder_name" text,
	"is_default" boolean DEFAULT false,
	"nickname" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_id_unique" UNIQUE("id"),
	CONSTRAINT "payment_methods_stripe_payment_method_id_unique" UNIQUE("stripe_payment_method_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_payment_methods_user" ON "payment_methods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payment_methods_stripe_pm" ON "payment_methods" USING btree ("stripe_payment_method_id");--> statement-breakpoint
CREATE INDEX "idx_payment_methods_default" ON "payment_methods" USING btree ("user_id","is_default");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id");