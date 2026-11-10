ALTER TABLE "invoice_object_deletions"
  ADD COLUMN "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
DROP INDEX "invoice_object_deletions_created_at_idx";
CREATE INDEX "invoice_object_deletions_next_attempt_at_idx"
  ON "invoice_object_deletions" ("next_attempt_at");
