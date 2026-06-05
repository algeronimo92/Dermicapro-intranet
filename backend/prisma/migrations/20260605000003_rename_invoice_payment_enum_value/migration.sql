-- Rename enum value: invoice_payment → payment_order_payment in PaymentType
ALTER TYPE "PaymentType" RENAME VALUE 'invoice_payment' TO 'payment_order_payment';
