-- Add receipt_urls column as text array with empty default
ALTER TABLE "payments" ADD COLUMN "receipt_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Migrate existing receipt_url data into receipt_urls array
UPDATE "payments"
SET "receipt_urls" = ARRAY["receipt_url"]
WHERE "receipt_url" IS NOT NULL;
