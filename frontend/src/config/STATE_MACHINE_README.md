# 🎯 State Machine Pattern - Sistema de Transiciones de Estado

## 📋 Resumen Ejecutivo

Implementación de **State Machine + Guard Conditions + RBAC** para gestionar las transiciones de estado de citas de forma segura, predecible y auditable.

## 🏗️ Arquitectura

### Patrón Implementado: **Finite State Machine (FSM) con Guards**

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE MACHINE                             │
│                                                              │
│  ┌──────────┐  guard(admin)   ┌──────────────┐             │
│  │ Reserved │ ─────────────▶  │ In Progress  │             │
│  └──────────┘                 └──────────────┘             │
│       │                              │                       │
│       │ guard(admin,sales)           │ guard(admin,nurse)   │
│       │ + confirmation               │ + hasPhotos()        │
│       ▼                              ▼                       │
│  ┌──────────┐                 ┌──────────────┐             │
│  │Cancelled │                 │   Attended   │             │
│  └──────────┘                 └──────────────┘             │
│       │                              │                       │
│       │ guard(admin,sales)           │ guard(admin)         │
│       │ + confirmation               │ + confirmation       │
│       │                              │                       │
│       └─────────────────┬────────────┘                      │
│                         ▼                                    │
│                   ┌──────────┐                              │
│                   │ Reserved │ (back)                       │
│                   └──────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Ventajas del Patrón

### ✅ Centralización
- **Única fuente de verdad** para todas las transiciones
- Fácil de mantener y extender
- No hay lógica dispersa en múltiples archivos

### ✅ Type-Safety
- TypeScript asegura que solo se usen transiciones válidas
- Autocompletado en el IDE
- Errores en tiempo de compilación

### ✅ Seguridad
- **Guards basados en roles** (RBAC)
- **Condiciones personalizadas** (ej: requiere fotos)
- **Confirmaciones** para acciones sensibles
- **Auditoría automática** de cambios

### ✅ Extensibilidad
- Agregar nuevos estados: solo agregar configuración
- Agregar nuevas transiciones: solo agregar a array
- Agregar nuevos guards: función pura
- Sin tocar código existente

### ✅ Testabilidad
- Funciones puras fáciles de testear
- Mock de contexto simple
- Test de guards aislados

## 📂 Estructura de Archivos

```
frontend/src/
├── config/
│   ├── appointmentStateMachine.config.ts  ← ⭐ State Machine
│   └── STATE_MACHINE_README.md            ← Este archivo
├── components/
│   └── StateTransitionSelector.tsx        ← UI Component
└── styles/
    └── state-transitions.css              ← Estilos
```

## 🔧 Uso Básico

### 1. Obtener Transiciones Disponibles

```typescript
import { getAvailableTransitions } from '../config/appointmentStateMachine.config';

const transitions = getAvailableTransitions(
  AppointmentStatus.reserved,  // Estado actual
  Role.admin,                   // Rol del usuario
  { appointment, user }         // Contexto adicional
);

// Resultado: Array de transiciones válidas
// [
//   { from: 'reserved', to: 'in_progress', label: 'Iniciar Atención', ... },
//   { from: 'reserved', to: 'cancelled', label: 'Cancelar Cita', ... },
// ]
```

### 2. Validar una Transición

```typescript
import { canTransition } from '../config/appointmentStateMachine.config';

const validation = canTransition(
  AppointmentStatus.reserved,
  AppointmentStatus.in_progress,
  Role.nurse,
  { appointment, user }
);

if (validation.allowed) {
  // Ejecutar transición
} else {
  console.error(validation.reason); // "No tienes permisos..."
}
```

### 3. Usar el Componente UI

```tsx
import { StateTransitionSelector } from '../components/StateTransitionSelector';

<StateTransitionSelector
  currentStatus={appointment.status}
  appointmentId={appointment.id}
  appointment={appointment}
  onTransition={async (newStatus) => {
    await appointmentsService.updateAppointment(id, { status: newStatus });
    await reload();
  }}
/>
```

## 🔒 Configurar Guards

### Guard Simple: Solo Roles

```typescript
{
  from: AppointmentStatus.reserved,
  to: AppointmentStatus.in_progress,
  guards: {
    allowedRoles: [Role.admin, Role.nurse],
    errorMessage: 'Solo admin y enfermeras pueden iniciar',
  },
  // ...
}
```

### Guard con Condición

```typescript
{
  from: AppointmentStatus.in_progress,
  to: AppointmentStatus.attended,
  guards: {
    allowedRoles: [Role.admin, Role.nurse],
    condition: (context) => {
      // Validar que tenga fotos de antes
      const hasBeforePhotos = context.appointment?.patientRecords?.some(
        record => record.beforePhotoUrls?.length > 0
      );
      return hasBeforePhotos;
    },
    errorMessage: 'Debes subir fotos antes de finalizar',
  },
  // ...
}
```

### Guard con Confirmación

```typescript
{
  from: AppointmentStatus.reserved,
  to: AppointmentStatus.cancelled,
  guards: {
    allowedRoles: [Role.admin, Role.sales],
    requiresConfirmation: true,
    confirmationMessage: '¿Estás seguro de cancelar? Afectará las comisiones.',
    errorMessage: 'Solo admin y ventas pueden cancelar',
  },
  // ...
}
```

## 🆕 Agregar Nuevas Transiciones

### Ejemplo: Permitir Revertir de "En Atención" a "Reservada" (Solo Admin)

```typescript
// En appointmentStateMachine.config.ts
{
  from: AppointmentStatus.in_progress,
  to: AppointmentStatus.reserved,
  guards: {
    allowedRoles: [Role.admin],
    requiresConfirmation: true,
    confirmationMessage: '¿Regresar a Reservada? Se perderá el progreso.',
    errorMessage: 'Solo administradores pueden revertir',
  },
  label: 'Revertir a Reservada',
  description: 'Regresar al estado reservada (solo admin)',
  icon: 'arrow-left',
}
```

**¡Y listo!** 🎉 El botón aparecerá automáticamente en el UI para administradores.

## 🧪 Testing

### Test de Guards

```typescript
import { canTransition } from '../config/appointmentStateMachine.config';

describe('State Machine Guards', () => {
  it('admin puede revertir de in_progress a reserved', () => {
    const result = canTransition(
      AppointmentStatus.in_progress,
      AppointmentStatus.reserved,
      Role.admin,
      { appointment: mockAppointment, user: adminUser }
    );

    expect(result.allowed).toBe(true);
  });

  it('nurse NO puede revertir de in_progress a reserved', () => {
    const result = canTransition(
      AppointmentStatus.in_progress,
      AppointmentStatus.reserved,
      Role.nurse,
      { appointment: mockAppointment, user: nurseUser }
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Solo administradores');
  });
});
```

### Test de Condiciones

```typescript
it('no puede finalizar sin fotos de antes', () => {
  const appointmentWithoutPhotos = {
    ...mockAppointment,
    patientRecords: []
  };

  const result = canTransition(
    AppointmentStatus.in_progress,
    AppointmentStatus.attended,
    Role.nurse,
    { appointment: appointmentWithoutPhotos, user: nurseUser }
  );

  expect(result.allowed).toBe(false);
  expect(result.reason).toContain('fotos de antes');
});
```

## 📊 Auditoría

Cada transición genera un log automático:

```typescript
{
  appointmentId: "123-456",
  fromStatus: "reserved",
  toStatus: "in_progress",
  userId: "user-789",
  timestamp: "2025-12-04T17:30:00Z",
  reason: "Paciente llegó a tiempo",
  metadata: { ... }
}
```

Para persistir en backend, descomentar en `createTransitionLog()`:

```typescript
export const createTransitionLog = async (log: StateTransitionLog): Promise<void> => {
  // Persistir en backend
  await fetch('/api/audit/state-transitions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
  });
};
```

## 🎯 Casos de Uso Comunes

### 1. Flujo Normal

```
Reserved → In Progress → Attended
```

- Enfermera puede: Reserved → In Progress
- Enfermera puede: In Progress → Attended (si hay fotos)

### 2. Cancelación

```
Reserved → Cancelled
```

- Admin/Sales pueden cancelar
- Requiere confirmación

### 3. No Asistió

```
Reserved → No Show
```

- Admin/Nurse/Sales pueden marcar
- Requiere confirmación

### 4. Corrección (Solo Admin)

```
In Progress → Reserved
Attended → In Progress
Cancelled → Reserved
No Show → Reserved
```

- Solo admin puede revertir estados
- Todas requieren confirmación

## 🔐 Matriz de Permisos

| Transición | Admin | Nurse | Sales |
|-----------|-------|-------|-------|
| Reserved → In Progress | ✅ | ✅ | ❌ |
| Reserved → Cancelled | ✅ | ❌ | ✅ |
| Reserved → No Show | ✅ | ✅ | ✅ |
| In Progress → Attended | ✅ | ✅* | ❌ |
| In Progress → Reserved | ✅ | ❌ | ❌ |
| Attended → In Progress | ✅ | ❌ | ❌ |
| Cancelled → Reserved | ✅ | ❌ | ✅ |
| No Show → Reserved | ✅ | ❌ | ✅ |

\* Requiere fotos de antes

## 📝 Mejores Prácticas

1. **Guards Puros**: Las funciones condition deben ser puras y sin efectos secundarios
2. **Mensajes Claros**: errorMessage debe explicar exactamente por qué no se permite
3. **Confirmaciones Sensatas**: Solo para acciones destructivas o inusuales
4. **Auditoría**: Siempre crear log para trazabilidad
5. **Testing**: Testear todos los guards con diferentes roles
6. **Documentación**: Actualizar este README al agregar transiciones

## 🚀 Próximos Pasos

1. **Backend Validation**: Implementar la misma lógica en backend
2. **Webhooks**: Notificar cuando cambian estados
3. **Historial**: Tabla de transiciones en BD
4. **Analytics**: Métricas por estado y transición
5. **Rollback**: Sistema de deshacer última transición

## 📚 Referencias

- [State Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/state)
- [Finite State Machines](https://en.wikipedia.org/wiki/Finite-state_machine)
- [XState Documentation](https://xstate.js.org/docs/)

---

**Autor**: Claude (Anthropic)
**Fecha**: 2025-12-04
**Versión**: 1.0.0
