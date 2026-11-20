ALTER TABLE "registered_invoices" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "invoice_object_deletions" (
  "id" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "version_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_object_deletions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoice_object_deletions_object_key_key"
  ON "invoice_object_deletions" ("object_key");
CREATE INDEX "invoice_object_deletions_created_at_idx"
  ON "invoice_object_deletions" ("created_at");
