# Frontend - Gestión de Roles y Permisos

## 📱 Interfaz de Usuario Implementada

Se ha creado una interfaz completa para la gestión de roles y permisos en el sistema DermicaPro.

## 🎨 Componentes Creados

### 1. **RolesPage** - Listado de Roles
**Ubicación**: `frontend/src/pages/RolesPage.tsx`

**Características**:
- ✅ Listado de todos los roles del sistema
- ✅ Filtro para mostrar/ocultar roles inactivos
- ✅ Información de permisos y usuarios asignados
- ✅ Acciones: Ver, Editar, Activar/Desactivar, Eliminar
- ✅ Protección de roles del sistema
- ✅ Validación antes de eliminar (roles con usuarios)

**Acciones Disponibles**:
- 👁️ Ver detalles del rol
- ✏️ Editar rol (solo roles personalizados)
- 🔒/🔓 Activar/Desactivar rol
- 🗑️ Eliminar rol (solo sin usuarios asignados)

### 2. **RoleFormPage** - Crear/Editar Rol
**Ubicación**: `frontend/src/pages/RoleFormPage.tsx`

**Características**:
- ✅ Formulario para crear nuevos roles
- ✅ Edición de roles existentes
- ✅ Selector visual de permisos por módulo
- ✅ Selección individual o por módulo completo
- ✅ Contador de permisos seleccionados
- ✅ Validaciones en tiempo real
- ✅ Estado indeterminado en checkboxes de módulo

**Campos**:
- **Nombre del Rol (ID)**: Identificador único (solo minúsculas, números, guiones bajos)
- **Nombre para Mostrar**: Nombre amigable visible para usuarios
- **Descripción**: Descripción opcional del rol
- **Permisos**: Selector visual organizado por módulos

**Permisos Organizados por Módulo**:
- 👥 Pacientes
- 📅 Citas
- 💉 Servicios
- 📦 Órdenes
- 🧾 Facturas
- 💰 Pagos
- 👤 Usuarios
- 🔐 Roles
- 💵 Comisiones
- 📊 Reportes
- 📋 Historiales Clínicos

### 3. **RoleDetailPage** - Detalle del Rol
**Ubicación**: `frontend/src/pages/RoleDetailPage.tsx`

**Características**:
- ✅ Vista detallada del rol
- ✅ Información general (descripción, estado, fechas)
- ✅ Lista de usuarios asignados al rol
- ✅ Permisos agrupados por módulo
- ✅ Badges para identificar roles del sistema
- ✅ Acciones rápidas (activar/desactivar, editar)

**Información Mostrada**:
- Descripción del rol
- Total de permisos
- Usuarios asignados
- Fecha de creación
- Última actualización
- Permisos desglosados por módulo

### 4. **rolesService** - Servicio API
**Ubicación**: `frontend/src/services/roles.service.ts`

**Métodos**:
```typescript
- getAll(includeInactive?: boolean): Promise<Role[]>
- getById(id: string): Promise<RoleDetail>
- create(data: CreateRoleDTO): Promise<Role>
- update(id: string, data: UpdateRoleDTO): Promise<Role>
- delete(id: string): Promise<void>
- toggleStatus(id: string): Promise<Role>
- getAllPermissions(): Promise<PermissionsResponse>
```

## 🎨 Estilos y Diseño

**Archivo**: `frontend/src/styles/roles.css`

### Componentes Visuales:

#### Permission Selector
- Grid responsive de módulos
- Checkboxes con estado indeterminado
- Hover effects
- Información descriptiva de cada permiso

#### Badges
- `badge-primary`: Información general
- `badge-success`: Estado activo
- `badge-warning`: Estado inactivo
- `badge-info`: Rol del sistema
- `badge-secondary`: Contadores

#### Cards y Layouts
- Grid responsive (1-3 columnas)
- Spacing consistente
- Border radius suave
- Colores del tema del sistema

## 🚀 Rutas Implementadas

```typescript
/roles                    // Listado de roles
/roles/new               // Crear nuevo rol
/roles/:id               // Ver detalle de rol
/roles/:id/edit          // Editar rol
```

### Integración en App.tsx

```typescript
// Menú de navegación (solo para admin)
<NavLink to="/roles">
  <span>🔐</span>
  Roles y Permisos
</NavLink>

// Rutas
<Route path="/roles" element={<RolesPage />} />
<Route path="/roles/new" element={<RoleFormPage />} />
<Route path="/roles/:id" element={<RoleDetailPage />} />
<Route path="/roles/:id/edit" element={<RoleFormPage />} />
```

## 💡 Características Avanzadas

### 1. Selector de Permisos Inteligente
- **Selección por módulo**: Click en el checkbox del módulo selecciona/deselecciona todos sus permisos
- **Estado indeterminado**: El checkbox del módulo muestra estado indeterminado cuando algunos (pero no todos) los permisos están seleccionados
- **Contador visual**: Muestra `X/Y` permisos seleccionados por módulo

### 2. Validaciones
- ✅ Nombre y displayName requeridos
- ✅ Al menos un permiso debe ser seleccionado
- ✅ Nombre solo puede contener: `a-z`, `0-9`, `_`
- ✅ Nombre no puede cambiar después de creación
- ✅ Verificación de nombre único

### 3. Protecciones
- 🔒 Roles del sistema no se pueden editar
- 🔒 Roles del sistema no se pueden eliminar
- 🔒 Roles con usuarios no se pueden eliminar
- 🔒 Solo administradores pueden acceder

### 4. UX Improvements
- **Loading states**: Spinners mientras carga data
- **Error handling**: Mensajes de error claros
- **Confirmaciones**: Diálogos de confirmación antes de eliminar
- **Feedback visual**: Estados hover, focus, disabled
- **Responsive design**: Funciona en mobile, tablet y desktop

## 📊 Flujo de Usuario

### Crear un Rol Nuevo

1. **Navegar a Roles**
   - Click en "Roles y Permisos" en el menú lateral

2. **Crear Nuevo Rol**
   - Click en botón "+ Crear Rol"
   - Llenar formulario:
     - Nombre del rol (ej: `doctor`, `receptionist`)
     - Nombre para mostrar (ej: "Doctor", "Recepcionista")
     - Descripción opcional
   - Seleccionar permisos por módulo o individualmente
   - Click en "Crear Rol"

3. **Ver Resultado**
   - Redirección automática a listado de roles
   - Nuevo rol visible en la tabla

### Editar un Rol Existente

1. **Desde el listado**
   - Click en icono ✏️ (Editar)
   - O click en el nombre del rol → botón "Editar"

2. **Modificar datos**
   - Cambiar displayName o descripción
   - Agregar/quitar permisos
   - Click en "Actualizar Rol"

3. **Confirmación**
   - Volver a listado con cambios aplicados

### Asignar Rol a Usuario

1. **Ir a Recursos Humanos**
   - Crear o editar usuario
   - Seleccionar rol en dropdown
   - El usuario tendrá los permisos del rol asignado

## 🔐 Seguridad

### Control de Acceso
- ✅ Solo usuarios con rol `admin` pueden acceder
- ✅ Autenticación JWT verificada en cada request
- ✅ Refresh token automático si expira
- ✅ Redirección a login si no autenticado

### Validaciones Frontend
- ✅ Validación de formularios antes de enviar
- ✅ Sanitización de inputs (nombre del rol)
- ✅ Confirmaciones antes de acciones destructivas

## 🎯 Mejores Prácticas Implementadas

### 1. Arquitectura
```
Services (API Layer)
    ↓
Pages (Smart Components)
    ↓
Shared Components (Dumb Components)
```

### 2. TypeScript
- ✅ Interfaces completamente tipadas
- ✅ DTOs para requests/responses
- ✅ Type safety en todo el flujo

### 3. React Best Practices
- ✅ Hooks para state management
- ✅ useEffect para side effects
- ✅ Componentes funcionales
- ✅ Props correctamente tipadas

### 4. Error Handling
```typescript
try {
  await rolesService.create(data);
  navigate('/roles');
} catch (err: any) {
  setError(err.response?.data?.message || 'Error al crear rol');
}
```

### 5. Loading States
```typescript
const [loading, setLoading] = useState(true);

if (loading) return <Loading />;
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px - Stack vertical
- **Tablet**: 768px - 1024px - 2 columnas
- **Desktop**: > 1024px - 3 columnas (detail view)

### Adaptaciones
- Grid de permisos: 1-3 columnas según pantalla
- Botones: Stack en mobile, inline en desktop
- Sidebar: Collapsible en mobile

## 🎨 Tema y Estilos

### Variables CSS Usadas
```css
--card-background
--border-color
--text-color
--text-muted
--primary-color
--hover-background
```

### Colores de Badges
- **Primary** (Azul): Info general
- **Success** (Verde): Activo, confirmaciones
- **Warning** (Amarillo): Inactivo, advertencias
- **Info** (Púrpura): Rol del sistema
- **Danger** (Rojo): Errores, eliminaciones

## 📝 Uso del Sistema

### Ejemplo: Crear Rol "Doctor"

1. Click en "+ Crear Rol"
2. Llenar formulario:
   ```
   Nombre: doctor
   Nombre para Mostrar: Doctor
   Descripción: Médico especialista en tratamientos
   ```
3. Seleccionar permisos:
   - ✅ patients.view
   - ✅ appointments.view
   - ✅ appointments.attend
   - ✅ records.view
   - ✅ records.create
   - ✅ records.update
4. Click "Crear Rol"
5. ✅ Rol creado exitosamente

## 🚀 Próximas Mejoras (Opcionales)

1. **Búsqueda y Filtros Avanzados**
   - Buscar roles por nombre
   - Filtrar por módulo de permisos
   - Ordenar por usuarios asignados

2. **Bulk Operations**
   - Selección múltiple de roles
   - Activar/desactivar en batch

3. **Historial de Cambios**
   - Auditoría de modificaciones
   - Quién modificó qué y cuándo

4. **Plantillas de Roles**
   - Roles predefinidos sugeridos
   - Clonar rol existente

5. **Vista de Comparación**
   - Comparar permisos entre roles
   - Matrix de roles vs permisos

---

**Autor**: Sistema DermicaPro
**Última actualización**: Diciembre 2025
