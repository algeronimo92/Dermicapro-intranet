import { Request, Response } from 'express';
import { findActiveTenantBySlug } from '../../platform/queries';
import { getTenantPrisma } from '../../platform/tenant-prisma';
import { generateAccessToken } from '../../utils/jwt';
import { AppError } from '../../middlewares/errorHandler';
import { config } from '../../config/env';

export const impersonateTenantHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const tenant = await findActiveTenantBySlug(slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);

    const prisma = getTenantPrisma(slug);
    const adminUser = await prisma.user.findFirst({
      where: { role: { name: 'admin' } },
      select: { id: true, email: true, roleId: true, role: { select: { name: true } } },
    });
    if (!adminUser) throw new AppError('No existe un usuario admin en esta clinica', 404);

    const token = generateAccessToken({
      id: adminUser.id,
      email: adminUser.email,
      roleId: adminUser.roleId,
      roleName: adminUser.role?.name,
      tenantSlug: slug,
    });

    const domain = config.platform.domain;
    const port = process.env.NODE_ENV === 'development' ? ':5173' : '';
    const loginUrl = `http://${slug}.${domain}${port}/impersonate?token=${token}`;

    res.json({ data: { token, userEmail: adminUser.email, loginUrl } });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al generar sesión de impersonación' });
  }
};
