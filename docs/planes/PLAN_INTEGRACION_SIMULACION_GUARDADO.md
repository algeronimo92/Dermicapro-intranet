# 📋 Plan de Integración: Simulación → Guardado en Base de Datos

**Fecha:** 2025-12-04
**Estado:** ✅ IMPLEMENTADO CON SOFT DELETE
**Prioridad:** 🔴 CRÍTICA

## ✅ DECISIÓN FINAL: SOFT DELETE

Después del análisis, se decidió implementar **Soft Delete** para `AppointmentService` debido a:
- ✅ Auditoría completa (quién, cuándo, por qué)
- ✅ Prevención de fraude (comisiones)
- ✅ Análisis de negocio (tasas de cancelación, KPIs)
- ✅ Recuperación de errores (deshacer eliminaciones)
- ✅ Debugging mejorado (historial completo)

---

## 🎯 Problema Actual

**URL afectada:** `http://localhost:5173/appointments/{id}/edit`

**Síntomas:**
- ✅ La simulación visual funciona correctamente (marca para eliminar, compensa sesiones, renumera)
- ❌ Al hacer clic en "Guardar", los cambios NO se persisten en la base de datos
- ❌ El backend recibe datos pero no los procesa según la lógica de simulación

**Causa raíz:**
- Frontend envía `allSessions` sin distinguir entre operaciones (crear/eliminar/actualizar)
- Backend recibe datos pero NO tiene lógica para procesar sesiones marcadas para eliminar
- Backend NO tiene lógica para crear nuevas sesiones respetando números de sesión calculados
- Backend NO tiene lógica para manejar múltiples paquetes nuevos del mismo servicio

---

## 📊 Estado Actual del Código

### Frontend (`AppointmentFormPage.tsx`)

**Líneas 508-541: Función `handleSubmit`**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // ...validaciones...

  const submissionData: CreateAppointmentDto = {
    patientId: formData.patientId,
    scheduledDate: formData.scheduledDate,
    durationMinutes: formData.durationMinutes,
    reservationAmount: formData.reservationAmount,
    notes: formData.notes,
    services: allSessions  // ⚠️ PROBLEMA: Envía todas las sesiones sin distinguir operaciones
  };

  if (isEditMode && id) {
    await appointmentsService.updateAppointment(id, submissionData);
  } else {
    await appointmentsService.createAppointment(submissionData);
  }
}
```

**Problema:**
- Envía `allSessions` que contiene:
  - Sesiones existentes (con `appointmentServiceId`)
  - Sesiones existentes marcadas para eliminar (`markedForDeletion: true`)
  - Sesiones nuevas (sin `appointmentServiceId`)
  - NO distingue qué operación realizar para cada sesión

### Backend (`appointments.controller.ts`)

**Líneas 207-257: Función `updateAppointment`**
```typescript
export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { scheduledDate, durationMinutes, notes, status } = req.body;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
      notes,
      status,
    },
    // ...includes...
  });

  res.json(appointment);
};
```

**Problema:**
- Solo actualiza campos básicos del `Appointment`
- NO procesa el array `services` del body
- NO maneja `AppointmentService` (sesiones)
- NO crea nuevas sesiones
- NO elimina sesiones marcadas para eliminar
- NO crea/actualiza `Order` si es necesario

---

## 🏗️ Arquitectura de la Solución

### Flujo Propuesto

```
Frontend (Simulación)
  ↓
[Transformar estado de simulación a operaciones explícitas]
  ↓
{
  toDelete: [appointmentServiceId1, appointmentServiceId2, ...],
  toCreate: [
    { orderId: "...", sessionNumber: 1, ... },
    { orderId: "...", sessionNumber: 2, ... },
  ],
  newOrders: [
    { serviceId: "...", totalSessions: 3, ... },
  ]
}
  ↓
Backend API (Procesamiento transaccional)
  ↓
[Operaciones en orden específico dentro de transacción]
  ↓
1. DELETE AppointmentService (sesiones marcadas para eliminar)
2. CREATE Order (nuevos paquetes)
3. CREATE AppointmentService (nuevas sesiones)
4. UPDATE Appointment (datos básicos)
  ↓
Base de Datos ✅
```

---

## 🔧 Cambios Necesarios

### 1️⃣ Frontend: Transformar Estado de Simulación

**Archivo:** `frontend/src/pages/AppointmentFormPage.tsx`

**Ubicación:** Modificar función `handleSubmit` (líneas 508-541)

**Cambios:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  try {
    setIsSaving(true);
    setError(null);

    // 🆕 NUEVO: Transformar estado de simulación a operaciones explícitas
    const operations = transformSessionsToOperations(allSessions, orders);

    const submissionData = {
      patientId: formData.patientId,
      scheduledDate: formData.scheduledDate,
      durationMinutes: formData.durationMinutes,
      reservationAmount: formData.reservationAmount,
      notes: formData.notes,

      // 🆕 NUEVO: Enviar operaciones explícitas en lugar de sesiones brutas
      sessionOperations: {
        toDelete: operations.toDelete,      // IDs de AppointmentService a eliminar
        toCreate: operations.toCreate,      // Nuevas sesiones a crear
        newOrders: operations.newOrders,    // Nuevos paquetes a crear
      }
    };

    if (isEditMode && id) {
      await appointmentsService.updateAppointment(id, submissionData);
    } else {
      await appointmentsService.createAppointment(submissionData);
    }

    navigate('/appointments');
  } catch (err: any) {
    setError(err.response?.data?.message || 'Error al guardar cita');
  } finally {
    setIsSaving(false);
  }
};
```

**Nueva función auxiliar:**

```typescript
/**
 * Transforma el estado de simulación a operaciones explícitas para el backend
 */
const transformSessionsToOperations = (
  sessions: SessionInput[],
  orders: OrderMetadata[]
) => {
  const toDelete: string[] = [];
  const toCreate: Array<{
    orderId?: string;
    serviceId: string;
    sessionNumber: number;
    tempPackageId?: string;
  }> = [];
  const newOrders: Array<{
    serviceId: string;
    totalSessions: number;
    tempPackageId: string;
  }> = [];

  // Track which new orders we've already added
  const addedNewOrders = new Set<string>();

  sessions.forEach(session => {
    // 1. Sesiones existentes marcadas para eliminar
    if (session.appointmentServiceId && session.markedForDeletion) {
      toDelete.push(session.appointmentServiceId);
    }

    // 2. Sesiones nuevas (a crear)
    if (!session.appointmentServiceId && !session.markedForDeletion) {
      // Si tiene orderId, es sesión nueva de paquete existente
      if (session.orderId) {
        toCreate.push({
          orderId: session.orderId,
          serviceId: session.serviceId,
          sessionNumber: session.sessionNumber || 1,
        });
      }
      // Si tiene tempPackageId, es sesión de paquete nuevo
      else if (session.tempPackageId) {
        // Agregar el nuevo paquete solo una vez
        if (!addedNewOrders.has(session.tempPackageId)) {
          const service = services.find(s => s.id === session.serviceId);
          newOrders.push({
            serviceId: session.serviceId,
            totalSessions: service?.defaultSessions || 1,
            tempPackageId: session.tempPackageId,
          });
          addedNewOrders.add(session.tempPackageId);
        }

        // Agregar la sesión a crear (el backend creará el Order primero)
        toCreate.push({
          serviceId: session.serviceId,
          sessionNumber: session.sessionNumber || 1,
          tempPackageId: session.tempPackageId,
        });
      }
    }
  });

  return { toDelete, toCreate, newOrders };
};
```

---

### 2️⃣ Backend: Procesar Operaciones Transaccionalmente

**Archivo:** `backend/src/controllers/appointments.controller.ts`

**Ubicación:** Reemplazar función `updateAppointment` (líneas 207-257)

**Cambios:**

```typescript
export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      scheduledDate,
      durationMinutes,
      notes,
      status,
      sessionOperations  // 🆕 NUEVO: Recibir operaciones explícitas
    } = req.body;

    // Ejecutar todas las operaciones dentro de una transacción
    const appointment = await prisma.$transaction(async (tx) => {

      // ============================================
      // PASO 1: Eliminar sesiones marcadas
      // ============================================
      if (sessionOperations?.toDelete && sessionOperations.toDelete.length > 0) {
        await tx.appointmentService.deleteMany({
          where: {
            id: { in: sessionOperations.toDelete },
            appointmentId: id,  // Seguridad: solo de esta cita
          },
        });
      }

      // ============================================
      // PASO 2: Crear nuevos paquetes (Orders)
      // ============================================
      const newOrdersMap = new Map<string, string>(); // tempPackageId → orderId real

      if (sessionOperations?.newOrders && sessionOperations.newOrders.length > 0) {
        for (const newOrder of sessionOperations.newOrders) {
          const service = await tx.service.findUnique({
            where: { id: newOrder.serviceId },
          });

          if (!service) {
            throw new AppError(`Service not found: ${newOrder.serviceId}`, 404);
          }

          // Obtener el paciente de la cita
          const apt = await tx.appointment.findUnique({
            where: { id },
            select: { patientId: true },
          });

          if (!apt) {
            throw new AppError('Appointment not found', 404);
          }

          // Crear el nuevo Order
          const createdOrder = await tx.order.create({
            data: {
              patientId: apt.patientId,
              serviceId: newOrder.serviceId,
              totalSessions: newOrder.totalSessions,
              originalPrice: service.basePrice,
              discount: 0,
              finalPrice: service.basePrice,
              createdById: req.user!.id,
            },
          });

          // Mapear tempPackageId → orderId real
          newOrdersMap.set(newOrder.tempPackageId, createdOrder.id);
        }
      }

      // ============================================
      // PASO 3: Crear nuevas sesiones
      // ============================================
      if (sessionOperations?.toCreate && sessionOperations.toCreate.length > 0) {
        for (const newSession of sessionOperations.toCreate) {
          let finalOrderId = newSession.orderId;

          // Si tiene tempPackageId, usar el orderId real recién creado
          if (newSession.tempPackageId) {
            finalOrderId = newOrdersMap.get(newSession.tempPackageId);

            if (!finalOrderId) {
              throw new AppError(
                `Order not found for tempPackageId: ${newSession.tempPackageId}`,
                500
              );
            }
          }

          if (!finalOrderId) {
            throw new AppError('OrderId is required for new session', 400);
          }

          // Crear AppointmentService
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
      // PASO 4: Actualizar datos básicos del Appointment
      // ============================================
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: {
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
          notes,
          status,
        },
        include: {
          patient: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          attendedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          patientRecords: {
            orderBy: { createdAt: 'desc' },
          },
          appointmentServices: {
            include: {
              order: {
                include: {
                  service: true,
                },
              },
            },
          },
        },
      });

      return updatedAppointment;
    });

    res.json(appointment);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error updating appointment:', error);
      res.status(500).json({ error: 'Failed to update appointment' });
    }
  }
};
```

---

### 3️⃣ Tipos de Datos

**Archivo:** `frontend/src/types/index.ts` (o crear si no existe)

**Agregar:**

```typescript
export interface SessionOperations {
  toDelete: string[];  // IDs de AppointmentService a eliminar
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
  patientId: string;
  scheduledDate: string;
  durationMinutes: number;
  reservationAmount?: number;
  notes?: string;
  status?: string;
  sessionOperations?: SessionOperations;  // 🆕 NUEVO
}
```

---

## 🔄 Orden de Operaciones (Crítico)

### Por qué este orden es importante:

1. **DELETE primero:** Liberar números de sesión ocupados antes de crear nuevos
2. **CREATE Orders:** Necesitamos los `orderId` reales antes de crear `AppointmentService`
3. **CREATE AppointmentService:** Usar los `orderId` reales del paso anterior
4. **UPDATE Appointment:** Actualizar metadatos al final

### Transaccionalidad:

- ✅ Todo dentro de `prisma.$transaction`
- ✅ Si falla algún paso, se hace ROLLBACK completo
- ✅ Garantiza consistencia de datos

---

## 🧪 Casos de Prueba

### Caso 1: Eliminar sesión existente
**Estado inicial:**
- Paquete existente: Hollywood Peel x3
- Sesiones reservadas: 1, 2, 3

**Acción:**
- Marcar sesión 2 para eliminar
- Guardar

**Resultado esperado:**
```sql
-- AppointmentService eliminado
DELETE FROM appointment_services WHERE id = '{id-sesion-2}';

-- Quedan sesiones 1 y 3
SELECT * FROM appointment_services WHERE appointment_id = '{id}';
-- Resultado: session_number IN (1, 3)
```

---

### Caso 2: Agregar sesión a paquete existente
**Estado inicial:**
- Paquete existente: Hollywood Peel x3 (total: 3 sesiones)
- Sesiones reservadas: 1, 2

**Acción:**
- Agregar sesión 3 (orderId existente, sessionNumber = 3)
- Guardar

**Resultado esperado:**
```sql
-- Nuevo AppointmentService creado
INSERT INTO appointment_services (appointment_id, order_id, session_number)
VALUES ('{appointment-id}', '{order-id}', 3);

-- Ahora hay 3 sesiones
SELECT * FROM appointment_services WHERE appointment_id = '{id}';
-- Resultado: session_number IN (1, 2, 3)
```

---

### Caso 3: Crear nuevo paquete
**Estado inicial:**
- Sin paquetes previos de HIFU

**Acción:**
- Agregar HIFU x6 (nuevo paquete)
- Agregar sesiones 1, 2, 3 del nuevo paquete
- Guardar

**Resultado esperado:**
```sql
-- 1. Crear nuevo Order
INSERT INTO orders (patient_id, service_id, total_sessions, original_price, final_price, created_by_id)
VALUES ('{patient-id}', '{hifu-service-id}', 6, 250.00, 250.00, '{user-id}');

-- 2. Crear 3 AppointmentService
INSERT INTO appointment_services (appointment_id, order_id, session_number)
VALUES
  ('{appointment-id}', '{new-order-id}', 1),
  ('{appointment-id}', '{new-order-id}', 2),
  ('{appointment-id}', '{new-order-id}', 3);
```

---

### Caso 4: Compensación automática
**Estado inicial:**
- Paquete existente: Hollywood Peel x3
- Sesiones reservadas: 1, 2, 3

**Acción:**
- Marcar sesión 3 para eliminar
- Agregar sesión nueva del mismo paquete
- **Compensación automática:** Se cancelan mutuamente

**Resultado esperado:**
```sql
-- NO se elimina nada
-- NO se crea nada
-- Sesiones finales: 1, 2, 3 (sin cambios)

SELECT * FROM appointment_services WHERE appointment_id = '{id}';
-- Resultado: session_number IN (1, 2, 3) -- IGUAL QUE ANTES
```

**Nota:** La compensación ya ocurre en el frontend (`applySessionCompensation`), por lo que en `toDelete` y `toCreate` ya vendrán filtrados.

---

### Caso 5: Renumeración con eliminación intermedia
**Estado inicial:**
- Paquete nuevo (en creación): Hollywood Peel x3
- Sesiones: 1, 2, 3

**Acción:**
- Eliminar sesión 2
- **Renumeración automática:** 3 → 2

**Resultado esperado:**
```sql
-- Crear Order
INSERT INTO orders (...) VALUES (...);

-- Crear AppointmentService (solo 2 sesiones, renumeradas)
INSERT INTO appointment_services (appointment_id, order_id, session_number)
VALUES
  ('{appointment-id}', '{new-order-id}', 1),
  ('{appointment-id}', '{new-order-id}', 2);  -- Era 3, ahora es 2
```

**Nota:** La renumeración ya ocurre en el frontend (`renumberNewSessions`), por lo que `toCreate` ya vendrá con los números correctos.

---

## ⚠️ Validaciones Necesarias

### Frontend:
1. ✅ No permitir guardar si hay paquete con 0 sesiones
2. ✅ Validar que `sessionNumber` esté dentro del rango válido (1 a totalSessions)
3. ✅ Validar que no haya números duplicados en el mismo paquete

### Backend:
1. ✅ Validar que `appointmentServiceId` en `toDelete` pertenezca a la cita actual (seguridad)
2. ✅ Validar que `orderId` en `toCreate` exista en la base de datos
3. ✅ Validar que `serviceId` en `newOrders` exista y esté activo
4. ✅ Validar que `sessionNumber` no esté ya ocupado en el Order
5. ✅ Validar que el paciente de la cita coincida con el paciente del Order

---

## 📈 Impacto en el Sistema

### Cambios en Base de Datos:
- ✅ **Ningún cambio en schema** (solo operaciones CRUD existentes)
- ✅ Usa relaciones ya existentes (Appointment → AppointmentService → Order)

### Cambios en API:
- 🔧 Modificar endpoint `PUT /appointments/:id` para recibir `sessionOperations`
- 🔧 Agregar lógica transaccional en `updateAppointment`

### Cambios en Frontend:
- 🔧 Modificar `handleSubmit` en `AppointmentFormPage.tsx`
- 🔧 Agregar función `transformSessionsToOperations`
- 🔧 Actualizar tipos en `types/index.ts`

### Compatibilidad:
- ✅ **Modo create:** No afectado (no usa `sessionOperations`)
- ✅ **Modo edit:** Compatible con versión anterior si no se envía `sessionOperations`
- ✅ **Otras páginas:** No afectadas

---

## 🚀 Plan de Implementación

### Fase 1: Backend (Crítico)
**Tiempo estimado:** 2-3 horas

1. Crear tipos `SessionOperations` en TypeScript backend
2. Modificar `updateAppointment` controller
3. Agregar validaciones de seguridad
4. Agregar logs para debugging
5. Probar con Postman/Insomnia

### Fase 2: Frontend (Crítico)
**Tiempo estimado:** 1-2 horas

1. Crear función `transformSessionsToOperations`
2. Modificar `handleSubmit`
3. Actualizar tipos en `types/index.ts`
4. Agregar validaciones pre-submit

### Fase 3: Testing (Importante)
**Tiempo estimado:** 2-3 horas

1. Probar caso 1: Eliminar sesión existente
2. Probar caso 2: Agregar sesión a paquete existente
3. Probar caso 3: Crear nuevo paquete
4. Probar caso 4: Compensación automática
5. Probar caso 5: Renumeración
6. Probar rollback en caso de error

### Fase 4: Validación (Opcional)
**Tiempo estimado:** 1 hora

1. Agregar mensajes de error amigables
2. Agregar loading states mejorados
3. Agregar confirmación antes de eliminar sesiones

---

## 🎯 Resultado Final Esperado

### ✅ Estado "Guardado Exitoso":

1. **Base de datos refleja exactamente la simulación:**
   - Sesiones eliminadas → Registros de `AppointmentService` eliminados
   - Sesiones nuevas → Registros de `AppointmentService` creados
   - Paquetes nuevos → Registros de `Order` creados
   - Números de sesión correctos → `session_number` en DB coincide con UI

2. **Transaccionalidad garantizada:**
   - Si falla algo, TODO se revierte (rollback)
   - No quedan datos inconsistentes

3. **Usuario ve confirmación:**
   - Redirige a `/appointments`
   - Mensaje de éxito (opcional)

---

## ❓ Preguntas para Aprobación

Antes de implementar, necesito confirmación en:

1. **¿El orden de operaciones propuesto es correcto?**
   - DELETE → CREATE Orders → CREATE AppointmentService → UPDATE Appointment

2. **¿La estructura de `sessionOperations` es clara?**
   ```typescript
   {
     toDelete: string[],
     toCreate: Array<{ orderId?, serviceId, sessionNumber, tempPackageId? }>,
     newOrders: Array<{ serviceId, totalSessions, tempPackageId }>
   }
   ```

3. **¿Qué hacer si falla alguna operación?**
   - Propongo: Rollback completo + mensaje de error al usuario

4. **¿Necesitas validaciones adicionales?**
   - Por ejemplo: límite máximo de sesiones por cita, validación de horarios, etc.

5. **¿Algún caso de uso adicional que deba considerar?**

---

## 📝 Notas Finales

- Este plan mantiene la **simulación actual** intacta (toda la lógica de compensación y renumeración sigue en el frontend)
- El backend solo ejecuta las operaciones finales ya calculadas
- La transaccionalidad garantiza que no haya estados inconsistentes
- Los cambios son **retrocompatibles** (modo create no se afecta)

---

**🟢 Listo para implementar una vez aprobado este plan.**
