import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

/**
 * Middleware para verificar que el usuario tenga un permiso específico
 * @param permissionName - Nombre del permiso requerido (e.g., "patients.create")
 */
export const requirePermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      // Obtener el usuario con su rol y permisos
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.role) {
        res.status(403).json({ error: 'Usuario sin rol asignado' });
        return;
      }

      // Verificar si el rol está activo
      if (!user.role.isActive) {
        res.status(403).json({ error: 'El rol del usuario está desactivado' });
        return;
      }

      // Verificar si el usuario tiene el permiso requerido
      const hasPermission = user.role.permissions.some(
        (rp) => rp.permission.name === permissionName
      );

      if (!hasPermission) {
        res.status(403).json({
          error: 'Permisos insuficientes',
          required: permissionName
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
};

/**
 * Middleware para verificar que el usuario tenga al menos uno de varios permisos
 * @param permissionNames - Array de nombres de permisos
 */
export const requireAnyPermission = (permissionNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.role) {
        res.status(403).json({ error: 'Usuario sin rol asignado' });
        return;
      }

      if (!user.role.isActive) {
        res.status(403).json({ error: 'El rol del usuario está desactivado' });
        return;
      }

      const hasAnyPermission = user.role.permissions.some((rp) =>
        permissionNames.includes(rp.permission.name)
      );

      if (!hasAnyPermission) {
        res.status(403).json({
          error: 'Permisos insuficientes',
          required: `Uno de: ${permissionNames.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking permissions:', error);
      res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
};

/**
 * Middleware para verificar que el usuario tenga todos los permisos especificados
 * @param permissionNames - Array de nombres de permisos requeridos
 */
export const requireAllPermissions = (permissionNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.role) {
        res.status(403).json({ error: 'Usuario sin rol asignado' });
        return;
      }

      if (!user.role.isActive) {
        res.status(403).json({ error: 'El rol del usuario está desactivado' });
        return;
      }

      const userPermissions = user.role.permissions.map((rp) => rp.permission.name);
      const hasAllPermissions = permissionNames.every((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasAllPermissions) {
        const missing = permissionNames.filter(
          (perm) => !userPermissions.includes(perm)
        );
        res.status(403).json({
          error: 'Permisos insuficientes',
          missing
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking permissions:', error);
      res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
};

/**
 * Middleware para verificar que el usuario tenga un rol específico por nombre
 * @param roleNames - Nombres de roles permitidos
 */
export const requireRole = (roleNames: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          role: true,
        },
      });

      if (!user || !user.role) {
        res.status(403).json({ error: 'Usuario sin rol asignado' });
        return;
      }

      if (!user.role.isActive) {
        res.status(403).json({ error: 'El rol del usuario está desactivado' });
        return;
      }

      const allowedRoles = Array.isArray(roleNames) ? roleNames : [roleNames];
      const hasRole = allowedRoles.includes(user.role.name);

      if (!hasRole) {
        res.status(403).json({
          error: 'Rol insuficiente',
          required: allowedRoles
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking role:', error);
      res.status(500).json({ error: 'Error al verificar rol' });
    }
  };
};

/**
 * Helper para verificar si un usuario tiene un permiso específico (sin middleware)
 */
export const userHasPermission = async (
  userId: string,
  permissionName: string
): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.role || !user.role.isActive) {
      return false;
    }

    return user.role.permissions.some(
      (rp) => rp.permission.name === permissionName
    );
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
};

/**
 * Helper para obtener todos los permisos de un usuario
 */
export const getUserPermissions = async (userId: string): Promise<string[]> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.role || !user.role.isActive) {
      return [];
    }

    return user.role.permissions.map((rp) => rp.permission.name);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
};
