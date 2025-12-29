import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export interface CreateRoleDTO {
  name: string;
  displayName: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleDTO {
  name?: string;
  displayName?: string;
  description?: string;
  isActive?: boolean;
  permissionIds?: string[];
}

export interface RoleFilters {
  includeInactive?: boolean;
}

export class RoleService {
  private readonly roleInclude = {
    permissions: {
      include: {
        permission: true,
      },
    },
    _count: {
      select: {
        users: true,
      },
    },
  };

  async findAll(filters: RoleFilters = {}) {
    const where: Prisma.SystemRoleWhereInput = filters.includeInactive
      ? {}
      : { isActive: true };

    return prisma.systemRole.findMany({
      where,
      include: this.roleInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.systemRole.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findByName(name: string) {
    return prisma.systemRole.findUnique({
      where: { name },
    });
  }

  async create(data: CreateRoleDTO) {
    const { permissionIds, ...roleData } = data;

    return prisma.systemRole.create({
      data: {
        ...roleData,
        permissions: permissionIds?.length
          ? {
              create: permissionIds.map((permissionId) => ({
                permission: { connect: { id: permissionId } },
              })),
            }
          : undefined,
      },
      include: this.roleInclude,
    });
  }

  async update(id: string, data: UpdateRoleDTO) {
    const { permissionIds, ...updateData } = data;

    return prisma.systemRole.update({
      where: { id },
      data: {
        ...updateData,
        permissions: permissionIds
          ? {
              deleteMany: {},
              create: permissionIds.map((permissionId) => ({
                permission: { connect: { id: permissionId } },
              })),
            }
          : undefined,
      },
      include: this.roleInclude,
    });
  }

  async delete(id: string) {
    return prisma.systemRole.delete({
      where: { id },
    });
  }

  async toggleStatus(id: string, isActive: boolean) {
    return prisma.systemRole.update({
      where: { id },
      data: { isActive },
      include: this.roleInclude,
    });
  }

  async getUserCount(id: string): Promise<number> {
    return prisma.user.count({
      where: { roleId: id },
    });
  }
}

export const roleService = new RoleService();
