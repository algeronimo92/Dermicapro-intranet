const PLATFORM_SUBDOMAINS = ['admin', 'www', 'api'];

export function getTenantSlug(): string | null {
  const parts = window.location.hostname.split('.');
  if (parts.length <= 1) return null;
  if (parts.length === 2 && parts[1] !== 'localhost') return null;
  const subdomain = parts[0];
  if (PLATFORM_SUBDOMAINS.includes(subdomain)) return null;
  return subdomain;
}

export function hasTenantSubdomain(): boolean {
  return getTenantSlug() !== null;
}
