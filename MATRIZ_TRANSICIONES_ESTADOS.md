# 📊 Matriz de Transiciones de Estados - Sistema de Citas

## 🎯 Resumen Ejecutivo

Este documento detalla todas las transiciones de estado posibles en el sistema de citas, incluyendo:
- ✅ Qué roles pueden ejecutar cada transición
- 📋 Qué requisitos se necesitan para avanzar
- ⚠️ Qué confirmaciones se solicitan al usuario
- 🔒 Validaciones y restricciones

---

## 📋 Tabla Completa de Transiciones por Estado Origen

### 🟦 DESDE: **RESERVED** (Reservada)

| Estado Destino | Admin | Nurse | Sales | Requisitos | Confirmación | Descripción |
|---------------|-------|-------|-------|------------|--------------|-------------|
| **In Progress** | ✅ | ✅ | ❌ | Ninguno | No | El paciente llegó y comienza la atención |
| **Cancelled** | ✅ | ❌ | ✅ | Ninguno | ⚠️ Sí | Cancelar cita (puede afectar comisiones) |
| **No Show** | ✅ | ❌ | ✅ | Ninguno | ⚠️ Sí | Paciente no se presentó |

---

### 🟨 DESDE: **IN_PROGRESS** (En Atención)

| Estado Destino | Admin | Nurse | Sales | Requisitos | Confirmación | Descripción |
|---------------|-------|-------|-------|------------|--------------|-------------|
| **Attended** | ✅ | ✅ | ❌ | 📸 **Fotos de ANTES** | No | Finalizar atención (requiere fotos) |
| **Reserved** | ✅ | ✅ | ❌ | Ninguno | ⚠️ Sí | Revertir a reservada (se pierde progreso) |
| **Cancelled** | ✅ | ❌ | ✅ | Ninguno | ⚠️ Sí | Cancelar durante atención (inusual) |

**⚠️ Nota Importante sobre "Attended":**
- El botón "Finalizar Atención" **siempre aparece** para admin y nurse
- Al hacer click, valida que existan fotos de ANTES
- Si no hay fotos → muestra error: _"Debes subir al menos fotos de ANTES para finalizar la atención"_
- Si hay fotos → procede a marcar como atendida

---

### 🟩 DESDE: **ATTENDED** (Atendida)

| Estado Destino | Admin | Nurse | Sales | Requisitos | Confirmación | Descripción |
|---------------|-------|-------|-------|------------|--------------|-------------|
| **In Progress** | ✅ | ❌ | ❌ | Ninguno | ⚠️ Sí | Reabrir atención para agregar información |

---

### 🟥 DESDE: **CANCELLED** (Cancelada)

| Estado Destino | Admin | Nurse | Sales | Requisitos | Confirmación | Descripción |
|---------------|-------|-------|-------|------------|--------------|-------------|
| **Reserved** | ✅ | ❌ | ✅ | Ninguno | ⚠️ Sí | Reactivar cita cancelada |

---

### 🟪 DESDE: **NO_SHOW** (No Asistió)

| Estado Destino | Admin | Nurse | Sales | Requisitos | Confirmación | Descripción |
|---------------|-------|-------|-------|------------|--------------|-------------|
| **Reserved** | ✅ | ❌ | ✅ | Ninguno | ⚠️ Sí | Corregir estado (paciente sí asistió) |
| **In Progress** | ✅ | ❌ | ❌ | Ninguno | ⚠️ Sí | Paciente llegó tarde |

---

## 👥 Tabla por Rol

### 🔴 ROL: **ADMIN** (Administrador)

| Desde | Hacia | Requisitos | Confirmación | Acción |
|-------|-------|------------|--------------|--------|
| Reserved | In Progress | - | No | Iniciar Atención |
| Reserved | Cancelled | - | ⚠️ Sí | Cancelar Cita |
| Reserved | No Show | - | ⚠️ Sí | Marcar No Asistió |
| In Progress | Attended | 📸 Fotos de ANTES | No | Finalizar Atención |
| In Progress | Reserved | - | ⚠️ Sí | Revertir a Reservada |
| In Progress | Cancelled | - | ⚠️ Sí | Cancelar |
| Attended | In Progress | - | ⚠️ Sí | Reabrir Atención |
| Cancelled | Reserved | - | ⚠️ Sí | Reactivar Cita |
| No Show | Reserved | - | ⚠️ Sí | Corregir a Reservada |
| No Show | In Progress | - | ⚠️ Sí | Paciente Llegó Tarde |

**Total de transiciones: 10** ✅ **Permisos completos**

---

### 🟢 ROL: **NURSE** (Enfermera)

| Desde | Hacia | Requisitos | Confirmación | Acción |
|-------|-------|------------|--------------|--------|
| Reserved | In Progress | - | No | Iniciar Atención |
| In Progress | Attended | 📸 Fotos de ANTES | No | Finalizar Atención |
| In Progress | Reserved | - | ⚠️ Sí | Revertir a Reservada |

**Total de transiciones: 3** - Enfocado en flujo de atención

**Restricciones:**
- ❌ No puede cancelar citas
- ❌ No puede marcar como "No Show"
- ❌ No puede reabrir citas atendidas
- ❌ No puede reactivar citas canceladas

---

### 🔵 ROL: **SALES** (Ventas)

| Desde | Hacia | Requisitos | Confirmación | Acción |
|-------|-------|------------|--------------|--------|
| Reserved | Cancelled | - | ⚠️ Sí | Cancelar Cita |
| Reserved | No Show | - | ⚠️ Sí | Marcar No Asistió |
| In Progress | Cancelled | - | ⚠️ Sí | Cancelar |
| Cancelled | Reserved | - | ⚠️ Sí | Reactivar Cita |
| No Show | Reserved | - | ⚠️ Sí | Corregir a Reservada |

**Total de transiciones: 5** - Enfocado en gestión comercial

**Restricciones:**
- ❌ No puede iniciar atención
- ❌ No puede finalizar atención
- ❌ No puede revertir estados de atención
- ❌ No puede marcar paciente llegó tarde

---

## 📸 Requisitos Especiales

### Fotos de ANTES (In Progress → Attended)

**Validación:**
```typescript
// El sistema valida que exista al menos una foto en beforePhotoUrls
const hasBeforePhotos = appointment.patientRecords.some(record => {
  return record.beforePhotoUrls && record.beforePhotoUrls.length > 0;
});
```

**Comportamiento:**
- ✅ Botón "Finalizar Atención" **siempre visible** para admin y nurse
- ❌ Al hacer click sin fotos → Error: "⚠️ Debes subir al menos fotos de ANTES para finalizar la atención"
- ✅ Al hacer click con fotos → Transición exitosa

**Razón:** Las fotos de antes son documentación obligatoria del tratamiento realizado.

---

## ⚠️ Confirmaciones Requeridas

Las siguientes transiciones requieren confirmación del usuario antes de ejecutarse:

| Transición | Mensaje de Confirmación |
|------------|------------------------|
| Reserved → Cancelled | "¿Estás seguro de cancelar esta cita? Esta acción puede afectar las comisiones." |
| Reserved → No Show | "¿Confirmas que el paciente no se presentó a la cita?" |
| In Progress → Reserved | "¿Regresar a estado Reservada? Se perderá el progreso de la atención." |
| In Progress → Cancelled | "¿Cancelar la cita durante la atención? Esto es inusual." |
| Attended → In Progress | "¿Regresar a estado En Atención? Esto es inusual para una cita ya atendida." |
| Cancelled → Reserved | "¿Reactivar esta cita cancelada?" |
| No Show → Reserved | "¿Cambiar a Reservada? El paciente sí asistió?" |
| No Show → In Progress | "¿El paciente llegó tarde? Cambiar a En Atención." |

**Razón:** Estas acciones son sensibles y pueden tener impacto en comisiones, historial clínico o flujo de trabajo.

---

## 🔄 Diagrama de Flujo Completo

```
                    ┌─────────────┐
              ┌────▶│  RESERVED   │◀────┐
              │     └─────────────┘     │
              │            │            │
              │            ▼            │
         Revertir   ┌─────────────┐  Reactivar
              │     │IN PROGRESS  │    │
              │     └─────────────┘    │
              │            │            │
              │            ▼            │
       ┌──────┴────┐ ┌─────────────┐   │
       │ CANCELLED │ │  ATTENDED   │   │
       └───────────┘ └─────────────┘   │
              │            │            │
              └────────────┴────────────┘
                   Reactivar

       ┌─────────────┐
       │  NO SHOW    │
       └─────────────┘
              │
              └────────▶ RESERVED
              └────────▶ IN PROGRESS
```

---

## 🔐 Seguridad y Auditoría

Cada transición de estado genera un **log de auditoría** automático:

```json
{
  "appointmentId": "uuid",
  "fromStatus": "reserved",
  "toStatus": "in_progress",
  "userId": "user-id",
  "timestamp": "2025-12-04T...",
  "reason": "Paciente llegó a tiempo",
  "metadata": {}
}
```

**Ubicación:** `frontend/src/config/appointmentStateMachine.config.ts` → función `createTransitionLog()`

---

## 📚 Referencias

- **Configuración completa:** [`appointmentStateMachine.config.ts`](frontend/src/config/appointmentStateMachine.config.ts)
- **Componente UI:** [`StateTransitionSelector.tsx`](frontend/src/components/StateTransitionSelector.tsx)
- **Documentación técnica:** [`STATE_MACHINE_README.md`](frontend/src/config/STATE_MACHINE_README.md)

---

**Última actualización:** 2025-12-04
**Versión:** 1.0.0
