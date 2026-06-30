import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../config/database';

/**
 * Returns the tenant-scoped PrismaClient when a subdomain tenant has been
 * resolved by tenantResolver middleware, otherwise falls back to the global
 * client.  All controller handlers should use this instead of importing
 * `prisma` directly so that data is always read from / written to the correct
 * schema.
 */
export function getPrisma(req: Request): PrismaClient {
  if (req.tenant && !req.tenantPrisma) {
    throw new Error('Tenant resolved but tenantPrisma not initialised — check tenantResolver middleware');
  }
  return (req.tenantPrisma ?? prisma) as PrismaClient;
}
