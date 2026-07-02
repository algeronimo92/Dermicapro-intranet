/*
  Warnings:

  - You are about to drop the column `service_template_id` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `service_template_id` on the `service_instances` table. All the data in the column will be lost.
  - You are about to drop the `service_templates` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `service_id` to the `service_instances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_package_id` to the `service_instances` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_service_template_id_fkey";

-- DropForeignKey
ALTER TABLE "service_instances" DROP CONSTRAINT "service_instances_service_template_id_fkey";

-- DropIndex
DROP INDEX "commissions_service_template_id_idx";

-- DropIndex
DROP INDEX "service_instances_service_template_id_idx";

-- AlterTable
ALTER TABLE "commissions" DROP COLUMN "service_template_id",
ADD COLUMN     "service_id" TEXT,
ADD COLUMN     "service_package_id" TEXT;

-- AlterTable
ALTER TABLE "service_instances" DROP COLUMN "service_template_id",
ADD COLUMN     "service_id" TEXT NOT NULL,
ADD COLUMN     "service_package_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "service_templates";

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "commission_type" TEXT DEFAULT 'percentage',
    "commission_rate" DECIMAL(5,4),
    "commission_fixed_amount" DECIMAL(10,2),
    "commission_notes" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_packages" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "commission_type" TEXT,
    "commission_rate" DECIMAL(5,4),
    "commission_fixed_amount" DECIMAL(10,2),

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_deleted_at_name_idx" ON "services"("deleted_at", "name");

-- CreateIndex
CREATE INDEX "services_active_lookup_idx" ON "services"("is_active", "deleted_at", "name");

-- CreateIndex
CREATE INDEX "service_packages_service_lookup_idx" ON "service_packages"("service_id", "is_active", "deleted_at");

-- CreateIndex
CREATE INDEX "commissions_service_id_idx" ON "commissions"("service_id");

-- CreateIndex
CREATE INDEX "commissions_service_package_id_idx" ON "commissions"("service_package_id");

-- CreateIndex
CREATE INDEX "service_instances_service_id_idx" ON "service_instances"("service_id");

-- CreateIndex
CREATE INDEX "service_instances_service_package_id_idx" ON "service_instances"("service_package_id");

-- AddForeignKey
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_instances" ADD CONSTRAINT "service_instances_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_instances" ADD CONSTRAINT "service_instances_service_package_id_fkey" FOREIGN KEY ("service_package_id") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_service_package_id_fkey" FOREIGN KEY ("service_package_id") REFERENCES "service_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
