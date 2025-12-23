/*
  Warnings:

  - You are about to drop the column `service_id` on the `appointment_services` table. All the data in the column will be lost.
  - Made the column `order_id` on table `appointment_services` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "appointment_services" DROP CONSTRAINT "appointment_services_order_id_fkey";

-- DropForeignKey
ALTER TABLE "appointment_services" DROP CONSTRAINT "appointment_services_service_id_fkey";

-- AlterTable
ALTER TABLE "appointment_services" DROP COLUMN "service_id",
ALTER COLUMN "order_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "appointment_services" ADD CONSTRAINT "appointment_services_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
