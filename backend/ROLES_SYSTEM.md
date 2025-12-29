# Sistema de Roles y Permisos

Este documento explica cómo funciona el sistema de roles y permisos dinámicos de DermicaPro.

## Arquitectura

El sistema consta de tres modelos principales:

1. **SystemRole**: Roles del sistema (admin, nurse, sales, etc.)
2. **Permission**: Permisos individuales (patients.create, appointments.view, etc.)
3. **RolePermission**: Relación muchos a muchos entre roles y permisos

## Modelos de Base de Datos

### SystemRole
```typescript
{
  id: string
  name: string           // Nombre único del rol (ej: "admin", "nurse")
  displayName: string    // Nombre para mostrar (ej: "Administrador")
  description: string?   // Descripción del rol
  isActive: boolean      // Si el rol está activo
  isSystem: boolean      // Si es un rol del sistema (no se puede eliminar)
  permissions: RolePermission[]
  users: User[]
}
```

### Permission
```typescript
{
  id: string
  name: string          // Nombre único (ej: "patients.create")
  displayName: string   // Nombre para mostrar (ej: "Crear Pacientes")
  description: string?  // Descripción del permiso
  module: string        // Módulo (ej: "patients", "appointments")
  action: string        // Acción (ej: "create", "read", "update", "delete")
}
```

## API Endpoints

### Roles

#### GET /api/roles
Obtener todos los roles con sus permisos.

**Query params:**
- `includeInactive`: boolean - Incluir roles inactivos

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "name": "admin",
    "displayName": "Administrador",
    "description": "Acceso completo al sistema",
    "isActive": true,
    "isSystem": true,
    "usersCount": 5,
    "permissions": [
      {
        "id": "uuid",
        "name": "patients.manage",
        "displayName": "Gestionar Pacientes",
        "module": "patients",
        "action": "manage"
      }
    ]
  }
]
```

#### GET /api/roles/:id
Obtener un rol específico con detalles completos.

**Respuesta:**
```json
{
  "id": "uuid",
  "name": "nurse",
  "displayName": "Enfermera",
  "permissions": [...],
  "users": [
    {
      "id": "uuid",
      "email": "nurse@example.com",
      "firstName": "María",
      "lastName": "García"
    }
  ]
}
```

#### POST /api/roles
Crear un nuevo rol.

**Body:**
```json
{
  "name": "custom_role",
  "displayName": "Rol Personalizado",
  "description": "Descripción opcional",
  "permissionIds": ["perm-id-1", "perm-id-2"]
}
```

#### PUT /api/roles/:id
Actualizar un rol existente.

**Body:**
```json
{
  "name": "updated_name",
  "displayName": "Nombre Actualizado",
  "description": "Nueva descripción",
  "isActive": true,
  "permissionIds": ["perm-id-1", "perm-id-2", "perm-id-3"]
}
```

#### PATCH /api/roles/:id/toggle-status
Activar/Desactivar un rol.

#### DELETE /api/roles/:id
Eliminar un rol (solo si no tiene usuarios asignados y no es rol del sistema).

### Permisos

#### GET /api/roles/permissions
Obtener todos los permisos disponibles.

**Respuesta:**
```json
{
  "all": [
    {
      "id": "uuid",
      "name": "patients.create",
      "displayName": "Crear Pacientes",
      "module": "patients",
      "action": "create"
    }
  ],
  "byModule": {
    "patients": [...],
    "appointments": [...]
  }
}
```

## Middlewares de Autorización

### requirePermission(permissionName)
Verifica que el usuario tenga un permiso específico.

```typescript
import { requirePermission } from '../middlewares/authorization';

// Solo usuarios con permiso "patients.create" pueden acceder
router.post('/patients',
  authenticate,
  requirePermission('patients.create'),
  createPatient
);
```

### requireAnyPermission(permissionNames)
Verifica que el usuario tenga al menos uno de los permisos especificados.

```typescript
import { requireAnyPermission } from '../middlewares/authorization';

// Usuarios con "patients.view" O "patients.manage" pueden acceder
router.get('/patients',
  authenticate,
  requireAnyPermission(['patients.view', 'patients.manage']),
  getPatients
);
```

### requireAllPermissions(permissionNames)
Verifica que el usuario tenga todos los permisos especificados.

```typescript
import { requireAllPermissions } from '../middlewares/authorization';

// Usuarios deben tener AMBOS permisos
router.delete('/patients/:id',
  authenticate,
  requireAllPermissions(['patients.delete', 'records.delete']),
  deletePatient
);
```

### requireRole(roleNames)
Verifica que el usuario tenga un rol específico (por nombre).

```typescript
import { requireRole } from '../middlewares/authorization';

// Solo administradores
router.get('/admin/dashboard',
  authenticate,
  requireRole('admin'),
  getDashboard
);

// Administradores o enfermeras
router.get('/medical/records',
  authenticate,
  requireRole(['admin', 'nurse', 'doctor']),
  getMedicalRecords
);
```

## Helpers Programáticos

### userHasPermission(userId, permissionName)
Verifica si un usuario tiene un permiso (sin middleware).

```typescript
import { userHasPermission } from '../middlewares/authorization';

const canCreate = await userHasPermission(userId, 'patients.create');
if (canCreate) {
  // Permitir acción
}
```

### getUserPermissions(userId)
Obtiene todos los permisos de un usuario.

```typescript
import { getUserPermissions } from '../middlewares/authorization';

const permissions = await getUserPermissions(userId);
// ['patients.view', 'patients.create', 'appointments.view', ...]
```

## Nomenclatura de Permisos

Los permisos siguen el patrón: `module.action`

### Módulos disponibles:
- `patients` - Gestión de pacientes
- `appointments` - Gestión de citas
- `services` - Catálogo de servicios
- `orders` - Órdenes de servicio
- `invoices` - Facturación
- `payments` - Pagos
- `users` - Usuarios del sistema
- `roles` - Roles y permisos
- `commissions` - Comisiones
- `reports` - Reportes
- `records` - Historiales clínicos

### Acciones comunes:
- `view` - Ver/Listar
- `create` - Crear
- `update` - Actualizar
- `delete` - Eliminar
- `manage` - Gestión completa (incluye todas las anteriores)
- `attend` - Atender (específico de citas)
- `export` - Exportar (específico de reportes)

## Roles Predefinidos

### Admin (Administrador)
- Acceso completo al sistema
- Todos los permisos
- No se puede eliminar (isSystem: true)

### Nurse (Enfermera)
- Gestión de pacientes (crear, ver, actualizar)
- Gestión de citas (crear, ver, actualizar, atender)
- Ver servicios
- Crear órdenes
- Ver facturas y pagos
- Gestionar historiales clínicos

### Sales (Vendedor)
- Gestión de pacientes
- Gestión de citas
- Gestión de órdenes
- Crear facturas
- Registrar pagos
- Ver sus comisiones

### Receptionist (Recepcionista)
- Ver y gestionar pacientes
- Gestionar citas
- Ver servicios
- Ver pagos

### Doctor (Doctor)
- Ver pacientes
- Atender citas
- Ver y gestionar historiales clínicos

## Ejemplo de Uso Completo

```typescript
// routes/patients.routes.ts
import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  requirePermission,
  requireAnyPermission
} from '../middlewares/authorization';
import {
  getPatients,
  createPatient,
  updatePatient,
  deletePatient
} from '../controllers/patients.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Ver pacientes: requiere permiso view o manage
router.get('/',
  requireAnyPermission(['patients.view', 'patients.manage']),
  getPatients
);

// Crear paciente: requiere permiso create o manage
router.post('/',
  requireAnyPermission(['patients.create', 'patients.manage']),
  createPatient
);

// Actualizar paciente: requiere permiso update o manage
router.put('/:id',
  requireAnyPermission(['patients.update', 'patients.manage']),
  updatePatient
);

// Eliminar paciente: requiere permiso delete o manage
router.delete('/:id',
  requireAnyPermission(['patients.delete', 'patients.manage']),
  deletePatient
);

export default router;
```

## Migración desde el Sistema Antiguo

El sistema antiguo usaba un enum `Role` con valores fijos. Ahora:

1. ✅ El enum `Role` ha sido eliminado
2. ✅ La columna `role` en `users` ha sido reemplazada por `roleId`
3. ✅ Los usuarios ahora se relacionan con `SystemRole`
4. ⚠️ El middleware `authorize()` está deprecado
5. ✅ Usa `requireRole()` o `requirePermission()` en su lugar

### Antes:
```typescript
import { authorize } from '../middlewares/auth';
import { Role } from '@prisma/client';

router.post('/', authenticate, authorize(Role.admin), createUser);
```

### Ahora:
```typescript
import { requireRole } from '../middlewares/authorization';

router.post('/', authenticate, requireRole('admin'), createUser);

// O mejor aún, usa permisos:
import { requirePermission } from '../middlewares/authorization';

router.post('/', authenticate, requirePermission('users.create'), createUser);
```

## Ejecutar el Seed

Para poblar la base de datos con los roles y permisos iniciales:

```bash
npx tsx prisma/seeds/seed-roles.ts
```

Esto creará:
- 49 permisos base
- 5 roles predefinidos (admin, nurse, sales, receptionist, doctor)
- Asignará los permisos correspondientes a cada rol

## Consideraciones de Seguridad

1. **Roles del Sistema**: Los roles marcados con `isSystem: true` no pueden ser eliminados ni modificados
2. **Validación de Permisos**: Siempre verifica permisos en el backend, nunca confíes solo en el frontend
3. **Tokens JWT**: Considera incluir `roleId` en el token JWT para reducir consultas a la base de datos
4. **Caché**: Para alta concurrencia, considera cachear los permisos de los usuarios
5. **Auditoría**: Registra cambios en roles y permisos para auditoría

## Próximos Pasos

1. Actualizar el controlador `auth.controller.ts` para incluir `roleId` en el registro
2. Actualizar el controlador `users.controller.ts` para gestionar roles
3. Actualizar todas las rutas para usar el nuevo sistema de permisos
4. Crear interfaz frontend para gestión de roles
5. Implementar caché de permisos si es necesario
