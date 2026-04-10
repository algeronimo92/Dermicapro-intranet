-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');

-- CreateEnum
CREATE TYPE "SubscriptionPlanTier" AS ENUM ('regular', 'pro');

-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'subscription_payment';

-- AlterTable
ALTER TABLE "patients" ADD COLUMN "stripe_customer_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "patients_stripe_customer_id_key" ON "patients"("stripe_customer_id");

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "tier" "SubscriptionPlanTier" NOT NULL DEFAULT 'regular',
    "price_amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "billingInterval" TEXT NOT NULL DEFAULT 'month',
    "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "included_sessions" INTEGER NOT NULL DEFAULT 0,
    "priority_booking" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB,
    "stripe_product_id" TEXT,
    "stripe_price_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'incomplete',
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancellation_reason" TEXT,
    "sessions_used_this_period" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_invoices" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "stripe_invoice_id" TEXT NOT NULL,
    "amount_due" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "status" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "hosted_invoice_url" TEXT,
    "invoice_pdf_url" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_stripe_product_id_key" ON "subscription_plans"("stripe_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_stripe_price_id_key" ON "subscription_plans"("stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_subscription_id_idx" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_patient_id_idx" ON "subscriptions"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_stripe_invoice_id_key" ON "subscription_invoices"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "subscription_invoices_subscription_id_idx" ON "subscription_invoices"("subscription_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
