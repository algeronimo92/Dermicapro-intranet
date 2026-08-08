import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

export const registry = new client.Registry();

registry.setDefaultLabels({ app: 'dermicapro-backend' });

// Métricas del proceso Node: CPU, memoria, event loop lag, GC, handles abiertos.
client.collectDefaultMetrics({ register: registry });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status'],
  // Ajustados al perfil de esta API: la mayoría de endpoints responden <500ms,
  // los de analytics pueden llegar a varios segundos.
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP atendidas',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Peticiones HTTP actualmente en curso',
  registers: [registry],
});

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_SEGMENT = /^\d+$/;

// Prometheus degrada mucho con etiquetas de alta cardinalidad. Los IDs (uuid) y
// los DNI numéricos se colapsan a ":id", y por si algún endpoint futuro mete
// otro identificador libre en la ruta, se limita el total de rutas distintas.
const MAX_DISTINCT_ROUTES = 200;
const knownRoutes = new Set<string>();

export function normalizeRoute(path: string): string {
  const segments = path.split('?')[0].split('/').filter(Boolean);
  const normalized =
    '/' +
    segments
      .map((segment) =>
        UUID_SEGMENT.test(segment) || NUMERIC_SEGMENT.test(segment) ? ':id' : segment
      )
      .join('/');

  if (knownRoutes.has(normalized)) return normalized;
  if (knownRoutes.size >= MAX_DISTINCT_ROUTES) return '/other';

  knownRoutes.add(normalized);
  return normalized;
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // El propio scrape no debe contarse como tráfico de la aplicación.
  if (req.path === '/metrics') return next();

  const endTimer = httpRequestDuration.startTimer();
  httpRequestsInFlight.inc();

  res.on('finish', () => {
    httpRequestsInFlight.dec();
    const labels = {
      method: req.method,
      route: normalizeRoute(req.originalUrl),
      status: String(res.statusCode),
    };
    endTimer(labels);
    httpRequestsTotal.inc(labels);
  });

  // 'finish' no se emite si el cliente aborta la conexión; sin esto el gauge
  // de peticiones en curso sólo subiría.
  res.on('close', () => {
    if (!res.writableFinished) httpRequestsInFlight.dec();
  });

  next();
}

export async function metricsHandler(req: Request, res: Response): Promise<void> {
  // /metrics no está expuesto por el nginx del frontend (sólo proxea /api y
  // /uploads), pero docker-compose.prod.yml sí publica el puerto 5000, así que
  // el token es la segunda barrera. Si METRICS_TOKEN no está definido el
  // endpoint queda abierto: úsalo siempre en producción.
  const token = process.env.METRICS_TOKEN;

  if (token && req.headers.authorization !== `Bearer ${token}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to collect metrics',
    });
  }
}
