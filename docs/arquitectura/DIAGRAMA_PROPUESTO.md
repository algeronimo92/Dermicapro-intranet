# Diagrama Propuesto - Modelo Mejorado

## Tu Propuesta vs Implementación Actual

### Lo que propones:
```
CITA (1 → *) SESIÓN
SESIÓN (* → 1) SERVICIOS_CONTRATADOS (Paquete/Order)
SERVICIOS_CONTRATADOS (* → 1) SERVICIO
SERVICIOS_CONTRATADOS (1 → *) BOLETA
```

### Implementación Actual:
```
APPOINTMENT (1 → *) APPOINTMENT_SERVICE
APPOINTMENT_SERVICE (* → 1) ORDER (Servicios Contratados)
ORDER (* → 1) SERVICE
ORDER (1 → 1) ??? (No hay boletas todavía)
```

## Diagrama Mejorado con tu Propuesta

```
┌─────────────────┐
│    PATIENT      │
│─────────────────│
│ id (PK)         │
│ firstName       │
│ lastName        │
│ dni             │
└─────────────────┘
         │
         │ 1
         │
         │ *
┌─────────────────────────┐
│  SERVICIOS_CONTRATADOS  │ ← Paquete/Order
│─────────────────────────│
│ id (PK)                 │
│ patientId (FK)          │
│ serviceId (FK)          │
│ totalSessions           │
│ completedSessions       │
│ originalPrice           │
│ discount                │
│ finalPrice              │
│ createdById (FK)        │
│ createdAt               │
└─────────────────────────┘
         │                  │
         │ 1                │ *
         │                  │
         │ *                │ 1
┌─────────────────┐    ┌─────────────────┐
│    SESIÓN       │    │    BOLETA       │
│─────────────────│    │─────────────────│
│ id (PK)         │    │ id (PK)         │
│ appointmentId(FK)│    │ orderId (FK)    │
│ orderId (FK) ───┘    │ number          │
│ serviceId (FK)       │ amount          │
│ sessionNumber        │ date            │
│ createdAt            │ status          │
└─────────────────┘    │ receiptUrl      │
         │             └─────────────────┘
         │ *
         │
         │ 1
┌─────────────────┐
│      CITA       │ ← Appointment
│─────────────────│
│ id (PK)         │
│ patientId (FK)  │
│ scheduledDate   │
│ durationMinutes │
│ status          │
│ notes           │
│ createdById (FK)│
│ attendedById(FK)│
│ attendedAt      │
└─────────────────┘
         │
         │ 1
         │
         │ *
┌─────────────────┐         ┌─────────────────┐
│    SERVICE      │─────────│  PATIENT_RECORD │
│─────────────────│    *  1 │─────────────────│
│ id (PK)         │         │ id (PK)         │
│ name            │         │ patientId (FK)  │
│ description     │         │ appointmentId(FK)│
│ basePrice       │         │ weight          │
│ defaultSessions │         │ bodyMeasurement │
│ isActive        │         │ healthNotes     │
└─────────────────┘         │ beforePhotos    │
                            │ afterPhotos     │
                            └─────────────────┘
```

## Comparación de Modelos

### Modelo Actual (Implementado)
```sql
-- Una cita puede tener múltiples sesiones
APPOINTMENT
  ├─ serviceId (FK) → Primera sesión
  ├─ orderId (FK)
  └─ sessionNumber

APPOINTMENT_SERVICE (Sesiones adicionales)
  ├─ appointmentId (FK)
  ├─ serviceId (FK)
  ├─ orderId (FK)
  └─ sessionNumber
```

### Modelo Propuesto (Tu sugerencia)
```sql
-- Una cita puede tener múltiples sesiones
CITA (APPOINTMENT)
  ├─ scheduledDate
  └─ status

SESIÓN (APPOINTMENT_SERVICE)
  ├─ appointmentId (FK) → CITA
  ├─ orderId (FK) → SERVICIOS_CONTRATADOS
  ├─ serviceId (FK)
  └─ sessionNumber

SERVICIOS_CONTRATADOS (ORDER)
  ├─ patientId (FK)
  ├─ serviceId (FK)
  └─ totalSessions

BOLETA (Nueva tabla)
  ├─ orderId (FK) → SERVICIOS_CONTRATADOS
  ├─ amount
  └─ receiptUrl
```

## Ventajas del Modelo Propuesto

### 1. Separación Clara
- **CITA**: Solo información de la visita (fecha, hora, estado)
- **SESIÓN**: Cada procedimiento realizado en la visita
- **SERVICIOS_CONTRATADOS**: Paquetes comprados
- **BOLETA**: Pagos realizados

### 2. Elimina Redundancia
**Problema actual:**
```
APPOINTMENT tiene:
  - serviceId (Primera sesión)
  - orderId
  - sessionNumber

APPOINTMENT_SERVICE tiene:
  - serviceId (Sesiones adicionales)
  - orderId
  - sessionNumber
```

**Solución propuesta:**
```
APPOINTMENT solo tiene:
  - scheduledDate
  - status
  - notes

SESIÓN tiene TODAS las sesiones:
  - serviceId
  - orderId
  - sessionNumber
```

### 3. Modelo de Pagos Claro
Actualmente: `reservationAmount` en APPOINTMENT (solo para reservas)

Propuesta: Tabla BOLETA separada
- Múltiples boletas por paquete
- Historial completo de pagos
- Vinculado al paquete, no a la cita

## Migración Necesaria

### Paso 1: Crear tabla BOLETA
```prisma
model Boleta {
  id            String   @id @default(uuid())
  orderId       String   @map("order_id")
  number        String?  // Número de boleta
  amount        Decimal  @db.Decimal(10, 2)
  paymentMethod PaymentMethod
  date          DateTime @default(now())
  status        String   // paid, pending, cancelled
  receiptUrl    String?  @map("receipt_url")
  notes         String?
  createdById   String   @map("created_by_id")
  createdAt     DateTime @default(now()) @map("created_at")

  // Relations
  order     Order @relation(fields: [orderId], references: [id])
  createdBy User  @relation(fields: [createdById], references: [id])

  @@map("boletas")
}
```

### Paso 2: Modificar APPOINTMENT
```prisma
model Appointment {
  id              String            @id @default(uuid())
  patientId       String            @map("patient_id")
  // ELIMINAR: serviceId, orderId, sessionNumber
  scheduledDate   DateTime          @map("scheduled_date")
  durationMinutes Int               @default(60) @map("duration_minutes")
  status          AppointmentStatus @default(reserved)
  notes           String?
  createdById     String            @map("created_by_id")
  attendedById    String?           @map("attended_by_id")
  attendedAt      DateTime?         @map("attended_at")
  createdAt       DateTime          @default(now()) @map("created_at")

  // Relations
  patient          Patient             @relation(fields: [patientId], references: [id])
  createdBy        User                @relation("AppointmentCreatedBy", fields: [createdById], references: [id])
  attendedBy       User?               @relation("AppointmentAttendedBy", fields: [attendedById], references: [id])
  sesiones         AppointmentService[] // TODAS las sesiones van aquí
  patientRecords   PatientRecord[]

  @@map("appointments")
}
```

### Paso 3: APPOINTMENT_SERVICE se convierte en SESIÓN principal
```prisma
model AppointmentService {
  id            String   @id @default(uuid())
  appointmentId String   @map("appointment_id")
  serviceId     String   @map("service_id")
  orderId       String?  @map("order_id")
  sessionNumber Int?     @map("session_number")
  status        String   @default("pending") // pending, completed, cancelled
  createdAt     DateTime @default(now()) @map("created_at")

  // Relations
  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  service     Service     @relation(fields: [serviceId], references: [id])
  order       Order?      @relation(fields: [orderId], references: [id])

  @@map("sesiones") // Cambiar nombre de tabla
}
```

## Ejemplo con Nuevo Modelo

### Escenario: Cliente compra 2 paquetes y agenda cita

```sql
-- 1. Cliente compra Hollywood Peel x3
INSERT INTO servicios_contratados (id, patientId, serviceId, totalSessions)
VALUES ('order1', 'patient1', 'hollywood-peel', 3);

-- 2. Cliente compra HIFU x2
INSERT INTO servicios_contratados (id, patientId, serviceId, totalSessions)
VALUES ('order2', 'patient1', 'hifu', 2);

-- 3. Cliente paga primera boleta
INSERT INTO boletas (id, orderId, amount, paymentMethod, status)
VALUES ('bol1', 'order1', 200.00, 'cash', 'paid');

-- 4. Cliente agenda cita para el 15 Dic
INSERT INTO cita (id, patientId, scheduledDate, status)
VALUES ('apt1', 'patient1', '2025-12-15 14:00', 'reserved');

-- 5. Agrega sesiones a la cita
INSERT INTO sesiones (id, appointmentId, serviceId, orderId, sessionNumber)
VALUES
  ('ses1', 'apt1', 'hollywood-peel', 'order1', 1),
  ('ses2', 'apt1', 'hifu', 'order2', 1);

-- Resultado:
┌────────────────────────────────────────┐
│ CITA: 15 Dic 2025, 2:00 PM            │
│ Estado: Reservada                      │
├────────────────────────────────────────┤
│ SESIONES:                              │
│  ✓ Hollywood Peel - Sesión 1/3        │
│  ✓ HIFU - Sesión 1/2                  │
├────────────────────────────────────────┤
│ PAQUETES:                              │
│  📦 Order1: Hollywood Peel (1/3)       │
│     💰 Boleta #1: S/. 200.00 (Pagado) │
│  📦 Order2: HIFU (1/2)                 │
│     ⚠️  Sin boleta                     │
└────────────────────────────────────────┘
```

## Consultas con Nuevo Modelo

### Obtener cita completa con sesiones y boletas
```sql
SELECT
  a.id as cita_id,
  a.scheduledDate,
  a.status as cita_status,
  s.id as sesion_id,
  s.sessionNumber,
  sv.name as servicio_name,
  o.id as order_id,
  o.totalSessions,
  b.amount as boleta_amount,
  b.status as boleta_status
FROM appointments a
LEFT JOIN sesiones s ON s.appointmentId = a.id
LEFT JOIN services sv ON s.serviceId = sv.id
LEFT JOIN servicios_contratados o ON s.orderId = o.id
LEFT JOIN boletas b ON b.orderId = o.id
WHERE a.id = 'apt1';
```

### Verificar saldo pendiente de un paquete
```sql
SELECT
  o.id,
  o.finalPrice as precio_total,
  COALESCE(SUM(b.amount), 0) as pagado,
  (o.finalPrice - COALESCE(SUM(b.amount), 0)) as saldo_pendiente
FROM servicios_contratados o
LEFT JOIN boletas b ON b.orderId = o.id AND b.status = 'paid'
WHERE o.id = 'order1'
GROUP BY o.id;
```

## Recomendación

Tu propuesta es **MÁS LIMPIA** que la implementación actual porque:

1. ✅ **Elimina duplicación**: No hay `serviceId` en dos lugares
2. ✅ **Separación de responsabilidades**: CITA solo maneja la visita, SESIÓN maneja los procedimientos
3. ✅ **Sistema de pagos**: BOLETA permite múltiples pagos por paquete
4. ✅ **Escalabilidad**: Fácil agregar características (ej: pagos parciales, adelantos)

¿Quieres que implemente este modelo mejorado o prefieres mantener el actual?
