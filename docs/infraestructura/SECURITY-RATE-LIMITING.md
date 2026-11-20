# 🛡️ Rate Limiting - Documentación de Seguridad

## ¿Qué es Rate Limiting?

El **rate limiting** es una técnica de seguridad que limita el número de peticiones que un cliente puede hacer a tu API en un período de tiempo determinado. Esto protege tu aplicación contra:

- ✅ Ataques de fuerza bruta (intentos masivos de login)
- ✅ Ataques DDoS (saturación del servidor)
- ✅ Spam y abuso de recursos
- ✅ Scraping automatizado
- ✅ Creación masiva de registros

## Configuración Implementada

### 1. **Rate Limiter General** (`generalLimiter`)
- **Endpoint**: Todos los endpoints de `/api/*`
- **Límite**: 100 peticiones por 15 minutos
- **Por**: Dirección IP
- **Propósito**: Protección general contra abuso

```typescript
// Ejemplo de uso automático
GET /api/patients
GET /api/appointments
```

### 2. **Rate Limiter de Autenticación** (`authLimiter`)
- **Endpoints**:
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
- **Límite**: 5 intentos por 15 minutos
- **Por**: IP + email/username
- **Propósito**: Prevenir ataques de fuerza bruta en login

```typescript
// Si un usuario intenta hacer login 5 veces con credenciales incorrectas
// quedará bloqueado por 15 minutos
POST /api/auth/login
```

### 3. **Rate Limiter de Creación** (`createLimiter`)
- **Uso**: Para endpoints POST de creación
- **Límite**: 30 creaciones por hora
- **Por**: Dirección IP
- **Propósito**: Prevenir spam y creación masiva

```typescript
// Ejemplo de implementación (opcional en tus rutas)
router.post('/patients', createLimiter, createPatient);
```

### 4. **Rate Limiter de Uploads** (`uploadLimiter`)
- **Uso**: Para endpoints de subida de archivos
- **Límite**: 10 uploads por hora
- **Por**: Dirección IP
- **Propósito**: Prevenir saturación del servidor con archivos

```typescript
// Ejemplo de implementación (opcional en tus rutas)
router.post('/upload', uploadLimiter, uploadFile);
```

## Respuestas del Rate Limiter

### Cuando NO se excede el límite
El cliente recibe los siguientes headers:
```http
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1703347200
```

### Cuando SE excede el límite
Respuesta HTTP 429 (Too Many Requests):
```json
{
  "error": "Demasiadas peticiones desde esta IP",
  "message": "Has excedido el límite de peticiones. Por favor intenta de nuevo más tarde.",
  "retryAfter": "15 minutos"
}
```

## Cómo Usar en Tus Rutas

### Importar los limitadores
```typescript
import {
  generalLimiter,
  authLimiter,
  createLimiter,
  uploadLimiter
} from '../middlewares/rateLimiter';
```

### Aplicar a rutas específicas
```typescript
// Autenticación (ya implementado)
router.post('/login', authLimiter, login);

// Creación de recursos (ejemplo)
router.post('/patients', createLimiter, createPatient);

// Upload de archivos (ejemplo)
router.post('/upload-photo', uploadLimiter, uploadPhoto);
```

## Configuración Personalizada

Si necesitas ajustar los límites, edita el archivo:
```
backend/src/middlewares/rateLimiter.ts
```

### Ejemplo: Aumentar límite general
```typescript
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Cambiar a 200 peticiones
  // ... resto de la configuración
});
```

## Testing del Rate Limiter

### Probar límite general (100 req/15min)
```bash
# Hacer múltiples peticiones rápidas
for i in {1..105}; do
  curl -i http://localhost:5001/api/patients
done
# La petición 101 debería retornar 429
```

### Probar límite de login (5 req/15min)
```bash
# Intentar login 6 veces con credenciales incorrectas
for i in {1..6}; do
  curl -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@email.com","password":"wrong"}'
done
# El intento 6 debería retornar 429
```

## Monitoreo

### Ver headers de rate limit
```bash
curl -i http://localhost:5001/api/patients
```

Busca estos headers en la respuesta:
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1703347200
```

## Consideraciones de Producción

1. **Proxy Inverso (Nginx/Traefik)**
   - Asegúrate de que el proxy pase correctamente la IP real del cliente
   - Configura `trust proxy` en Express si usas proxy

2. **Redis para Rate Limiting Distribuido**
   - Para múltiples instancias del backend, considera usar Redis
   - Instalar: `npm install rate-limit-redis`

3. **Whitelist de IPs**
   - Puedes excluir IPs específicas (como monitoring tools)

4. **Logs**
   - Considera loggear cuando se alcancen los límites para detectar ataques

## Archivo de Configuración

El rate limiting está implementado en:
```
📁 backend/src/middlewares/rateLimiter.ts
```

## Estado Actual

✅ **Implementado**:
- Rate limiting general en todos los endpoints de API
- Rate limiting específico para login y refresh
- Headers estándar de rate limit
- Mensajes de error descriptivos

⏳ **Pendiente** (opcional):
- Aplicar `createLimiter` a endpoints POST de creación
- Aplicar `uploadLimiter` a endpoints de subida de archivos
- Implementar Redis para múltiples instancias
- Configurar whitelist de IPs

## Recursos Adicionales

- [express-rate-limit Documentation](https://github.com/express-rate-limit/express-rate-limit)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#rate-limiting)

---

**Última actualización**: 2025-12-23
**Versión**: 1.0.0
