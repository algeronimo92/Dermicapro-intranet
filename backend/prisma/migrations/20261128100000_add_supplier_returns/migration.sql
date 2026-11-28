-- Devoluciones de productos al proveedor (vencido, dañado, error del pedido...).
--
-- - supplier_returns / supplier_return_items: cada devolución resta stock y
--   exige un motivo. Cada salida en inventory_movements queda ligada a su línea
--   (reason = supplier_return). No se editan ni se borran.

-- CreateEnum
CREATE TYPE "SupplierReturnReason" AS ENUM ('expired', 'damaged', 'wrong_item', 'defective', 'other');

-- AlterEnum
ALTER TYPE "InventoryMovementReason" ADD VALUE 'supplier_return';

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "supplier_return_item_id" TEXT;

-- CreateTable
CREATE TABLE "supplier_returns" (
    "id" TEXT NOT NULL,
    "return_date" DATE NOT NULL,
    "reason" "SupplierReturnReason" NOT NULL,
    "supplier_name" TEXT,
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_return_items" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "supplier_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_returns_return_date_created_at_idx" ON "supplier_returns"("return_date" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "supplier_returns_created_by_id_idx" ON "supplier_returns"("created_by_id");

-- CreateIndex
CREATE INDEX "supplier_return_items_product_id_idx" ON "supplier_return_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_return_items_return_id_product_id_key" ON "supplier_return_items"("return_id", "product_id");

-- CreateIndex
CREATE INDEX "inventory_movements_supplier_return_item_id_idx" ON "inventory_movements"("supplier_return_item_id");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_supplier_return_item_id_fkey" FOREIGN KEY ("supplier_return_item_id") REFERENCES "supplier_return_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_return_items" ADD CONSTRAINT "supplier_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "supplier_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_return_items" ADD CONSTRAINT "supplier_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integridad
ALTER TABLE "supplier_return_items"
  ADD CONSTRAINT "supplier_return_items_quantity_positive" CHECK ("quantity" > 0);

-- Con motivo "Otro" la nota es obligatoria: es la que dice por qué.
ALTER TABLE "supplier_returns"
  ADD CONSTRAINT "supplier_returns_other_needs_note" CHECK ("reason" <> 'other' OR length(trim(coalesce("note", ''))) > 0);

-- Privilegios iniciales: inventario registra devoluciones. El admin puede
-- ajustarlos en Empleados -> Privilegios.
GRANT SELECT, INSERT ON "supplier_returns", "supplier_return_items" TO app_inventory;
