-- AlterTable
ALTER TABLE "ordenes_de_pago" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by_id" TEXT,
ADD COLUMN     "cancel_reason" TEXT;

-- CreateIndex
CREATE INDEX "ordenes_de_pago_cancelled_by_id_idx" ON "ordenes_de_pago"("cancelled_by_id");

-- AddForeignKey
ALTER TABLE "ordenes_de_pago" ADD CONSTRAINT "ordenes_de_pago_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
