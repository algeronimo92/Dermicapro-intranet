/*
  Warnings:

  - You are about to drop the column `cancel_reason` on the `service_instances` table. All the data in the column will be lost.
  - You are about to drop the column `cancelled_at` on the `service_instances` table. All the data in the column will be lost.
  - You are about to drop the column `cancelled_by_id` on the `service_instances` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "service_instances" DROP CONSTRAINT "service_instances_cancelled_by_id_fkey";

-- AlterTable
ALTER TABLE "service_instances" DROP COLUMN "cancel_reason",
DROP COLUMN "cancelled_at",
DROP COLUMN "cancelled_by_id",
ADD COLUMN     "conclude_reason" TEXT,
ADD COLUMN     "concluded_at" TIMESTAMP(3),
ADD COLUMN     "concluded_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "service_instances" ADD CONSTRAINT "service_instances_concluded_by_id_fkey" FOREIGN KEY ("concluded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
