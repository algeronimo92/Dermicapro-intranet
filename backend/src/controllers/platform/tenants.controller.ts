import { Request, Response } from 'express';
import {
  listAllTenants,
  findTenantBySlug,
  updateTenant,
  setTenantActive,
  listTenantMigrations,
  getTenantMetrics,
  getFailedMigrationsSummary,
} from '../../platform/queries';
import { provisionTenant } from '../../platform/provision';
import { AppError } from '../../middlewares/errorHandler';
import { aggregateTenantMetrics } from '../../platform/metrics';

export const listTenants = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tenants = await listAllTenants();
    res.json({ data: tenants, total: tenants.length });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clinicas' });
  }
};

export const getTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    res.json({ data: tenant });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al obtener clinica' });
  }
};

export const createTenantHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, contactEmail, contactPhone, logoUrl, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;
    if (!name || !slug) throw new AppError('name y slug son requeridos', 400);
    const result = await provisionTenant({ name, slug, contactEmail, contactPhone, logoUrl, adminEmail, adminPassword, adminFirstName, adminLastName });
    res.status(201).json({ data: result });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al crear clinica' });
  }
};

export const updateTenantHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    const updated = await updateTenant(tenant.id, req.body);
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al actualizar clinica' });
  }
};

export const activateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    const updated = await setTenantActive(tenant.id, true);
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al activar clinica' });
  }
};

export const deactivateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    const updated = await setTenantActive(tenant.id, false);
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al desactivar clinica' });
  }
};

export const getTenantMigrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    const migrations = await listTenantMigrations(tenant.id);
    res.json({ data: migrations });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al obtener migraciones' });
  }
};

export const getTenantMetricsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    const metrics = await getTenantMetrics(tenant.id);
    if (!metrics) throw new AppError('Métricas no disponibles aún. Espere el siguiente ciclo de actualización.', 404);
    res.json({ data: metrics });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al obtener métricas' });
  }
};

export const refreshTenantMetricsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await findTenantBySlug(req.params.slug);
    if (!tenant) throw new AppError('Clinica no encontrada', 404);
    await aggregateTenantMetrics(tenant.slug, tenant.id);
    const metrics = await getTenantMetrics(tenant.id);
    res.json({ data: metrics });
  } catch (err) {
    if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message });
    else res.status(500).json({ error: 'Error al actualizar métricas' });
  }
};

export const getFailedMigrationsSummaryHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await getFailedMigrationsSummary();
    const totalFailed = rows.reduce((s, r) => s + r.failedCount, 0);
    res.json({
      data: {
        totalFailed,
        tenants: rows.map((r) => ({ slug: r.tenantSlug, name: r.tenantName, failedCount: r.failedCount })),
      },
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener resumen de migraciones' });
  }
};
