# Plan: Múltiples Servicios por Cita

## Objetivo
Permitir que una cita pueda incluir múltiples servicios/procedimientos que se realizan en la misma visita.
**IMPORTANTE**: Las cantidades de sesiones se suman al pedido.

## Cambios Necesarios

### 1. Base de Datos (Prisma Schema)
- **Crear tabla intermedia**: `AppointmentService` para relación muchos-a-muchos
- **TODOS los servicios**: Se almacenarán en `AppointmentService` (no solo adicionales)
- **Eliminar serviceId de Appointment**: Ya no es necesario, todos los servicios van en la tabla intermedia
- **OrderService**: Nueva tabla para rastrear servicios dentro de un pedido con sus sesiones

```prisma
model AppointmentService {
  id            String      @id @default(uuid())
  appointmentId String      @map("appointment_id")
  serviceId     String      @map("service_id")
  orderServiceId String?    @map("order_service_id")  // Vincula al OrderService si es parte de un paquete
  price         Decimal     @db.Decimal(10, 2)  // Precio al momento de la cita
  duration      Int         // Duración en minutos
  createdAt     DateTime    @default(now()) @map("created_at")

  appointment  Appointment  @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  service      Service      @relation(fields: [serviceId], references: [id])
  orderService OrderService? @relation(fields: [orderServiceId], references: [id])

  @@map("appointment_services")
}

model OrderService {
  id                String              @id @default(uuid())
  orderId           String              @map("order_id")
  serviceId         String              @map("service_id")
  totalSessions     Int                 @map("total_sessions")
  completedSessions Int                 @default(0) @map("completed_sessions")
  price             Decimal             @map("price") @db.Decimal(10, 2)
  createdAt         DateTime            @default(now()) @map("created_at")

  order              Order               @relation(fields: [orderId], references: [id], onDelete: Cascade)
  service            Service             @relation(fields: [serviceId], references: [id])
  appointmentServices AppointmentService[]

  @@map("order_services")
}
```

### 2. Backend

#### Modificar `appointments.controller.ts`
- **createAppointment**:
  - Aceptar array de `serviceIds` además del `serviceId` principal
  - Calcular duración total (suma de duraciones)
  - Crear registros en `AppointmentService` para cada servicio adicional
  - Mantener `serviceId` principal para paquetes

#### Actualizar DTOs
```typescript
export interface CreateAppointmentDto {
  patientId: string;
  serviceId: string;  // Servicio principal (para paquetes)
  additionalServiceIds?: string[];  // Servicios adicionales
  scheduledDate: string;
  durationMinutes?: number;  // Opcional, se calcula automáticamente
  reservationAmount?: number;
  notes?: string;
  orderId?: string;
}
```

### 3. Frontend

#### `AppointmentFormPage.tsx`
- Cambiar `Select` de servicio a **selección múltiple**
- Mostrar lista de servicios seleccionados con sus precios y duraciones
- Calcular y mostrar:
  - Duración total (suma de todas las duraciones)
  - Precio total (suma de todos los precios)
- Permitir agregar/quitar servicios de la lista

#### `AppointmentDetailPage.tsx`
- Mostrar todos los servicios de la cita
- Listar cada servicio con su precio individual
- Mostrar precio y duración total

#### `PatientHistoryPage.tsx`
- Mostrar servicios múltiples en el historial
- Formato: "Hollywood Peel + HIFU + Laser" o similar

#### `Calendar.tsx`
- Mostrar título resumido: "Hollywood Peel + 2 más" si hay múltiples servicios
- Tooltip con lista completa de servicios

### 4. Lógica de Negocio

#### Reglas:
1. **Servicio principal**: El primer servicio seleccionado es el "principal"
2. **Paquetes**: Solo el servicio principal puede estar asociado a un paquete
3. **Duración**: Suma automática de todas las duraciones
4. **Precio**: Suma automática de todos los precios
5. **Compatibilidad**: Sistema actual de paquetes sigue funcionando igual

#### Ejemplo de uso:
```
Cita nueva:
- Selecciono: Hollywood Peel (45 min, $100)
- Agrego: HIFU (30 min, $80)
- Agrego: Laser (20 min, $60)
- Total: 95 minutos, $240
```

## Migración de Base de Datos
```bash
npx prisma migrate dev --name add_appointment_services
```

## Orden de Implementación
1. ✅ Actualizar schema de Prisma
2. ✅ Ejecutar migración
3. ✅ Actualizar DTOs en backend
4. ✅ Modificar controlador de appointments
5. ✅ Actualizar tipos en frontend
6. ✅ Modificar formulario de creación
7. ✅ Actualizar página de detalle
8. ✅ Actualizar historial
9. ✅ Actualizar calendario

## Retrocompatibilidad
- Todas las citas existentes mantienen su `serviceId` principal
- Sistema de paquetes funciona exactamente igual
- Servicios adicionales son opcionales (backward compatible)
