-- Inventario por apartados (fase 1): compras con factura, tipo de factura y
-- stock objetivo.
--
-- - registered_invoices.category separa las facturas de Tratamientos de las de
--   Productos (compras de inventario). Las existentes quedan como Tratamientos.
-- - purchases / purchase_items: cada compra suma stock y puede llevar su
--   factura. Cada entrada en inventory_movements queda ligada a su línea.
-- - products.target_stock: hasta dónde reponer en la lista de compras.
-- - Seguridad por filas: quien pertenece a app_inventory sólo ve y registra
--   facturas de Productos; el resto de roles con acceso a Facturas ve ambas.

-- CreateEnum
CREATE TYPE "InvoiceCategory" AS ENUM ('treatments', 'products');

-- AlterTable
ALTER TABLE "registered_invoices" ADD COLUMN     "category" "InvoiceCategory" NOT NULL DEFAULT 'treatments';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "target_stock" INTEGER;

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "purchase_item_id" TEXT;

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "purchase_date" DATE NOT NULL,
    "invoice_id" TEXT,
    "note" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchases_invoice_id_key" ON "purchases"("invoice_id");

-- CreateIndex
CREATE INDEX "purchases_purchase_date_created_at_idx" ON "purchases"("purchase_date" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "purchases_created_by_id_idx" ON "purchases"("created_by_id");

-- CreateIndex
CREATE INDEX "purchase_items_product_id_idx" ON "purchase_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_items_purchase_id_product_id_key" ON "purchase_items"("purchase_id", "product_id");

-- CreateIndex
CREATE INDEX "registered_invoices_category_created_at_idx" ON "registered_invoices"("category", "created_at");

-- CreateIndex
CREATE INDEX "inventory_movements_purchase_item_id_idx" ON "inventory_movements"("purchase_item_id");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "registered_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integridad
ALTER TABLE "products"
  ADD CONSTRAINT "products_target_stock_non_negative" CHECK ("target_stock" IS NULL OR "target_stock" >= 0);

ALTER TABLE "purchase_items"
  ADD CONSTRAINT "purchase_items_quantity_positive" CHECK ("quantity" > 0);

-- Una compra sólo se liga a facturas de Productos, y una factura ligada a una
-- compra no puede pasar a Tratamientos. SECURITY DEFINER: la verificación ve
-- la otra tabla aunque quien edita no tenga privilegios sobre ella.
CREATE FUNCTION "purchase_invoice_must_be_products"() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM registered_invoices WHERE id = NEW.invoice_id AND category = 'products'
  ) THEN
    RAISE EXCEPTION 'INVOICE_NOT_PRODUCTS: la factura de una compra debe ser de Productos';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "purchases_invoice_category"
  BEFORE INSERT OR UPDATE OF invoice_id ON "purchases"
  FOR EACH ROW EXECUTE FUNCTION "purchase_invoice_must_be_products"();

CREATE FUNCTION "linked_invoice_keeps_products"() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.category <> 'products' AND EXISTS (SELECT 1 FROM purchases WHERE invoice_id = NEW.id) THEN
    RAISE EXCEPTION 'INVOICE_CATEGORY_LOCKED: la factura está ligada a una compra de inventario';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "registered_invoices_linked_category"
  BEFORE UPDATE OF category ON "registered_invoices"
  FOR EACH ROW EXECUTE FUNCTION "linked_invoice_keeps_products"();

REVOKE ALL ON FUNCTION "purchase_invoice_must_be_products"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "linked_invoice_keeps_products"() FROM PUBLIC;

-- Seguridad por filas en Facturas. El dueño de la base (admin, migraciones,
-- trabajos en segundo plano) no está sujeto a estas políticas.
ALTER TABLE "registered_invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registered_invoices_by_category" ON "registered_invoices"
  USING (category = 'products' OR NOT pg_has_role(current_user, 'app_inventory', 'MEMBER'))
  WITH CHECK (category = 'products' OR NOT pg_has_role(current_user, 'app_inventory', 'MEMBER'));

-- Un adjunto se ve si se ve su factura (la subconsulta ya pasa por la política).
ALTER TABLE "registered_invoice_attachments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registered_invoice_attachments_by_invoice" ON "registered_invoice_attachments"
  USING (EXISTS (SELECT 1 FROM registered_invoices i WHERE i.id = invoice_id))
  WITH CHECK (EXISTS (SELECT 1 FROM registered_invoices i WHERE i.id = invoice_id));

-- Privilegios iniciales: inventario registra compras y sus facturas de
-- Productos. El admin puede ajustarlos en Empleados -> Privilegios.
GRANT SELECT, INSERT ON "purchases", "purchase_items" TO app_inventory;
GRANT SELECT, INSERT ON "registered_invoices", "registered_invoice_attachments" TO app_inventory;
