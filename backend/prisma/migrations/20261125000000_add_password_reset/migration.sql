-- "¿Olvidaste tu contraseña?" por correo.
--
-- password_reset_tokens sólo la usan /api/auth/forgot-password y
-- /api/auth/reset-password, que corren como el dueño de la base. A propósito no
-- se da ningún GRANT a los roles app_* ni se agrega a constants/dbPrivileges.ts:
-- ningún empleado debe poder leer ni crear enlaces de recuperación.

ALTER TABLE "users" ADD COLUMN "sessions_revoked_at" TIMESTAMP(3);

CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "requested_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
