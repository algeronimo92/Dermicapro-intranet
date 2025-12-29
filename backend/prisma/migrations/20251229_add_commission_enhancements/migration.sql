-- AlterEnum: Add new commission statuses
ALTER TYPE "CommissionStatus" ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE "CommissionStatus" ADD VALUE IF NOT EXISTS 'rejected';

-- AlterTable: Add commission fields to Service
ALTER TABLE "services"
ADD COLUMN IF NOT EXISTS "commission_rate" DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS "commission_notes" TEXT;

-- AlterTable: Enhance Commission table
ALTER TABLE "commissions"
ADD COLUMN IF NOT EXISTS "order_id" TEXT,
ADD COLUMN IF NOT EXISTS "service_id" TEXT,
ADD COLUMN IF NOT EXISTS "base_amount" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "approved_by_id" TEXT,
ADD COLUMN IF NOT EXISTS "paid_by_id" TEXT,
ADD COLUMN IF NOT EXISTS "payment_method" "PaymentMethod",
ADD COLUMN IF NOT EXISTS "payment_reference" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "commissions_sales_person_id_idx" ON "commissions"("sales_person_id");
CREATE INDEX IF NOT EXISTS "commissions_appointment_id_idx" ON "commissions"("appointment_id");
CREATE INDEX IF NOT EXISTS "commissions_order_id_idx" ON "commissions"("order_id");
CREATE INDEX IF NOT EXISTS "commissions_service_id_idx" ON "commissions"("service_id");
CREATE INDEX IF NOT EXISTS "commissions_status_idx" ON "commissions"("status");
CREATE INDEX IF NOT EXISTS "commissions_created_at_idx" ON "commissions"("created_at");

-- AddForeignKey
ALTER TABLE "commissions"
ADD CONSTRAINT "commissions_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commissions"
ADD CONSTRAINT "commissions_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commissions"
ADD CONSTRAINT "commissions_approved_by_id_fkey"
FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "commissions"
ADD CONSTRAINT "commissions_paid_by_id_fkey"
FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrar datos existentes: Agregar base_amount a comisiones existentes
UPDATE "commissions"
SET "base_amount" = "commission_amount" / NULLIF("commission_rate", 0)
WHERE "base_amount" IS NULL AND "commission_rate" > 0;

-- Para comisiones sin base_amount, usar commission_amount como base
UPDATE "commissions"
SET "base_amount" = "commission_amount"
WHERE "base_amount" IS NULL;
