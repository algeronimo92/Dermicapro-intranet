import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  env: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  },

  upload: {
    directory: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
  },

  /**
   * Envío de correos (recuperar contraseña). En producción, la cuenta
   * no-reply@dermicapro.com de Hostinger: smtp.hostinger.com, puerto 465 (SSL).
   * En desarrollo, Mailpit (docker-compose.yml). Sin SMTP_HOST no se envía nada.
   */
  mail: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '465'),
    // 465 usa SSL desde el inicio; 587 y 1025 (Mailpit) usan STARTTLS o nada.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : (process.env.SMTP_PORT || '465') === '465',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'DermicaPro <no-reply@dermicapro.com>',
    /**
     * Sólo desarrollo: permite configurar desde la pantalla un SMTP interno
     * (Mailpit) y sin cifrado. En producción debe quedar apagado.
     */
    allowInternalHosts: process.env.SMTP_ALLOW_INTERNAL_HOSTS === 'true',
  },

  /**
   * "Conectar con Google / Microsoft / Zoho" en Configuración -> Correo de
   * envío. Cada proveedor aparece sólo si tiene su client id y secret. La URL
   * de retorno debe estar registrada tal cual en la consola de cada proveedor.
   */
  mailOAuth: {
    redirectUri: process.env.MAIL_OAUTH_REDIRECT_URI || '',
    google: { clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '', clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '' },
    microsoft: { clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID || '', clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET || '' },
    zoho: { clientId: process.env.ZOHO_OAUTH_CLIENT_ID || '', clientSecret: process.env.ZOHO_OAUTH_CLIENT_SECRET || '' },
  },

  /** Clave para cifrar secretos guardados en la base (utils/secretCipher.ts). */
  settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY || '',

  /** Dirección pública del frontend; con ella se arman los enlaces de los correos. */
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
};
