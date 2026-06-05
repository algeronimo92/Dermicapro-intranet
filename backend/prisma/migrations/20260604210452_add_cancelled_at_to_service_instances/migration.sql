-- AlterTable
ALTER TABLE "service_instances" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "service_instances" ADD CONSTRAINT "service_instances_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
