# Diagrama de Base de Datos - Sistema de Citas con Múltiples Sesiones

## Diagrama Entidad-Relación

```
┌─────────────────┐
│     PATIENT     │
│─────────────────│
│ id (PK)         │
│ firstName       │
│ lastName        │
│ dni             │
│ dateOfBirth     │
│ sex             │
│ phone           │
│ email           │
│ createdById (FK)│
└─────────────────┘
         │
         │ 1
         │
         │ *
┌─────────────────┐        ┌─────────────────┐
│     ORDER       │────────│    SERVICE      │
│─────────────────│   *  1 │─────────────────│
│ id (PK)         │        │ id (PK)         │
│ patientId (FK)  │        │ name            │
│ serviceId (FK)  │────────│ description     │
│ totalSessions   │        │ basePrice       │
│ completedSess   │        │ defaultSessions │
│ originalPrice   │        │ isActive        │
│ discount        │        └─────────────────┘
│ finalPrice      │                 │
│ createdById (FK)│                 │
└─────────────────┘                 │
         │                          │
         │ 1                        │
         │                          │
         │ *                        │
┌─────────────────────────────┐    │
│  APPOINTMENT_SERVICE        │    │
│─────────────────────────────│    │
│ id (PK)                     │    │
│ appointmentId (FK)          │    │
│ serviceId (FK)  ────────────┘    │
│ orderId (FK)                     │
│ sessionNumber                    │
│ createdAt                        │
└─────────────────────────────┘    │
         │                         │
         │ *                       │
         │                         │
         │ 1                       │
┌─────────────────┐                │
│  APPOINTMENT    │                │
│─────────────────│                │
│ id (PK)         │                │
│ patientId (FK)  │                │
│ serviceId (FK)  │────────────────┘
│ orderId (FK)    │
│ sessionNumber   │
│ scheduledDate   │
│ durationMinutes │
│ status          │
│ reservationAmt  │
│ notes           │
│ createdById (FK)│
│ attendedById(FK)│
│ attendedAt      │
└─────────────────┘
         │
         │ 1
         │
         │ *
┌─────────────────┐
│ PATIENT_RECORD  │
│─────────────────│
│ id (PK)         │
│ patientId (FK)  │
│ appointmentId(FK)│
│ originalSvcId(FK)│
│ weight          │
│ bodyMeasurement │
│ healthNotes     │
│ beforePhotos    │
│ afterPhotos     │
│ createdById (FK)│
└─────────────────┘
```

## Flujo de Datos: Múltiples Sesiones por Cita

### 1. Escenario: Cliente Nuevo - Múltiples Servicios

```
Cliente nuevo quiere:
- Hollywood Peel (paquete de 3 sesiones)
- HIFU (paquete de 1 sesión)

Proceso:
1. Se crea APPOINTMENT
   ├─ serviceId = Hollywood Peel
   ├─ orderId = Order1 (Hollywood Peel x3)
   ├─ sessionNumber = 1
   └─ scheduledDate = "2025-12-10 10:00"

2. Se crea ORDER 1
   ├─ serviceId = Hollywood Peel
   ├─ totalSessions = 3
   └─ completedSessions = 0

3. Se crea ORDER 2
   ├─ serviceId = HIFU
   ├─ totalSessions = 1
   └─ completedSessions = 0

4. Se crea APPOINTMENT_SERVICE
   ├─ appointmentId = Appointment.id
   ├─ serviceId = HIFU
   ├─ orderId = Order2
   └─ sessionNumber = 1

Resultado:
┌────────────────────────────────────────┐
│ CITA: 10 Dic 2025, 10:00 AM           │
├────────────────────────────────────────┤
│ Sesión 1: Hollywood Peel (1/3)        │
│ Sesión 2: HIFU (1/1)                  │
└────────────────────────────────────────┘
```

### 2. Escenario: Cliente Antiguo - Sesiones de Diferentes Paquetes

```
Cliente tiene:
- Order1: Hollywood Peel (Sesión 1/3 completada)
- Order2: HIFU (Sesión 1/2 completada)

Cliente quiere agendar:
- Sesión 2 de Hollywood Peel
- Sesión 2 de HIFU

Proceso:
1. Se crea APPOINTMENT
   ├─ serviceId = Hollywood Peel
   ├─ orderId = Order1
   ├─ sessionNumber = 2
   └─ scheduledDate = "2025-12-15 14:00"

2. Se crea APPOINTMENT_SERVICE
   ├─ appointmentId = Appointment.id
   ├─ serviceId = HIFU
   ├─ orderId = Order2
   └─ sessionNumber = 2

Resultado:
┌────────────────────────────────────────┐
│ CITA: 15 Dic 2025, 2:00 PM            │
├────────────────────────────────────────┤
│ Sesión 1: Hollywood Peel (2/3)        │
│ Sesión 2: HIFU (2/2)                  │
└────────────────────────────────────────┘
```

## Relaciones Clave

### 1. APPOINTMENT → SERVICE (1:1)
- **Propósito**: Servicio principal de la cita
- **Campos**: `serviceId`, `orderId`, `sessionNumber`
- **Uso**: Primera sesión que se agregó

### 2. APPOINTMENT → APPOINTMENT_SERVICE (1:*)
- **Propósito**: Sesiones adicionales en la misma cita
- **Campos**: Cada registro tiene `serviceId`, `orderId`, `sessionNumber`
- **Uso**: Todas las sesiones después de la primera

### 3. ORDER → SERVICE (1:1)
- **Propósito**: Paquete de sesiones para un servicio
- **Campos**: `serviceId`, `totalSessions`
- **Ejemplo**: Order(Hollywood Peel, 3 sesiones)

### 4. APPOINTMENT_SERVICE → ORDER (*:1)
- **Propósito**: Vincula sesión adicional a su paquete
- **Campos**: `orderId`, `sessionNumber`
- **Ejemplo**: Sesión 2 de Hollywood Peel

## Consultas Importantes

### Obtener todas las sesiones de una cita:

```sql
-- Sesión principal
SELECT
  a.id as appointment_id,
  a.serviceId,
  a.sessionNumber,
  s.name as service_name,
  o.totalSessions
FROM appointments a
LEFT JOIN services s ON a.serviceId = s.id
LEFT JOIN orders o ON a.orderId = o.id
WHERE a.id = 'appointment-id';

-- Sesiones adicionales
SELECT
  as.id,
  as.serviceId,
  as.sessionNumber,
  s.name as service_name,
  o.totalSessions
FROM appointment_services as
LEFT JOIN services s ON as.serviceId = s.id
LEFT JOIN orders o ON as.orderId = o.id
WHERE as.appointmentId = 'appointment-id';
```

### Calcular progreso de un paquete:

```sql
SELECT
  o.id,
  o.serviceId,
  s.name,
  o.totalSessions,
  COUNT(CASE WHEN a.status = 'attended' THEN 1 END) as completed_sessions,
  COUNT(CASE WHEN a.status = 'reserved' THEN 1 END) as pending_sessions
FROM orders o
LEFT JOIN services s ON o.serviceId = s.id
LEFT JOIN appointments a ON a.orderId = o.id AND a.status != 'cancelled'
WHERE o.id = 'order-id'
GROUP BY o.id;
```

## Reglas de Negocio Implementadas

1. **Una cita puede tener múltiples sesiones**
   - Sesión principal: `Appointment.serviceId`
   - Sesiones adicionales: `AppointmentService` records

2. **Cada sesión puede pertenecer a un paquete (Order)**
   - Si tiene `orderId`: Es parte de un paquete
   - Si NO tiene `orderId`: Es sesión independiente

3. **Cálculo de número de sesión**
   - Backend calcula automáticamente el siguiente número disponible
   - No permite duplicados en el mismo paquete

4. **Estado de sesiones**
   - `reserved`: Sesión agendada
   - `attended`: Sesión completada
   - `cancelled`: No cuenta para el paquete
   - `no_show`: No asistió

5. **Integridad referencial**
   - `AppointmentService` → `onDelete: Cascade` (si se elimina cita, se eliminan sesiones)
   - `Order` → `onDelete: Restrict` (no permite eliminar si hay citas)

## Ejemplo Completo de Datos

```sql
-- PATIENT
id: "p1"
firstName: "María"
lastName: "García"

-- SERVICES
s1: id="svc1", name="Hollywood Peel", basePrice=200, defaultSessions=3
s2: id="svc2", name="HIFU", basePrice=300, defaultSessions=2

-- ORDERS (Paquetes comprados)
o1: id="ord1", patientId="p1", serviceId="svc1", totalSessions=3
o2: id="ord2", patientId="p1", serviceId="svc2", totalSessions=2

-- APPOINTMENT (Cita del 15 Dic)
id: "apt1"
patientId: "p1"
serviceId: "svc1"          ← Primera sesión: Hollywood Peel
orderId: "ord1"
sessionNumber: 2           ← Sesión 2 de 3
scheduledDate: "2025-12-15 14:00"
status: "reserved"

-- APPOINTMENT_SERVICE (Sesiones adicionales de la misma cita)
id: "as1"
appointmentId: "apt1"
serviceId: "svc2"          ← Segunda sesión: HIFU
orderId: "ord2"
sessionNumber: 2           ← Sesión 2 de 2

-- Resultado visual:
┌─────────────────────────────────────────────┐
│ CITA: 15 Dic 2025, 2:00 PM                 │
│ Paciente: María García                     │
├─────────────────────────────────────────────┤
│ ✓ Hollywood Peel - Sesión 2/3 (Paquete)    │
│ ✓ HIFU - Sesión 2/2 (Paquete)              │
├─────────────────────────────────────────────┤
│ Total: S/. 500.00                           │
└─────────────────────────────────────────────┘
```

## Ventajas del Diseño

1. **Flexibilidad**: Puede combinar sesiones de diferentes paquetes
2. **Escalabilidad**: Fácil agregar más sesiones sin límite
3. **Rastreabilidad**: Cada sesión mantiene referencia a su paquete
4. **Compatibilidad**: Sistema anterior sigue funcionando (una sola sesión)
5. **Integridad**: Cascadas y restricciones previenen datos huérfanos
