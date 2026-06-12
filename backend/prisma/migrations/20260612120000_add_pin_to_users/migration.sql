-- AlterTable
ALTER TABLE "users" ADD COLUMN "pin_hash" TEXT;
ALTER TABLE "users" ADD COLUMN "pin_failed_attempts" INTEGER NOT NULL DEFAULT 0;
