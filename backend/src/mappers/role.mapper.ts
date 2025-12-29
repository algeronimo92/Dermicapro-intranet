import { SystemRole, Permission, RolePermission } from '@prisma/client';

type RoleWithRelations = SystemRole & {
  permissions: (RolePermission & {
    permission: Permission;
  })[];
  _count?: {
    users: number;
  };
};

type RoleWithUsers = SystemRole & {
  permissions: (RolePermission & {
    permission: Permission;
  })[];
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  }>;
};

export interface RoleDTO {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
  usersCount?: number;
  permissions: PermissionDTO[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleDetailDTO extends RoleDTO {
  users: UserSummaryDTO[];
}

export interface PermissionDTO {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  module: string;
  action: string;
}

export interface UserSummaryDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export class RoleMapper {
  toDTO(role: RoleWithRelations): RoleDTO {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      isSystem: role.isSystem,
      usersCount: role._count?.users,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        displayName: rp.permission.displayName,
        description: rp.permission.description,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  toDetailDTO(role: RoleWithUsers): RoleDetailDTO {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isActive: role.isActive,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        displayName: rp.permission.displayName,
        description: rp.permission.description,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
      users: role.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  toDTOList(roles: RoleWithRelations[]): RoleDTO[] {
    return roles.map((role) => this.toDTO(role));
  }
}

export const roleMapper = new RoleMapper();
