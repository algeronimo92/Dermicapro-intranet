import api from './api';

export type ObjectPrivilege = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
export type RoleGrants = Record<string, ObjectPrivilege[]>;

export interface DbTable {
  name: string;
  label: string;
  module: string;
}

export interface SystemPrivileges {
  superuser: boolean;
  createDb: boolean;
  createRole: boolean;
  login: boolean;
  createInSchema: boolean;
}

export interface RoleMember {
  dbRole: string;
  name: string;
}

export interface RolePrivileges {
  appRole: string;
  dbRole: string;
  displayName: string;
  members: RoleMember[];
  grants: RoleGrants;
  system: SystemPrivileges;
}

export interface PrivilegeMatrix {
  tables: DbTable[];
  privileges: ObjectPrivilege[];
  roles: RolePrivileges[];
}

export const PRIVILEGE_LABELS: Record<ObjectPrivilege, { label: string; hint: string }> = {
  SELECT: { label: 'Leer', hint: 'SELECT: consultar registros' },
  INSERT: { label: 'Crear', hint: 'INSERT: agregar registros' },
  UPDATE: { label: 'Modificar', hint: 'UPDATE: cambiar registros' },
  DELETE: { label: 'Eliminar', hint: 'DELETE: borrar registros' },
};

export const SYSTEM_PRIVILEGE_LABELS: Record<keyof SystemPrivileges, string> = {
  superuser: 'Superusuario',
  createDb: 'Crear bases de datos (CREATEDB)',
  createRole: 'Crear roles (CREATEROLE)',
  login: 'Conectarse directamente (LOGIN)',
  createInSchema: 'Crear tablas y objetos (CREATE)',
};

export const dbPrivilegesService = {
  async getMatrix(): Promise<PrivilegeMatrix> {
    const response = await api.get<{ data: PrivilegeMatrix }>('/db-privileges');
    return response.data.data;
  },

  async saveRole(appRole: string, grants: RoleGrants): Promise<{ role: RolePrivileges; message: string }> {
    const response = await api.put<{ data: RolePrivileges; message: string }>(`/db-privileges/${appRole}`, { grants });
    return { role: response.data.data, message: response.data.message };
  },
};
