-- ============================================================
-- CONSOLIDATED MIGRATION: All 20260506 changes in correct order
-- ============================================================

-- 1. Drop subscription tables
DROP TABLE IF EXISTS "subscription_invoices" CASCADE;
DROP TABLE IF EXISTS "subscriptions" CASCADE;
DROP TABLE IF EXISTS "subscription_plans" CASCADE;

-- 2. Drop stripe/niubiz columns from patients
ALTER TABLE "patients"
  DROP COLUMN IF EXISTS "stripe_customer_id",
  DROP COLUMN IF EXISTS "niubiz_card_token",
  DROP COLUMN IF EXISTS "niubiz_card_brand",
  DROP COLUMN IF EXISTS "niubiz_card_last_four",
  DROP COLUMN IF EXISTS "niubiz_card_expiry_month",
  DROP COLUMN IF EXISTS "niubiz_card_expiry_year";

-- 3. Drop original_service_id from patient_records
ALTER TABLE "patient_records" DROP COLUMN IF EXISTS "original_service_id";

-- 4. Update PaymentType enum (remove subscription_payment)
ALTER TYPE "PaymentType" RENAME TO "PaymentType_old";
CREATE TYPE "PaymentType" AS ENUM ('invoice_payment', 'reservation', 'service_payment', 'account_credit', 'penalty', 'other');
ALTER TABLE "payments" ALTER COLUMN "payment_type" TYPE "PaymentType" USING "payment_type"::text::"PaymentType";
DROP TYPE "PaymentType_old";

-- 5. Drop subscription enums
DROP TYPE IF EXISTS "SubscriptionStatus";
DROP TYPE IF EXISTS "SubscriptionPlanTier";

-- 6. Drop roles/permissions tables and FK
DROP TABLE IF EXISTS "role_permissions" CASCADE;
DROP TABLE IF EXISTS "permissions" CASCADE;
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_id_fkey";
DROP TABLE IF EXISTS "system_roles" CASCADE;

-- 7. Rename tables
ALTER TABLE "services" RENAME TO "service_templates";
ALTER TABLE "orders" RENAME TO "service_instances";
ALTER TABLE "appointment_services" RENAME TO "sessions";

-- 8. Rename FK columns
ALTER TABLE "service_instances" RENAME COLUMN "service_id" TO "service_template_id";
ALTER TABLE "commissions" RENAME COLUMN "order_id" TO "service_instance_id";
ALTER TABLE "commissions" RENAME COLUMN "service_id" TO "service_template_id";
ALTER TABLE "sessions" RENAME COLUMN "order_id" TO "service_instance_id";

-- 9. Create roles table
CREATE TABLE "roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- 10. Add FK from users to roles
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON UPDATE CASCADE ON DELETE SET NULL;
