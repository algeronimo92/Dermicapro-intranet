-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('sunscreen', 'serum', 'cleanser', 'moisturizer', 'accessory', 'other');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "InventoryMovementReason" AS ENUM ('initial', 'purchase', 'sale', 'internal_use', 'loss', 'adjustment');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" "ProductCategory" NOT NULL DEFAULT 'other',
    "presentation" TEXT,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 0,
    "photo_url" TEXT,
    "barcode" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "reason" "InventoryMovementReason" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_active_name_idx" ON "products"("is_active", "name");

-- CreateIndex
CREATE INDEX "products_created_by_id_idx" ON "products"("created_by_id");

-- CreateIndex
CREATE INDEX "inventory_movements_product_created_at_idx" ON "inventory_movements"("product_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inventory_movements_created_by_id_idx" ON "inventory_movements"("created_by_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- El stock nunca puede quedar negativo, ni siquiera si un bug salta la
-- validación del controlador.
ALTER TABLE "products"
  ADD CONSTRAINT "products_stock_non_negative" CHECK ("stock" >= 0),
  ADD CONSTRAINT "products_min_stock_non_negative" CHECK ("min_stock" >= 0),
  ADD CONSTRAINT "products_sale_price_non_negative" CHECK ("sale_price" >= 0);

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "inventory_movements_stock_after_non_negative" CHECK ("stock_after" >= 0);

-- Rol de inventario
INSERT INTO "roles" ("id", "name", "display_name", "description")
VALUES (
  'ec844c6b-4dc6-4e8f-9219-b993e4a25600',
  'inventory',
  'Inventario',
  'Gestiona productos y movimientos de inventario'
)
ON CONFLICT ("name") DO UPDATE
SET "display_name" = EXCLUDED."display_name",
    "description" = EXCLUDED."description";
