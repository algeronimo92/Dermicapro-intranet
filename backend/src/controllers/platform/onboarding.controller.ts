import { Request, Response } from 'express';
import crypto from 'crypto';
import { provisionTenant } from '../../platform/provision';
import { sendWelcomeEmail } from '../../platform/email';
import { AppError } from '../../middlewares/errorHandler';
import { config } from '../../config/env';

function generateTempPassword(): string {
  return crypto.randomBytes(8).toString('hex');
}

function buildLoginUrl(slug: string): string {
  const domain = config.platform.domain;
  const protocol = config.env === 'production' ? 'https' : 'http';
  const port = config.env === 'production' ? '' : ':5173';
  return `${protocol}://${slug}.${domain}${port}/login`;
}

export const registerTenantHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, contactEmail, contactPhone, adminFirstName, adminLastName, adminEmail } = req.body;
    if (!name || !slug || !adminEmail || !adminFirstName || !adminLastName) {
      throw new AppError('name, slug, adminEmail, adminFirstName y adminLastName son requeridos', 400);
    }

    const tempPassword = generateTempPassword();
    const result = await provisionTenant({
      name,
      slug,
      contactEmail: contactEmail ?? adminEmail,
      contactPhone,
      adminEmail,
      adminPassword: tempPassword,
      adminFirstName,
      adminLastName,
    });

    const loginUrl = buildLoginUrl(slug);

    sendWelcomeEmail({
      to: adminEmail,
      clinicName: name,
      adminFirstName,
      slug,
      tempPassword,
      loginUrl,
    }).catch((err) => console.error('[onboarding] Failed to send welcome email:', err));

    res.status(201).json({
      data: {
        tenant: result.tenant,
        loginUrl,
        adminEmail,
        tempPassword,
        migrationsApplied: result.migrationsApplied,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
    } else if (err instanceof Error && err.message.startsWith('Ya existe')) {
      res.status(409).json({ error: err.message });
    } else if (err instanceof Error && err.message.startsWith('Slug inválido')) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Error al registrar la clínica' });
    }
  }
};
