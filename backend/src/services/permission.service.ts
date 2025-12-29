import prisma from '../config/database';

export interface CreatePermissionDTO {
  name: string;
  displayName: string;
  description?: string;
  module: string;
  action: string;
}

export class PermissionService {
  async findAll() {
    return prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  async findByModule(module: string) {
    return prisma.permission.findMany({
      where: { module },
      orderBy: { action: 'asc' },
    });
  }

  async findByName(name: string) {
    return prisma.permission.findUnique({
      where: { name },
    });
  }

  async groupByModule() {
    const permissions = await this.findAll();

    return permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);
  }

  async create(data: CreatePermissionDTO) {
    return prisma.permission.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        module: data.module,
        action: data.action,
      },
    });
  }
}

export const permissionService = new PermissionService();
