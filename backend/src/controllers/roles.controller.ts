import { Request, Response } from 'express';
import { getPrisma } from '../utils/tenant';

export const getAllRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = await getPrisma(req).role.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
      },
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};
