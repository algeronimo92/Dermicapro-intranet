-- CreateTable
CREATE TABLE "registered_invoices" (
    "id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "number_key" TEXT NOT NULL,
    "issuer_ruc" TEXT NOT NULL,
    "issuer_name" TEXT NOT NULL,
    "customer_document" TEXT,
    "customer_name" TEXT,
    "customer_address" TEXT,
    "issue_date" DATE NOT NULL,
    "issue_time" TEXT,
    "currency" TEXT NOT NULL,
    "taxable_subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2),
    "tax" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "payment_condition" TEXT NOT NULL,
    "bank_account" TEXT,
    "seller" TEXT,
    "items" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registered_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registered_invoice_attachments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "content" BYTEA NOT NULL,

    CONSTRAINT "registered_invoice_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registered_invoices_created_at_id_idx" ON "registered_invoices"("created_at", "id");

-- CreateIndex
CREATE INDEX "registered_invoices_created_by_id_idx" ON "registered_invoices"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "registered_invoices_document_key" ON "registered_invoices"("issuer_ruc", "document_type", "series", "number_key");

-- CreateIndex
CREATE INDEX "registered_invoice_attachments_invoice_id_idx" ON "registered_invoice_attachments"("invoice_id");

-- AddForeignKey
ALTER TABLE "registered_invoices" ADD CONSTRAINT "registered_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registered_invoice_attachments" ADD CONSTRAINT "registered_invoice_attachments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "registered_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

