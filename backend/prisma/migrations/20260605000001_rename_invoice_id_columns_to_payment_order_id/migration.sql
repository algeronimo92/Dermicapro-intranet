-- Rename column: invoice_id → payment_order_id in service_instances
ALTER TABLE "service_instances" RENAME COLUMN "invoice_id" TO "payment_order_id";

-- Rename column: invoice_id → payment_order_id in payments
ALTER TABLE "payments" RENAME COLUMN "invoice_id" TO "payment_order_id";
