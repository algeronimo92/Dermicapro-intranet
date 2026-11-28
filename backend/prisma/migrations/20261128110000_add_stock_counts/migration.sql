-- Conteo de inventario: se cuenta el stock físico y, si difiere del sistema,
-- el stock se ajusta con un movimiento "Ajuste por conteo" (reason = adjustment)
-- ligado a la línea del conteo. Los conteos no se editan ni se borran.
-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "stock_count_item_id" TEXT;

-- CreateTable
CREATE TABLE "stock_counts" (
    "id" TEXT NOT NULL,
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_items" (
    "id" TEXT NOT NULL,
    "count_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "expected_stock" INTEGER NOT NULL,
    "counted_stock" INTEGER NOT NULL,

    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_counts_created_at_idx" ON "stock_counts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "stock_counts_created_by_id_idx" ON "stock_counts"("created_by_id");

-- CreateIndex
CREATE INDEX "stock_count_items_product_id_idx" ON "stock_count_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_items_count_id_product_id_key" ON "stock_count_items"("count_id", "product_id");

-- CreateIndex
CREATE INDEX "inventory_movements_stock_count_item_id_idx" ON "inventory_movements"("stock_count_item_id");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_stock_count_item_id_fkey" FOREIGN KEY ("stock_count_item_id") REFERENCES "stock_count_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "stock_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integridad
ALTER TABLE "stock_count_items"
  ADD CONSTRAINT "stock_count_items_expected_non_negative" CHECK ("expected_stock" >= 0),
  ADD CONSTRAINT "stock_count_items_counted_non_negative" CHECK ("counted_stock" >= 0);

-- Privilegios iniciales: inventario registra conteos. El admin puede
-- ajustarlos en Empleados -> Privilegios.
GRANT SELECT, INSERT ON "stock_counts", "stock_count_items" TO app_inventory;
