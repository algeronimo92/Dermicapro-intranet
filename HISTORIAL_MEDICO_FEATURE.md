# Feature: Historial Médico del Paciente

## Descripción General

Se ha implementado un sistema completo para registrar y almacenar el historial médico de cada paciente cuando se marca una cita como "Atendida". Este historial incluye:

- Notas del tratamiento realizado
- Peso del paciente
- Medidas corporales
- Notas de salud
- Fotos de antes del tratamiento
- Fotos de después del tratamiento

**Característica principal**: El historial es cronológico y se vincula automáticamente a cada cita atendida.

---

## Flujo de Trabajo

### 1. Cuando una Enfermera o Admin Atiende una Cita

#### Paso 1: Abrir Modal de Atención
- Navegar a la cita en estado "Reservada"
- Hacer clic en el botón verde "Marcar como Atendida"
- Se abre un modal completo con formulario de atención médica

#### Paso 2: Completar Información del Tratamiento

**Campos del formulario**:

1. **Notas del Tratamiento** (obligatorio)
   - Descripción del procedimiento realizado
   - Puede ser diferente al servicio programado
   - Observaciones durante el tratamiento
   - Reacciones del paciente

2. **Peso** (opcional)
   - Peso actual del paciente en kg
   - Ejemplo: 65.5

3. **Notas de Salud** (opcional)
   - Alergias detectadas
   - Condiciones especiales
   - Recomendaciones post-tratamiento
   - Medicamentos prescritos

4. **Fotos de Antes** (opcional, máximo 5)
   - Se toman ANTES del procedimiento
   - Formato: JPG, PNG, WebP
   - Tamaño máximo: 5MB por foto
   - Preview inmediato en el modal

5. **Fotos de Después** (opcional, máximo 5)
   - Se toman DESPUÉS del procedimiento
   - Formato: JPG, PNG, WebP
   - Tamaño máximo: 5MB por foto
   - Preview inmediato en el modal

#### Paso 3: Guardar
- El sistema sube automáticamente todas las fotos al servidor
- Crea un registro médico vinculado a la cita
- Marca la cita como "Atendida"
- Registra quién atendió y cuándo

---

## Arquitectura Técnica

### Backend

#### 1. Endpoint: POST `/api/appointments/:id/attend`

**Archivo**: `backend/src/controllers/appointments.controller.ts:236`

**Parámetros aceptados**:
```typescript
{
  treatmentNotes: string;      // Notas del tratamiento
  weight: number;               // Peso en kg
  healthNotes: string;          // Notas de salud
  beforePhotoUrls: string[];    // URLs de fotos antes
  afterPhotoUrls: string[];     // URLs de fotos después
}
```

**Proceso**:
1. Actualiza el appointment con status='attended'
2. Registra attendedById y attendedAt
3. Crea un PatientRecord si hay información adicional
4. Vincula el registro médico a la cita y al paciente

#### 2. Endpoint: POST `/api/appointments/upload-photos`

**Archivo**: `backend/src/controllers/appointments.controller.ts:314`

**Funcionalidad**:
- Acepta hasta 10 fotos simultáneamente
- Usa multer para procesar archivos
- Retorna array de URLs generadas
- Validación automática de tipo y tamaño

**Ejemplo de respuesta**:
```json
{
  "urls": [
    "/uploads/uuid1.jpg",
    "/uploads/uuid2.jpg"
  ]
}
```

#### 3. Modelo de Datos: PatientRecord

**Schema Prisma** (`backend/prisma/schema.prisma:152`):
```prisma
model PatientRecord {
  id              String   @id @default(uuid())
  patientId       String
  appointmentId   String
  weight          Decimal? @db.Decimal(5, 2)
  bodyMeasurement Json?
  healthNotes     String?
  beforePhotoUrls Json?    // Array de URLs
  afterPhotoUrls  Json?    // Array de URLs
  createdById     String
  createdAt       DateTime @default(now())

  patient     Patient     @relation(...)
  appointment Appointment @relation(...)
  createdBy   User        @relation(...)
}
```

---

### Frontend

#### 1. Componente: AttendAppointmentModal

**Archivo**: `frontend/src/components/AttendAppointmentModal.tsx`

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: (updatedAppointment) => void;
}
```

**Características**:
- Formulario completo con validación
- Preview de imágenes antes de subir
- Botón para eliminar fotos seleccionadas
- Progreso de subida visible
- Manejo de errores

**Estados internos**:
- `formData`: Notas y medidas
- `beforePhotos`: Archivos de fotos antes
- `afterPhotos`: Archivos de fotos después
- `beforePreviews`: Previews base64 de fotos antes
- `afterPreviews`: Previews base64 de fotos después
- `isSubmitting`: Estado de envío
- `uploadProgress`: Mensaje de progreso

#### 2. Servicio: appointmentsService

**Archivo**: `frontend/src/services/appointments.service.ts`

**Nuevas funciones**:

```typescript
// Marcar como atendida con datos médicos
async markAsAttended(
  id: string,
  data?: AttendAppointmentDto
): Promise<Appointment>

// Subir fotos de tratamiento
async uploadTreatmentPhotos(
  files: File[]
): Promise<{ urls: string[] }>
```

**Interface AttendAppointmentDto**:
```typescript
{
  notes?: string;
  treatmentNotes?: string;
  weight?: number;
  bodyMeasurement?: Record<string, number>;
  healthNotes?: string;
  beforePhotoUrls?: string[];
  afterPhotoUrls?: string[];
}
```

---

## Proceso de Subida de Fotos

### Paso a Paso

1. **Usuario selecciona fotos**
   - Click en "📷 Agregar Fotos de Antes/Después"
   - Input de archivo abre
   - Usuario selecciona 1-5 imágenes

2. **Validación en el cliente**
   ```typescript
   - Tipo: Solo image/*
   - Tamaño: Max 5MB por imagen
   - Cantidad: Max 5 fotos por categoría
   ```

3. **Preview inmediato**
   - Se usa FileReader para crear base64
   - Se muestra thumbnail 120x120px
   - Botón ×  para eliminar

4. **Al hacer Submit**
   ```typescript
   // 1. Subir fotos de antes
   const beforeUrls = await uploadTreatmentPhotos(beforePhotos);

   // 2. Subir fotos de después
   const afterUrls = await uploadTreatmentPhotos(afterPhotos);

   // 3. Marcar como atendida con URLs
   await markAsAttended(appointmentId, {
     ...formData,
     beforePhotoUrls: beforeUrls,
     afterPhotoUrls: afterUrls
   });
   ```

5. **Almacenamiento**
   - Backend guarda en `/uploads/` con UUID único
   - Rutas guardadas en base de datos como JSON
   - Ejemplo: `["/uploads/abc-123.jpg", "/uploads/def-456.jpg"]`

---

## Visualización del Historial

### Dónde Ver el Historial

El historial médico se puede consultar mediante el endpoint existente:

```
GET /api/patients/:id/history
```

**Respuesta**:
```json
[
  {
    "id": "record-uuid",
    "patientId": "patient-uuid",
    "appointmentId": "appointment-uuid",
    "weight": 65.5,
    "healthNotes": "Sin alergias conocidas",
    "beforePhotoUrls": ["/uploads/before1.jpg", "/uploads/before2.jpg"],
    "afterPhotoUrls": ["/uploads/after1.jpg"],
    "createdAt": "2024-12-03T10:30:00Z",
    "appointment": {
      "scheduledDate": "2024-12-03T10:00:00Z",
      "service": {
        "name": "HIFU 12D (Lifting sin Cirugía)"
      }
    },
    "createdBy": {
      "firstName": "María",
      "lastName": "González"
    }
  }
]
```

### Orden Cronológico

Los registros se devuelven ordenados por `createdAt DESC` (más reciente primero).

---

## Casos de Uso

### Caso 1: Tratamiento Simple sin Fotos
```
Usuario: Enfermera
Acción: Marcar cita como atendida
Datos: Solo notas del tratamiento
Resultado: Se crea appointment.status='attended', NO se crea PatientRecord
```

### Caso 2: Tratamiento Completo con Fotos
```
Usuario: Enfermera
Acción: Marcar cita como atendida
Datos:
  - Notas del tratamiento
  - Peso: 68.2 kg
  - 3 fotos antes
  - 2 fotos después
  - Notas de salud
Resultado:
  - appointment.status='attended'
  - PatientRecord creado con todos los datos
  - 5 fotos subidas al servidor
```

### Caso 3: Solo Registro de Peso
```
Usuario: Enfermera
Acción: Marcar cita como atendida
Datos:
  - Notas del tratamiento
  - Peso: 70.0 kg
Resultado:
  - appointment.status='attended'
  - PatientRecord creado con peso
```

---

## Seguridad y Permisos

### Quién Puede Registrar Atención

| Rol | Puede Atender Citas |
|-----|---------------------|
| Admin | ✅ Sí |
| Nurse | ✅ Sí |
| Sales | ❌ No |

**Validación en el backend**:
```typescript
router.post('/:id/attend',
  authorize('admin', 'nurse'),
  markAsAttended
);
```

### Quién Puede Ver Historial

| Rol | Puede Ver Historial |
|-----|---------------------|
| Admin | ✅ Sí (completo) |
| Nurse | ✅ Sí (completo) |
| Sales | ❌ No (según PROJECT_SUMMARY) |

---

## Archivos Modificados/Creados

### Backend
1. ✅ `backend/src/controllers/appointments.controller.ts:236-285`
   - Actualizado `markAsAttended`
   - Agregado `uploadTreatmentPhotos`

2. ✅ `backend/src/routes/appointments.routes.ts:26`
   - Agregada ruta `/upload-photos`

### Frontend
3. ✅ `frontend/src/components/AttendAppointmentModal.tsx` (NUEVO)
   - Modal completo con formulario
   - Manejo de fotos con preview
   - 350+ líneas

4. ✅ `frontend/src/services/appointments.service.ts:17-25,62-89`
   - Interface `AttendAppointmentDto`
   - Función `markAsAttended` actualizada
   - Función `uploadTreatmentPhotos` agregada

5. ✅ `frontend/src/pages/AppointmentDetailPage.tsx`
   - Import de `AttendAppointmentModal`
   - Estado `showAttendModal`
   - Botón abre modal en lugar de llamar directamente

---

## Mejoras Futuras Sugeridas

### Alta Prioridad
- [ ] Página dedicada de historial médico del paciente
- [ ] Galería de fotos con zoom y comparación antes/después
- [ ] Gráficas de evolución de peso
- [ ] Exportar historial a PDF

### Media Prioridad
- [ ] Edición de registros médicos
- [ ] Agregar más medidas corporales (perímetros, etc.)
- [ ] Firma digital del paciente
- [ ] Consentimientos informados

### Baja Prioridad
- [ ] Comparación automática de fotos (IA)
- [ ] Recordatorios de seguimiento
- [ ] Notas de voz
- [ ] Integración con dispositivos médicos

---

## Pruebas

### Cómo Probar

1. **Iniciar backend y frontend**
   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

2. **Login como Enfermera**
   - Email: `enfermera@dermicapro.com`
   - Password: `nurse123`

3. **Navegar a una cita reservada**
   - Ir a `/appointments`
   - Click en una cita con estado "Reservada"

4. **Registrar atención**
   - Click en "Marcar como Atendida"
   - Completar formulario con notas
   - Agregar fotos de antes (2-3)
   - Agregar fotos de después (2-3)
   - Ingresar peso
   - Agregar notas de salud
   - Click en "Marcar como Atendida"

5. **Verificar**
   - La cita cambia a estado "Atendida"
   - Se muestra "Atendido por: María González"
   - Consultar base de datos:
     ```sql
     SELECT * FROM patient_records WHERE appointment_id = 'cita-uuid';
     ```

### Verificar en Base de Datos

```sql
-- Ver registros médicos recientes
SELECT
  pr.*,
  p.first_name || ' ' || p.last_name as patient_name,
  a.scheduled_date,
  s.name as service_name
FROM patient_records pr
JOIN patients p ON pr.patient_id = p.id
JOIN appointments a ON pr.appointment_id = a.id
JOIN services s ON a.service_id = s.id
ORDER BY pr.created_at DESC
LIMIT 5;
```

---

## Troubleshooting

### Problema: Las fotos no se suben
**Solución**:
- Verificar que la carpeta `/backend/uploads` existe
- Verificar permisos de escritura
- Ver logs del servidor

### Problema: Error "No file uploaded"
**Solución**:
- Verificar que los inputs tienen `name="photos"`
- Verificar Content-Type: multipart/form-data
- Ver network tab en DevTools

### Problema: Preview no se muestra
**Solución**:
- Verificar que el archivo es una imagen válida
- Ver consola del navegador
- Verificar tamaño del archivo (< 5MB)

---

## Estado Actual

✅ **Implementado y Funcional**
- Modal de atención médica
- Subida de fotos múltiples
- Creación de registros médicos
- Vinculación con citas
- Validaciones de seguridad

⏳ **Pendiente** (Opcional)
- Página dedicada de historial
- Visualización de fotos en detalle de paciente
- Comparación antes/después
- Exportación de historial

---

**Versión**: 1.0
**Fecha**: Diciembre 2024
**Desarrollado para**: DermicaPro - Trujillo, Perú
