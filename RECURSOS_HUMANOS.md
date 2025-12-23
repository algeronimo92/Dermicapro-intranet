# Módulo de Recursos Humanos - DermicaPro

## Descripción General

Se ha implementado un módulo completo de Recursos Humanos que permite gestionar empleados, definir roles y ver estadísticas de desempeño. Este módulo está disponible únicamente para usuarios con rol de **Administrador**.

---

## Características Implementadas

### 1. Gestión de Empleados

#### Listado de Empleados
- **Ruta**: `/employees`
- **Archivo**: [frontend/src/pages/EmployeesPage.tsx](frontend/src/pages/EmployeesPage.tsx)
- **Funcionalidades**:
  - Visualización de todos los empleados en tabla paginada
  - Búsqueda por nombre o correo electrónico
  - Filtros por:
    - Rol (Admin, Enfermera, Ventas)
    - Estado (Activo/Inactivo)
  - Badges de colores para roles y estado
  - Navegación a detalle de empleado al hacer clic en fila

#### Crear/Editar Empleado
- **Rutas**:
  - Crear: `/employees/new`
  - Editar: `/employees/:id/edit`
- **Archivo**: [frontend/src/pages/EmployeeFormPage.tsx](frontend/src/pages/EmployeeFormPage.tsx)
- **Campos del formulario**:
  - Nombres (requerido)
  - Apellidos (requerido)
  - Correo electrónico (requerido, no editable después de creación)
  - Contraseña (requerida en creación, opcional en edición)
  - Rol: Admin, Enfermera, Ventas (requerido)
  - Sexo (opcional)
  - Fecha de nacimiento (opcional)
  - Estado activo/inactivo (solo en edición)
- **Validaciones**:
  - Correo electrónico válido
  - Contraseña mínimo 6 caracteres
  - Confirmación de contraseña
  - Verificación de correo único

#### Detalle de Empleado
- **Ruta**: `/employees/:id`
- **Archivo**: [frontend/src/pages/EmployeeDetailPage.tsx](frontend/src/pages/EmployeeDetailPage.tsx)
- **Información mostrada**:
  - Datos personales completos
  - Badge de rol con código de colores:
    - 🔴 Rojo: Administrador
    - 🔵 Azul: Enfermera
    - 🟢 Verde: Ventas
  - Estado activo/inactivo
  - Estadísticas de desempeño según rol
- **Acciones disponibles**:
  - Editar información
  - Activar/Desactivar usuario (no se puede desactivar a sí mismo)

### 2. Estadísticas por Rol

El módulo muestra estadísticas personalizadas según el rol del empleado:

#### Para Ventas (Sales):
- Pacientes registrados
- Citas creadas
- Comisiones generadas (cantidad)
- Total en comisiones (S/.)
- Comisiones pagadas (S/.)

#### Para Enfermeras (Nurse):
- Pacientes registrados
- Citas atendidas
- Registros médicos creados
- Citas atendidas en últimos 30 días

#### Para Administradores (Admin):
- Pacientes registrados
- Citas creadas
- Citas atendidas
- Registros médicos creados

---

## Estructura del Backend

### Controlador
**Archivo**: [backend/src/controllers/users.controller.ts](backend/src/controllers/users.controller.ts)

**Funciones implementadas**:
- `getAllUsers`: Obtiene lista paginada con filtros
- `getUserById`: Obtiene detalles de un usuario
- `createUser`: Crea nuevo empleado
- `updateUser`: Actualiza información de empleado
- `deactivateUser`: Desactiva un empleado
- `activateUser`: Activa un empleado
- `getUserStats`: Obtiene estadísticas del empleado

### Rutas API
**Archivo**: [backend/src/routes/users.routes.ts](backend/src/routes/users.routes.ts)

**Endpoints disponibles**:
```
GET    /api/users              # Listar empleados (paginado, filtros)
GET    /api/users/:id          # Obtener empleado por ID
GET    /api/users/:id/stats    # Obtener estadísticas
POST   /api/users              # Crear empleado (admin)
PUT    /api/users/:id          # Actualizar empleado
POST   /api/users/:id/deactivate  # Desactivar (admin)
POST   /api/users/:id/activate    # Activar (admin)
```

**Permisos**:
- 🔒 Rutas protegidas: Requieren autenticación
- 👑 Solo Admin: Crear, listar todos, activar/desactivar

---

## Estructura del Frontend

### Servicios API
**Archivo**: [frontend/src/services/users.service.ts](frontend/src/services/users.service.ts)

**Interfaces**:
- `CreateUserDto`: Datos para crear empleado
- `UpdateUserDto`: Datos para actualizar empleado
- `GetUsersParams`: Parámetros de búsqueda y filtros
- `UserStats`: Estadísticas del empleado

**Funciones**:
- `getUsers`: Lista paginada con filtros
- `getUser`: Obtiene un empleado
- `createUser`: Crea empleado
- `updateUser`: Actualiza empleado
- `deactivateUser`: Desactiva empleado
- `activateUser`: Activa empleado
- `getUserStats`: Obtiene estadísticas

### Páginas React
1. **EmployeesPage**: Listado y búsqueda
2. **EmployeeFormPage**: Crear/editar
3. **EmployeeDetailPage**: Vista detallada con estadísticas

### Navegación
- Menú lateral: Opción "Recursos Humanos" (solo visible para admins)
- Integrado en [frontend/src/App.tsx](frontend/src/App.tsx)

---

## Estilos CSS

**Archivo**: [frontend/src/styles.css](frontend/src/styles.css)

**Clases agregadas**:
- `.stats-grid`: Grid responsive para tarjetas de estadísticas
- `.stat-card`: Tarjetas con gradientes de colores
- `.stat-value`: Valor numérico grande
- `.stat-label`: Etiqueta descriptiva
- `.checkbox-label`: Estilo para checkbox de estado activo

**Efectos visuales**:
- Gradientes de colores en tarjetas de estadísticas
- Efecto hover con elevación
- Animaciones suaves
- Responsive design

---

## Seguridad

### Autenticación y Autorización
- ✅ Todas las rutas requieren autenticación JWT
- ✅ Solo administradores pueden:
  - Ver listado completo de empleados
  - Crear nuevos empleados
  - Activar/desactivar empleados
- ✅ Usuarios pueden ver su propio perfil
- ✅ Hash seguro de contraseñas con bcrypt
- ✅ Validación de correo único

### Validaciones
- ✅ Formato de correo electrónico
- ✅ Longitud mínima de contraseña (6 caracteres)
- ✅ Roles válidos (admin, nurse, sales)
- ✅ Prevención de auto-desactivación
- ✅ Verificación de duplicados

---

## Roles Disponibles

| Rol | Código | Permisos | Badge Color |
|-----|--------|----------|-------------|
| **Administrador** | `admin` | Acceso total al sistema | 🔴 Rojo |
| **Enfermera** | `nurse` | Atender pacientes, registros médicos | 🔵 Azul |
| **Ventas** | `sales` | Crear citas, pacientes, ver comisiones | 🟢 Verde |

---

## Flujo de Trabajo

### Crear Nuevo Empleado
1. Admin accede a `/employees`
2. Click en "Nuevo Empleado"
3. Completa formulario con datos requeridos
4. Sistema valida y crea usuario
5. Contraseña hasheada automáticamente
6. Usuario puede iniciar sesión inmediatamente

### Editar Empleado
1. Admin accede al detalle del empleado
2. Click en "Editar"
3. Modifica información necesaria
4. Opcionalmente cambia contraseña
5. Actualiza rol o estado activo
6. Cambios se guardan y surten efecto inmediatamente

### Ver Estadísticas
1. Admin accede al detalle del empleado
2. Sistema carga estadísticas automáticamente
3. Muestra métricas relevantes según rol
4. Tarjetas de colores con animaciones

---

## Próximas Mejoras Sugeridas

### Alta Prioridad
- [ ] Exportar lista de empleados a Excel/PDF
- [ ] Historial de cambios en empleados
- [ ] Notificaciones por correo al crear cuenta

### Media Prioridad
- [ ] Dashboard de RRHH con gráficas
- [ ] Gestión de horarios y turnos
- [ ] Control de asistencia
- [ ] Evaluaciones de desempeño

### Baja Prioridad
- [ ] Chat interno entre empleados
- [ ] Sistema de permisos y vacaciones
- [ ] Certificaciones y capacitaciones
- [ ] Organigrama visual

---

## Pruebas

### Cómo Probar el Módulo

1. **Iniciar Backend**:
```bash
cd backend
npm run dev
```

2. **Iniciar Frontend**:
```bash
cd frontend
npm run dev
```

3. **Acceder como Admin**:
   - Email: `admin@dermicapro.com`
   - Contraseña: `admin123`

4. **Navegar a Recursos Humanos**:
   - En el menú lateral: "Recursos Humanos"
   - Probar búsqueda y filtros
   - Crear nuevo empleado
   - Ver detalles y estadísticas

### Casos de Prueba

- ✅ Crear empleado con todos los roles
- ✅ Validación de correo duplicado
- ✅ Validación de contraseña débil
- ✅ Editar empleado sin cambiar contraseña
- ✅ Cambiar contraseña de empleado
- ✅ Activar/Desactivar empleado
- ✅ Intentar desactivarse a sí mismo (debe fallar)
- ✅ Ver estadísticas según rol
- ✅ Búsqueda y filtros
- ✅ Paginación

---

## Archivos Creados/Modificados

### Backend
- ✅ `backend/src/controllers/users.controller.ts` (nuevo)
- ✅ `backend/src/routes/users.routes.ts` (nuevo)
- ✅ `backend/src/routes/index.ts` (modificado)

### Frontend
- ✅ `frontend/src/pages/EmployeesPage.tsx` (nuevo)
- ✅ `frontend/src/pages/EmployeeFormPage.tsx` (nuevo)
- ✅ `frontend/src/pages/EmployeeDetailPage.tsx` (nuevo)
- ✅ `frontend/src/services/users.service.ts` (nuevo)
- ✅ `frontend/src/App.tsx` (modificado)
- ✅ `frontend/src/styles.css` (modificado)

---

## Integración con el Sistema Existente

El módulo de RRHH se integra perfectamente con el sistema existente:

- ✅ Usa el mismo sistema de autenticación JWT
- ✅ Comparte la base de datos (tabla `users`)
- ✅ Respeta los roles existentes (admin, nurse, sales)
- ✅ Usa los mismos componentes reutilizables (Button, Input, Table, etc.)
- ✅ Sigue el mismo patrón de diseño del resto del sistema
- ✅ Estilos consistentes con el resto de la aplicación

---

## Soporte

Para preguntas o problemas:
1. Revisar esta documentación
2. Verificar logs del backend
3. Revisar consola del navegador
4. Validar permisos de usuario

---

**Desarrollado para DermicaPro - Trujillo, Perú**
**Fecha**: Diciembre 2024
