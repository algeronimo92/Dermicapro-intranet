-- Citas que llegan desde el CRM (POST /api/integrations/crm/appointments).

-- Un paciente creado desde el CRM solo trae nombre, DNI y teléfono.
ALTER TABLE "patients" ALTER COLUMN "date_of_birth" DROP NOT NULL;
ALTER TABLE "patients" ALTER COLUMN "sex" DROP NOT NULL;

-- Origen externo de la cita; la pareja es única para que un reenvío no duplique.
ALTER TABLE "appointments" ADD COLUMN "external_source" TEXT;
ALTER TABLE "appointments" ADD COLUMN "external_id" TEXT;

CREATE UNIQUE INDEX "appointments_external_source_external_id_key"
  ON "appointments" ("external_source", "external_id");
