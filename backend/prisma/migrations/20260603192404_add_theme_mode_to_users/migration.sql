/*
  Warnings:

  - Made the column `base_amount` on table `commissions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_by_id` on table `invoices` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "commissions_appointment_id_idx";

-- DropIndex
DROP INDEX "commissions_created_at_idx";

-- DropIndex
DROP INDEX "commissions_order_id_idx";

-- DropIndex
DROP INDEX "commissions_sales_person_id_idx";

-- DropIndex
DROP INDEX "commissions_service_id_idx";

-- DropIndex
DROP INDEX "commissions_status_idx";

-- AlterTable
ALTER TABLE "commissions" ALTER COLUMN "base_amount" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "created_by_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "service_instances" RENAME CONSTRAINT "orders_pkey" TO "service_instances_pkey";

-- AlterTable
ALTER TABLE "service_templates" RENAME CONSTRAINT "services_pkey" TO "service_templates_pkey";

-- AlterTable
ALTER TABLE "sessions" RENAME CONSTRAINT "appointment_services_pkey" TO "sessions_pkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "theme_mode" TEXT NOT NULL DEFAULT 'auto';

-- RenameForeignKey
ALTER TABLE "commissions" RENAME CONSTRAINT "commissions_order_id_fkey" TO "commissions_service_instance_id_fkey";

-- RenameForeignKey
ALTER TABLE "commissions" RENAME CONSTRAINT "commissions_service_id_fkey" TO "commissions_service_template_id_fkey";

-- RenameForeignKey
ALTER TABLE "service_instances" RENAME CONSTRAINT "orders_created_by_id_fkey" TO "service_instances_created_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "service_instances" RENAME CONSTRAINT "orders_invoice_id_fkey" TO "service_instances_invoice_id_fkey";

-- RenameForeignKey
ALTER TABLE "service_instances" RENAME CONSTRAINT "orders_patient_id_fkey" TO "service_instances_patient_id_fkey";

-- RenameForeignKey
ALTER TABLE "service_instances" RENAME CONSTRAINT "orders_service_id_fkey" TO "service_instances_service_template_id_fkey";

-- RenameForeignKey
ALTER TABLE "sessions" RENAME CONSTRAINT "appointment_services_appointment_id_fkey" TO "sessions_appointment_id_fkey";

-- RenameForeignKey
ALTER TABLE "sessions" RENAME CONSTRAINT "appointment_services_deleted_by_id_fkey" TO "sessions_deleted_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "sessions" RENAME CONSTRAINT "appointment_services_order_id_fkey" TO "sessions_service_instance_id_fkey";
