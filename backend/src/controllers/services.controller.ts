import { Request, Response } from 'express';
import prisma from '../config/database';

const PACKAGES_ORDER = { sessions: 'asc' as const };

export const validateCommissionFields = (body: any): string | null => {
  const { commissionType, commissionRate, commissionFixedAmount } = body;

  if (commissionRate !== undefined && commissionRate !== null && (commissionRate < 0 || commissionRate > 1)) {
    return 'La tasa de comisión debe estar entre 0 y 1 (0% - 100%)';
  }

  if (commissionFixedAmount !== undefined && commissionFixedAmount !== null && commissionFixedAmount < 0) {
    return 'El monto fijo de comisión debe ser mayor o igual a 0';
  }

  if (commissionType && !['percentage', 'fixed'].includes(commissionType)) {
    return 'El tipo de comisión debe ser "percentage" o "fixed"';
  }

  return null;
};

export const getServices = async (req: Request, res: Response) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';

    const services = await prisma.service.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      include: {
        packages: {
          where: includeDeleted ? {} : { deletedAt: null },
          orderBy: PACKAGES_ORDER
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener servicios', error: error.message });
  }
};

export const getActiveServices = async (_req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      include: {
        packages: {
          where: { isActive: true, deletedAt: null },
          orderBy: PACKAGES_ORDER
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener servicios activos', error: error.message });
  }
};

export const getService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({
      where: { id },
      include: { packages: { orderBy: PACKAGES_ORDER } }
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    return res.json(service);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al obtener servicio', error: error.message });
  }
};

export const createService = async (req: Request, res: Response) => {
  try {
    const { name, description, icon, isActive, commissionType, commissionRate, commissionFixedAmount, commissionNotes } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    const commissionError = validateCommissionFields(req.body);
    if (commissionError) {
      return res.status(400).json({ message: commissionError });
    }

    const service = await prisma.service.create({
      data: {
        name,
        description,
        icon,
        isActive: isActive !== undefined ? isActive : true,
        commissionType: commissionType || 'percentage',
        commissionRate: commissionRate !== undefined ? commissionRate : null,
        commissionFixedAmount: commissionFixedAmount !== undefined ? commissionFixedAmount : null,
        commissionNotes: commissionNotes || null,
      },
      include: { packages: true }
    });

    return res.status(201).json(service);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al crear servicio', error: error.message });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, icon, isActive, commissionType, commissionRate, commissionFixedAmount, commissionNotes } = req.body;

    const existingService = await prisma.service.findUnique({ where: { id } });

    if (!existingService) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const commissionError = validateCommissionFields(req.body);
    if (commissionError) {
      return res.status(400).json({ message: commissionError });
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        name,
        description,
        icon,
        isActive,
        commissionType: commissionType !== undefined ? commissionType : undefined,
        commissionRate: commissionRate !== undefined ? commissionRate : undefined,
        commissionFixedAmount: commissionFixedAmount !== undefined ? commissionFixedAmount : undefined,
        commissionNotes: commissionNotes !== undefined ? commissionNotes : undefined,
      },
      include: { packages: { orderBy: PACKAGES_ORDER } }
    });

    return res.json(service);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al actualizar servicio', error: error.message });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingService = await prisma.service.findUnique({ where: { id } });

    if (!existingService) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    if (existingService.deletedAt) {
      return res.status(400).json({ message: 'El servicio ya está eliminado' });
    }

    // Soft delete en cascada: el servicio y todos sus paquetes
    await prisma.$transaction([
      prisma.service.update({ where: { id }, data: { deletedAt: new Date() } }),
      prisma.servicePackage.updateMany({ where: { serviceId: id, deletedAt: null }, data: { deletedAt: new Date() } })
    ]);

    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al eliminar servicio', error: error.message });
  }
};

export const restoreService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingService = await prisma.service.findUnique({ where: { id } });

    if (!existingService) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    if (!existingService.deletedAt) {
      return res.status(400).json({ message: 'El servicio no está eliminado' });
    }

    const service = await prisma.service.update({
      where: { id },
      data: { deletedAt: null },
      include: { packages: { orderBy: PACKAGES_ORDER } }
    });

    return res.json(service);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al restaurar servicio', error: error.message });
  }
};
