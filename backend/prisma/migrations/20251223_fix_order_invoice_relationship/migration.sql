-- AlterTable: Change Invoice-Order relationship from one-to-one to many-to-one
-- Remove the unique constraint on invoices.order_id
DROP INDEX IF EXISTS "invoices_order_id_key";

-- Remove the old foreign key from invoices to orders
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_order_id_fkey";

-- Remove the order_id column from invoices
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "order_id";

-- Add invoice_id column to orders (nullable to allow orders without invoices)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_id" TEXT;

-- Add created_by_id to invoices if it doesn't exist
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;

-- Add foreign key from orders to invoices
ALTER TABLE "orders" ADD CONSTRAINT "orders_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key for created_by_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_created_by_id_fkey'
  ) THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
