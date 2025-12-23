# 📋 Configuración de Estados de Citas

## 🎯 Propósito

Este sistema de configuración centralizada permite modificar el comportamiento, permisos y UI de las citas **sin tocar el código de presentación**. Usa el patrón **Strategy + Configuration Object** para máxima flexibilidad y mantenibilidad.

## 📁 Arquitectura

```
frontend/src/
├── config/
│   ├── appointmentStates.config.ts  ← 🔧 Configuración centralizada
│   └── README.md                     ← Este archivo
├── components/
│   └── ContextualCTA.tsx             ← Componente que renderiza CTAs
└── pages/
    └── AppointmentDetailPage.tsx     ← Usa la configuración
```

## 🚀 Uso Básico

### 1. Modificar Permisos

```typescript
// appointmentStates.config.ts

[AppointmentStatus.reserved]: {
  permissions: {
    canView: [Role.admin, Role.nurse, Role.sales],
    canEdit: [Role.admin, Role.sales],         // ✏️ Solo admin y sales
    canDelete: [Role.admin],                   // 🗑️ Solo admin
    canUploadPhotos: [],                       // 📸 Nadie en reserved
    canUploadReceipt: [Role.admin, Role.sales],
    canMarkAttended: [Role.admin, Role.nurse],
  },
  // ...
}
```

### 2. Cambiar Visibilidad de Secciones

```typescript
[AppointmentStatus.attended]: {
  visibility: {
    showWorkflowGuide: false,              // ❌ Ocultar guía
    showPhotoGallery: (_hasPhotos) => true, // ✅ Siempre mostrar
    showPaymentCard: true,                  // ✅ Mostrar
    showSystemInfo: {
      visible: true,
      defaultExpanded: true,                // 📂 Expandido por defecto
    },
  },
  // ...
}
```

### 3. Personalizar CTA (Call-to-Action)

```typescript
[AppointmentStatus.in_progress]: {
  cta: {
    label: 'Finalizar Atención',      // 📝 Texto del botón
    icon: 'check',                     // ✅ Icono (play, check, calendar, refresh)
    variant: 'success',                // 🎨 Estilo (primary, success, secondary, danger)
    action: 'finish',                  // 🎬 Acción (start, finish, reschedule, next-session)
    roles: [Role.admin, Role.nurse],   // 👤 Quién puede verlo
    pulse: false,                      // 💫 Animación de pulso
  },
  // ...
}
```

### 4. Configurar Urgencia de Pago

```typescript
[AppointmentStatus.attended]: {
  paymentHighlight: {
    urgency: 'urgent',                 // 🔴 Nivel: none, warning, urgent
    condition: (_hasReceipt, hasPendingPayment) => hasPendingPayment,
  },
  // ...
}
```

## 📖 Ejemplos Comunes

### Ejemplo 1: Nuevo Estado "En Revisión"

```typescript
import { AppointmentStatus, Role } from '../types';

// 1. Agregar nuevo enum en types/index.ts
export enum AppointmentStatus {
  // ... existentes
  under_review = 'under_review',  // NUEVO
}

// 2. Agregar configuración
[AppointmentStatus.under_review]: {
  status: AppointmentStatus.under_review,
  label: {
    singular: 'En Revisión',
    plural: 'En Revisión',
    color: 'status-under-review',
    badge: 'badge-purple',
  },
  permissions: {
    canView: [Role.admin],
    canEdit: [Role.admin],
    canDelete: [Role.admin],
    canChangeStatus: [Role.admin],
    canUploadPhotos: [Role.admin],
    canUploadReceipt: [],
    canMarkAttended: [],
  },
  visibility: {
    showWorkflowGuide: true,
    showPhotoGallery: (hasPhotos) => hasPhotos,
    showPaymentCard: true,
    showSystemInfo: {
      visible: true,
      defaultExpanded: true,
    },
    showActionButtons: {
      edit: true,
      delete: false,
      attend: false,
    },
  },
  cta: {
    label: 'Aprobar y Continuar',
    icon: 'check',
    variant: 'primary',
    action: 'start',  // Reutilizar acción existente
    roles: [Role.admin],
    pulse: true,
  },
  paymentHighlight: {
    urgency: 'none',
    condition: () => false,
  },
  nextStates: [AppointmentStatus.in_progress, AppointmentStatus.cancelled],
  description: 'Cita en revisión administrativa antes de iniciar.',
},
```

### Ejemplo 2: Cambiar Quién Puede Eliminar Citas Canceladas

```typescript
// Antes: Solo admin
[AppointmentStatus.cancelled]: {
  permissions: {
    canDelete: [Role.admin],  // ❌ Solo admin
  },
}

// Después: Admin y sales pueden eliminar
[AppointmentStatus.cancelled]: {
  permissions: {
    canDelete: [Role.admin, Role.sales],  // ✅ Admin y sales
  },
}
```

### Ejemplo 3: Agregar Icono Personalizado al CTA

```typescript
// 1. En ContextualCTA.tsx, agregar nuevo icono:
const CTAIcons = {
  // ... existentes
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L2 18h16L10 2z" stroke="currentColor" strokeWidth="2"/>
      <path d="M10 8v4M10 14h.01" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
};

// 2. En config, usar el nuevo icono:
cta: {
  label: 'Requiere Atención',
  icon: 'warning',  // Nuevo icono
  variant: 'danger',
  // ...
}
```

## 🔍 Funciones Helper

### `hasPermission(status, permission, userRole)`

Verifica si un rol tiene un permiso específico.

```typescript
if (hasPermission(appointment.status, 'canDelete', user?.role)) {
  // Mostrar botón eliminar
}
```

### `getCTA(status, userRole)`

Obtiene el CTA apropiado para un estado y rol.

```typescript
const cta = getCTA(appointment.status, user?.role);
if (cta) {
  return <ContextualCTA cta={cta} {...props} />;
}
```

### `getPaymentUrgency(status, hasReceipt, hasPendingPayment)`

Determina el nivel de urgencia del pago.

```typescript
const urgency = getPaymentUrgency(
  appointment.status,
  !!appointment.reservationReceiptUrl,
  hasPendingPayment
);
// Resultado: 'none' | 'warning' | 'urgent'
```

### `shouldShow(status, element, context?)`

Verifica si debe mostrar un elemento de UI.

```typescript
if (shouldShow(appointment.status, 'showWorkflowGuide')) {
  return <StatusWorkflowGuide {...props} />;
}
```

### `getValidTransitions(currentStatus, userRole)`

Obtiene estados válidos a los que puede transicionar.

```typescript
const validStates = getValidTransitions(appointment.status, user?.role);
// Resultado: [AppointmentStatus.in_progress, AppointmentStatus.cancelled]
```

## 🎨 Guía de Estilos CSS

### Clases de Estado

```css
/* Badges de estado */
.status-reserved { background: #e3f2fd; color: #1976d2; }
.status-in-progress { background: #fff3cd; color: #856404; }
.status-attended { background: #d4edda; color: #155724; }
.status-cancelled { background: #f8d7da; color: #721c24; }
.status-no-show { background: #e2e3e5; color: #383d41; }
```

### Clases de Urgencia de Pago

```css
/* Urgencia de pago */
.payment-card--urgent {
  border: 2px solid #ef4444;
  animation: urgent-pulse 2s ease-in-out infinite;
}

.payment-card--warning {
  border: 2px solid #f59e0b;
}
```

### Clases de Botones Contextuales

```css
/* Variantes de botón */
.btn-contextual--primary { background: linear-gradient(135deg, #6366f1, #4f46e5); }
.btn-contextual--success { background: linear-gradient(135deg, #10b981, #059669); }
.btn-contextual--secondary { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.btn-contextual--danger { background: linear-gradient(135deg, #ef4444, #dc2626); }

/* Animación de pulso */
.btn-contextual--pulse { animation: cta-pulse 2s ease-in-out infinite; }
```

## 🧪 Testing

```typescript
import { getStateConfig, hasPermission } from '../config/appointmentStates.config';
import { AppointmentStatus, Role } from '../types';

describe('appointmentStates.config', () => {
  it('should allow admin to delete reserved appointments', () => {
    const result = hasPermission(
      AppointmentStatus.reserved,
      'canDelete',
      Role.admin
    );
    expect(result).toBe(true);
  });

  it('should not allow nurse to edit cancelled appointments', () => {
    const result = hasPermission(
      AppointmentStatus.cancelled,
      'canEdit',
      Role.nurse
    );
    expect(result).toBe(false);
  });

  it('should return urgent for attended with pending payment', () => {
    const urgency = getPaymentUrgency(
      AppointmentStatus.attended,
      true,  // hasReceipt
      true   // hasPendingPayment
    );
    expect(urgency).toBe('urgent');
  });
});
```

## 🔒 Mejores Prácticas

1. **Siempre documentar cambios**: Actualiza la `description` cuando modifiques un estado
2. **Testear permisos**: Verifica que los roles tengan acceso correcto
3. **Validar transiciones**: Asegura que `nextStates` sean lógicos
4. **CSS consistente**: Usa las clases existentes antes de crear nuevas
5. **Iconos reutilizables**: Agrega iconos a `ContextualCTA.tsx` para reutilización
6. **Evitar duplicación**: Si dos estados tienen configuración similar, considera abstraer

## 🚨 Troubleshooting

### ❓ El CTA no aparece

**Solución**: Verifica que el rol del usuario esté en `cta.roles`

```typescript
cta: {
  roles: [Role.admin, Role.nurse],  // ← Agregar rol aquí
}
```

### ❓ El permiso no funciona

**Solución**: Usa `hasPermission` en lugar de verificar manualmente

```typescript
// ❌ Evitar
if (user?.role === Role.admin || user?.role === Role.sales) { }

// ✅ Correcto
if (hasPermission(appointment.status, 'canEdit', user?.role)) { }
```

### ❓ TypeScript error en `shouldShow`

**Solución**: Pasa el contexto cuando uses `showPhotoGallery`

```typescript
shouldShow(status, 'showPhotoGallery', { hasPhotos: true })
```

## 📚 Referencias

- **Patrón Strategy**: [Refactoring Guru](https://refactoring.guru/design-patterns/strategy)
- **Configuration Objects**: [Martin Fowler](https://martinfowler.com/articles/configurationComplexity.html)
- **Type-safe Config**: [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

**Última actualización**: 2025-12-04
**Autor**: Claude (Anthropic)
**Versión**: 1.0.0
