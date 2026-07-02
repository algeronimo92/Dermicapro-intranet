import { Request, Response } from 'express';
import prisma from '../config/database';
import { validateCommissionFields } from './services.controller';

export const getPackagesByService = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';

    const packages = await prisma.servicePackage.findMany({
      where: {
        serviceId,
        ...(includeDeleted ? {} : { deletedAt: null })
      },
      orderBy: { sessions: 'asc' }
    });

    return res.json(packages);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al obtener paquetes', error: error.message });
  }
};

export const createPackage = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const { sessions, price, label, isActive, commissionType, commissionRate, commissionFixedAmount } = req.body;

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    if (price === undefined || price === null) {
      return res.status(400).json({ message: 'El precio es requerido' });
    }

    if (price < 0) {
      return res.status(400).json({ message: 'El precio debe ser mayor o igual a 0' });
    }

    if (sessions !== undefined && sessions < 1) {
      return res.status(400).json({ message: 'El número de sesiones debe ser al menos 1' });
    }

    const commissionError = validateCommissionFields(req.body);
    if (commissionError) {
      return res.status(400).json({ message: commissionError });
    }

    const servicePackage = await prisma.servicePackage.create({
      data: {
        serviceId,
        sessions: sessions || 1,
        price,
        label: label || null,
        isActive: isActive !== undefined ? isActive : true,
        commissionType: commissionType || null,
        commissionRate: commissionRate !== undefined ? commissionRate : null,
        commissionFixedAmount: commissionFixedAmount !== undefined ? commissionFixedAmount : null,
      }
    });

    return res.status(201).json(servicePackage);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al crear paquete', error: error.message });
  }
};

export const updatePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sessions, price, label, isActive, commissionType, commissionRate, commissionFixedAmount } = req.body;

    const existingPackage = await prisma.servicePackage.findUnique({ where: { id } });
    if (!existingPackage) {
      return res.status(404).json({ message: 'Paquete no encontrado' });
    }

    if (price !== undefined && price < 0) {
      return res.status(400).json({ message: 'El precio debe ser mayor o igual a 0' });
    }

    if (sessions !== undefined && sessions < 1) {
      return res.status(400).json({ message: 'El número de sesiones debe ser al menos 1' });
    }

    const commissionError = validateCommissionFields(req.body);
    if (commissionError) {
      return res.status(400).json({ message: commissionError });
    }

    const servicePackage = await prisma.servicePackage.update({
      where: { id },
      data: {
        sessions,
        price,
        label: label !== undefined ? label : undefined,
        isActive,
        // null explícito borra el override y vuelve a heredar del Service padre
        commissionType: commissionType !== undefined ? commissionType : undefined,
        commissionRate: commissionRate !== undefined ? commissionRate : undefined,
        commissionFixedAmount: commissionFixedAmount !== undefined ? commissionFixedAmount : undefined,
      }
    });

    return res.json(servicePackage);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al actualizar paquete', error: error.message });
  }
};

export const deletePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingPackage = await prisma.servicePackage.findUnique({ where: { id } });
    if (!existingPackage) {
      return res.status(404).json({ message: 'Paquete no encontrado' });
    }

    if (existingPackage.deletedAt) {
      return res.status(400).json({ message: 'El paquete ya está eliminado' });
    }

    await prisma.servicePackage.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al eliminar paquete', error: error.message });
  }
};

export const restorePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingPackage = await prisma.servicePackage.findUnique({ where: { id } });
    if (!existingPackage) {
      return res.status(404).json({ message: 'Paquete no encontrado' });
    }

    if (!existingPackage.deletedAt) {
      return res.status(400).json({ message: 'El paquete no está eliminado' });
    }

    const servicePackage = await prisma.servicePackage.update({
      where: { id },
      data: { deletedAt: null }
    });

    return res.json(servicePackage);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error al restaurar paquete', error: error.message });
  }
};
