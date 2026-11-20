# Reglas de Negocio - DermicaPro

## Documento de Reglas de Negocio Completas

**Última actualización:** 3 de diciembre de 2025
**Autor:** Análisis exhaustivo del código base
**Fuentes:** Backend controllers, Schema Prisma, Rutas, Middleware

---

## Tabla de Contenidos

1. [Gestión de Usuarios (Users)](#1-gestión-de-usuarios-users)
2. [Gestión de Pacientes (Patients)](#2-gestión-de-pacientes-patients)
3. [Gestión de Servicios (Services)](#3-gestión-de-servicios-services)
4. [Gestión de Paquetes (Orders)](#4-gestión-de-paquetes-orders)
5. [Gestión de Citas (Appointments)](#5-gestión-de-citas-appointments)
6. [Gestión de Servicios por Cita (AppointmentServices)](#6-gestión-de-servicios-por-cita-appointmentservices)
7. [Gestión de Sesiones de Tratamiento (TreatmentSessions)](#7-gestión-de-sesiones-de-tratamiento-treatmentsessions)
8. [Gestión de Registros Médicos (PatientRecords)](#8-gestión-de-registros-médicos-patientrecords)
9. [Gestión de Comisiones (Commissions)](#9-gestión-de-comisiones-commissions)
10. [Gestión de Facturas (Invoices)](#10-gestión-de-facturas-invoices)
11. [Gestión de Pagos (Payments)](#11-gestión-de-pagos-payments)
12. [Autenticación y Autorización](#12-autenticación-y-autorización)
13. [Flujos de Trabajo Completos](#13-flujos-de-trabajo-completos)
14. [Validaciones y Restricciones](#14-validaciones-y-restricciones)

---

## 1. Gestión de Usuarios (Users)

### 1.1 Roles del Sistema

**Fuente:** `backend/prisma/schema.prisma` líneas 13-17

```prisma
enum Role {
  admin
  nurse
  sales
}
```

**Descripción:**
- **admin**: Administrador con permisos completos
- **nurse**: Enfermera/o que atiende citas y registra tratamientos
- **sales**: Personal de ventas que crea citas y gestiona pacientes

### 1.2 Creación de Usuarios

**Fuente:** `backend/src/controllers/users.controller.ts` líneas 117-176

**Reglas:**
- Solo usuarios con rol `admin` pueden crear nuevos usuarios
- Campos requeridos: `email`, `password`, `firstName`, `lastName`, `role`
- El email debe ser único en el sistema
- El rol debe ser uno de: `admin`, `nurse`, `sales`
- La contraseña se almacena hasheada (bcrypt)
- Campos opcionales: `sex`, `dateOfBirth`
- Por defecto `isActive` es `true`

**Validaciones:**
```typescript
// Validar campos requeridos
if (!email || !password || !firstName || !lastName || !role) {
  throw new AppError('Missing required fields', 400);
}

// Validar que el rol sea válido
if (!['admin', 'nurse', 'sales'].includes(role)) {
  throw new AppError('Invalid role', 400);
}

// Verificar si el email ya existe
const existingUser = await prisma.user.findUnique({ where: { email } });
if (existingUser) {
  throw new AppError('User with this email already exists', 409);
}
```

### 1.3 Actualización de Usuarios

**Fuente:** `backend/src/controllers/users.controller.ts` líneas 178-235

**Reglas:**
- Usuarios autenticados pueden actualizar `firstName`, `lastName`, `sex`, `dateOfBirth`
- Solo usuarios `admin` pueden cambiar el `role` y el estado `isActive`
- Si se proporciona una nueva contraseña, se hashea antes de guardar
- No se puede cambiar el email de un usuario

### 1.4 Desactivación de Usuarios

**Fuente:** `backend/src/controllers/users.controller.ts` líneas 237-266

**Reglas:**
- Solo usuarios `admin` pueden desactivar usuarios
- Un usuario NO puede desactivarse a sí mismo
- La desactivación es un "soft delete" (cambia `isActive` a `false`)
- Los usuarios desactivados no pueden iniciar sesión

```typescript
// No permitir que el usuario se desactive a sí mismo
if (req.user!.id === id) {
  throw new AppError('Cannot deactivate your own account', 400);
}
```

### 1.5 Estadísticas de Usuarios

**Fuente:** `backend/src/controllers/users.controller.ts` líneas 290-374

**Reglas:**
- Cualquier usuario autenticado puede ver estadísticas de usuarios
- Para usuarios con rol `sales`:
  - Se calculan comisiones totales
  - Se calculan comisiones pagadas
  - Se cuenta el número de comisiones
- Para usuarios con rol `nurse`:
  - Se cuentan las citas atendidas en los últimos 30 días

---

## 2. Gestión de Pacientes (Patients)

### 2.1 Creación de Pacientes

**Fuente:** `backend/src/controllers/patients.controller.ts` líneas 162-200

**Reglas:**
- Cualquier usuario autenticado puede crear pacientes
- Campos requeridos: `firstName`, `lastName`, `dni`, `dateOfBirth`, `sex`
- El `dni` debe ser único en el sistema
- Campos opcionales: `phone`, `email`, `address`
- El paciente queda asociado al usuario que lo crea (`createdById`)

**Validaciones:**
```typescript
if (!firstName || !lastName || !dni || !dateOfBirth || !sex) {
  throw new AppError('Missing required fields', 400);
}

const existingPatient = await prisma.patient.findUnique({ where: { dni } });
if (existingPatient) {
  throw new AppError('Patient with this DNI already exists', 409);
}
```

### 2.2 Actualización de Pacientes

**Fuente:** `backend/src/controllers/patients.controller.ts` líneas 202-224

**Reglas:**
- Cualquier usuario autenticado puede actualizar pacientes
- No se puede actualizar el `dni` (campo único e inmutable)
- No se actualiza el `createdById` (queda el usuario original)

### 2.3 Eliminación de Pacientes

**Fuente:** `backend/src/controllers/patients.controller.ts` líneas 226-238

**Reglas:**
- Solo usuarios con rol `admin` pueden eliminar pacientes
- Es una eliminación permanente (hard delete)
- Se elimina en cascada (dependiendo de las relaciones en Prisma)

### 2.4 Historial de Paciente

**Fuente:** `backend/src/controllers/patients.controller.ts` líneas 240-349

**Reglas:**
- Solo usuarios con rol `admin` o `nurse` pueden ver el historial completo
- El historial incluye:
  - Todas las citas del paciente (ordenadas por fecha descendente)
  - Servicios asociados a cada cita
  - Registros médicos (PatientRecords) de cada cita
  - Estadísticas calculadas:
    - Total de citas
    - Citas atendidas
    - Citas canceladas
    - Citas con "no show"
    - Fecha de registro
    - Fecha de última atención
    - Fecha de última cita

### 2.5 Listado de Pacientes

**Fuente:** `backend/src/controllers/patients.controller.ts` líneas 5-114

**Reglas:**
- Soporta paginación: `page`, `limit`
- Soporta búsqueda por texto: `search` (busca en firstName, lastName, dni, phone, email)
- Soporta filtro por sexo: `sex`
- Incluye información de última atención (`lastAttendedDate`, `lastAttendedBy`)

---

## 3. Gestión de Servicios (Services)

### 3.1 Creación de Servicios

**Fuente:** `backend/src/controllers/services.controller.ts` líneas 50-81

**Reglas:**
- Campos requeridos: `name`, `basePrice`
- El `basePrice` debe ser mayor o igual a 0
- `defaultSessions` debe ser al menos 1 (por defecto es 1)
- Por defecto `isActive` es `true`
- Campos opcionales: `description`, `isActive`

**Validaciones:**
```typescript
if (!name || !basePrice) {
  return res.status(400).json({ message: 'Nombre y precio son requeridos' });
}

if (basePrice < 0) {
  return res.status(400).json({ message: 'El precio debe ser mayor o igual a 0' });
}

if (defaultSessions !== undefined && defaultSessions < 1) {
  return res.status(400).json({ message: 'El número de sesiones debe ser al menos 1' });
}
```

### 3.2 Actualización de Servicios

**Fuente:** `backend/src/controllers/services.controller.ts` líneas 83-121

**Reglas:**
- Mismas validaciones que creación
- Se puede actualizar: `name`, `description`, `basePrice`, `defaultSessions`, `isActive`

### 3.3 Eliminación de Servicios (Soft Delete)

**Fuente:** `backend/src/controllers/services.controller.ts` líneas 123-150

**Reglas:**
- Es una eliminación lógica (soft delete)
- Se actualiza el campo `deletedAt` con la fecha actual
- No se puede eliminar un servicio ya eliminado
- Los servicios eliminados se pueden restaurar

### 3.4 Restauración de Servicios

**Fuente:** `backend/src/controllers/services.controller.ts` líneas 152-179

**Reglas:**
- Solo se pueden restaurar servicios que tengan `deletedAt` no nulo
- La restauración pone `deletedAt` a `null`

### 3.5 Listado de Servicios

**Fuente:** `backend/src/controllers/services.controller.ts` líneas 4-31

**Reglas:**
- Por defecto solo muestra servicios activos (`deletedAt: null`)
- Se puede incluir servicios eliminados con query param `includeDeleted=true`
- Los servicios activos se filtran además por `isActive: true`
- Ordenados alfabéticamente por nombre

---

## 4. Gestión de Paquetes (Orders)

### 4.1 Modelo de Order

**Fuente:** `backend/prisma/schema.prisma` líneas 130-152

```prisma
model Order {
  id                String   @id @default(uuid())
  patientId         String   @map("patient_id")
  serviceId         String   @map("service_id")
  totalSessions     Int      @map("total_sessions")
  completedSessions Int      @default(0) @map("completed_sessions")
  originalPrice     Decimal  @map("original_price") @db.Decimal(10, 2)
  discount          Decimal  @default(0) @map("discount") @db.Decimal(10, 2)
  finalPrice        Decimal  @map("final_price") @db.Decimal(10, 2)
  notes             String?
  createdById       String   @map("created_by_id")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relations
  patient             Patient              @relation(fields: [patientId], references: [id])
  service             Service              @relation(fields: [serviceId], references: [id])
  createdBy           User                 @relation("OrderCreatedBy", fields: [createdById], references: [id])
  appointmentServices AppointmentService[]
  invoice             Invoice?
}
```

### 4.2 Creación Automática de Orders

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 218-232

**Reglas CRÍTICAS:**
- Un Order se crea AUTOMÁTICAMENTE cuando se crea una cita SIN especificar `orderId`
- Al crear la cita, si no se proporciona `orderId` en el array `services`:
  1. Se crea un nuevo Order
  2. El Order toma los valores por defecto del servicio:
     - `totalSessions` = `service.defaultSessions`
     - `originalPrice` = `service.basePrice`
     - `discount` = 0
     - `finalPrice` = `service.basePrice`
  3. Se asigna `sessionNumber = 1` automáticamente

```typescript
// ALWAYS create an ORDER if not provided
if (!svcOrderId) {
  const newOrder = await tx.order.create({
    data: {
      patientId,
      serviceId: svc.serviceId,
      totalSessions: service.defaultSessions,
      completedSessions: 0,
      originalPrice: service.basePrice,
      discount: 0,
      finalPrice: service.basePrice,
      createdById: req.user!.id,
    },
  });
  svcOrderId = newOrder.id;
  svcSessionNumber = 1;
}
```

### 4.3 Relación Order - Invoice

**Fuente:** `backend/prisma/schema.prisma` líneas 149, 255

**Reglas:**
- La relación entre Order e Invoice es **1:1**
- Un Order puede tener máximo un Invoice
- El campo `orderId` en Invoice es `@unique`
- Un Invoice se crea cuando el cliente compra un paquete (no implementado aún en controllers)

---

## 5. Gestión de Citas (Appointments)

### 5.1 Modelo de Appointment

**Fuente:** `backend/prisma/schema.prisma` líneas 154-180

```prisma
model Appointment {
  id                    String            @id @default(uuid())
  patientId             String            @map("patient_id")
  scheduledDate         DateTime          @map("scheduled_date")
  durationMinutes       Int               @default(60) @map("duration_minutes")
  status                AppointmentStatus @default(reserved)
  reservationAmount     Decimal?          @map("reservation_amount") @db.Decimal(10, 2)
  reservationReceiptUrl String?           @map("reservation_receipt_url")
  createdById           String            @map("created_by_id")
  attendedById          String?           @map("attended_by_id")
  attendedAt            DateTime?         @map("attended_at")
  notes                 String?
  createdAt             DateTime          @default(now()) @map("created_at")
  updatedAt             DateTime          @updatedAt @map("updated_at")
}
```

### 5.2 Estados de Cita

**Fuente:** `backend/prisma/schema.prisma` líneas 25-30

```prisma
enum AppointmentStatus {
  reserved
  attended
  cancelled
  no_show
}
```

**Transiciones de Estado:**
- `reserved` → `attended` (cuando se marca como atendida)
- `reserved` → `cancelled` (cuando se cancela)
- `reserved` → `no_show` (cuando el paciente no asiste)

### 5.3 Creación de Citas

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 177-305

**Reglas CRÍTICAS:**
- Solo usuarios con rol `admin` o `sales` pueden crear citas
- Campos requeridos:
  - `patientId`
  - `scheduledDate`
  - `services` (array con al menos un servicio)
- El campo `durationMinutes` por defecto es 60
- El estado inicial es siempre `reserved`
- Una cita es un "contenedor" que puede tener múltiples servicios

**Estructura del array `services`:**
```typescript
services: [
  {
    serviceId: "uuid-del-servicio",
    orderId?: "uuid-del-order-existente",  // Opcional
    sessionNumber?: 1                       // Opcional
  }
]
```

**Lógica de creación:**
1. Se crea el Appointment como contenedor
2. Para CADA servicio en el array `services`:
   - Si NO tiene `orderId`: se crea un Order automáticamente
   - Si tiene `orderId` pero NO tiene `sessionNumber`: se calcula el siguiente disponible
   - Se crea un registro en `AppointmentService` vinculando el Appointment con el Order

**Cálculo de sessionNumber:**
```typescript
// Si el servicio tiene orderId pero no sessionNumber, calcular el siguiente
if (!svcSessionNumber) {
  const existingAppointmentServices = await tx.appointmentService.findMany({
    where: { orderId: svcOrderId },
    select: { sessionNumber: true },
  });

  const occupiedNumbers = new Set(
    existingAppointmentServices.map(as => as.sessionNumber).filter(n => n !== null) as number[]
  );

  svcSessionNumber = 1;
  while (occupiedNumbers.has(svcSessionNumber)) {
    svcSessionNumber++;
  }
}
```

### 5.4 Adelanto/Reserva (reservationAmount)

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 179, 283-294

**Reglas:**
- Es un campo opcional que indica el monto pagado como adelanto para reservar la cita
- Si se proporciona un `reservationAmount` > 0, se crea automáticamente una comisión:
  - Tasa de comisión: 10% (0.1)
  - La comisión se asigna al usuario que crea la cita (`req.user.id`)
  - Estado inicial de la comisión: `pending`

```typescript
if (reservationAmount && parseFloat(reservationAmount) > 0) {
  const commissionRate = 0.1; // 10% commission rate
  await prisma.commission.create({
    data: {
      salesPersonId: req.user!.id,
      appointmentId: appointment!.id,
      commissionRate,
      commissionAmount: parseFloat(reservationAmount) * commissionRate,
      status: 'pending',
    },
  });
}
```

### 5.5 Actualización de Citas

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 307-330

**Reglas:**
- Solo usuarios con rol `admin` o `sales` pueden actualizar citas
- Se puede actualizar: `scheduledDate`, `durationMinutes`, `notes`, `status`

### 5.6 Cancelación de Citas (Soft Delete)

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 332-347

**Reglas:**
- Solo usuarios con rol `admin` o `sales` pueden cancelar citas
- Es un "soft delete": cambia el status a `cancelled`
- NO se elimina el registro de la base de datos
- Se preservan comisiones y registros asociados

### 5.7 Marcar Cita como Atendida

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 349-424

**Reglas:**
- Solo usuarios con rol `admin` o `nurse` pueden marcar citas como atendidas
- Al marcar como atendida:
  1. Se cambia el `status` a `attended`
  2. Se registra `attendedById` con el ID del usuario que atiende
  3. Se registra `attendedAt` con la fecha/hora actual
  4. Si se proporciona información médica, se crea un `PatientRecord`

**Campos opcionales al atender:**
- `serviceId`: Si se proporciona un servicio diferente al original
- `notes` o `treatmentNotes`: Notas del tratamiento
- `weight`: Peso del paciente
- `bodyMeasurement`: Medidas corporales (JSON)
- `healthNotes`: Notas de salud
- `beforePhotoUrls`: URLs de fotos antes del tratamiento (JSON)
- `afterPhotoUrls`: URLs de fotos después del tratamiento (JSON)

**Cambio de servicio:**
Si se proporciona un `serviceId` diferente al original, se guarda el servicio original en el PatientRecord:
```typescript
const originalServiceId = originalAppointment?.serviceId;
const serviceChanged = serviceId && serviceId !== originalServiceId;

// En PatientRecord:
originalServiceId: serviceChanged ? originalServiceId : null
```

### 5.8 Listado de Citas

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 5-105

**Reglas:**
- Soporta paginación: `page`, `limit`
- Filtros disponibles:
  - `status`: Filtrar por estado de cita
  - `date`: Filtrar por fecha específica
  - `userId`: Filtrar por usuario que creó la cita (solo admin)
- **Filtro automático por rol:**
  - Si el usuario tiene rol `sales`, solo ve citas que él creó (`createdById = req.user.id`)
  - Los usuarios `admin` y `nurse` ven todas las citas

```typescript
if (req.user?.role === 'sales') {
  where.createdById = req.user.id;
}
```

### 5.9 Subida de Comprobantes

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 426-451

**Reglas:**
- Solo usuarios con rol `admin` o `sales` pueden subir comprobantes
- El comprobante se almacena en `reservationReceiptUrl`
- Formatos permitidos: JPEG, PNG, WebP (configurado en middleware)
- Tamaño máximo de archivo: definido en configuración

---

## 6. Gestión de Servicios por Cita (AppointmentServices)

### 6.1 Modelo de AppointmentService

**Fuente:** `backend/prisma/schema.prisma` líneas 239-251

```prisma
model AppointmentService {
  id            String   @id @default(uuid())
  appointmentId String   @map("appointment_id")
  orderId       String   @map("order_id")
  sessionNumber Int?     @map("session_number")
  createdAt     DateTime @default(now()) @map("created_at")

  // Relations
  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  order       Order       @relation(fields: [orderId], references: [id])
}
```

### 6.2 Propósito

**Reglas:**
- `AppointmentService` es una tabla intermedia que vincula Appointments con Orders
- Permite que una sola cita (Appointment) tenga múltiples servicios/sesiones
- Cada `AppointmentService` representa una sesión de un paquete (Order)
- El campo `sessionNumber` indica qué sesión del paquete se está consumiendo

### 6.3 Eliminación en Cascada

**Fuente:** `backend/prisma/schema.prisma` línea 247

**Reglas:**
- Cuando se elimina un Appointment, se eliminan automáticamente todos los AppointmentServices asociados (`onDelete: Cascade`)
- Cuando se elimina un Order, los AppointmentServices NO se eliminan automáticamente (no hay cascade)

---

## 7. Gestión de Sesiones de Tratamiento (TreatmentSessions)

### 7.1 Modelo de TreatmentSession

**Fuente:** `backend/prisma/schema.prisma` líneas 182-198

```prisma
model TreatmentSession {
  id            String        @id @default(uuid())
  appointmentId String        @map("appointment_id")
  sessionNumber Int           @map("session_number")
  totalSessions Int           @map("total_sessions")
  amountPaid    Decimal       @map("amount_paid") @db.Decimal(10, 2)
  paymentMethod PaymentMethod @map("payment_method")
  performed     Boolean       @default(false)
  notes         String?
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  // Relations
  appointment Appointment @relation(fields: [appointmentId], references: [id])
}
```

### 7.2 Creación de Sesión

**Fuente:** `backend/src/controllers/sessions.controller.ts` líneas 20-79

**Reglas:**
- Solo usuarios con rol `admin` o `nurse` pueden crear sesiones
- Campos requeridos: `sessionNumber`, `totalSessions`, `amountPaid`, `paymentMethod`
- Por defecto `performed` es `false`
- Al crear una sesión, se puede crear automáticamente un `PatientRecord` si se proporcionan datos médicos

### 7.3 Métodos de Pago

**Fuente:** `backend/prisma/schema.prisma` líneas 32-38

```prisma
enum PaymentMethod {
  cash
  card
  transfer
  yape
  plin
}
```

---

## 8. Gestión de Registros Médicos (PatientRecords)

### 8.1 Modelo de PatientRecord

**Fuente:** `backend/prisma/schema.prisma` líneas 200-220

```prisma
model PatientRecord {
  id                String   @id @default(uuid())
  patientId         String   @map("patient_id")
  appointmentId     String   @map("appointment_id")
  originalServiceId String?  @map("original_service_id")
  weight            Decimal? @db.Decimal(5, 2)
  bodyMeasurement   Json?    @map("body_measurement")
  healthNotes       String?  @map("health_notes")
  beforePhotoUrls   Json?    @map("before_photo_urls")
  afterPhotoUrls    Json?    @map("after_photo_urls")
  createdById       String   @map("created_by_id")
  createdAt         DateTime @default(now()) @map("created_at")

  // Relations
  patient         Patient     @relation(fields: [patientId], references: [id])
  appointment     Appointment @relation(fields: [appointmentId], references: [id])
  originalService Service?    @relation("PatientRecordOriginalService", fields: [originalServiceId], references: [id])
  createdBy       User        @relation(fields: [createdById], references: [id])
}
```

### 8.2 Creación de Registro Médico

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 402-417

**Reglas:**
- Se crea AUTOMÁTICAMENTE al marcar una cita como atendida si se proporcionan datos médicos
- Condición: Al menos uno de estos campos debe tener valor:
  - `treatmentNotes`
  - `weight`
  - `bodyMeasurement`
  - `healthNotes`
  - `beforePhotoUrls`
  - `afterPhotoUrls`
- El registro queda vinculado a la cita y al paciente
- Si se cambió el servicio durante la atención, se guarda el `originalServiceId`

### 8.3 Campo originalServiceId

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 363-370, 408

**Reglas:**
- Este campo solo se llena si el servicio se cambió durante la atención
- Permite rastrear qué servicio estaba originalmente programado
- Es útil para auditoría y análisis de cambios de servicio

---

## 9. Gestión de Comisiones (Commissions)

### 9.1 Modelo de Commission

**Fuente:** `backend/prisma/schema.prisma` líneas 222-237

```prisma
model Commission {
  id               String           @id @default(uuid())
  salesPersonId    String           @map("sales_person_id")
  appointmentId    String           @map("appointment_id")
  commissionRate   Decimal          @map("commission_rate") @db.Decimal(5, 4)
  commissionAmount Decimal          @map("commission_amount") @db.Decimal(10, 2)
  status           CommissionStatus @default(pending)
  paidAt           DateTime?        @map("paid_at")
  createdAt        DateTime         @default(now()) @map("created_at")

  // Relations
  salesPerson User        @relation(fields: [salesPersonId], references: [id])
  appointment Appointment @relation(fields: [appointmentId], references: [id])
}
```

### 9.2 Estados de Comisión

**Fuente:** `backend/prisma/schema.prisma` líneas 40-44

```prisma
enum CommissionStatus {
  pending
  paid
  cancelled
}
```

### 9.3 Creación Automática de Comisión

**Fuente:** `backend/src/controllers/appointments.controller.ts` líneas 283-294

**Reglas:**
- Se crea AUTOMÁTICAMENTE cuando se crea una cita con `reservationAmount` > 0
- Tasa de comisión fija: **10% (0.1)**
- La comisión se asigna al usuario que crea la cita (`createdById`)
- Estado inicial: `pending`
- Cálculo: `commissionAmount = reservationAmount * 0.1`

### 9.4 Cálculo de Estadísticas de Comisiones

**Fuente:** `backend/src/controllers/users.controller.ts` líneas 320-340

**Reglas:**
- Para usuarios con rol `sales` se calculan:
  - **totalCommissions**: Suma de todas las comisiones (sin importar estado)
  - **paidCommissions**: Suma solo de comisiones con status `paid`
  - **commissionCount**: Cantidad total de comisiones

---

## 10. Gestión de Facturas (Invoices)

### 10.1 Modelo de Invoice

**Fuente:** `backend/prisma/schema.prisma` líneas 253-269

```prisma
model Invoice {
  id          String        @id @default(uuid())
  orderId     String        @unique @map("order_id")
  patientId   String        @map("patient_id")
  totalAmount Decimal       @map("total_amount") @db.Decimal(10, 2)
  status      InvoiceStatus @default(pending)
  dueDate     DateTime?     @map("due_date")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  // Relations
  order    Order     @relation(fields: [orderId], references: [id])
  patient  Patient   @relation(fields: [patientId], references: [id])
  payments Payment[]
}
```

### 10.2 Estados de Factura

**Fuente:** `backend/prisma/schema.prisma` líneas 46-51

```prisma
enum InvoiceStatus {
  pending   // No ha pagado nada
  partial   // Ha pagado algo pero no todo
  paid      // Pagado completamente
  cancelled // Cancelado/anulado
}
```

### 10.3 Relación Invoice - Order

**Reglas:**
- Relación **1:1** estricta
- `orderId` es `@unique` en la tabla `invoices`
- Un Order solo puede tener máximo una Invoice
- Una Invoice está vinculada a exactamente un Order

### 10.4 Creación de Invoice (No implementado)

**Estado:** Los modelos existen en el schema, pero NO hay controladores implementados para crear/gestionar Invoices

**Reglas esperadas (según modelo):**
- Se debería crear cuando un cliente compra un paquete (Order)
- El `totalAmount` debería ser igual al `finalPrice` del Order
- Estado inicial debería ser `pending`

---

## 11. Gestión de Pagos (Payments)

### 11.1 Modelo de Payment

**Fuente:** `backend/prisma/schema.prisma` líneas 271-292

```prisma
model Payment {
  id            String        @id @default(uuid())
  patientId     String        @map("patient_id")
  invoiceId     String?       @map("invoice_id")
  appointmentId String?       @map("appointment_id")
  amountPaid    Decimal       @map("amount_paid") @db.Decimal(10, 2)
  paymentMethod PaymentMethod @map("payment_method")
  paymentType   PaymentType   @map("payment_type")
  paymentDate   DateTime      @default(now()) @map("payment_date")
  receiptUrl    String?       @map("receipt_url")
  notes         String?
  createdById   String        @map("created_by_id")
  createdAt     DateTime      @default(now()) @map("created_at")

  // Relations
  patient     Patient      @relation(fields: [patientId], references: [id])
  invoice     Invoice?     @relation(fields: [invoiceId], references: [id])
  appointment Appointment? @relation(fields: [appointmentId], references: [id])
  createdBy   User         @relation("PaymentCreatedBy", fields: [createdById], references: [id])
}
```

### 11.2 Tipos de Pago

**Fuente:** `backend/prisma/schema.prisma` líneas 53-60

```prisma
enum PaymentType {
  invoice_payment    // Pago de factura (tiene invoiceId)
  reservation        // Adelanto/reserva de cita (tiene appointmentId, no invoiceId)
  service_payment    // Pago directo de servicio (tiene appointmentId)
  account_credit     // Abono a cuenta del paciente (solo patientId)
  penalty            // Multa o penalidad
  other              // Otro tipo de pago
}
```

### 11.3 Reglas de Asociación de Pagos

**Reglas:**
- `patientId` es **SIEMPRE requerido** (todo pago está asociado a un paciente)
- `invoiceId` es **opcional** (solo para pagos tipo `invoice_payment`)
- `appointmentId` es **opcional** (solo para pagos tipo `reservation` o `service_payment`)

**Por tipo de pago:**

| PaymentType       | invoiceId | appointmentId | Descripción                                    |
|-------------------|-----------|---------------|------------------------------------------------|
| invoice_payment   | Requerido | No            | Pago de una factura de paquete                 |
| reservation       | No        | Requerido     | Adelanto para reservar una cita                |
| service_payment   | No        | Requerido     | Pago directo de un servicio en la cita         |
| account_credit    | No        | No            | Abono a cuenta del paciente (crédito)          |
| penalty           | No        | Puede tener   | Multa o penalidad (ej. por cancelación tardía) |
| other             | No        | Puede tener   | Otro tipo de pago no categorizado              |

### 11.4 Creación de Payments (No implementado)

**Estado:** Los modelos existen en el schema, pero NO hay controladores implementados para crear/gestionar Payments

---

## 12. Autenticación y Autorización

### 12.1 Sistema de Autenticación

**Fuente:** `backend/src/controllers/auth.controller.ts`

**Reglas:**
- Sistema basado en JWT (JSON Web Tokens)
- Dos tipos de tokens:
  - **Access Token**: Token de corta duración para acceder a recursos
  - **Refresh Token**: Token de larga duración para renovar el access token

### 12.2 Login

**Fuente:** `backend/src/controllers/auth.controller.ts` líneas 7-56

**Reglas:**
- Campos requeridos: `email`, `password`
- El usuario debe existir y estar activo (`isActive: true`)
- La contraseña se verifica con bcrypt
- Si las credenciales son válidas, se generan ambos tokens
- Los tokens incluyen: `id`, `email`, `role`

### 12.3 Refresh Token

**Fuente:** `backend/src/controllers/auth.controller.ts` líneas 58-96

**Reglas:**
- Permite renovar el access token sin volver a ingresar credenciales
- Se debe proporcionar un `refreshToken` válido
- Se verifica que el usuario siga activo
- Se generan nuevos access token y refresh token

### 12.4 Middleware de Autenticación

**Fuente:** `backend/src/middlewares/auth.ts` líneas 5-26

**Reglas:**
- Todas las rutas protegidas requieren un token en el header `Authorization`
- Formato: `Bearer <token>`
- Si no hay token o es inválido: Error 401 (Unauthorized)
- Si el token es válido, se decodifica y se almacena en `req.user`

### 12.5 Middleware de Autorización

**Fuente:** `backend/src/middlewares/auth.ts` líneas 28-42

**Reglas:**
- Permite restringir endpoints a roles específicos
- Se usa como: `authorize('admin', 'nurse')`
- Si el usuario no tiene uno de los roles permitidos: Error 403 (Forbidden)

### 12.6 Permisos por Endpoint

#### Usuarios (Users)
**Fuente:** `backend/src/routes/users.routes.ts`

| Método | Endpoint              | Roles permitidos | Descripción                  |
|--------|-----------------------|------------------|------------------------------|
| GET    | /api/users            | admin            | Listar todos los usuarios    |
| GET    | /api/users/:id        | Todos (autenticado) | Ver un usuario            |
| GET    | /api/users/:id/stats  | Todos (autenticado) | Ver estadísticas          |
| POST   | /api/users            | admin            | Crear nuevo usuario          |
| PUT    | /api/users/:id        | Todos (autenticado) | Actualizar usuario        |
| POST   | /api/users/:id/deactivate | admin        | Desactivar usuario           |
| POST   | /api/users/:id/activate   | admin        | Activar usuario              |

#### Pacientes (Patients)
**Fuente:** `backend/src/routes/patients.routes.ts`

| Método | Endpoint                | Roles permitidos     | Descripción                  |
|--------|-------------------------|----------------------|------------------------------|
| GET    | /api/patients           | Todos (autenticado)  | Listar pacientes             |
| GET    | /api/patients/:id       | Todos (autenticado)  | Ver un paciente              |
| GET    | /api/patients/:id/history | admin, nurse       | Ver historial completo       |
| POST   | /api/patients           | Todos (autenticado)  | Crear paciente               |
| PUT    | /api/patients/:id       | Todos (autenticado)  | Actualizar paciente          |
| DELETE | /api/patients/:id       | admin                | Eliminar paciente            |

#### Citas (Appointments)
**Fuente:** `backend/src/routes/appointments.routes.ts`

| Método | Endpoint                          | Roles permitidos | Descripción                     |
|--------|-----------------------------------|------------------|---------------------------------|
| GET    | /api/appointments                 | Todos (autenticado) | Listar citas (filtro automático por rol sales) |
| GET    | /api/appointments/:id             | Todos (autenticado) | Ver una cita                 |
| POST   | /api/appointments                 | admin, sales     | Crear cita                      |
| PUT    | /api/appointments/:id             | admin, sales     | Actualizar cita                 |
| DELETE | /api/appointments/:id             | admin, sales     | Cancelar cita                   |
| POST   | /api/appointments/:id/attend      | admin, nurse     | Marcar como atendida            |
| POST   | /api/appointments/:id/upload-receipt | admin, sales  | Subir comprobante de reserva    |
| POST   | /api/appointments/upload-photos   | admin, nurse     | Subir fotos de tratamiento      |

#### Sesiones (Sessions)
**Fuente:** `backend/src/routes/sessions.routes.ts`

| Método | Endpoint                                    | Roles permitidos | Descripción                  |
|--------|---------------------------------------------|------------------|------------------------------|
| GET    | /api/sessions/appointments/:id/sessions     | Todos (autenticado) | Listar sesiones de una cita |
| POST   | /api/sessions/appointments/:id/sessions     | admin, nurse     | Crear sesión                 |
| PUT    | /api/sessions/:id                           | admin, nurse     | Actualizar sesión            |
| POST   | /api/sessions/:id/upload-photos             | admin, nurse     | Subir fotos de sesión        |

#### Servicios (Services)
**Fuente:** `backend/src/routes/services.routes.ts`

| Método | Endpoint                  | Roles permitidos     | Descripción                  |
|--------|---------------------------|----------------------|------------------------------|
| GET    | /api/services             | Todos (autenticado)  | Listar servicios             |
| GET    | /api/services/active      | Todos (autenticado)  | Listar servicios activos     |
| GET    | /api/services/:id         | Todos (autenticado)  | Ver un servicio              |
| POST   | /api/services             | Todos (autenticado)  | Crear servicio (debería ser admin) |
| PUT    | /api/services/:id         | Todos (autenticado)  | Actualizar servicio (debería ser admin) |
| DELETE | /api/services/:id         | Todos (autenticado)  | Eliminar servicio (debería ser admin) |
| POST   | /api/services/:id/restore | Todos (autenticado)  | Restaurar servicio (debería ser admin) |

**NOTA:** Los endpoints de servicios deberían tener autorización `admin` para POST, PUT, DELETE, pero actualmente no la tienen implementada en las rutas.

---

## 13. Flujos de Trabajo Completos

### 13.1 Flujo: Cliente nuevo + Primera cita con adelanto

**Actores:** Usuario con rol `sales`

**Pasos:**
1. **Crear paciente** (POST /api/patients)
   - Validar DNI único
   - Guardar datos: firstName, lastName, dni, dateOfBirth, sex, etc.

2. **Crear cita con adelanto** (POST /api/appointments)
   - Proporcionar: patientId, scheduledDate, reservationAmount
   - Proporcionar array `services` con al menos un servicio
   - Sistema crea:
     - Appointment (status: reserved)
     - Order automáticamente (si no se proporciona orderId)
     - AppointmentService (vincula Appointment con Order)
     - Commission (10% del reservationAmount, status: pending)

3. **Subir comprobante de pago** (POST /api/appointments/:id/upload-receipt)
   - Guardar receiptUrl en el Appointment

**Resultado:**
- Paciente registrado
- Cita reservada
- Orden creada
- Comisión pendiente para el vendedor

### 13.2 Flujo: Atender una cita

**Actores:** Usuario con rol `nurse` o `admin`

**Pasos:**
1. **Listar citas del día** (GET /api/appointments?date=YYYY-MM-DD&status=reserved)

2. **Marcar cita como atendida** (POST /api/appointments/:id/attend)
   - Proporcionar datos del tratamiento:
     - treatmentNotes
     - weight, bodyMeasurement
     - healthNotes
     - beforePhotoUrls, afterPhotoUrls
   - Sistema actualiza:
     - Appointment.status = 'attended'
     - Appointment.attendedById = usuario actual
     - Appointment.attendedAt = fecha/hora actual
   - Sistema crea:
     - PatientRecord con todos los datos médicos

3. **Opcional: Crear sesión de tratamiento** (POST /api/sessions/appointments/:id/sessions)
   - Si se requiere registrar pago específico de la sesión

**Resultado:**
- Cita marcada como atendida
- Historial médico del paciente actualizado
- Sesión registrada (si aplica)

### 13.3 Flujo: Cliente compra paquete de sesiones

**Actores:** Usuario con rol `sales` o `admin`

**Estado:** Parcialmente implementado

**Pasos esperados:**
1. **Crear Order manualmente** (NO implementado aún)
   - Seleccionar servicio
   - Definir totalSessions, discount, finalPrice
   - Asociar a paciente

2. **Crear Invoice del Order** (NO implementado aún)
   - totalAmount = Order.finalPrice
   - status = 'pending'

3. **Registrar pago inicial** (NO implementado aún)
   - paymentType = 'invoice_payment'
   - invoiceId = Invoice.id
   - Actualizar Invoice.status según monto pagado:
     - Si pago parcial: status = 'partial'
     - Si pago completo: status = 'paid'

4. **Crear citas consumiendo el paquete** (POST /api/appointments)
   - Proporcionar orderId existente en el array `services`
   - El sistema asigna automáticamente el sessionNumber

**Resultado esperado:**
- Paquete vendido
- Invoice generada
- Pagos registrados
- Citas pueden consumir sesiones del paquete

### 13.4 Flujo: Consumir sesión de un paquete existente

**Actores:** Usuario con rol `sales` o `admin`

**Pasos:**
1. **Consultar paquetes del paciente** (GET /api/patients/:id)
   - Ver los Orders existentes con sesiones disponibles

2. **Crear cita usando el Order** (POST /api/appointments)
   - Proporcionar en el array `services`:
     ```json
     {
       "serviceId": "uuid-del-servicio",
       "orderId": "uuid-del-paquete-existente",
       "sessionNumber": 2  // Opcional, se calcula automáticamente
     }
     ```
   - Sistema crea:
     - Appointment
     - AppointmentService vinculando a la sesión del Order

3. **Atender la cita** (ver flujo 13.2)

**Resultado:**
- Cita creada usando sesión del paquete
- sessionNumber asignado
- Sesión consumida del Order

### 13.5 Flujo: Registrar historial médico completo

**Actores:** Usuario con rol `nurse` o `admin`

**Pasos:**
1. **Subir fotos antes del tratamiento** (POST /api/appointments/upload-photos)
   - Subir múltiples fotos (máximo 10)
   - Obtener URLs

2. **Atender la cita con datos completos** (POST /api/appointments/:id/attend)
   - Proporcionar:
     - weight, bodyMeasurement (JSON)
     - healthNotes, treatmentNotes
     - beforePhotoUrls (array de URLs)

3. **Durante/después del tratamiento: subir fotos después** (POST /api/sessions/:id/upload-photos)
   - type = 'after'
   - Se agregan a PatientRecord.afterPhotoUrls

4. **Ver historial completo del paciente** (GET /api/patients/:id/history)

**Resultado:**
- Historial médico completo con fotos antes/después
- Evolución del paciente documentada
- Medidas y peso registrados

---

## 14. Validaciones y Restricciones

### 14.1 Restricciones de Base de Datos

**Fuente:** `backend/prisma/schema.prisma`

#### Campos Únicos
- `User.email` (@unique)
- `Patient.dni` (@unique)
- `Invoice.orderId` (@unique)

#### Campos Requeridos (NOT NULL)
**User:**
- email, passwordHash, firstName, lastName, role

**Patient:**
- firstName, lastName, dni, dateOfBirth, sex, createdById

**Service:**
- name, basePrice, defaultSessions, isActive

**Order:**
- patientId, serviceId, totalSessions, originalPrice, discount, finalPrice, createdById

**Appointment:**
- patientId, scheduledDate, durationMinutes, status, createdById

**TreatmentSession:**
- appointmentId, sessionNumber, totalSessions, amountPaid, paymentMethod, performed

**PatientRecord:**
- patientId, appointmentId, createdById

**Commission:**
- salesPersonId, appointmentId, commissionRate, commissionAmount, status

**AppointmentService:**
- appointmentId, orderId

**Invoice:**
- orderId, patientId, totalAmount, status

**Payment:**
- patientId, amountPaid, paymentMethod, paymentType, createdById

### 14.2 Relaciones en Cascada (onDelete)

| Modelo            | Relación          | onDelete  | Descripción                                    |
|-------------------|-------------------|-----------|------------------------------------------------|
| Appointment       | AppointmentService| CASCADE   | Al borrar cita, se borran sus servicios        |
| Order             | Patient           | RESTRICT  | No se puede borrar paciente con órdenes        |
| Order             | Service           | RESTRICT  | No se puede borrar servicio con órdenes        |
| Invoice           | Order             | RESTRICT  | No se puede borrar orden con factura           |
| Payment           | Invoice           | SET NULL  | Si se borra factura, pago queda sin invoice    |
| Payment           | Appointment       | SET NULL  | Si se borra cita, pago queda sin appointment   |

### 14.3 Valores por Defecto

| Modelo            | Campo             | Valor por defecto |
|-------------------|-------------------|-------------------|
| User              | isActive          | true              |
| Service           | defaultSessions   | 1                 |
| Service           | isActive          | true              |
| Order             | completedSessions | 0                 |
| Order             | discount          | 0                 |
| Appointment       | durationMinutes   | 60                |
| Appointment       | status            | reserved          |
| TreatmentSession  | performed         | false             |
| Commission        | status            | pending           |
| Invoice           | status            | pending           |

### 14.4 Validaciones de Negocio en Código

#### Usuarios
- Email único
- Rol válido: admin, nurse, sales
- No puede desactivarse a sí mismo

#### Pacientes
- DNI único
- Campos requeridos: firstName, lastName, dni, dateOfBirth, sex

#### Servicios
- basePrice >= 0
- defaultSessions >= 1
- Nombre y precio requeridos

#### Citas
- Debe tener al menos un servicio en el array `services[]`
- Campos requeridos: patientId, scheduledDate, services
- La eliminación es soft (cambia status a 'cancelled')

#### Comisiones
- Se crean automáticamente solo si reservationAmount > 0
- Tasa fija del 10%

#### Archivos subidos
- Formatos permitidos: JPEG, JPG, PNG, WebP
- Tamaño máximo: definido en configuración
- Máximo 10 fotos por vez

### 14.5 Reglas de Paginación

**Por defecto:**
- page = 1
- limit = 10

**Se aplica en:**
- GET /api/users
- GET /api/patients
- GET /api/appointments

### 14.6 Reglas de Búsqueda y Filtros

#### Pacientes
- Búsqueda por: firstName, lastName, dni, phone, email (case insensitive)
- Filtro por: sex

#### Citas
- Filtro por: status, date, userId (solo admin)
- Filtro automático: sales solo ve sus propias citas

#### Usuarios
- Búsqueda por: firstName, lastName, email (case insensitive)
- Filtro por: role, isActive

#### Servicios
- Filtro por: isActive (por defecto true)
- Opción de incluir eliminados: includeDeleted=true

---

## 15. Análisis de Inconsistencias y Áreas de Mejora

### 15.1 Funcionalidades NO Implementadas

**CRÍTICO - Modelos sin controladores:**
1. **Orders**: Existe el modelo pero NO hay controladores para:
   - Crear Order manualmente (solo se crea automáticamente al crear cita)
   - Listar Orders
   - Actualizar Orders
   - Ver detalle de un Order

2. **Invoices**: Existe el modelo pero NO hay controladores para:
   - Crear Invoice
   - Listar Invoices
   - Actualizar status de Invoice
   - Ver detalle de una Invoice

3. **Payments**: Existe el modelo pero NO hay controladores para:
   - Registrar Pagos
   - Listar Pagos
   - Ver detalle de un Pago
   - Actualizar Invoice.status basado en pagos

### 15.2 Inconsistencias Detectadas

1. **Permisos en Servicios:**
   - Los endpoints de servicios (POST, PUT, DELETE) no tienen restricción de rol
   - Cualquier usuario autenticado puede crear/modificar/eliminar servicios
   - **Recomendación:** Agregar `authorize('admin')` en las rutas

2. **Doble sistema de sesiones:**
   - Existe `TreatmentSession` (modelo completo)
   - Existe `AppointmentService` con `sessionNumber`
   - **Pregunta:** ¿Son complementarios o redundantes?

3. **Falta actualizar completedSessions:**
   - El campo `Order.completedSessions` nunca se actualiza en el código
   - **Recomendación:** Actualizar cuando una cita se marca como atendida

4. **Falta cálculo de Invoice.status:**
   - No hay lógica para actualizar Invoice.status basado en pagos recibidos
   - **Recomendación:** Implementar trigger o función que calcule:
     - pending: 0% pagado
     - partial: >0% y <100% pagado
     - paid: 100% pagado

5. **reservationAmount vs Payment:**
   - `Appointment.reservationAmount` es solo un Decimal
   - No se crea un `Payment` con tipo `reservation` automáticamente
   - **Recomendación:** Crear Payment automáticamente al crear cita con reservationAmount

### 15.3 Validaciones Faltantes

1. **No se valida disponibilidad de horario:**
   - Se puede crear múltiples citas en el mismo horario
   - **Recomendación:** Validar conflictos de horario

2. **No se valida totalSessions vs citas creadas:**
   - Se pueden crear más citas de las sesiones disponibles en un Order
   - **Recomendación:** Validar que sessionNumber <= Order.totalSessions

3. **No se valida cantidad de fotos:**
   - Aunque el middleware permite máximo 10, no hay validación adicional

4. **No se valida monto de pago vs monto de factura:**
   - Cuando se implemente Payments, falta validar que no se pague más del total

### 15.4 Mejoras de Seguridad

1. **Filtrado de datos sensibles:**
   - El passwordHash se excluye en algunos endpoints pero no en todos
   - **Recomendación:** Crear un tipo genérico que siempre excluya passwordHash

2. **Rate limiting:**
   - No hay protección contra ataques de fuerza bruta en login
   - **Recomendación:** Implementar rate limiting

3. **Validación de ownership:**
   - Un usuario `sales` puede actualizar citas de otro usuario `sales`
   - **Recomendación:** Validar que solo pueda editar sus propias citas

### 15.5 Mejoras de UX/Negocio

1. **Notificaciones:**
   - No hay sistema de notificaciones o recordatorios
   - **Recomendación:** Implementar recordatorios de citas

2. **Auditoría:**
   - No hay logs de auditoría de cambios críticos
   - **Recomendación:** Implementar audit log

3. **Reportes:**
   - No hay endpoints para reportes de ventas, comisiones, etc.
   - **Recomendación:** Implementar módulo de reportes

4. **Calendario de disponibilidad:**
   - No hay forma de ver disponibilidad de horarios
   - **Recomendación:** Implementar endpoint de disponibilidad

---

## 16. Resumen Ejecutivo

### Estadísticas del Sistema

- **Total de modelos:** 12
- **Total de enums:** 6
- **Total de controladores:** 6
- **Total de rutas:** 6
- **Total de roles:** 3

### Modelos Implementados Completamente
1. User
2. Patient
3. Service
4. Appointment
5. TreatmentSession
6. PatientRecord
7. Commission
8. AppointmentService

### Modelos Implementados Parcialmente
1. **Order** - Modelo existe, se crea automáticamente, pero falta CRUD manual

### Modelos NO Implementados
1. **Invoice** - Solo existe el schema
2. **Payment** - Solo existe el schema

### Reglas Críticas Identificadas

1. **Order se crea automáticamente** al crear una cita sin orderId
2. **Comisión del 10%** se crea automáticamente con reservationAmount
3. **Las citas son soft deleted** (status = 'cancelled')
4. **Los servicios son soft deleted** (deletedAt)
5. **Rol sales solo ve sus propias citas** (filtro automático)
6. **AppointmentService vincula múltiples servicios a una cita**
7. **PatientRecord guarda el servicio original** si se cambió durante atención
8. **Relación 1:1 entre Order e Invoice**
9. **sessionNumber se calcula automáticamente** buscando el siguiente disponible

### Flujos Principales Soportados

1. Registro de paciente nuevo
2. Creación de cita con adelanto
3. Atención de cita con registro médico
4. Gestión de usuarios y roles
5. Gestión de servicios con soft delete
6. Subida de fotos y comprobantes
7. Historial médico completo del paciente
8. Estadísticas de comisiones por vendedor

### Flujos Pendientes de Implementar

1. Venta de paquetes (Orders + Invoices)
2. Registro de pagos
3. Actualización de estado de facturas
4. Cálculo de saldos
5. Reportes de ventas
6. Notificaciones y recordatorios

---

**Fin del documento de Reglas de Negocio**
