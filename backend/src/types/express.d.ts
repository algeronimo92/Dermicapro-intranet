import { PrismaClient } from '@prisma/client';
import { Tenant } from '../platform/types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roleId?: string | null;
        roleName?: string;
        tenantSlug?: string;
      };
      patient?: {
        id: string;
        email: string | null;
        firstName: string;
        lastName: string;
        dni: string;
        hasPortalAccess: boolean;
      };
      tenant?: Tenant;
      tenantPrisma?: PrismaClient;
    }
  }
}

export {};
