-- Remove redundant reservation_amount column from appointments.
-- The source of truth is payments.amount_paid where payment_type = 'reservation'.
ALTER TABLE "appointments" DROP COLUMN "reservation_amount";
