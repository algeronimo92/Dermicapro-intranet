# Módulo de Gestión de Pacientes - DermicaPro

## Descripción General

El módulo de gestión de pacientes es una implementación completa para administrar los datos de los pacientes de la clínica DermicaPro.

## Características Implementadas

### 1. Lista de Pacientes (`/patients`)
- ✅ Visualización paginada de pacientes (10 por página)
- ✅ Búsqueda por nombre, DNI o teléfono
- ✅ Filtro por sexo (Masculino, Femenino, Otro)
- ✅ Ordenamiento por fecha de registro
- ✅ Click en fila para ver detalle
- ✅ Botón para crear nuevo paciente
- ✅ Contador de resultados
- ✅ Diseño responsive

### 2. Crear Paciente (`/patients/new`)
- ✅ Formulario completo con validación
- ✅ Campos obligatorios: Nombres, Apellidos, DNI, Fecha de Nacimiento, Sexo
- ✅ Campos opcionales: Teléfono, Correo, Dirección
- ✅ Validaciones:
  - DNI: 8 dígitos numéricos
  - Teléfono: 9 dígitos numéricos
  - Email: formato válido
- ✅ Mensajes de error en tiempo real
- ✅ Navegación a lista después de crear

### 3. Editar Paciente (`/patients/:id/edit`)
- ✅ Mismo formulario que crear paciente
- ✅ Precarga de datos existentes
- ✅ Validación completa
- ✅ Actualización en tiempo real

### 4. Detalle de Paciente (`/patients/:id`)
- ✅ Visualización completa de información personal
- ✅ Visualización de información de contacto
- ✅ Cálculo automático de edad
- ✅ Información del sistema (ID, fecha de registro)
- ✅ Botones de acción:
  - Ver Historial Médico
  - Crear Nueva Cita
  - Editar
  - Eliminar (solo Admin)
- ✅ Modal de confirmación para eliminar
- ✅ Navegación de regreso a lista

## Componentes Reutilizables Creados

### UI Components
- **Button** - Botón con variantes (primary, secondary, danger, success)
- **Input** - Campo de entrada con label y mensajes de error
- **Select** - Selector con opciones y validación
- **Table** - Tabla genérica con columnas configurables
- **Pagination** - Paginación con navegación
- **Modal** - Modal/Dialog reutilizable
- **Loading** - Indicador de carga

## Servicios API

### `patients.service.ts`
```typescript
- getPatients(params) - Lista paginada con filtros
- getPatient(id) - Obtener un paciente
- createPatient(data) - Crear paciente
- updatePatient(id, data) - Actualizar paciente
- deletePatient(id) - Eliminar paciente
- getPatientHistory(id) - Obtener historial médico
```

## Estructura de Archivos Creada

```
frontend/src/
├── pages/
│   ├── PatientsPage.tsx        # Lista de pacientes
│   ├── PatientFormPage.tsx     # Crear/Editar paciente
│   └── PatientDetailPage.tsx   # Detalle de paciente
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Table.tsx
│   ├── Pagination.tsx
│   ├── Modal.tsx
│   ├── Loading.tsx
│   └── index.ts
├── services/
│   └── patients.service.ts
└── styles.css                  # Estilos globales
```

## Rutas Configuradas

```typescript
/patients              -> PatientsPage (lista)
/patients/new          -> PatientFormPage (crear)
/patients/:id          -> PatientDetailPage (ver)
/patients/:id/edit     -> PatientFormPage (editar)
```

## Permisos por Rol

| Acción | Admin | Nurse | Sales |
|--------|-------|-------|-------|
| Ver lista | ✅ | ✅ | ✅ |
| Ver detalle | ✅ | ✅ | ✅ |
| Crear | ✅ | ✅ | ✅ |
| Editar | ✅ | ✅ | ✅ |
| Eliminar | ✅ | ❌ | ❌ |
| Ver historial | ✅ | ✅ | ❌ |

## Estilos CSS

Se ha creado un sistema de estilos completo y profesional:
- Paleta de colores consistente
- Sistema de espaciado uniforme
- Componentes responsive
- Animaciones sutiles
- Estados hover/focus/disabled
- Diseño mobile-first

## Próximos Pasos

### Para completar el módulo de pacientes:
1. Crear página de Historial Médico (`/patients/:id/history`)
2. Agregar exportación a PDF/Excel
3. Agregar fotos de perfil del paciente
4. Agregar notas rápidas
5. Agregar timeline de actividad

### Otros módulos pendientes:
1. **Citas** - Sistema completo de gestión de citas
2. **Sesiones de Tratamiento** - Registro de sesiones
3. **Comisiones** - Gestión de comisiones de ventas
4. **Dashboard** - Estadísticas y gráficos
5. **Usuarios** - Gestión de usuarios del sistema

## Cómo Probar

1. Iniciar el backend:
```bash
cd backend
npm run dev
```

2. Iniciar el frontend:
```bash
cd frontend
npm run dev
```

3. Navegar a: http://localhost:5173
4. Iniciar sesión con cualquier usuario de prueba
5. Ir a la sección "Pacientes"

## Notas Técnicas

- Todas las páginas tienen manejo de errores
- Loading states en todas las operaciones async
- Validación tanto en frontend como backend
- Navegación intuitiva con breadcrumbs visuales
- Mensajes de confirmación para acciones destructivas
- Diseño responsive para móviles y tablets

## Build

El módulo compila exitosamente sin errores:
```bash
npm run build
✓ built in 373ms
```
