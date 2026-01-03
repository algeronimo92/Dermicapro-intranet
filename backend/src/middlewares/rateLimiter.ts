import rateLimit from 'express-rate-limit';

/**
 * Rate limiter general para toda la API
 * Límite: 100 peticiones por 15 minutos por IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por ventana
  message: {
    error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Retorna info de rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
  // Handler cuando se excede el límite
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiadas peticiones desde esta IP',
      message: 'Has excedido el límite de peticiones. Por favor intenta de nuevo más tarde.',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * Rate limiter estricto para endpoints de autenticación
 * Límite: 50 intentos por 15 minutos por IP (desarrollo)
 * En producción debería ser más estricto (5 intentos)
 * Previene ataques de fuerza bruta
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 5 : 200, // Límite flexible para desarrollo
  skipSuccessfulRequests: true, // No cuenta peticiones exitosas
  message: {
    error: 'Demasiados intentos de autenticación fallidos',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiados intentos de autenticación',
      message: 'Has excedido el límite de intentos de inicio de sesión. Por favor intenta de nuevo en 15 minutos.',
      retryAfter: '15 minutos'
    });
  }
});

/**
 * Rate limiter para creación de recursos
 * Límite: 30 peticiones por hora por IP
 * Previene spam y creación masiva de registros
 */
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 30, // Límite de 30 creaciones por hora
  message: {
    error: 'Demasiadas operaciones de creación',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Límite de creación excedido',
      message: 'Has excedido el límite de creación de registros. Por favor intenta de nuevo más tarde.',
      retryAfter: '1 hora'
    });
  }
});

/**
 * Rate limiter para uploads de archivos
 * Límite: 10 uploads por hora por IP
 * Previene saturación del servidor con archivos
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Límite de 10 uploads por hora
  message: {
    error: 'Demasiadas subidas de archivos',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Límite de subida de archivos excedido',
      message: 'Has excedido el límite de subida de archivos. Por favor intenta de nuevo más tarde.',
      retryAfter: '1 hora'
    });
  }
});
