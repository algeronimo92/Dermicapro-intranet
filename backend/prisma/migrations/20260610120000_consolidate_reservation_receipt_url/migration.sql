-- Backfill: copy appointment.reservation_receipt_url → payment.receipt_url
-- for reservation payments that still have receipt_url = NULL
UPDATE "payments" p
SET receipt_url = a.reservation_receipt_url
FROM "appointments" a
WHERE p.appointment_id = a.id
  AND p.payment_type = 'reservation'
  AND p.voided_at IS NULL
  AND p.receipt_url IS NULL
  AND a.reservation_receipt_url IS NOT NULL;

-- Drop the now-redundant column
ALTER TABLE "appointments" DROP COLUMN "reservation_receipt_url";
