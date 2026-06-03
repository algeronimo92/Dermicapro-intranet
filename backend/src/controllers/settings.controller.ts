import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

const VALID_KEYS = ['session_timeout_minutes'] as const;
type SettingKey = typeof VALID_KEYS[number];

const SETTING_META: Record<SettingKey, { description: string; min: number; max: number }> = {
  session_timeout_minutes: {
    description: 'Minutos de inactividad antes de cerrar sesión automáticamente',
    min: 1,
    max: 120,
  },
};

export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await prisma.systemSetting.findMany();
    const settings: Record<string, string> = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    // Incluir defaults para claves no guardadas aún
    for (const key of VALID_KEYS) {
      if (!(key in settings)) {
        settings[key] = getDefault(key);
      }
    }

    res.json({ data: settings });
  } catch {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.roleName !== 'admin') {
      throw new AppError('Solo los administradores pueden modificar la configuración del sistema', 403);
    }

    const { key, value } = req.body as { key: string; value: string };

    if (!VALID_KEYS.includes(key as SettingKey)) {
      throw new AppError(`Clave inválida. Permitidas: ${VALID_KEYS.join(', ')}`, 400);
    }

    const meta = SETTING_META[key as SettingKey];
    const num = Number(value);

    if (isNaN(num) || num < meta.min || num > meta.max) {
      throw new AppError(
        `Valor inválido para "${key}". Debe ser un número entre ${meta.min} y ${meta.max}.`,
        400
      );
    }

    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(num), updatedById: req.user!.id },
      create: { key, value: String(num), description: meta.description, updatedById: req.user!.id },
    });

    res.json({ data: { [updated.key]: updated.value } });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update setting' });
    }
  }
};

function getDefault(key: SettingKey): string {
  const defaults: Record<SettingKey, string> = {
    session_timeout_minutes: '5',
  };
  return defaults[key];
}
