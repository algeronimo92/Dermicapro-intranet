-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'account_credit';

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "account_balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
