ALTER TABLE "registered_invoice_attachments"
  ALTER COLUMN "content" DROP NOT NULL,
  ADD COLUMN "object_key" TEXT,
  ADD CONSTRAINT "registered_invoice_attachments_storage_check"
    CHECK (("content" IS NULL) <> ("object_key" IS NULL));

CREATE UNIQUE INDEX "registered_invoice_attachments_object_key_key"
  ON "registered_invoice_attachments" ("object_key");
