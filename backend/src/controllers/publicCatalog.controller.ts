import { Request, Response } from 'express';
import { logUnexpectedError } from '../middlewares/errorHandler';
import prisma from '../config/database';

// Catálogo público de servicios y paquetes — solo lectura, sin datos de comisión
// ni de negocio interno. Pensado para consumo externo (ej. mostrar precios en un sitio web).
export const getPublicCatalog = async (req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        packages: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            sessions: true,
            price: true,
            label: true,
          },
          orderBy: { sessions: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ data: services });
  } catch (error: any) {
    logUnexpectedError(req, error);
    res.status(500).json({ message: 'Error al obtener el catálogo', error: error.message });
  }
};
