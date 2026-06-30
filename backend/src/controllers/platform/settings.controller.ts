import { Request, Response } from 'express';
import platformPool from '../../platform/db';

const SETTINGS_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from', 'platform_domain', 'max_tenants'] as const;
type SettingKey = typeof SETTINGS_KEYS[number];

async function getAllSettings(): Promise<Record<SettingKey, string | null>> {
  const result = await platformPool.query(
    'SELECT key, value FROM platform_settings WHERE key = ANY($1)',
    [SETTINGS_KEYS],
  );
  const map: Record<string, string | null> = {};
  for (const row of result.rows) map[row.key] = row.value;
  const out = {} as Record<SettingKey, string | null>;
  for (const key of SETTINGS_KEYS) out[key] = map[key] ?? null;
  return out;
}

function toResponse(raw: Record<SettingKey, string | null>, maskPassword = true) {
  return {
    smtpHost: raw.smtp_host,
    smtpPort: raw.smtp_port ? parseInt(raw.smtp_port, 10) : null,
    smtpUser: raw.smtp_user,
    smtpPassword: maskPassword && raw.smtp_password ? '••••••••' : raw.smtp_password,
    smtpFrom: raw.smtp_from,
    platformDomain: raw.platform_domain,
    maxTenants: raw.max_tenants ? parseInt(raw.max_tenants, 10) : null,
  };
}

export const getSettingsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const raw = await getAllSettings();
    res.json({ data: toResponse(raw) });
  } catch {
    res.status(500).json({ error: 'Error al obtener configuracion' });
  }
};

export const updateSettingsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom, platformDomain, maxTenants } = req.body;
    const updates: Array<[SettingKey, string]> = [];
    if (smtpHost !== undefined) updates.push(['smtp_host', String(smtpHost || '')]);
    if (smtpPort !== undefined) updates.push(['smtp_port', String(smtpPort || '')]);
    if (smtpUser !== undefined) updates.push(['smtp_user', String(smtpUser || '')]);
    if (smtpPassword !== undefined && smtpPassword !== '••••••••') updates.push(['smtp_password', String(smtpPassword || '')]);
    if (smtpFrom !== undefined) updates.push(['smtp_from', String(smtpFrom || '')]);
    if (platformDomain !== undefined) updates.push(['platform_domain', String(platformDomain || '')]);
    if (maxTenants !== undefined) updates.push(['max_tenants', String(maxTenants || '')]);

    for (const [key, value] of updates) {
      await platformPool.query(
        `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value],
      );
    }
    const raw = await getAllSettings();
    res.json({ data: toResponse(raw) });
  } catch {
    res.status(500).json({ error: 'Error al guardar configuracion' });
  }
};
