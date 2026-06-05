-- AlterTable
ALTER TABLE "ordenes_de_pago" RENAME CONSTRAINT "invoices_pkey" TO "ordenes_de_pago_pkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "photo_url" TEXT;

-- RenameForeignKey
ALTER TABLE "ordenes_de_pago" RENAME CONSTRAINT "invoices_created_by_id_fkey" TO "ordenes_de_pago_created_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "ordenes_de_pago" RENAME CONSTRAINT "invoices_patient_id_fkey" TO "ordenes_de_pago_patient_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_invoice_id_fkey" TO "payments_payment_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "service_instances" RENAME CONSTRAINT "service_instances_invoice_id_fkey" TO "service_instances_payment_order_id_fkey";
