/**
 * Niubiz Payment Gateway Configuration
 *
 * Documentación: https://desarrolladores.niubiz.com.pe
 *
 * Flujo de integración:
 * 1. Generar token de acceso (API Security)
 * 2. Generar token de sesión (API Session)
 * 3. Mostrar formulario de tokenización en frontend
 * 4. Recibir token de tarjeta
 * 5. Cobrar con API Authorization
 */

// Ambiente: 'sandbox' | 'production'
const ENVIRONMENT = process.env.NIUBIZ_ENVIRONMENT || 'sandbox';

// URLs base según ambiente
const NIUBIZ_URLS = {
  sandbox: {
    security: 'https://apisandbox.vnforappstest.com/api.security/v1/security',
    session: 'https://apisandbox.vnforappstest.com/api.ecommerce/v2/ecommerce/token/session',
    authorization: 'https://apisandbox.vnforappstest.com/api.authorization/v3/authorization/ecommerce',
    checkoutJs: 'https://static-content-qas.vnforapps.com/v2/js/checkout.js?qa=true',
  },
  production: {
    security: 'https://apiprod.vnforapps.com/api.security/v1/security',
    session: 'https://apiprod.vnforapps.com/api.ecommerce/v2/ecommerce/token/session',
    authorization: 'https://apiprod.vnforapps.com/api.authorization/v3/authorization/ecommerce',
    checkoutJs: 'https://static-content.vnforapps.com/v2/js/checkout.js',
  },
} as const;

export const NIUBIZ_CONFIG = {
  environment: ENVIRONMENT as 'sandbox' | 'production',

  // Credenciales (desde variables de entorno)
  merchantId: process.env.NIUBIZ_MERCHANT_ID || '',
  username: process.env.NIUBIZ_USERNAME || '',
  password: process.env.NIUBIZ_PASSWORD || '',

  // URLs según ambiente
  urls: NIUBIZ_URLS[ENVIRONMENT as keyof typeof NIUBIZ_URLS] || NIUBIZ_URLS.sandbox,

  // Configuración de pagos
  currency: 'PEN',
  channel: 'recurrent', // 'web' para pagos únicos, 'recurrent' para recurrencia

  // URLs de callback
  callbackUrl: process.env.NIUBIZ_CALLBACK_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/subscription/callback`,

  // Antifraud MDD (Merchant Defined Data)
  antifraud: {
    MDD4: process.env.NIUBIZ_MDD4 || 'correo@dermicapro.com', // Email del comercio
    MDD21: '0', // Tipo de envío: 0=No aplica
    MDD32: process.env.NIUBIZ_MDD32 || '12345678901', // RUC del comercio
    MDD75: 'Registrado', // Estado del cliente
    MDD77: '1', // Número de días como cliente (mínimo 1)
  },
};

// Validar configuración al iniciar
export function validateNiubizConfig(): void {
  const requiredEnvVars = ['NIUBIZ_MERCHANT_ID', 'NIUBIZ_USERNAME', 'NIUBIZ_PASSWORD'];
  const missing = requiredEnvVars.filter((v) => !process.env[v]);

  if (missing.length > 0 && ENVIRONMENT === 'production') {
    throw new Error(`Missing Niubiz environment variables: ${missing.join(', ')}`);
  }

  if (missing.length > 0) {
    console.warn(`[Niubiz] Warning: Missing environment variables: ${missing.join(', ')}. Using sandbox defaults.`);
  }
}

// Credenciales de prueba (solo para desarrollo)
export const NIUBIZ_TEST_CREDENTIALS = {
  merchantIdSoles: '456879852',
  merchantIdDolares: '456879853',
  username: 'integraciones@niubiz.com.pe',
  password: '_7z3@8fF',
  testCards: {
    approved: ['4919148107859067', '4500340090000016', '4551708161768059'],
    declined: ['4444333322221111', '4111111111111111'],
    cvv: '123',
    expiry: '12/28',
  },
  testEmails: {
    approved: 'accept@sastest.com',
    declined: 'reject@sastest.com',
    verifiedVisa: 'review@sastest.com',
  },
};
