# Diagrama Entidad-Relación - DermicaPro (Actualizado 2025-12-04)

## Diagrama ER Completo

```
┌─────────────────────────┐
│         USER            │
│─────────────────────────│
│ id (PK)                 │
│ email (UNIQUE)          │
│ password                │
│ firstName               │
│ lastName                │
│ role (admin/sales/...)  │
│ isActive                │
│ createdAt               │
└─────────────────────────┘
         │ 1
         │ creates
         │ *
┌─────────────────────────┐
│       PATIENT           │
│─────────────────────────│
│ id (PK)                 │
│ firstName               │
│ lastName                │
│ dni (UNIQUE)            │
│ dateOfBirth             │
│ sex                     │
│ phone                   │
│ email                   │
│ address                 │
│ createdById (FK)        │◄────┐
│ createdAt               │     │
└─────────────────────────┘     │
         │ 1                     │
         │                       │
         │ * has                 │
┌─────────────────────────┐     │
│        ORDER            │     │
│─────────────────────────│     │
│ id (PK)                 │     │
│ patientId (FK)          │─────┘
│ serviceId (FK)          │─────┐
│ totalSessions           │     │
│ completedSessions       │     │
│ originalPrice           │     │
│ discount                │     │
│ finalPrice              │     │
│ notes                   │     │
│ createdById (FK)        │     │
│ createdAt               │     │
└─────────────────────────┘     │
         │ 1                     │
         │                       │
         │ * has                 │
┌─────────────────────────┐     │ * uses
│      APPOINTMENT        │     │
│─────────────────────────│     │
│ id (PK)                 │     │
│ patientId (FK)          │     │
│ serviceId (FK)          │─────┤
│ orderId (FK, nullable)  │─────┘
│ sessionNumber (nullable)│
│ scheduledDate           │
│ durationMinutes         │
│ status                  │
│ reservationAmount       │
│ reservationReceiptUrl   │
│ notes                   │
│ createdById (FK)        │
│ attendedById (FK, null) │
│ attendedAt (nullable)   │
│ createdAt               │
└─────────────────────────┘
         │ 1
         │
         │ * has additional
         │
┌─────────────────────────┐
│  APPOINTMENT_SERVICE    │
│─────────────────────────│
│ id (PK)                 │
│ appointmentId (FK)      │─────┐
│ serviceId (FK)          │─────┤
│ orderId (FK, nullable)  │     │
│ sessionNumber (nullable)│     │
│ createdAt               │     │
└─────────────────────────┘     │
                                │
         ┌──────────────────────┘
         │ * uses
         │
         │ 1
┌─────────────────────────┐
│       SERVICE           │
│─────────────────────────│
│ id (PK)                 │
│ name                    │
│ description             │
│ basePrice               │
│ defaultSessions         │
│ isActive                │
│ createdAt               │
└─────────────────────────┘
         │ 1
         │
         │ * generates
         │
┌─────────────────────────┐
│    PATIENT_RECORD       │
│─────────────────────────│
│ id (PK)                 │
│ patientId (FK)          │
│ appointmentId (FK)      │
│ originalServiceId (FK?) │──┐
│ weight                  │  │
│ bodyMeasurement (JSON)  │  │
│ healthNotes             │  │
│ beforePhotoUrls (JSON)  │  │
│ afterPhotoUrls (JSON)   │  │
│ createdById (FK)        │  │
│ createdAt               │  │
└─────────────────────────┘  │
                              │
         ┌────────────────────┘
         │ (when service changed)
         │
         │ 1
┌─────────────────────────┐
│      COMMISSION         │
│─────────────────────────│
│ id (PK)                 │
│ salesPersonId (FK)      │──┐
│ appointmentId (FK)      │  │
│ commissionRate          │  │
│ commissionAmount        │  │
│ status                  │  │
│ paidAt (nullable)       │  │
│ createdAt               │  │
└─────────────────────────┘  │
                              │
                              └──(all FK to USER)
```

## Cardinalidades Detalladas

### 1. USER → PATIENT (1:*)
- **Relación**: "creates" (crea)
- **Descripción**: Un usuario puede crear múltiples pacientes
- **FK**: `patient.createdById → user.id`
- **Restricción**: `onDelete: Restrict` (no se puede eliminar usuario con pacientes)

### 2. PATIENT → ORDER (1:*)
- **Relación**: "has" (tiene)
- **Descripción**: Un paciente puede tener múltiples paquetes/órdenes
- **FK**: `order.patientId → patient.id`
- **Restricción**: `onDelete: Cascade` (eliminar paciente elimina sus órdenes)
- **Caso de Uso**: Permite crear paquetes sin cita agendada (ej: cliente paga adelanto pero sin fecha)

### 3. SERVICE → ORDER (*:1)
- **Relación**: "is purchased as" (se compra como)
- **Descripción**: Múltiples órdenes pueden ser del mismo servicio
- **FK**: `order.serviceId → service.id`
- **Restricción**: `onDelete: Restrict` (no se puede eliminar servicio con órdenes)

### 4. ORDER → APPOINTMENT (1:*)
- **Relación**: "has sessions in" (tiene sesiones en)
- **Descripción**: Una orden puede tener múltiples citas (sesiones)
- **FK**: `appointment.orderId → order.id` (nullable)
- **Restricción**: `onDelete: Restrict` (no se puede eliminar orden con citas)

### 5. PATIENT → APPOINTMENT (1:*)
- **Relación**: "schedules" (agenda)
- **Descripción**: Un paciente puede agendar múltiples citas
- **FK**: `appointment.patientId → patient.id`
- **Restricción**: `onDelete: Cascade`

### 6. SERVICE → APPOINTMENT (*:1)
- **Relación**: "is performed in" (se realiza en)
- **Descripción**: Múltiples citas pueden ser del mismo servicio
- **FK**: `appointment.serviceId → service.id`
- **Restricción**: `onDelete: Restrict`

### 7. APPOINTMENT → APPOINTMENT_SERVICE (1:*)
- **Relación**: "includes additional" (incluye adicionales)
- **Descripción**: Una cita puede incluir múltiples servicios/sesiones adicionales
- **FK**: `appointment_service.appointmentId → appointment.id`
- **Restricción**: `onDelete: Cascade` (eliminar cita elimina sus servicios adicionales)

### 8. SERVICE → APPOINTMENT_SERVICE (*:1)
- **Relación**: "is added to" (se agrega a)
- **Descripción**: Un servicio puede estar en múltiples servicios adicionales
- **FK**: `appointment_service.serviceId → service.id`
- **Restricción**: `onDelete: Restrict`

### 9. ORDER → APPOINTMENT_SERVICE (1:*)
- **Relación**: "tracks sessions in" (rastrea sesiones en)
- **Descripción**: Una orden puede tener sesiones distribuidas en múltiples citas
- **FK**: `appointment_service.orderId → order.id` (nullable)
- **Restricción**: `onDelete: Restrict`

### 10. APPOINTMENT → PATIENT_RECORD (1:*)
- **Relación**: "generates" (genera)
- **Descripción**: Una cita puede generar múltiples registros médicos
- **FK**: `patient_record.appointmentId → appointment.id`
- **Restricción**: `onDelete: Cascade`

### 11. PATIENT → PATIENT_RECORD (1:*)
- **Relación**: "has medical history in" (tiene historial médico en)
- **Descripción**: Un paciente puede tener múltiples registros médicos
- **FK**: `patient_record.patientId → patient.id`
- **Restricción**: `onDelete: Cascade`

### 12. APPOINTMENT → COMMISSION (1:1)
- **Relación**: "generates" (genera)
- **Descripción**: Una cita con reserva genera una comisión
- **FK**: `commission.appointmentId → appointment.id`
- **Restricción**: `onDelete: Cascade`

### 13. USER → COMMISSION (1:*)
- **Relación**: "earns" (gana)
- **Descripción**: Un vendedor puede ganar múltiples comisiones
- **FK**: `commission.salesPersonId → user.id`
- **Restricción**: `onDelete: Restrict`

## Estados y Enums

### AppointmentStatus
```typescript
enum AppointmentStatus {
  reserved    // Cita agendada
  attended    // Cita atendida
  cancelled   // Cita cancelada
  no_show     // Paciente no asistió
}
```

### UserRole
```typescript
enum UserRole {
  admin       // Administrador
  sales       // Vendedor
  doctor      // Médico/Doctor
}
```

### CommissionStatus
```typescript
enum CommissionStatus {
  pending     // Pendiente de pago
  paid        // Pagada
}
```

### Sex
```typescript
enum Sex {
  M           // Masculino
  F           // Femenino
}
```

## Reglas de Negocio Implementadas

### 1. Sistema de Sesiones Múltiples en una Cita
- ✅ Una APPOINTMENT tiene un servicio principal (`serviceId`, `orderId`, `sessionNumber`)
- ✅ Puede tener N servicios adicionales en APPOINTMENT_SERVICE
- ✅ Cada servicio adicional también puede tener `orderId` y `sessionNumber`

### 2. Creación de Paquetes Automática
- ✅ Si un servicio tiene `defaultSessions > 1` y no se especifica `orderId`
- ✅ El sistema crea automáticamente un ORDER con `totalSessions = defaultSessions`
- ✅ La primera sesión se asigna con `sessionNumber = 1`

### 3. Cálculo de Números de Sesión
- ✅ El backend calcula automáticamente el siguiente `sessionNumber` disponible
- ✅ Considera citas canceladas (no ocupan número)
- ✅ Reutiliza números de sesiones canceladas

### 4. Validación de Paquetes Pendientes
- ✅ El frontend previene agendar nueva sesión si hay una pendiente (`reserved`)
- ✅ Solo permite una cita pendiente por paquete a la vez

### 5. Historial Médico con Servicio Original
- ✅ Si un servicio es cambiado durante la atención, se guarda el `originalServiceId`
- ✅ Permite rastrear qué servicio se agendó vs qué se realizó

### 6. Sistema de Comisiones
- ✅ Se genera comisión automáticamente si hay `reservationAmount > 0`
- ✅ Tasa de comisión: 10% del monto de reserva
- ✅ Estado inicial: `pending`

### 7. Soft Delete de Citas
- ✅ Eliminar cita = cambiar status a `cancelled`
- ✅ Preserva historial, comisiones y registros asociados
- ✅ No cuenta para números de sesión ocupados

## Casos de Uso Principales

### Caso 1: Cliente Nuevo - Una Sesión Simple
```
1. Crear PATIENT
2. Crear APPOINTMENT
   - serviceId: "Limpieza Facial"
   - orderId: null (sesión única)
   - sessionNumber: null
```

### Caso 2: Cliente Nuevo - Servicio con Paquete
```
1. Crear PATIENT
2. Frontend envía:
   services: [{ serviceId: "Hollywood Peel" }]
3. Backend automáticamente:
   - Crea ORDER (totalSessions = 3)
   - Crea APPOINTMENT (sessionNumber = 1, orderId = nuevo)
```

### Caso 3: Cliente Nuevo - Múltiples Servicios en una Cita
```
1. Crear PATIENT
2. Frontend envía:
   services: [
     { serviceId: "Hollywood Peel" },
     { serviceId: "HIFU" }
   ]
3. Backend automáticamente:
   - Crea ORDER 1 para Hollywood Peel (3 sesiones)
   - Crea ORDER 2 para HIFU (2 sesiones)
   - Crea APPOINTMENT con Hollywood Peel (sesión 1/3)
   - Crea APPOINTMENT_SERVICE con HIFU (sesión 1/2)
```

### Caso 4: Cliente Antiguo - Completar Paquetes Existentes
```
1. Cliente tiene:
   - ORDER 1: Hollywood Peel (sesión 1/3 completada)
   - ORDER 2: HIFU (sesión 1/2 completada)
2. Frontend envía:
   services: [
     { serviceId: "Hollywood Peel", orderId: "order1" },
     { serviceId: "HIFU", orderId: "order2" }
   ]
3. Backend calcula:
   - Hollywood Peel: sessionNumber = 2
   - HIFU: sessionNumber = 2
```

### Caso 5: Atender Cita y Generar Historial Médico
```
1. Marcar APPOINTMENT como attended
2. Crear PATIENT_RECORD con:
   - weight, bodyMeasurement
   - healthNotes
   - beforePhotoUrls, afterPhotoUrls
3. Si servicio cambió: guardar originalServiceId
```

## Índices y Performance

### Índices Importantes
```sql
-- PATIENT
CREATE INDEX idx_patient_dni ON patients(dni);
CREATE INDEX idx_patient_created_by ON patients(created_by_id);

-- APPOINTMENT
CREATE INDEX idx_appointment_patient ON appointments(patient_id);
CREATE INDEX idx_appointment_service ON appointments(service_id);
CREATE INDEX idx_appointment_order ON appointments(order_id);
CREATE INDEX idx_appointment_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_appointment_status ON appointments(status);

-- APPOINTMENT_SERVICE
CREATE INDEX idx_appointment_service_appointment ON appointment_services(appointment_id);
CREATE INDEX idx_appointment_service_order ON appointment_services(order_id);

-- ORDER
CREATE INDEX idx_order_patient ON orders(patient_id);
CREATE INDEX idx_order_service ON orders(service_id);

-- COMMISSION
CREATE INDEX idx_commission_sales_person ON commissions(sales_person_id);
CREATE INDEX idx_commission_status ON commissions(status);
```

## Diagrama de Flujo de Datos: Crear Cita con Múltiples Sesiones

```
Frontend: AppointmentFormPage
         │
         │ User agrega sesiones
         │
         ▼
   [Session List]
   - Hollywood Peel (nuevo paquete)
   - HIFU (paquete existente, sesión 2)
         │
         │ Submit
         │
         ▼
   POST /appointments
   {
     patientId: "...",
     scheduledDate: "...",
     services: [
       { serviceId: "hp-id" },
       { serviceId: "hifu-id", orderId: "order-123" }
     ]
   }
         │
         ▼
Backend: appointments.controller.ts
         │
         ├─► Extract first session → mainServiceId, mainOrderId
         │
         ├─► Check if needs new ORDER for main service
         │   (if defaultSessions > 1 && no orderId)
         │
         ├─► Calculate sessionNumber for main service
         │
         ├─► Create APPOINTMENT (with main service)
         │
         ├─► For each additional service:
         │   ├─► Check if needs new ORDER
         │   ├─► Calculate sessionNumber
         │   └─► Create APPOINTMENT_SERVICE
         │
         └─► Return created appointment
```

## Migración y Compatibilidad

### ✅ Compatibilidad con Sistema Anterior
- El sistema anterior enviaba: `serviceId` + `orderId` en root
- El nuevo sistema envía: `services[]` array
- El backend acepta ambos formatos
- Migración gradual sin romper funcionalidad existente

### 🔄 Deprecaciones
- `CreateAppointmentDto.serviceId` - Deprecated, usar `services[]`
- `CreateAppointmentDto.orderId` - Deprecated, usar `services[].orderId`

## Resumen Visual de Relaciones Clave

```
PATIENT
  ├─► tiene muchos ORDER (paquetes comprados, con o sin fecha agendada)
  │    └─► pertenece a un SERVICE
  │    └─► tiene muchas APPOINTMENT_SERVICE (sesiones del paquete distribuidas en citas)
  │
  └─► tiene muchas APPOINTMENT
       └─► cada APPOINTMENT tiene muchos APPOINTMENT_SERVICE
            └─► cada APPOINTMENT_SERVICE puede pertenecer a un ORDER
                 └─► cada ORDER pertenece a un SERVICE

APPOINTMENT (Cita - Contenedor Puro)
  ├─► pertenece a un PATIENT
  ├─► tiene muchos APPOINTMENT_SERVICE (TODAS las sesiones de la cita)
  │    ├─► cada uno tiene un SERVICE
  │    └─► opcionalmente pertenece a un ORDER
  ├─► genera PATIENT_RECORD al ser atendida
  └─► genera COMMISSION si tiene reservationAmount
```

---

## CAMBIO ARQUITECTÓNICO IMPORTANTE (2025-12-04)

### Nueva Arquitectura: APPOINTMENT como Contenedor Puro

A partir de esta versión, APPOINTMENT ya NO tiene servicio principal. Ahora funciona como un **contenedor puro** donde TODAS las sesiones se almacenan en `APPOINTMENT_SERVICE`.

#### Cambios en el Modelo APPOINTMENT:

```typescript
// ❌ ANTES (v2.0):
model Appointment {
  serviceId     String    // REQUERIDO - sesión principal
  orderId       String?   // opcional
  sessionNumber Int?      // opcional
  service       Service   // relación con servicio principal
  order         Order?    // relación con paquete
}

// ✅ AHORA (v3.0 - ARQUITECTURA LIMPIA):
model Appointment {
  // ❌ ELIMINADOS: serviceId, orderId, sessionNumber, service, order
  // ✅ Solo campos esenciales del contenedor
  patientId              String
  scheduledDate          DateTime
  durationMinutes        Int
  status                 AppointmentStatus
  reservationAmount      Decimal?
  notes                  String?
  createdById            String
  attendedById           String?
  appointmentServices    AppointmentService[] // TODAS las sesiones aquí
}
```

#### Nueva Estructura de Datos:

```
APPOINTMENT (contenedor vacío)
  ├─ patientId
  ├─ scheduledDate
  ├─ durationMinutes
  ├─ status
  ├─ notes
  └─ appointmentServices: [TODAS las sesiones aquí]
       ├─ appointmentService 1
       │   ├─ serviceId
       │   ├─ orderId (si es parte de un paquete)
       │   └─ sessionNumber (si es parte de un paquete)
       ├─ appointmentService 2
       └─ appointmentService N
```

#### Migraciones Aplicadas:

1. **Migración 1**: `20251204010457_make_appointment_service_id_nullable`
   - **Cambio**: `serviceId`, `orderId`, `sessionNumber` se hicieron NULLABLE
   - **Objetivo**: Preparación para eliminar campos

2. **Migración 2**: `20251204011252_remove_deprecated_appointment_fields`
   - **Cambio**: ELIMINADOS completamente `serviceId`, `orderId`, `sessionNumber` de appointments
   - **Cambio**: ELIMINADAS relaciones `service` y `order` del modelo Appointment
   - **Resultado**: Arquitectura 100% limpia - APPOINTMENT es contenedor puro

#### Backend - Nueva Lógica de createAppointment:

```typescript
// ❌ ANTES (v2.0): Extraía primera sesión como principal
const [firstSession, ...rest] = services;
appointment.serviceId = firstSession.serviceId;
appointment.orderId = firstSession.orderId;
appointment.sessionNumber = 1;
appointmentServices = rest; // solo adicionales

// ✅ AHORA (v3.0): APPOINTMENT puro, TODAS las sesiones en appointmentServices
const appointment = await tx.appointment.create({
  data: {
    patientId,
    // ❌ NO MÁS: serviceId, orderId, sessionNumber
    scheduledDate: new Date(scheduledDate),
    durationMinutes,
    status: 'reserved',
    // ...otros campos del contenedor
  }
});

// Crear AppointmentService para CADA sesión en services[]
for (const svc of services) {
  await tx.appointmentService.create({
    data: {
      appointmentId: appointment.id,
      serviceId: svc.serviceId,
      orderId: svc.orderId || null,
      sessionNumber: svc.sessionNumber || null,
    }
  });
}
```

#### Frontend - Mostrar Servicios:

```typescript
// ❌ NO USAR:
appointment.service?.name

// ✅ USAR:
appointment.appointmentServices?.map(as => as.service?.name).join(', ')
```

---
**Última actualización**: 2025-12-04
**Versión del sistema**: v3.0 - APPOINTMENT como contenedor puro, todas las sesiones en APPOINTMENT_SERVICE
