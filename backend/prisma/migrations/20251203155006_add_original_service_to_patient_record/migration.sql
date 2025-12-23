-- AlterTable
ALTER TABLE "patient_records" ADD COLUMN     "original_service_id" TEXT;

-- AddForeignKey
ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_original_service_id_fkey" FOREIGN KEY ("original_service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
