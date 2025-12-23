/*
  Warnings:

  - You are about to drop the column `order_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `service_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `session_number` on the `appointments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_order_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_service_id_fkey";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "order_id",
DROP COLUMN "service_id",
DROP COLUMN "session_number";
