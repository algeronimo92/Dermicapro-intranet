import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { rolesService, Permission, Role } from '../services/roles.service';
import { Button, Input, Loading } from '../components';

export function RoleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Permissions
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsByModule, setPermissionsByModule] = useState<Record<string, Permission[]>>({});
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  // State for role data
  const [role, setRole] = useState<Role | null>(null);

  // State for adding new permission
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false);
  const [newPermission, setNewPermission] = useState({
    name: '',
    displayName: '',
    description: '',
    module: '',
    action: '',
  });
  const [addingPermission, setAddingPermission] = useState(false);

  useEffect(() => {
    loadPermissions();
    if (isEditing && id) {
      loadRole(id);
    }
  }, [id]);

  const loadPermissions = async () => {
    try {
      const data = await rolesService.getAllPermissions();
      setPermissions(data.all);
      setPermissionsByModule(data.byModule);
    } catch (err) {
      console.error('Error loading permissions:', err);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const loadRole = async (roleId: string) => {
    try {
      setLoading(true);
      const data = await rolesService.getById(roleId);
      setRole(data);
      setName(data.name);
      setDisplayName(data.displayName);
      setDescription(data.description || '');
      setSelectedPermissions(data.permissions.map(p => p.id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar rol');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !displayName.trim()) {
      setError('El nombre y nombre para mostrar son requeridos');
      return;
    }

    if (selectedPermissions.length === 0) {
      setError('Debe seleccionar al menos un permiso');
      return;
    }

    try {
      setSaving(true);

      if (isEditing && id) {
        // Actualizar todo (incluso para roles del sistema)
        await rolesService.update(id, {
          name: name.trim(),
          displayName: displayName.trim(),
          description: description.trim() || undefined,
          permissionIds: selectedPermissions,
        });
      } else {
        await rolesService.create({
          name: name.trim(),
          displayName: displayName.trim(),
          description: description.trim() || undefined,
          permissionIds: selectedPermissions,
        });
      }

      navigate('/roles');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar rol');
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
      // Deseleccionar todos del módulo
      setSelectedPermissions(prev => prev.filter(id => !moduleIds.includes(id)));
    } else {
      // Seleccionar todos del módulo
      setSelectedPermissions(prev => {
        const newSelection = new Set([...prev, ...moduleIds]);
        return Array.from(newSelection);
      });
    }
  };

  const handleAddPermission = async () => {
    if (!newPermission.name || !newPermission.displayName || !newPermission.module || !newPermission.action) {
      setError('Todos los campos son requeridos para crear un permiso');
      return;
    }

    try {
      setAddingPermission(true);
      setError('');

      // Crear el permiso usando el servicio de roles
      const response = await fetch('http://localhost:5001/api/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name: newPermission.name,
          displayName: newPermission.displayName,
          description: newPermission.description,
          module: newPermission.module,
          action: newPermission.action,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear permiso');
      }

      const createdPermission = await response.json();

      // Recargar permisos
      await loadPermissions();

      // Seleccionar automáticamente el nuevo permiso
      setSelectedPermissions(prev => [...prev, createdPermission.id]);

      // Limpiar formulario y cerrar modal
      setNewPermission({
        name: '',
        displayName: '',
        description: '',
        module: '',
        action: '',
      });
      setShowAddPermissionModal(false);
    } catch (err: any) {
      setError(err.message || 'Error al crear permiso');
    } finally {
      setAddingPermission(false);
    }
  };

  if (loading || loadingPermissions) {
    return <Loading />;
  }

  // Advertencia para roles del sistema (pero permitir edición en desarrollo)
  const isSystemRole = isEditing && role?.isSystem;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEditing ? 'Editar Rol' : 'Crear Rol'}
          </h1>
          <p className="page-subtitle">
            {isEditing
              ? 'Modifica los datos y permisos del rol'
              : 'Define un nuevo rol con sus permisos'}
          </p>
        </div>
      </div>

      {isSystemRole && (
        <div className="alert alert-warning mb-4">
          <p className="font-semibold">⚠️ Rol del Sistema</p>
          <p>
            Este es un rol del sistema. Ten cuidado al modificarlo ya que puede afectar
            el funcionamiento de la aplicación. Los cambios se aplicarán a todos los usuarios
            con este rol.
          </p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Información del Rol</h2>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label required">
                Nombre del Rol (ID)
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="admin, nurse, sales, etc."
                required
                disabled={isEditing}
                className={isEditing ? 'bg-gray-100' : ''}
              />
              <p className="form-help">
                Solo minúsculas, números y guiones bajos. No se puede cambiar después.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label required">
                Nombre para Mostrar
              </label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Administrador, Enfermera, etc."
                required
              />
              <p className="form-help">
                Nombre que verán los usuarios
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe las responsabilidades de este rol..."
              className="form-textarea"
              rows={3}
            />
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Permisos del Rol</h2>
            <div className="flex gap-3 items-center">
              <span className="badge badge-primary">
                {selectedPermissions.length} permisos seleccionados
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddPermissionModal(true)}
              >
                + Crear Nuevo Permiso
              </Button>
            </div>
          </div>

          <div className="permissions-grid">
            {Object.entries(permissionsByModule).map(([module, modulePermissions]) => {
              const moduleIds = modulePermissions.map(p => p.id);
              const allSelected = moduleIds.every(id => selectedPermissions.includes(id));
              const someSelected = moduleIds.some(id => selectedPermissions.includes(id)) && !allSelected;

              return (
                <div key={module} className="permission-module">
                  <div className="permission-module-header">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={input => {
                          if (input) input.indeterminate = someSelected;
                        }}
                        onChange={() => handleSelectAllInModule(module)}
                      />
                      <span className="font-semibold capitalize">
                        {getModuleDisplayName(module)}
                      </span>
                    </label>
                    <span className="text-sm text-gray-500">
                      {modulePermissions.filter(p => selectedPermissions.includes(p.id)).length}/{modulePermissions.length}
                    </span>
                  </div>

                  <div className="permission-list">
                    {modulePermissions.map(permission => (
                      <label
                        key={permission.id}
                        className="permission-item"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={() => handleTogglePermission(permission.id)}
                        />
                        <div className="permission-info">
                          <span className="permission-name">{permission.displayName}</span>
                          <span className="permission-description">{permission.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/roles')}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Actualizar Rol' : 'Crear Rol'}
          </Button>
        </div>
      </form>

      {/* Modal para agregar nuevo permiso */}
      {showAddPermissionModal && (
        <div className="modal-overlay" onClick={() => setShowAddPermissionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Crear Nuevo Permiso</h2>
              <button
                className="modal-close"
                onClick={() => setShowAddPermissionModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">Nombre del Permiso</label>
                <Input
                  type="text"
                  value={newPermission.name}
                  onChange={(e) => setNewPermission(prev => ({
                    ...prev,
                    name: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')
                  }))}
                  placeholder="users.view, patients.create, etc."
                  required
                />
                <p className="form-help">
                  Formato: modulo.accion (ej: users.view, appointments.create)
                </p>
              </div>

              <div className="form-group">
                <label className="form-label required">Nombre para Mostrar</label>
                <Input
                  type="text"
                  value={newPermission.displayName}
                  onChange={(e) => setNewPermission(prev => ({
                    ...prev,
                    displayName: e.target.value
                  }))}
                  placeholder="Ver Usuarios, Crear Citas, etc."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <Input
                  type="text"
                  value={newPermission.description}
                  onChange={(e) => setNewPermission(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Descripción del permiso..."
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label required">Módulo</label>
                  <Input
                    type="text"
                    value={newPermission.module}
                    onChange={(e) => setNewPermission(prev => ({
                      ...prev,
                      module: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                    }))}
                    placeholder="users, patients, appointments, etc."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Acción</label>
                  <Input
                    type="text"
                    value={newPermission.action}
                    onChange={(e) => setNewPermission(prev => ({
                      ...prev,
                      action: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                    }))}
                    placeholder="view, create, edit, delete, manage"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddPermissionModal(false)}
                disabled={addingPermission}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAddPermission}
                disabled={addingPermission}
              >
                {addingPermission ? 'Creando...' : 'Crear Permiso'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper para mostrar nombres amigables de módulos
function getModuleDisplayName(module: string): string {
  const displayNames: Record<string, string> = {
    patients: 'Pacientes',
    appointments: 'Citas',
    services: 'Servicios',
    orders: 'Órdenes',
    invoices: 'Facturas',
    payments: 'Pagos',
    users: 'Usuarios',
    roles: 'Roles',
    commissions: 'Comisiones',
    reports: 'Reportes',
    records: 'Historiales Clínicos',
  };

  return displayNames[module] || module;
}
