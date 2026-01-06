import { Request, Response } from 'express';
import prisma from '../config/database';

export const getServices = async (req: Request, res: Response) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';

    const services = await prisma.service.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { name: 'asc' }
    });
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener servicios', error: error.message });
  }
};

export const getActiveServices = async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      where: {
        isActive: true,
        deletedAt: null
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
      where: { id }
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
    const { name, description, basePrice, defaultSessions, isActive, commissionType, commissionRate, commissionFixedAmount, commissionNotes } = req.body;

    // Validaciones
    if (!name || !basePrice) {
      return res.status(400).json({ message: 'Nombre y precio son requeridos' });
    }

    if (basePrice < 0) {
      return res.status(400).json({ message: 'El precio debe ser mayor o igual a 0' });
    }

    if (defaultSessions !== undefined && defaultSessions < 1) {
      return res.status(400).json({ message: 'El número de sesiones debe ser al menos 1' });
    }

    if (commissionRate !== undefined && (commissionRate < 0 || commissionRate > 1)) {
      return res.status(400).json({ message: 'La tasa de comisión debe estar entre 0 y 1 (0% - 100%)' });
    }

    if (commissionFixedAmount !== undefined && commissionFixedAmount < 0) {
      return res.status(400).json({ message: 'El monto fijo de comisión debe ser mayor o igual a 0' });
    }

    if (commissionType && !['percentage', 'fixed'].includes(commissionType)) {
      return res.status(400).json({ message: 'El tipo de comisión debe ser "percentage" o "fixed"' });
    }

    const service = await prisma.service.create({
      data: {
        name,
        description,
        basePrice,
        defaultSessions: defaultSessions || 1,
        isActive: isActive !== undefined ? isActive : true,
        commissionType: commissionType || 'percentage',
        commissionRate: commissionRate !== undefined ? commissionRate : null,
        commissionFixedAmount: commissionFixedAmount !== undefined ? commissionFixedAmount : null,
        commissionNotes: commissionNotes || null,
      }
    });

    return res.status(201).json(service);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al crear servicio', error: error.message });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, basePrice, defaultSessions, isActive, commissionType, commissionRate, commissionFixedAmount, commissionNotes } = req.body;

    // Verificar que el servicio existe
    const existingService = await prisma.service.findUnique({
      where: { id }
    });

    if (!existingService) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // Validaciones
    if (basePrice !== undefined && basePrice < 0) {
      return res.status(400).json({ message: 'El precio debe ser mayor o igual a 0' });
    }

    if (defaultSessions !== undefined && defaultSessions < 1) {
      return res.status(400).json({ message: 'El número de sesiones debe ser al menos 1' });
    }

    if (commissionRate !== undefined && commissionRate !== null && (commissionRate < 0 || commissionRate > 1)) {
      return res.status(400).json({ message: 'La tasa de comisión debe estar entre 0 y 1 (0% - 100%)' });
    }

    if (commissionFixedAmount !== undefined && commissionFixedAmount !== null && commissionFixedAmount < 0) {
      return res.status(400).json({ message: 'El monto fijo de comisión debe ser mayor o igual a 0' });
    }

    if (commissionType && !['percentage', 'fixed'].includes(commissionType)) {
      return res.status(400).json({ message: 'El tipo de comisión debe ser "percentage" o "fixed"' });
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        name,
        description,
        basePrice,
        defaultSessions,
        isActive,
        commissionType: commissionType !== undefined ? commissionType : undefined,
        commissionRate: commissionRate !== undefined ? commissionRate : undefined,
        commissionFixedAmount: commissionFixedAmount !== undefined ? commissionFixedAmount : undefined,
        commissionNotes: commissionNotes !== undefined ? commissionNotes : undefined,
      }
    });

    return res.json(service);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al actualizar servicio', error: error.message });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que el servicio existe
    const existingService = await prisma.service.findUnique({
      where: { id }
    });

    if (!existingService) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    if (existingService.deletedAt) {
      return res.status(400).json({ message: 'El servicio ya está eliminado' });
    }

    // Soft delete: solo actualizar deletedAt
    await prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al eliminar servicio', error: error.message });
  }
};

export const restoreService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que el servicio existe
    const existingService = await prisma.service.findUnique({
      where: { id }
    });

    if (!existingService) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    if (!existingService.deletedAt) {
      return res.status(400).json({ message: 'El servicio no está eliminado' });
    }

    // Restaurar: poner deletedAt a null
    const service = await prisma.service.update({
      where: { id },
      data: { deletedAt: null }
    });

    return res.json(service);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al restaurar servicio', error: error.message });
  }
};
