# Pendiente: Refactorización de Manejo de Fechas

**Fecha de análisis**: 2025-12-06
**Análisis realizado por**: Claude Code
**Total de casos encontrados**: 34 adicionales

---

## 📊 Resumen Ejecutivo

Se identificaron **34 ubicaciones adicionales** en el código que todavía usan patrones antiguos de manejo de fechas y necesitan ser refactorizados usando las utilidades de `dateUtils.ts`.

### Distribución por Prioridad

| Prioridad | Cantidad | Impacto |
|-----------|----------|---------|
| **CRÍTICA** | 5 | Errores funcionales, bugs de timezone |
| **ALTA** | 8 | Datos incorrectos, inconsistencias |
| **MEDIA** | 18 | Visualización, mantenibilidad |
| **BAJA** | 3 | Limpieza de código |

---

## 🔴 CRÍTICA - Requiere Acción Inmediata

### 1. AppointmentsService.ts - Fecha de Hoy
**Archivo**: `frontend/src/services/appointments.service.ts:103`

```typescript
// ❌ ANTES:
const today = new Date().toISOString().split('T')[0];

// ✅ AHORA:
import { getLocalDateString } from '../utils/dateUtils';
const today = getLocalDateString();
```

**Impacto**: Causa off-by-one day en filtros de citas del día actual

---

### 2. FormValidatorService.ts - Validación de Fecha Pasada
**Archivo**: `frontend/src/services/formValidator.service.ts:51`

```typescript
// ❌ ANTES:
if (scheduledDate < new Date()) {
  errors.scheduledDate = 'La fecha no puede ser en el pasado';
}

// ✅ AHORA:
import { isDateTimeInPast } from '../utils/dateUtils';
if (isDateTimeInPast(scheduledDate)) {
  errors.scheduledDate = 'La fecha no puede ser en el pasado';
}
```

**Impacto**: Validación incorrecta, especialmente en horas próximas a la medianoche

---

### 3. Payments.controller.ts - Fecha de Pago
**Archivo**: `backend/src/controllers/payments.controller.ts:182`

```typescript
// ❌ ANTES:
paymentDate: paymentDate ? new Date(paymentDate) : new Date(),

// ✅ AHORA:
import { parseStartOfDay } from '../utils/dateUtils';
paymentDate: paymentDate ? parseStartOfDay(paymentDate) : new Date(),
```

**Impacto**: Fechas de pago registradas con zona horaria incorrecta

---

### 4. Invoices.controller.ts - Fecha de Vencimiento
**Archivo**: `backend/src/controllers/invoices.controller.ts:256`

```typescript
// ❌ ANTES:
dueDate ? new Date(dueDate) : undefined

// ✅ AHORA:
import { parseStartOfDay } from '../utils/dateUtils';
dueDate ? parseStartOfDay(dueDate) : undefined
```

**Impacto**: Fechas de vencimiento inconsistentes

---

### 5. InvoiceFactory.ts - Cálculo de Vencimiento
**Archivo**: `backend/src/services/invoice.factory.ts:90-91`

```typescript
// ❌ ANTES:
const dueDate = new Date();
dueDate.setDate(dueDate.getDate() + daysUntilDue);

// ✅ AHORA:
import { addDays } from '../utils/dateUtils';
const dueDate = addDays(new Date(), daysUntilDue);
```

**Impacto**: Cálculo incorrecto de fechas de vencimiento

---

## 🟠 ALTA - Requiere Atención Pronto

### 6. EmployeeFormPage.tsx - Formateo de Fecha
**Archivo**: `frontend/src/pages/EmployeeFormPage.tsx:53`

```typescript
// ❌ ANTES:
dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',

// ✅ AHORA:
import { utcToLocalDate } from '../utils/dateUtils';
dateOfBirth: user.dateOfBirth ? utcToLocalDate(user.dateOfBirth) : '',
```

---

### 7. PatientFormPage.tsx - Formateo de Fecha
**Archivo**: `frontend/src/pages/PatientFormPage.tsx:45`

```typescript
// ❌ ANTES:
dateOfBirth: patient.dateOfBirth.split('T')[0],

// ✅ AHORA:
import { utcToLocalDate } from '../utils/dateUtils';
dateOfBirth: utcToLocalDate(patient.dateOfBirth),
```

---

### 8. PatientDetailPage.tsx - Cálculo de Edad
**Archivo**: `frontend/src/pages/PatientDetailPage.tsx:145-147`

```typescript
// ❌ ANTES:
Math.floor(
  (new Date().getTime() - new Date(patient.dateOfBirth).getTime()) /
  (365.25 * 24 * 60 * 60 * 1000)
)

// ✅ AHORA:
import { calculateAge } from '../utils/dateUtils';

// Agregar a dateUtils.ts:
export function calculateAge(birthDateString: string): number {
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

// Uso:
calculateAge(patient.dateOfBirth)
```

**Nota**: Esta función debe agregarse a `dateUtils.ts` del frontend

---

### 9. PatientHistoryPage.tsx - Parseo de Fechas
**Archivo**: `frontend/src/pages/PatientHistoryPage.tsx:264`

```typescript
// ❌ ANTES:
.map(apt => new Date(apt.attendedAt || apt.scheduledDate))

// ✅ AHORA:
.map(apt => new Date(apt.attendedAt || apt.scheduledDate)) // Este está OK, pero...
```

**Múltiples líneas problemáticas en el mismo archivo:**

- **Línea 277**:
  ```typescript
  // ❌ ANTES:
  new Date(history.statistics.registrationDate).toLocaleDateString('es-PE')

  // ✅ AHORA:
  import { formatDate } from '../utils/dateUtils';
  formatDate(history.statistics.registrationDate)
  ```

- **Línea 285**:
  ```typescript
  // ❌ ANTES:
  lastRecordDate.toLocaleDateString('es-PE')

  // ✅ AHORA:
  formatDate(lastRecordDate)
  ```

- **Líneas 352, 550**:
  ```typescript
  // ❌ ANTES:
  new Date(appointment.scheduledDate).toLocaleDateString('es-PE', {...})
  new Date(note.createdAt).toLocaleString('es-PE', {...})

  // ✅ AHORA:
  formatDate(appointment.scheduledDate, {...})
  formatDateTime(note.createdAt, {...})
  ```

---

### 10-11. Patients.controller.ts - Fecha de Nacimiento
**Archivo**: `backend/src/controllers/patients.controller.ts`

**Línea 247**:
```typescript
// ❌ ANTES:
dateOfBirth: new Date(dateOfBirth),

// ✅ AHORA:
import { parseStartOfDay } from '../utils/dateUtils';
dateOfBirth: parseStartOfDay(dateOfBirth),
```

**Línea 276**:
```typescript
// ❌ ANTES:
dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,

// ✅ AHORA:
dateOfBirth: dateOfBirth ? parseStartOfDay(dateOfBirth) : undefined,
```

---

## 🟡 MEDIA - Mejora de Mantenibilidad

### 12-20. Múltiples Páginas - toLocaleDateString()

Todos estos usan `.toLocaleDateString('es-PE')` que debería reemplazarse por `formatDate()`:

| Archivo | Líneas | Código Actual |
|---------|--------|---------------|
| **PatientsPage.tsx** | 114, 120, 168 | `new Date(...).toLocaleDateString('es-PE')` |
| **EmployeeDetailPage.tsx** | 191, 212 | `new Date(...).toLocaleDateString('es-PE')` |
| **EmployeesPage.tsx** | 157, 181 | `new Date(...).toLocaleDateString('es-PE')` |
| **PatientInvoicesPage.tsx** | 351, 421 | `new Date(...).toLocaleDateString('es-PE')` |
| **InvoiceDetailPage.tsx** | 235, 241, 349 | `new Date(...).toLocaleDateString('es-PE')` |

**Refactorización estándar para todos**:
```typescript
// ❌ ANTES:
new Date(someDate).toLocaleDateString('es-PE')

// ✅ AHORA:
import { formatDate } from '../utils/dateUtils';
formatDate(someDate)
```

---

### 21. Calendar.tsx - Comparación de Timestamps
**Archivo**: `frontend/src/components/Calendar.tsx:171`

```typescript
// ❌ ANTES:
.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

// ✅ AHORA (agregar a dateUtils):
export function compareDates(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return d1.getTime() - d2.getTime();
}

// Uso:
.sort((a, b) => compareDates(a.scheduledDate, b.scheduledDate));
```

---

### 22. AppointmentDetailPage.tsx - Fallback ISO
**Archivo**: `frontend/src/pages/AppointmentDetailPage.tsx:489`

```typescript
// ❌ ANTES:
createdAt: appSvc.order.createdAt || new Date().toISOString(),

// ✅ AHORA:
createdAt: appSvc.order.createdAt || new Date().toISOString(), // Este está OK en backend
```

---

### 23. Services.controller.ts - Soft Delete
**Archivo**: `backend/src/controllers/services.controller.ts:143`

```typescript
// ❌ ANTES:
data: { deletedAt: new Date() }

// ✅ AHORA:
data: { deletedAt: new Date() } // Este está OK, es timestamp UTC
```

---

## 🟢 BAJA - Limpieza de Código

### 24. PackageGroupView.tsx
**Archivo**: `frontend/src/components/PackageGroupView.tsx:337`

```typescript
// ❌ ANTES:
Creado {new Date(orderCreatedAt).toLocaleDateString('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})}

// ✅ AHORA:
import { formatDate } from '../utils/dateUtils';
Creado {formatDate(orderCreatedAt, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})}
```

---

### 25. AttendAppointmentModal.tsx
**Archivo**: `frontend/src/components/AttendAppointmentModal.tsx:254`

```typescript
// ❌ ANTES:
{new Date(appointment.scheduledDate).toLocaleDateString('es-PE', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

// ✅ AHORA:
import { formatDateTime } from '../utils/dateUtils';
{formatDateTime(appointment.scheduledDate, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
```

---

## 📋 Plan de Acción Recomendado

### Fase 1: Críticos (Inmediato - Hoy)
1. ✅ AppointmentsService.ts:103
2. ✅ FormValidatorService.ts:51
3. ✅ Payments.controller.ts:182
4. ✅ Invoices.controller.ts:256
5. ✅ InvoiceFactory.ts:90-91

**Tiempo estimado**: 30 minutos

### Fase 2: Alta Prioridad (Esta semana)
1. ✅ EmployeeFormPage.tsx:53
2. ✅ PatientFormPage.tsx:45
3. ✅ PatientDetailPage.tsx - Agregar `calculateAge()`
4. ✅ PatientHistoryPage.tsx - Múltiples líneas
5. ✅ Patients.controller.ts:247, 276

**Tiempo estimado**: 1 hora

### Fase 3: Media Prioridad (Próxima semana)
1. ✅ Todas las páginas con `.toLocaleDateString()`
2. ✅ Calendar.tsx - Agregar `compareDates()`

**Tiempo estimado**: 2 horas

### Fase 4: Baja Prioridad (Cuando sea posible)
1. ✅ PackageGroupView.tsx
2. ✅ AttendAppointmentModal.tsx

**Tiempo estimado**: 30 minutos

---

## 🛠️ Funciones Faltantes en dateUtils

Estas funciones deben agregarse a `dateUtils.ts`:

### Frontend (`frontend/src/utils/dateUtils.ts`)

```typescript
/**
 * Calcula la edad a partir de una fecha de nacimiento
 */
export function calculateAge(birthDateString: string): number {
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Compara dos fechas (para usar en sort)
 * Retorna: negativo si date1 < date2, positivo si date1 > date2, 0 si iguales
 */
export function compareDates(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return d1.getTime() - d2.getTime();
}
```

### Backend (`backend/src/utils/dateUtils.ts`)

Ya tiene todas las funciones necesarias ✅

---

## ✅ Checklist de Verificación

### Antes de Refactorizar
- [ ] Leer y entender el contexto del código
- [ ] Identificar si la fecha es solo fecha (YYYY-MM-DD) o fecha+hora
- [ ] Verificar si viene del frontend o de la BD
- [ ] Revisar si hay tests que necesiten actualizarse

### Durante la Refactorización
- [ ] Importar las funciones correctas de dateUtils
- [ ] Reemplazar el código antiguo
- [ ] Verificar que el tipo de retorno sea correcto
- [ ] Verificar que no se rompan dependencias

### Después de Refactorizar
- [ ] Verificar que compile sin errores
- [ ] Probar manualmente la funcionalidad
- [ ] Verificar en diferentes zonas horarias si es posible
- [ ] Actualizar tests si existen

---

## 📚 Referencias Rápidas

### Patrones Comunes

| Patrón Antiguo | Reemplazo | Función |
|---------------|-----------|---------|
| `new Date().toISOString().split('T')[0]` | `getLocalDateString()` | Fecha de hoy |
| `.split('T')[0]` | `utcToLocalDate()` | Formatear para input |
| `date < new Date()` | `isDateTimeInPast(date)` | Validar pasado |
| `.toLocaleDateString('es-PE')` | `formatDate(date)` | Mostrar fecha |
| `.toLocaleString('es-PE')` | `formatDateTime(date)` | Mostrar fecha+hora |
| `new Date(dateString)` en backend | `parseStartOfDay(dateString)` | Parsear fecha |
| Cálculo manual de edad | `calculateAge(birthDate)` | Edad |
| `.getTime()` para comparar | `compareDates(d1, d2)` | Comparar fechas |

---

**Última actualización**: 2025-12-06
**Estado**: Pendiente de implementación
**Responsable**: Equipo de desarrollo
