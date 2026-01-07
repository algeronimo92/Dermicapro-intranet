-- AlterTable: Add commission_type and commission_fixed_amount to services table
ALTER TABLE "services"
ADD COLUMN IF NOT EXISTS "commission_type" TEXT DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS "commission_fixed_amount" DECIMAL(10,2);
