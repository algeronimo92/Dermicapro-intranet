import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rolesService, Role } from '../services/roles.service';
import { Button, Table, Loading } from '../components';

export function RolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadRoles();
  }, [includeInactive]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await rolesService.getAll(includeInactive);
      setRoles(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await rolesService.toggleStatus(id);
      await loadRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cambiar estado del rol');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el rol "${name}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await rolesService.delete(id);
      await loadRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar rol');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Roles</h1>
          <p className="page-subtitle">
            Administra los roles y permisos del sistema
          </p>
        </div>
        <Button onClick={() => navigate('/roles/new')}>
          + Crear Rol
        </Button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="filters-container">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          <span>Mostrar roles inactivos</span>
        </label>
      </div>

      <div className="card">
        <Table
          columns={[
            {
              key: 'displayName',
              label: 'Nombre',
              render: (role: Role) => (
                <div>
                  <div className="font-medium">{role.displayName}</div>
                  <div className="text-sm text-gray-500">
                    {role.name}
                    {role.isSystem && (
                      <span className="ml-2 badge badge-info">Sistema</span>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'description',
              label: 'Descripción',
              render: (role: Role) => (
                <span className="text-sm">{role.description || '-'}</span>
              ),
            },
            {
              key: 'permissions',
              label: 'Permisos',
              render: (role: Role) => (
                <span className="badge badge-primary">
                  {role.permissions.length} permisos
                </span>
              ),
            },
            {
              key: 'usersCount',
              label: 'Usuarios',
              render: (role: Role) => (
                <span className="badge badge-secondary">
                  {role.usersCount || 0} usuarios
                </span>
              ),
            },
            {
              key: 'isActive',
              label: 'Estado',
              render: (role: Role) => (
                <span className={`badge ${role.isActive ? 'badge-success' : 'badge-warning'}`}>
                  {role.isActive ? 'Activo' : 'Inactivo'}
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Acciones',
              render: (role: Role) => (
                <div className="action-buttons">
                  <button
                    className="btn-icon"
                    onClick={() => navigate(`/roles/${role.id}`)}
                    title="Ver detalles"
                  >
                    👁️
                  </button>
                  {!role.isSystem && (
                    <>
                      <button
                        className="btn-icon"
                        onClick={() => navigate(`/roles/${role.id}/edit`)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleToggleStatus(role.id)}
                        title={role.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {role.isActive ? '🔒' : '🔓'}
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => handleDelete(role.id, role.displayName)}
                        disabled={deletingId === role.id || (role.usersCount && role.usersCount > 0)}
                        title={
                          role.usersCount && role.usersCount > 0
                            ? 'No se puede eliminar: tiene usuarios asignados'
                            : 'Eliminar'
                        }
                      >
                        {deletingId === role.id ? '⏳' : '🗑️'}
                      </button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={roles}
          emptyMessage="No hay roles registrados"
        />
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">ℹ️ Información</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Los roles del sistema no pueden ser modificados ni eliminados</li>
          <li>• No se puede eliminar un rol que tenga usuarios asignados</li>
          <li>• Al desactivar un rol, los usuarios con ese rol no podrán acceder al sistema</li>
        </ul>
      </div>
    </div>
  );
}
