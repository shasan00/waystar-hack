CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "bill_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "page_id" uuid;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "payer_email" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "payer_name" text;--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_stripe_event_idx" ON "webhook_events" USING btree ("stripe_event_id");--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_page_id_payment_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."payment_pages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plans_page_idx" ON "plans" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_stripe_sub_idx" ON "plans" USING btree ("stripe_subscription_id");