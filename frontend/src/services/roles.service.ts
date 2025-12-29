import api from './api';

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  module: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
  usersCount?: number;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleDetail extends Role {
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  }>;
}

export interface CreateRoleDTO {
  name: string;
  displayName: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleDTO {
  name?: string;
  displayName?: string;
  description?: string;
  isActive?: boolean;
  permissionIds?: string[];
}

export interface PermissionsResponse {
  all: Permission[];
  byModule: Record<string, Permission[]>;
}

class RolesService {
  /**
   * Obtener todos los roles
   */
  async getAll(includeInactive = false): Promise<Role[]> {
    const response = await api.get<Role[]>('/roles', {
      params: { includeInactive },
    });
    return response.data;
  }

  /**
   * Obtener un rol por ID
   */
  async getById(id: string): Promise<RoleDetail> {
    const response = await api.get<RoleDetail>(`/roles/${id}`);
    return response.data;
  }

  /**
   * Crear un nuevo rol
   */
  async create(data: CreateRoleDTO): Promise<Role> {
    const response = await api.post<Role>('/roles', data);
    return response.data;
  }

  /**
   * Actualizar un rol
   */
  async update(id: string, data: UpdateRoleDTO): Promise<Role> {
    const response = await api.put<Role>(`/roles/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar un rol
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/roles/${id}`);
  }

  /**
   * Activar/Desactivar un rol
   */
  async toggleStatus(id: string): Promise<Role> {
    const response = await api.patch<Role>(`/roles/${id}/toggle-status`);
    return response.data;
  }

  /**
   * Obtener todos los permisos disponibles
   */
  async getAllPermissions(): Promise<PermissionsResponse> {
    const response = await api.get<PermissionsResponse>('/roles/permissions');
    return response.data;
  }
}

export const rolesService = new RolesService();
