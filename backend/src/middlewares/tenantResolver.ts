import { Request, Response, NextFunction } from 'express';
import { findActiveTenantBySlug } from '../platform/queries';
import { getTenantPrisma } from '../platform/tenant-prisma';

const PLATFORM_SUBDOMAINS = ['admin', 'www', 'api'];

function extractSlug(hostname: string): string | null {
  // hostname examples:
  //   dermicapro.plataforma.com  -> dermicapro
  //   dermicapro.localhost       -> dermicapro
  //   localhost                  -> null (no subdomain)
  //   admin.plataforma.com      -> admin (platform subdomain, skip)

  const parts = hostname.split('.');

  // No subdomain: "localhost" or "plataforma.com"
  if (parts.length <= 1) return null;
  // "plataforma.com" (just domain + tld) or "localhost" edge cases
  if (parts.length === 2 && parts[1] !== 'localhost') return null;

  const subdomain = parts[0];

  if (PLATFORM_SUBDOMAINS.includes(subdomain)) return null;

  return subdomain;
}

export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const slug = extractSlug(req.hostname);

    if (!slug) {
      next();
      return;
    }

    const tenant = await findActiveTenantBySlug(slug);

    if (!tenant) {
      res.status(404).json({ error: 'Clinica no encontrada' });
      return;
    }

    req.tenant = tenant;
    req.tenantPrisma = getTenantPrisma(tenant.slug);
    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ error: 'Error al resolver clinica' });
  }
}
