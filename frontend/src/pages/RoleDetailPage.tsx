import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { rolesService, RoleDetail, Permission } from '../services/roles.service';
import { Button, Loading } from '../components';
import { useAuth } from '../contexts/AuthContext';

export function RoleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para edición de permisos
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [permissionsByModule, setPermissionsByModule] = useState<Record<string, Permission[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadRole(id);
    }
  }, [id]);

  const loadRole = async (roleId: string) => {
    try {
      setLoading(true);
      const data = await rolesService.getById(roleId);
      setRole(data);
      setSelectedPermissions(data.permissions.map(p => p.id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar rol');
    } finally {
      setLoading(false);
    }
  };

  const loadAllPermissions = async () => {
    try {
      const data = await rolesService.getAllPermissions();
      setAllPermissions(data.all);
      setPermissionsByModule(data.byModule);
    } catch (err) {
      console.error('Error loading permissions:', err);
    }
  };

  const handleStartEditing = async () => {
    await loadAllPermissions();
    setIsEditingPermissions(true);
  };

  const handleCancelEditing = () => {
    if (!role) return;
    setSelectedPermissions(role.permissions.map(p => p.id));
    setIsEditingPermissions(false);
  };

  const handleSavePermissions = async () => {
    if (!role || !id) return;

    try {
      setSaving(true);
      await rolesService.update(id, {
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissionIds: selectedPermissions,
      });
      await loadRole(id);
      setIsEditingPermissions(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar permisos');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSelectAllInModule = (module: string) => {
    const modulePermissions = permissionsByModule[module] || [];
    const moduleIds = modulePermissions.map(p => p.id);

    const allSelected = moduleIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !moduleIds.includes(id)));
    } else {
      setSelectedPermissions(prev => {
        const newSelection = new Set([...prev, ...moduleIds]);
        return Array.from(newSelection);
      });
    }
  };

  const handleToggleStatus = async () => {
    if (!role || !id) return;

    try {
      await rolesService.toggleStatus(id);
      await loadRole(id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cambiar estado del rol');
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error || !role) {
    return (
      <div className="page-container">
        <div className="alert alert-error">
          {error || 'Rol no encontrado'}
        </div>
        <Button onClick={() => navigate('/roles')}>Volver a Roles</Button>
      </div>
    );
  }

  // Verificar si el usuario es admin
  const isAdmin = user?.role && (typeof user.role === 'string' ? user.role === 'admin' : user.role.name === 'admin');

  // Agrupar permisos por módulo (para vista de solo lectura)
  const rolePermissionsByModule = role.permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, typeof role.permissions>);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{role.displayName}</h1>
            {role.isSystem && (
              <span className="badge badge-info">Sistema</span>
            )}
            <span className={`badge ${role.isActive ? 'badge-success' : 'badge-warning'}`}>
              {role.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="page-subtitle">{role.name}</p>
        </div>
        <div className="flex gap-2">
          {!role.isSystem && (
            <>
              <Button
                variant="secondary"
                onClick={handleToggleStatus}
              >
                {role.isActive ? '🔒 Desactivar' : '🔓 Activar'}
              </Button>
              <Button onClick={() => navigate(`/roles/${id}/edit`)}>
                ✏️ Editar
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate('/roles')}
          >
            Volver
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del rol */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Información</h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Descripción</label>
                <p className="text-sm">{role.description || 'Sin descripción'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Permisos Totales</label>
                <p className="text-2xl font-bold">{role.permissions.length}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Usuarios Asignados</label>
                <p className="text-2xl font-bold">{role.users.length}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Creado</label>
                <p className="text-sm">
                  {new Date(role.createdAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Última Actualización</label>
                <p className="text-sm">
                  {new Date(role.updatedAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Usuarios asignados */}
          {role.users.length > 0 && (
            <div className="card mt-6">
              <h2 className="text-lg font-semibold mb-4">Usuarios con este Rol</h2>
              <div className="space-y-2">
                {role.users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-warning'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Permisos por módulo */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Permisos por Módulo</h2>
              {isAdmin && !isEditingPermissions && (
                <Button
                  variant="secondary"
                  onClick={handleStartEditing}
                >
                  ✏️ Editar Permisos
                </Button>
              )}
              {isEditingPermissions && (
                <div className="flex gap-2">
                  <span className="badge badge-primary">
                    {selectedPermissions.length} permisos seleccionados
                  </span>
                  <Button
                    variant="secondary"
                    onClick={handleCancelEditing}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSavePermissions}
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              )}
            </div>

            {isEditingPermissions ? (
              // Vista de edición con checkboxes
              <div className="space-y-4">
                {Object.entries(permissionsByModule).map(([module, modulePermissions]) => {
                  const moduleIds = modulePermissions.map(p => p.id);
                  const allSelected = moduleIds.every(id => selectedPermissions.includes(id));
                  const someSelected = moduleIds.some(id => selectedPermissions.includes(id)) && !allSelected;

                  return (
                    <div key={module} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={input => {
                              if (input) input.indeterminate = someSelected;
                            }}
                            onChange={() => handleSelectAllInModule(module)}
                            className="form-checkbox h-5 w-5"
                          />
                          <h3 className="font-semibold capitalize">
                            {getModuleDisplayName(module)}
                          </h3>
                        </label>
                        <span className="text-sm text-gray-500">
                          {modulePermissions.filter(p => selectedPermissions.includes(p.id)).length}/{modulePermissions.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-7">
                        {modulePermissions.map(permission => (
                          <label
                            key={permission.id}
                            className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(permission.id)}
                              onChange={() => handleTogglePermission(permission.id)}
                              className="form-checkbox mt-1"
                            />
                            <div>
                              <p className="text-sm font-medium">{permission.displayName}</p>
                              {permission.description && (
                                <p className="text-xs text-gray-500">{permission.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Vista de solo lectura
              <div className="space-y-4">
                {Object.entries(rolePermissionsByModule).map(([module, permissions]) => (
                  <div key={module} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3 capitalize flex items-center justify-between">
                      <span>{getModuleDisplayName(module)}</span>
                      <span className="badge badge-primary">{permissions.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {permissions.map(permission => (
                        <div
                          key={permission.id}
                          className="flex items-start gap-2 p-2 bg-gray-50 rounded"
                        >
                          <span className="text-green-600 mt-1">✓</span>
                          <div>
                            <p className="text-sm font-medium">{permission.displayName}</p>
                            {permission.description && (
                              <p className="text-xs text-gray-500">{permission.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper para mostrar nombres amigables de módulos
function getModuleDisplayName(module: string): string {
  const displayNames: Record<string, string> = {
    patients: '👥 Pacientes',
    appointments: '📅 Citas',
    services: '💉 Servicios',
    orders: '📦 Órdenes',
    invoices: '🧾 Facturas',
    payments: '💰 Pagos',
    users: '👤 Usuarios',
    roles: '🔐 Roles',
    commissions: '💵 Comisiones',
    reports: '📊 Reportes',
    records: '📋 Historiales Clínicos',
  };

  return displayNames[module] || module;
}
