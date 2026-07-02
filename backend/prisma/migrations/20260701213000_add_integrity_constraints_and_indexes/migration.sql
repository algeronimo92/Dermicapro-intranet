-- Add database-level guardrails for business rules already enforced by the app,
-- plus indexes for foreign keys and common list/report queries.

-- ================================
-- Check constraints
-- ================================

ALTER TABLE "patients"
  ADD CONSTRAINT "patients_account_balance_non_negative_check"
  CHECK ("account_balance" >= 0);

ALTER TABLE "service_templates"
  ADD CONSTRAINT "service_templates_base_price_non_negative_check"
  CHECK ("base_price" >= 0),
  ADD CONSTRAINT "service_templates_default_sessions_positive_check"
  CHECK ("default_sessions" > 0),
  ADD CONSTRAINT "service_templates_commission_type_check"
  CHECK ("commission_type" IS NULL OR "commission_type" IN ('percentage', 'fixed')),
  ADD CONSTRAINT "service_templates_commission_rate_range_check"
  CHECK ("commission_rate" IS NULL OR ("commission_rate" >= 0 AND "commission_rate" <= 1)),
  ADD CONSTRAINT "service_templates_commission_fixed_amount_non_negative_check"
  CHECK ("commission_fixed_amount" IS NULL OR "commission_fixed_amount" >= 0);

ALTER TABLE "service_instances"
  ADD CONSTRAINT "service_instances_total_sessions_positive_check"
  CHECK ("total_sessions" > 0),
  ADD CONSTRAINT "service_instances_completed_sessions_non_negative_check"
  CHECK ("completed_sessions" >= 0),
  ADD CONSTRAINT "service_instances_completed_sessions_lte_total_check"
  CHECK ("completed_sessions" <= "total_sessions"),
  ADD CONSTRAINT "service_instances_original_price_non_negative_check"
  CHECK ("original_price" >= 0),
  ADD CONSTRAINT "service_instances_final_price_non_negative_check"
  CHECK ("final_price" >= 0);

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_duration_minutes_positive_check"
  CHECK ("duration_minutes" > 0);

ALTER TABLE "ordenes_de_pago"
  ADD CONSTRAINT "ordenes_de_pago_total_amount_non_negative_check"
  CHECK ("total_amount" >= 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_paid_positive_check"
  CHECK ("amount_paid" > 0),
  ADD CONSTRAINT "payments_type_relationship_check"
  CHECK (
    (
      "payment_type" = 'payment_order_payment'
      AND "payment_order_id" IS NOT NULL
      AND "appointment_id" IS NULL
    )
    OR (
      "payment_type" = 'reservation'
      AND "appointment_id" IS NOT NULL
      AND "payment_order_id" IS NULL
    )
    OR (
      "payment_type" = 'service_payment'
      AND "appointment_id" IS NOT NULL
      AND "payment_order_id" IS NULL
    )
    OR (
      "payment_type" = 'account_credit'
      AND "payment_order_id" IS NULL
      AND "appointment_id" IS NULL
      AND "payment_method" <> 'account_credit'
    )
    OR (
      "payment_type" IN ('penalty', 'other')
    )
  );

ALTER TABLE "commissions"
  ADD CONSTRAINT "commissions_rate_non_negative_check"
  CHECK ("commission_rate" >= 0),
  ADD CONSTRAINT "commissions_base_amount_non_negative_check"
  CHECK ("base_amount" >= 0),
  ADD CONSTRAINT "commissions_amount_non_negative_check"
  CHECK ("commission_amount" >= 0),
  ADD CONSTRAINT "commissions_approval_fields_check"
  CHECK (
    ("approved_at" IS NULL AND "approved_by_id" IS NULL)
    OR ("approved_at" IS NOT NULL AND "approved_by_id" IS NOT NULL)
  ),
  ADD CONSTRAINT "commissions_payment_fields_check"
  CHECK (
    ("paid_at" IS NULL AND "paid_by_id" IS NULL)
    OR ("paid_at" IS NOT NULL AND "paid_by_id" IS NOT NULL)
  );

-- ================================
-- FK and query indexes
-- ================================

CREATE INDEX IF NOT EXISTS "users_role_id_idx"
  ON "users" ("role_id");

CREATE INDEX IF NOT EXISTS "patients_created_by_id_idx"
  ON "patients" ("created_by_id");
CREATE INDEX IF NOT EXISTS "patients_password_set_by_staff_id_idx"
  ON "patients" ("password_set_by_staff_id");
CREATE INDEX IF NOT EXISTS "patients_created_at_idx"
  ON "patients" ("created_at");

CREATE INDEX IF NOT EXISTS "service_templates_deleted_at_name_idx"
  ON "service_templates" ("deleted_at", "name");
CREATE INDEX IF NOT EXISTS "service_templates_active_lookup_idx"
  ON "service_templates" ("is_active", "deleted_at", "name");
CREATE INDEX IF NOT EXISTS "service_templates_active_name_partial_idx"
  ON "service_templates" ("name")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "service_instances_patient_created_at_idx"
  ON "service_instances" ("patient_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "service_instances_service_template_id_idx"
  ON "service_instances" ("service_template_id");
CREATE INDEX IF NOT EXISTS "service_instances_created_by_id_idx"
  ON "service_instances" ("created_by_id");
CREATE INDEX IF NOT EXISTS "service_instances_concluded_by_id_idx"
  ON "service_instances" ("concluded_by_id");
CREATE INDEX IF NOT EXISTS "service_instances_payment_order_id_idx"
  ON "service_instances" ("payment_order_id");
CREATE INDEX IF NOT EXISTS "service_instances_patient_unbilled_created_at_idx"
  ON "service_instances" ("patient_id", "created_at" DESC)
  WHERE "payment_order_id" IS NULL;

CREATE INDEX IF NOT EXISTS "appointments_patient_scheduled_date_idx"
  ON "appointments" ("patient_id", "scheduled_date" DESC);
CREATE INDEX IF NOT EXISTS "appointments_status_scheduled_date_idx"
  ON "appointments" ("status", "scheduled_date" DESC);
CREATE INDEX IF NOT EXISTS "appointments_created_by_scheduled_date_idx"
  ON "appointments" ("created_by_id", "scheduled_date" DESC);
CREATE INDEX IF NOT EXISTS "appointments_attended_by_id_idx"
  ON "appointments" ("attended_by_id");

CREATE INDEX IF NOT EXISTS "appointment_attendees_user_id_idx"
  ON "appointment_attendees" ("user_id");
CREATE INDEX IF NOT EXISTS "appointment_attendees_added_by_id_idx"
  ON "appointment_attendees" ("added_by_id");

CREATE INDEX IF NOT EXISTS "appointment_notes_appointment_created_at_idx"
  ON "appointment_notes" ("appointment_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "appointment_notes_created_by_id_idx"
  ON "appointment_notes" ("created_by_id");

CREATE INDEX IF NOT EXISTS "patient_records_patient_created_at_idx"
  ON "patient_records" ("patient_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "patient_records_appointment_id_idx"
  ON "patient_records" ("appointment_id");
CREATE INDEX IF NOT EXISTS "patient_records_created_by_id_idx"
  ON "patient_records" ("created_by_id");

CREATE INDEX IF NOT EXISTS "commissions_sales_status_created_at_idx"
  ON "commissions" ("sales_person_id", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "commissions_appointment_id_idx"
  ON "commissions" ("appointment_id");
CREATE INDEX IF NOT EXISTS "commissions_service_instance_id_idx"
  ON "commissions" ("service_instance_id");
CREATE INDEX IF NOT EXISTS "commissions_service_template_id_idx"
  ON "commissions" ("service_template_id");
CREATE INDEX IF NOT EXISTS "commissions_approved_by_id_idx"
  ON "commissions" ("approved_by_id");
CREATE INDEX IF NOT EXISTS "commissions_paid_by_id_idx"
  ON "commissions" ("paid_by_id");
CREATE INDEX IF NOT EXISTS "commissions_status_created_at_idx"
  ON "commissions" ("status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "sessions_appointment_deleted_at_idx"
  ON "sessions" ("appointment_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "sessions_service_instance_deleted_at_idx"
  ON "sessions" ("service_instance_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "sessions_deleted_by_id_idx"
  ON "sessions" ("deleted_by_id");

CREATE INDEX IF NOT EXISTS "ordenes_de_pago_patient_status_created_at_idx"
  ON "ordenes_de_pago" ("patient_id", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "ordenes_de_pago_created_by_id_idx"
  ON "ordenes_de_pago" ("created_by_id");
CREATE INDEX IF NOT EXISTS "ordenes_de_pago_status_created_at_idx"
  ON "ordenes_de_pago" ("status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "payments_patient_payment_date_idx"
  ON "payments" ("patient_id", "payment_date" DESC);
CREATE INDEX IF NOT EXISTS "payments_order_voided_payment_date_idx"
  ON "payments" ("payment_order_id", "voided_at", "payment_date" DESC);
CREATE INDEX IF NOT EXISTS "payments_appointment_type_voided_idx"
  ON "payments" ("appointment_id", "payment_type", "voided_at");
CREATE INDEX IF NOT EXISTS "payments_created_by_id_idx"
  ON "payments" ("created_by_id");
CREATE INDEX IF NOT EXISTS "payments_voided_by_id_idx"
  ON "payments" ("voided_by_id");
CREATE INDEX IF NOT EXISTS "payments_payment_date_idx"
  ON "payments" ("payment_date" DESC);
CREATE INDEX IF NOT EXISTS "payments_type_payment_date_idx"
  ON "payments" ("payment_type", "payment_date" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "payments_one_active_reservation_per_appointment_idx"
  ON "payments" ("appointment_id")
  WHERE "payment_type" = 'reservation' AND "voided_at" IS NULL;
