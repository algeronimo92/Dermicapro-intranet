/**
 * Niubiz Repository
 *
 * Abstracción de la API de Niubiz para pagos con tarjeta.
 * Implementa retry logic y manejo de errores.
 *
 * Flujo:
 * 1. getAccessToken() - Obtener token de acceso
 * 2. createSessionToken() - Crear token de sesión para formulario
 * 3. authorizePayment() - Cobrar con token de tarjeta
 */

import { NIUBIZ_CONFIG, NIUBIZ_TEST_CREDENTIALS } from '../config/niubiz';

// ==========================================
// Types
// ==========================================

export interface NiubizSessionParams {
  amount: number;
  clientIp: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
}

export interface NiubizSessionResponse {
  sessionKey: string;
  expirationTime: number;
}

export interface NiubizAuthorizationParams {
  sessionKey?: string; // Para pagos con formulario
  cardToken?: string; // Para pagos recurrentes con token guardado
  purchaseNumber: string;
  amount: number;
  currency?: string;
  clientIp: string;
  email: string;
  firstName: string;
  lastName: string;
  documentNumber?: string;
  // Para recurrencia
  recurrence?: {
    type: 'recurring' | 'initial';
    frequency: 'monthly' | 'yearly';
  };
}

export interface NiubizAuthorizationResponse {
  errorCode: number;
  errorMessage: string;
  transactionUUID: string;
  transactionDate: string;
  transactionToken?: string; // Token de tarjeta para futuros cobros
  order: {
    purchaseNumber: string;
    amount: number;
    currency: string;
    authorizedAmount: number;
    authorizationCode: string;
    actionCode: string;
    traceNumber: string;
  };
  dataMap: {
    TERMINAL: string;
    ACTION_DESCRIPTION: string;
    CARD: string; // Últimos 4 dígitos
    BRAND: string; // VISA, MC, etc.
    ECI_DESCRIPTION?: string;
    SIGNATURE?: string;
    CARD_TYPE?: string; // C=Crédito, D=Débito
    PROCESS_CODE?: string;
    TRANSACTION_DATE?: string;
    ACTION_CODE?: string;
  };
}

export interface NiubizError {
  errorCode: number;
  errorMessage: string;
  data?: Record<string, unknown>;
}

// ==========================================
// Retry Configuration
// ==========================================

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // No reintentar errores de cliente (4xx)
      if (error instanceof NiubizApiError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[Niubiz] ${operationName} failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delay}ms...`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[Niubiz] ${operationName} failed after ${MAX_RETRIES} attempts`);
  throw lastError;
}

// ==========================================
// Custom Error
// ==========================================

export class NiubizApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NiubizApiError';
  }
}

// ==========================================
// Niubiz Repository
// ==========================================

export class NiubizRepository {
  private accessToken: string | null = null;
  private accessTokenExpiry: number = 0;

  /**
   * Obtener token de acceso (API Security)
   * Este token se usa para autenticar las demás llamadas
   */
  async getAccessToken(): Promise<string> {
    // Usar token cacheado si aún es válido (5 minutos de margen)
    if (this.accessToken && Date.now() < this.accessTokenExpiry - 300000) {
      return this.accessToken;
    }

    const credentials = this.getCredentials();
    const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');

    const response = await withRetry(async () => {
      const res = await fetch(NIUBIZ_CONFIG.urls.security, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      });

      if (!res.ok) {
        throw new NiubizApiError(
          `Failed to get access token: ${res.statusText}`,
          res.status
        );
      }

      return res.text(); // El token viene como texto plano
    }, 'getAccessToken');

    this.accessToken = response.trim();
    // Token válido por 10 minutos
    this.accessTokenExpiry = Date.now() + 600000;

    console.log('[Niubiz] Access token obtained successfully');
    return this.accessToken;
  }

  /**
   * Crear token de sesión (API Session)
   * Este token se usa para mostrar el formulario de pago en el frontend
   */
  async createSessionToken(params: NiubizSessionParams): Promise<NiubizSessionResponse> {
    const accessToken = await this.getAccessToken();
    const credentials = this.getCredentials();

    const body = {
      channel: NIUBIZ_CONFIG.channel,
      amount: params.amount.toFixed(2),
      antifraud: {
        clientIp: params.clientIp,
        merchantDefineData: {
          MDD4: params.email || NIUBIZ_CONFIG.antifraud.MDD4,
          MDD21: NIUBIZ_CONFIG.antifraud.MDD21,
          MDD32: NIUBIZ_CONFIG.antifraud.MDD32,
          MDD75: NIUBIZ_CONFIG.antifraud.MDD75,
          MDD77: NIUBIZ_CONFIG.antifraud.MDD77,
        },
      },
      ...(params.firstName && {
        cardHolder: {
          firstName: params.firstName,
          lastName: params.lastName || '',
          email: params.email || '',
          documentNumber: params.documentNumber || '',
        },
      }),
    };

    const response = await withRetry(async () => {
      const res = await fetch(
        `${NIUBIZ_CONFIG.urls.session}/${credentials.merchantId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: accessToken,
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errorBody = await res.text();
        throw new NiubizApiError(
          `Failed to create session token: ${errorBody}`,
          res.status
        );
      }

      return res.json();
    }, 'createSessionToken');

    console.log('[Niubiz] Session token created successfully');
    return {
      sessionKey: response.sessionKey,
      expirationTime: response.expirationTime || Date.now() + 1800000, // 30 min default
    };
  }

  /**
   * Autorizar pago (API Authorization)
   * Se usa tanto para pagos iniciales como para cobros recurrentes
   */
  async authorizePayment(params: NiubizAuthorizationParams): Promise<NiubizAuthorizationResponse> {
    const accessToken = await this.getAccessToken();
    const credentials = this.getCredentials();

    const body: Record<string, unknown> = {
      channel: NIUBIZ_CONFIG.channel,
      captureType: 'manual', // Captura inmediata
      countable: true,
      order: {
        tokenId: params.sessionKey || params.cardToken,
        purchaseNumber: params.purchaseNumber,
        amount: params.amount.toFixed(2),
        currency: params.currency || NIUBIZ_CONFIG.currency,
      },
      cardHolder: {
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        documentNumber: params.documentNumber || '',
      },
    };

    // Agregar datos de recurrencia si aplica
    if (params.recurrence) {
      body.sponsored = {
        merchantId: credentials.merchantId,
        ...body.order,
      };
      body.yape = null;
    }

    // Para cobros con token guardado (recurrencia)
    if (params.cardToken && !params.sessionKey) {
      body.order = {
        ...body.order,
        tokenId: params.cardToken,
      };
    }

    const response = await withRetry(async () => {
      const res = await fetch(
        `${NIUBIZ_CONFIG.urls.authorization}/${credentials.merchantId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: accessToken,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok || data.errorCode !== 0) {
        throw new NiubizApiError(
          data.errorMessage || `Authorization failed: ${res.statusText}`,
          res.status,
          data.errorCode,
          data
        );
      }

      return data;
    }, 'authorizePayment');

    console.log(`[Niubiz] Payment authorized: ${response.order?.authorizationCode}`);
    return response;
  }

  /**
   * Procesar cobro recurrente
   * Usa el token de tarjeta guardado para cobrar
   */
  async processRecurringPayment(params: {
    cardToken: string;
    purchaseNumber: string;
    amount: number;
    email: string;
    firstName: string;
    lastName: string;
    clientIp?: string;
  }): Promise<NiubizAuthorizationResponse> {
    return this.authorizePayment({
      cardToken: params.cardToken,
      purchaseNumber: params.purchaseNumber,
      amount: params.amount,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      clientIp: params.clientIp || '127.0.0.1',
      recurrence: {
        type: 'recurring',
        frequency: 'monthly',
      },
    });
  }

  /**
   * Obtener datos de configuración para el frontend
   */
  getCheckoutConfig(sessionKey: string, amount: number, purchaseNumber: string) {
    const credentials = this.getCredentials();

    return {
      sessionKey,
      merchantId: credentials.merchantId,
      purchaseNumber,
      amount: amount.toFixed(2),
      channel: NIUBIZ_CONFIG.channel,
      checkoutJs: NIUBIZ_CONFIG.urls.checkoutJs,
      callbackUrl: NIUBIZ_CONFIG.callbackUrl,
      environment: NIUBIZ_CONFIG.environment,
    };
  }

  /**
   * Obtener credenciales según ambiente
   */
  private getCredentials() {
    if (NIUBIZ_CONFIG.environment === 'sandbox' && !NIUBIZ_CONFIG.merchantId) {
      // Usar credenciales de prueba si no están configuradas
      return {
        merchantId: NIUBIZ_TEST_CREDENTIALS.merchantIdSoles,
        username: NIUBIZ_TEST_CREDENTIALS.username,
        password: NIUBIZ_TEST_CREDENTIALS.password,
      };
    }

    return {
      merchantId: NIUBIZ_CONFIG.merchantId,
      username: NIUBIZ_CONFIG.username,
      password: NIUBIZ_CONFIG.password,
    };
  }
}

// Singleton instance
export const niubizRepository = new NiubizRepository();
