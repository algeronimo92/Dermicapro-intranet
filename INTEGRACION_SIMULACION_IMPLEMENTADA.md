# ✅ Integración Simulación → Guardado IMPLEMENTADA

**Fecha:** 2025-12-04
**Estado:** ✅ COMPLETADO
**Tipo:** Soft Delete

---

## 🎯 Resumen

Se implementó exitosamente la integración entre el sistema de simulación de paquetes en el frontend y el guardado persistente en la base de datos, utilizando **Soft Delete** para máxima auditoría y recuperabilidad.

---

## 🛠️ Cambios Implementados

### 1️⃣ **Base de Datos** (Backend)

#### Schema Prisma (`backend/prisma/schema.prisma`)
```prisma
model AppointmentService {
  id            String    @id @default(uuid())
  appointmentId String    @map("appointment_id")
  orderId       String    @map("order_id")
  sessionNumber Int?      @map("session_number")
  createdAt     DateTime  @default(now()) @map("created_at")

  // 🆕 Soft Delete fields
  deletedAt     DateTime? @map("deleted_at")
  deletedById   String?   @map("deleted_by_id")
  deleteReason  String?   @map("delete_reason")

  // Relations
  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  order       Order       @relation(fields: [orderId], references: [id])
  deletedBy   User?       @relation("AppointmentServiceDeletedBy", fields: [deletedById], references: [id])

  @@map("appointment_services")
}
```

#### Migración Creada
- **Archivo:** `backend/prisma/migrations/20251204223919_add_soft_delete_to_appointment_service/migration.sql`
- **Campos agregados:**
  - `deleted_at`: Timestamp de cuándo se eliminó
  - `deleted_by_id`: Usuario que eliminó
  - `delete_reason`: Razón de la eliminación

---

### 2️⃣ **Tipos TypeScript** (Frontend)

#### `frontend/src/types/index.ts`
```typescript
export interface SessionOperations {
  toDelete: string[];  // IDs de AppointmentService a eliminar (soft delete)
  toCreate: Array<{
    orderId?: string;
    serviceId: string;
    sessionNumber: number;
    tempPackageId?: string;
  }>;
  newOrders: Array<{
    serviceId: string;
    totalSessions: number;
    tempPackageId: string;
  }>;
}

export interface UpdateAppointmentDto {
  patientId?: string;
  scheduledDate?: string;
  durationMinutes?: number;
  reservationAmount?: number;
  notes?: string;
  status?: AppointmentStatus;
  sessionOperations?: SessionOperations;  // 🆕 NUEVO
}
```

---

### 3️⃣ **Frontend Logic** (`frontend/src/pages/AppointmentFormPage.tsx`)

#### Función de Transformación (líneas 480-542)
```typescript
const transformSessionsToOperations = (
  sessions: SessionInput[]
): import('../types').SessionOperations => {
  const toDelete: string[] = [];
  const toCreate: Array<{...}> = [];
  const newOrders: Array<{...}> = [];

  sessions.forEach((session) => {
    // 1. Sesiones existentes marcadas para eliminar (soft delete)
    if (session.appointmentServiceId && session.markedForDeletion) {
      toDelete.push(session.appointmentServiceId);
    }

    // 2. Sesiones nuevas (a crear)
    if (!session.appointmentServiceId && !session.markedForDeletion) {
      if (session.orderId) {
        // Sesión de paquete existente
        toCreate.push({...});
      } else if (session.tempPackageId) {
        // Sesión de paquete nuevo
        if (!addedNewOrders.has(session.tempPackageId)) {
          newOrders.push({...});
        }
        toCreate.push({...});
      }
    }
  });

  return { toDelete, toCreate, newOrders };
};
```

#### handleSubmit Actualizado (líneas 572-617)
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  if (isEditMode && id) {
    // MODO EDIT: Usar SessionOperations
    const sessionOperations = transformSessionsToOperations(allSessions);

    const submissionData = {
      ...formData,
      sessionOperations,  // 🆕 Envía operaciones explícitas
    };

    await appointmentsService.updateAppointment(id, submissionData);
  } else {
    // MODO CREATE: Mantener comportamiento legacy
    await appointmentsService.createAppointment({
      ...formData,
      services: allSessions,
    });
  }
};
```

---

### 4️⃣ **Backend Controller** (`backend/src/controllers/appointments.controller.ts`)

#### updateAppointment con Transacción (líneas 207-367)
```typescript
export const updateAppointment = async (req: Request, res: Response) => {
  const { sessionOperations } = req.body;

  const appointment = await prisma.$transaction(async (tx) => {

    // ============================================
    // PASO 1: Soft Delete de sesiones marcadas
    // ============================================
    if (sessionOperations?.toDelete?.length > 0) {
      await tx.appointmentService.updateMany({
        where: {
          id: { in: sessionOperations.toDelete },
          appointmentId: id,  // Seguridad
        },
        data: {
          deletedAt: new Date(),
          deletedById: req.user!.id,
          deleteReason: 'Eliminado por usuario desde simulación',
        },
      });
    }

    // ============================================
    // PASO 2: Crear nuevos paquetes (Orders)
    // ============================================
    const newOrdersMap = new Map<string, string>();

    if (sessionOperations?.newOrders?.length > 0) {
      for (const newOrder of sessionOperations.newOrders) {
        const service = await tx.service.findUnique({...});
        const createdOrder = await tx.order.create({...});
        newOrdersMap.set(newOrder.tempPackageId, createdOrder.id);
      }
    }

    // ============================================
    // PASO 3: Crear nuevas sesiones
    // ============================================
    if (sessionOperations?.toCreate?.length > 0) {
      for (const newSession of sessionOperations.toCreate) {
        let finalOrderId = newSession.orderId;

        // Mapear tempPackageId → orderId real
        if (newSession.tempPackageId) {
          finalOrderId = newOrdersMap.get(newSession.tempPackageId);
        }

        await tx.appointmentService.create({
          data: {
            appointmentId: id,
            orderId: finalOrderId,
            sessionNumber: newSession.sessionNumber,
          },
        });
      }
    }

    // ============================================
    // PASO 4: Actualizar datos básicos
    // ============================================
    return await tx.appointment.update({
      where: { id },
      data: { scheduledDate, durationMinutes, notes, status },
      include: {
        appointmentServices: {
          where: { deletedAt: null },  // Solo sesiones activas
          include: { order: { include: { service: true } } },
        },
      },
    });
  });

  res.json(appointment);
};
```

---

## 🔄 Flujo Completo End-to-End

### Ejemplo: Usuario Edita Cita

```
┌─────────────────────────────────────────────┐
│ FRONTEND: Usuario en pantalla de edición   │
└─────────────────────────────────────────────┘
                   ↓
      Usuario hace cambios:
      - Marca sesión 2 para eliminar
      - Agrega sesión de nuevo paquete HIFU
                   ↓
┌─────────────────────────────────────────────┐
│ transformSessionsToOperations()             │
│ Analiza allSessions y genera:              │
│ {                                           │
│   toDelete: ["appointmentservice-2"],       │
│   toCreate: [{...hifu-session}],            │
│   newOrders: [{serviceId: "hifu", ...}]     │
│ }                                           │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ handleSubmit()                              │
│ POST /api/appointments/:id                  │
│ Body: { sessionOperations: {...} }          │
└─────────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ BACKEND: updateAppointment()                │
│ prisma.$transaction(async (tx) => {         │
└─────────────────────────────────────────────┘
                   ↓
      ┌────────────┬────────────┬────────────┐
      │  PASO 1    │  PASO 2    │  PASO 3    │
      │  Soft      │  Create    │  Create    │
      │  Delete    │  Orders    │  Sessions  │
      └────────────┴────────────┴────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ BASE DE DATOS: Estado final                 │
│                                             │
│ appointment_services:                       │
│ - id: "as-1", session: 1, deleted_at: null │
│ - id: "as-2", session: 2, deleted_at: NOW  │ ← SOFT DELETE
│ - id: "as-3", session: 3, deleted_at: null │
│ - id: "as-4", session: 1, deleted_at: null │ ← NUEVO (HIFU)
│                                             │
│ orders:                                     │
│ - id: "order-hollywood" (existente)         │
│ - id: "order-hifu-new" (creado) 🆕          │
└─────────────────────────────────────────────┘
                   ↓
      ✅ Usuario ve mensaje de éxito
      ✅ Redirige a /appointments
```

---

## 🎯 Casos de Uso Soportados

### ✅ Caso 1: Eliminar Sesión Existente
**Acción:** Usuario marca sesión 2 de Hollywood Peel para eliminar
**Backend:**
```sql
UPDATE appointment_services
SET deleted_at = NOW(),
    deleted_by_id = 'user-id',
    delete_reason = 'Eliminado por usuario desde simulación'
WHERE id = 'appointmentservice-2';
```
**Resultado:** Sesión marcada como eliminada (soft delete)

---

### ✅ Caso 2: Agregar Sesión a Paquete Existente
**Acción:** Usuario agrega sesión 3 a paquete Hollywood existente
**Backend:**
```sql
INSERT INTO appointment_services (appointment_id, order_id, session_number)
VALUES ('cita-id', 'hollywood-order-id', 3);
```
**Resultado:** Nueva sesión creada en paquete existente

---

### ✅ Caso 3: Crear Nuevo Paquete
**Acción:** Usuario agrega 3 sesiones de HIFU (nuevo paquete)
**Backend:**
```sql
-- PASO 2: Crear Order
INSERT INTO orders (patient_id, service_id, total_sessions, ...)
VALUES ('patient-id', 'hifu-id', 6, ...);

-- PASO 3: Crear 3 AppointmentServices
INSERT INTO appointment_services (appointment_id, order_id, session_number)
VALUES
  ('cita-id', 'new-hifu-order-id', 1),
  ('cita-id', 'new-hifu-order-id', 2),
  ('cita-id', 'new-hifu-order-id', 3);
```
**Resultado:** Nuevo paquete y sesiones creadas

---

### ✅ Caso 4: Compensación Automática
**Acción:** Usuario marca sesión 3 para eliminar y agrega sesión nueva (mismo paquete)
**Frontend:** `applySessionCompensation()` cancela ambas operaciones
**Backend:** No recibe toDelete ni toCreate para ese paquete
**Resultado:** Sin cambios (compensación en frontend)

---

## 🔒 Ventajas del Soft Delete Implementado

### 1. **Auditoría Completa**
```sql
-- Ver quién eliminó qué y cuándo
SELECT
  as.id,
  as.session_number,
  as.deleted_at,
  u.first_name || ' ' || u.last_name as deleted_by,
  as.delete_reason
FROM appointment_services as
JOIN users u ON as.deleted_by_id = u.id
WHERE as.deleted_at IS NOT NULL;
```

### 2. **Recuperación de Errores**
```sql
-- Restaurar sesión eliminada por error
UPDATE appointment_services
SET deleted_at = NULL,
    deleted_by_id = NULL,
    delete_reason = NULL
WHERE id = 'appointmentservice-2';
```

### 3. **Análisis de Negocio**
```sql
-- Tasa de cancelación por servicio
SELECT
  s.name,
  COUNT(*) as total_sessions,
  SUM(CASE WHEN as.deleted_at IS NOT NULL THEN 1 ELSE 0 END) as cancelled_sessions,
  (SUM(CASE WHEN as.deleted_at IS NOT NULL THEN 1 ELSE 0 END)::float / COUNT(*) * 100) as cancellation_rate
FROM appointment_services as
JOIN orders o ON as.order_id = o.id
JOIN services s ON o.service_id = s.id
GROUP BY s.name;
```

### 4. **Prevención de Fraude**
```sql
-- Detectar vendedores que eliminan muchas sesiones
SELECT
  u.first_name || ' ' || u.last_name as vendedor,
  COUNT(*) as sesiones_eliminadas
FROM appointment_services as
JOIN users u ON as.deleted_by_id = u.id
WHERE as.deleted_at > NOW() - INTERVAL '30 days'
GROUP BY vendedor
ORDER BY sesiones_eliminadas DESC;
```

---

## 📊 Queries Importantes

### Solo Sesiones Activas
```typescript
const activeSessions = await prisma.appointmentService.findMany({
  where: {
    appointmentId: 'cita-id',
    deletedAt: null,  // ← Filtro de soft delete
  },
});
```

### Incluir Sesiones Eliminadas (Auditoría)
```typescript
const allSessions = await prisma.appointmentService.findMany({
  where: {
    appointmentId: 'cita-id',
    // Sin filtro deletedAt
  },
});
```

### Solo Sesiones Eliminadas
```typescript
const deletedSessions = await prisma.appointmentService.findMany({
  where: {
    appointmentId: 'cita-id',
    deletedAt: { not: null },
  },
});
```

---

## ⚠️ Consideraciones Importantes

### 1. **Limpieza Programada (Opcional)**
Considera implementar un job que elimine físicamente sesiones soft-deleted después de 1 año:
```typescript
// Cron job mensual
await prisma.appointmentService.deleteMany({
  where: {
    deletedAt: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
  }
});
```

### 2. **Filtro Global**
Siempre incluir `deletedAt: null` en queries de sesiones activas:
```typescript
// ✅ CORRECTO
appointmentServices: {
  where: { deletedAt: null },
}

// ❌ INCORRECTO (incluye eliminadas)
appointmentServices: {
  // Sin filtro
}
```

### 3. **Restauración de Sesiones**
Para implementar "deshacer" en UI:
```typescript
// Backend endpoint
router.post('/appointment-services/:id/restore', async (req, res) => {
  await prisma.appointmentService.update({
    where: { id: req.params.id },
    data: {
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
    },
  });
  res.json({ message: 'Session restored' });
});
```

---

## ✅ Checklist de Implementación Completada

- [x] Schema Prisma actualizado con campos de soft delete
- [x] Migración creada y aplicada
- [x] Tipos TypeScript definidos (SessionOperations, UpdateAppointmentDto)
- [x] Función `transformSessionsToOperations` en frontend
- [x] `handleSubmit` actualizado para usar SessionOperations
- [x] Controller `updateAppointment` con transacción y 4 pasos
- [x] Filtro `deletedAt: null` en query de appointmentServices
- [x] Relación User ↔ AppointmentService (deletedBy)
- [x] Validaciones de seguridad (appointmentId check)
- [x] Manejo de errores con AppError

---

## 🚀 Próximos Pasos (Opcionales)

1. **Endpoint de Restauración**
   - Permitir deshacer eliminaciones recientes (<24h)

2. **Dashboard de Auditoría**
   - Vista para admins con historial de cambios

3. **Reportes de Cancelación**
   - KPIs de sesiones canceladas vs completadas

4. **Limpieza Automática**
   - Cron job para eliminar físicamente registros antiguos

5. **Notificaciones**
   - Alertar si vendedor elimina >5 sesiones/día

---

**🎉 INTEGRACIÓN COMPLETADA EXITOSAMENTE**
