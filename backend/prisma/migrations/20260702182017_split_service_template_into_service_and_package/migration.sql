-- Split de service_templates en services + service_packages PRESERVANDO datos.
--
-- Los templates legacy codificaban cada paquete de sesiones como una fila
-- separada con sufijo "(xN)" en el nombre (ej. "Hollywood Peel (x3)").
-- Esta migración agrupa esas filas por nombre base — la misma regla que
-- prisma/seed.ts — creando un Service por grupo y un ServicePackage por
-- template. Cada package conserva el id de su template para que
-- service_instances y commissions mapeen 1:1.

-- 1. Quitar FKs e índices que referencian service_templates (los datos quedan intactos)
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_service_template_id_fkey";
ALTER TABLE "service_instances" DROP CONSTRAINT "service_instances_service_template_id_fkey";
DROP INDEX "commissions_service_template_id_idx";
DROP INDEX "service_instances_service_template_id_idx";

-- 2. Tablas nuevas
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "commission_type" TEXT DEFAULT 'percentage',
    "commission_rate" DECIMAL(5,4),
    "commission_fixed_amount" DECIMAL(10,2),
    "commission_notes" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_packages" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "commission_type" TEXT,
    "commission_rate" DECIMAL(5,4),
    "commission_fixed_amount" DECIMAL(10,2),

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- 3. Mapeo template → grupo. El template canónico de cada grupo es la
--    variante de 1 sesión (o la más antigua si no la hay); presta su id
--    y su comisión al Service, igual que en seed.ts.
CREATE TABLE "_split_service_mapping" AS
WITH templates AS (
  SELECT id,
         btrim(regexp_replace(name, '\s*\(x\d+\)\s*$', '', 'i')) AS base_name,
         default_sessions,
         created_at
  FROM "service_templates"
),
canonicals AS (
  SELECT DISTINCT ON (base_name) base_name, id AS service_id
  FROM templates
  ORDER BY base_name, (default_sessions = 1) DESC, created_at, id
)
SELECT t.id AS template_id, t.base_name, c.service_id
FROM templates t
JOIN canonicals c USING (base_name);

-- 4. Un Service por grupo. Queda activo/no-eliminado si al menos un
--    template del grupo lo estaba.
INSERT INTO "services" (id, name, description, icon, is_active, deleted_at, created_at, updated_at, commission_type, commission_rate, commission_fixed_amount, commission_notes)
SELECT ct.id,
       agg.base_name,
       ct.description,
       ct.icon,
       agg.is_active,
       agg.deleted_at,
       agg.created_at,
       agg.updated_at,
       COALESCE(ct.commission_type, 'percentage'),
       ct.commission_rate,
       ct.commission_fixed_amount,
       ct.commission_notes
FROM (
  SELECT m.base_name,
         m.service_id,
         bool_or(t.is_active AND t.deleted_at IS NULL) AS is_active,
         CASE WHEN bool_or(t.deleted_at IS NULL) THEN NULL ELSE max(t.deleted_at) END AS deleted_at,
         min(t.created_at) AS created_at,
         max(t.updated_at) AS updated_at
  FROM "_split_service_mapping" m
  JOIN "service_templates" t ON t.id = m.template_id
  GROUP BY m.base_name, m.service_id
) agg
JOIN "service_templates" ct ON ct.id = agg.service_id;

-- 5. Un ServicePackage por template (conserva el id del template).
--    La comisión solo se guarda como override si difiere de la del
--    template canónico; NULL hereda del Service padre.
INSERT INTO "service_packages" (id, service_id, sessions, price, label, is_active, deleted_at, created_at, updated_at, commission_type, commission_rate, commission_fixed_amount)
SELECT t.id,
       m.service_id,
       t.default_sessions,
       t.base_price,
       COALESCE('x' || (regexp_match(t.name, '\(x(\d+)\)\s*$', 'i'))[1], 'Individual'),
       t.is_active,
       t.deleted_at,
       t.created_at,
       t.updated_at,
       CASE WHEN s.same THEN NULL ELSE t.commission_type END,
       CASE WHEN s.same THEN NULL ELSE t.commission_rate END,
       CASE WHEN s.same THEN NULL ELSE t.commission_fixed_amount END
FROM "service_templates" t
JOIN "_split_service_mapping" m ON m.template_id = t.id
JOIN "service_templates" ct ON ct.id = m.service_id
CROSS JOIN LATERAL (
  SELECT t.commission_type IS NOT DISTINCT FROM ct.commission_type
     AND t.commission_rate IS NOT DISTINCT FROM ct.commission_rate
     AND t.commission_fixed_amount IS NOT DISTINCT FROM ct.commission_fixed_amount AS same
) s;

-- 6. service_instances: backfill antes de imponer NOT NULL
ALTER TABLE "service_instances"
  ADD COLUMN "service_id" TEXT,
  ADD COLUMN "service_package_id" TEXT;

UPDATE "service_instances" si
SET "service_id" = m.service_id,
    "service_package_id" = si."service_template_id"
FROM "_split_service_mapping" m
WHERE m.template_id = si."service_template_id";

ALTER TABLE "service_instances"
  ALTER COLUMN "service_id" SET NOT NULL,
  ALTER COLUMN "service_package_id" SET NOT NULL;

-- 7. commissions: backfill (columnas nullable; filas sin template quedan NULL)
ALTER TABLE "commissions"
  ADD COLUMN "service_id" TEXT,
  ADD COLUMN "service_package_id" TEXT;

UPDATE "commissions" c
SET "service_id" = m.service_id,
    "service_package_id" = c."service_template_id"
FROM "_split_service_mapping" m
WHERE m.template_id = c."service_template_id";

-- 8. Eliminar columnas y tabla legacy
ALTER TABLE "commissions" DROP COLUMN "service_template_id";
ALTER TABLE "service_instances" DROP COLUMN "service_template_id";
DROP TABLE "_split_service_mapping";
DROP TABLE "service_templates";

-- 9. Índices
CREATE INDEX "services_deleted_at_name_idx" ON "services"("deleted_at", "name");
CREATE INDEX "services_active_lookup_idx" ON "services"("is_active", "deleted_at", "name");
CREATE INDEX "service_packages_service_lookup_idx" ON "service_packages"("service_id", "is_active", "deleted_at");
CREATE INDEX "commissions_service_id_idx" ON "commissions"("service_id");
CREATE INDEX "commissions_service_package_id_idx" ON "commissions"("service_package_id");
CREATE INDEX "service_instances_service_id_idx" ON "service_instances"("service_id");
CREATE INDEX "service_instances_service_package_id_idx" ON "service_instances"("service_package_id");

-- 10. Foreign keys
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_instances" ADD CONSTRAINT "service_instances_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_instances" ADD CONSTRAINT "service_instances_service_package_id_fkey" FOREIGN KEY ("service_package_id") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_service_package_id_fkey" FOREIGN KEY ("service_package_id") REFERENCES "service_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
