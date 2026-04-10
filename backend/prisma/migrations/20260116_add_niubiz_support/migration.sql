-- Migration: Add Niubiz support for recurring payments
-- This migration adds fields needed to process recurring payments with Niubiz
-- since Niubiz doesn't handle recurrence automatically like Stripe

-- Add Niubiz card token fields to patients
ALTER TABLE "patients" ADD COLUMN "niubiz_card_token" TEXT;
ALTER TABLE "patients" ADD COLUMN "niubiz_card_brand" TEXT;
ALTER TABLE "patients" ADD COLUMN "niubiz_card_last_four" TEXT;
ALTER TABLE "patients" ADD COLUMN "niubiz_card_expiry_month" INTEGER;
ALTER TABLE "patients" ADD COLUMN "niubiz_card_expiry_year" INTEGER;

-- Add Niubiz fields to subscriptions for manual recurrence
ALTER TABLE "subscriptions" ADD COLUMN "payment_gateway" TEXT NOT NULL DEFAULT 'niubiz';
ALTER TABLE "subscriptions" ADD COLUMN "niubiz_last_transaction_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN "niubiz_last_payment_date" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN "niubiz_next_payment_date" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN "niubiz_retry_count" INTEGER NOT NULL DEFAULT 0;

-- Create index for cron job to efficiently find subscriptions due for payment
CREATE INDEX "subscriptions_niubiz_next_payment_date_idx" ON "subscriptions"("niubiz_next_payment_date");

-- Add Niubiz fields to subscription_invoices
-- Make stripe_invoice_id nullable since we now support Niubiz
ALTER TABLE "subscription_invoices" ALTER COLUMN "stripe_invoice_id" DROP NOT NULL;
ALTER TABLE "subscription_invoices" ADD COLUMN "niubiz_transaction_id" TEXT;
ALTER TABLE "subscription_invoices" ADD COLUMN "niubiz_auth_code" TEXT;
ALTER TABLE "subscription_invoices" ADD COLUMN "niubiz_trace_number" TEXT;
ALTER TABLE "subscription_invoices" ADD COLUMN "error_code" TEXT;
ALTER TABLE "subscription_invoices" ADD COLUMN "error_message" TEXT;

-- Create unique index for niubiz_transaction_id
CREATE UNIQUE INDEX "subscription_invoices_niubiz_transaction_id_key" ON "subscription_invoices"("niubiz_transaction_id");
