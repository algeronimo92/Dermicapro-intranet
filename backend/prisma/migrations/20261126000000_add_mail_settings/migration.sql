-- Correo de envío configurable desde Configuración (SMTP propio o cuenta
-- conectada por OAuth).
--
-- Sólo la usan las rutas de admin (/api/settings/email) y el envío de correos,
-- que corren como el dueño de la base. A propósito no se da ningún GRANT a los
-- roles app_* ni se agrega a constants/dbPrivileges.ts: guarda la contraseña
-- SMTP y el refresh token (cifrados).

CREATE TABLE "mail_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_security" TEXT,
    "smtp_username" TEXT,
    "smtp_password_enc" TEXT,
    "from_address" TEXT,
    "from_name" TEXT,
    "oauth_provider" TEXT,
    "oauth_refresh_token_enc" TEXT,
    "oauth_account_email" TEXT,
    "oauth_accounts_server" TEXT,
    "oauth_account_id" TEXT,
    "oauth_nonce" TEXT,
    "oauth_pending_provider" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" TEXT,

    CONSTRAINT "mail_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mail_settings_single_row" CHECK ("id" = 1),
    CONSTRAINT "mail_settings_smtp_security_check" CHECK ("smtp_security" IS NULL OR "smtp_security" IN ('starttls', 'ssl', 'none')),
    CONSTRAINT "mail_settings_oauth_provider_check" CHECK ("oauth_provider" IS NULL OR "oauth_provider" IN ('google', 'microsoft', 'zoho'))
);
