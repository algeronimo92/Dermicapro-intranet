import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import jwt from 'jsonwebtoken';

// Decodifica el JWT sin verificarlo solo para extraer el user ID como clave del rate limiter.
// La verificación real sigue ocurriendo en el middleware de autenticación.
function getUserKey(req: Request): string {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.decode(auth.split(' ')[1]) as { id?: string } | null;
      if (decoded?.id) return `user:${decoded.id}`;
    } catch {
      // fall through to IP
    }
  }
  return `ip:${req.ip ?? 'unknown'}`;
}

// 500 requests por usuario por 15 minutos en producción.
// Cada usuario tiene su propio contador, así toda la clínica en la misma WiFi no comparte el límite.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  skip: () => process.env.NODE_ENV !== 'production',
  keyGenerator: getUserKey,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Demasiadas peticiones',
      message: 'Has excedido el límite de peticiones. Por favor intenta de nuevo más tarde.',
      retryAfter: '15 minutos'
    });
  }
});

// Rate limiter estricto para endpoints de autenticación (por IP, no por usuario).
// Previene fuerza bruta en login.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 20 : 200,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Demasiados intentos de autenticación',
      message: 'Has excedido el límite de intentos de inicio de sesión. Por favor intenta de nuevo en 15 minutos.',
      retryAfter: '15 minutos'
    });
  }
});

// Rate limiter para creación de recursos — por usuario autenticado.
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 100,
  skip: () => process.env.NODE_ENV !== 'production',
  keyGenerator: getUserKey,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Límite de creación excedido',
      message: 'Has excedido el límite de creación de registros. Por favor intenta de nuevo más tarde.',
      retryAfter: '1 hora'
    });
  }
});

// Rate limiter para uploads — por usuario autenticado.
// validate.keyGeneratorIpFallback=false: el keyGenerator usa user ID (no IP) en rutas autenticadas.
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  skip: () => process.env.NODE_ENV !== 'production',
  keyGenerator: getUserKey,
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Límite de subida de archivos excedido',
      message: 'Has excedido el límite de subida de archivos. Por favor intenta de nuevo más tarde.',
      retryAfter: '1 hora'
    });
  }
});
