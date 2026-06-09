import { Request, Response, NextFunction } from 'express';

const SENSITIVE_FIELDS = new Set(['password', 'token', 'secret', 'authorization', 'cookie']);
const MAX_BODY_LENGTH = 2000;

function sanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE_FIELDS.has(k.toLowerCase()) ? '[REDACTED]' : sanitize(v),
    ])
  );
}

function truncate(data: unknown): unknown {
  const str = JSON.stringify(data);
  if (str.length <= MAX_BODY_LENGTH) return data;
  return { _truncated: true, _length: str.length, _preview: str.slice(0, MAX_BODY_LENGTH) };
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startAt = process.hrtime();
  const originalJson = res.json.bind(res);
  let responseBody: unknown;

  res.json = function (body: unknown) {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const [sec, ns] = process.hrtime(startAt);
    const durationMs = Math.round(sec * 1000 + ns / 1e6);
    const isError = res.statusCode >= 400;

    const entry: Record<string, unknown> = {
      event: 'http_request',
      method: req.method,
      uri: req.originalUrl,
      status: res.statusCode,
      duration_ms: durationMs,
      ip: req.ip,
    };

    if (req.body && Object.keys(req.body).length > 0) {
      entry.request_body = truncate(sanitize(req.body));
    }

    if (responseBody !== undefined) {
      entry.response_body = JSON.stringify(truncate(responseBody));
    }

    if (isError) {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  });

  next();
}
