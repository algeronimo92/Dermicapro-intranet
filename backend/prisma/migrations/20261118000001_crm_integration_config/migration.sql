-- Configuración de la integración con el CRM, editable desde Configuración.
-- El token se guarda solo como hash: se muestra una única vez al generarlo.
CREATE TABLE "integration_configs" (
    "integration" TEXT NOT NULL,
    "token_hash" TEXT,
    "token_hint" TEXT,
    "token_created_at" TIMESTAMP(3),
    "token_created_by_id" TEXT,
    "fallback_user_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("integration")
);

CREATE INDEX "integration_configs_token_created_by_id_idx" ON "integration_configs"("token_created_by_id");

CREATE INDEX "integration_configs_fallback_user_id_idx" ON "integration_configs"("fallback_user_id");

ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_token_created_by_id_fkey"
  FOREIGN KEY ("token_created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_fallback_user_id_fkey"
  FOREIGN KEY ("fallback_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
