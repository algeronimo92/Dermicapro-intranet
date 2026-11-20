# Módulo de Gestión de Citas - DermicaPro

## ✅ Implementación Completada

Se ha implementado exitosamente el **Módulo Completo de Gestión de Citas** para DermicaPro.

---

## 📋 Archivos Creados

### Páginas (3)
1. **AppointmentsPage.tsx** - Lista de citas con filtros por estado y fechas
2. **AppointmentFormPage.tsx** - Formulario para crear/editar citas
3. **AppointmentDetailPage.tsx** - Vista detallada con funcionalidad de subir recibo

### Servicios (2)
1. **appointments.service.ts** - Servicio API completo para operaciones CRUD de citas
2. **services.service.ts** - Servicio para obtener lista de servicios/tratamientos

### Estilos Agregados
- Status badges (estados de citas con colores)
- Info box (caja de información)
- Estilos para filtros de fecha

---

## 🎯 Funcionalidades Implementadas

### Lista de Citas
- ✅ Visualización paginada (10 registros por página)
- ✅ Filtro por estado (Reservada, Atendida, Cancelada, No asistió)
- ✅ Filtro por rango de fechas (desde/hasta)
- ✅ Botón "Limpiar filtros"
- ✅ Contador de resultados totales
- ✅ Click en fila para ver detalle
- ✅ Badges de colores por estado
- ✅ Visualización de fecha y hora
- ✅ Información del paciente y servicio
- ✅ Monto de reserva
- ✅ Usuario que creó la cita

### Crear/Editar Cita
- ✅ Selección de paciente desde lista completa
- ✅ Selección de servicio con precio visible
- ✅ Selección de fecha y hora (datetime-local)
- ✅ Campo para monto de reserva (opcional)
- ✅ Campo de notas/observaciones
- ✅ Validación completa en tiempo real
- ✅ Validación que la fecha no sea en el pasado
- ✅ Precarga de paciente desde URL (patientId query param)
- ✅ Carga de datos en modo edición

### Detalle de Cita
- ✅ Información completa de la cita
- ✅ Badge de estado con color
- ✅ Información del paciente (con link)
- ✅ Información del servicio y precio
- ✅ Monto de reserva y recibo
- ✅ **Subir recibo** (JPG, PNG, PDF hasta 5MB)
- ✅ **Marcar como atendida** (Admin/Nurse)
- ✅ Botones Editar/Eliminar según permisos
- ✅ Modal de confirmación para eliminar
- ✅ Link para ver información del paciente
- ✅ Información de auditoría (creado por, atendido por, fechas)

---

## 🎨 Estados de Citas

| Estado | Color | Descripción |
|--------|-------|-------------|
| Reservada | Azul | Cita programada, pendiente de atención |
| Atendida | Verde | Cita completada |
| Cancelada | Rojo | Cita cancelada |
| No asistió | Amarillo | Paciente no se presentó |

---

## 🔐 Permisos por Rol

| Acción | Admin | Nurse | Sales |
|--------|-------|-------|-------|
| Ver lista | ✅ | ✅ | ✅ |
| Ver detalle | ✅ | ✅ | ✅ |
| Crear | ✅ | ❌ | ✅ |
| Editar | ✅ | ❌ | ✅ |
| Eliminar | ✅ | ❌ | ❌ |
| Marcar atendida | ✅ | ✅ | ❌ |
| Subir recibo | ✅ | ✅ | ✅ |

---

## 📊 Flujo de Trabajo

### Vendedor Crea Cita
1. Click en "Nueva Cita"
2. Selecciona paciente (o viene preseleccionado desde página de paciente)
3. Selecciona servicio
4. Elige fecha y hora
5. Ingresa monto de reserva (opcional)
6. Agrega notas (opcional)
7. Click en "Crear Cita"
8. Sistema crea cita y genera comisión automáticamente

### Vendedor Sube Recibo
1. Entra al detalle de la cita
2. Click en "Subir Recibo"
3. Selecciona archivo (JPG/PNG/PDF)
4. Sistema valida y sube el archivo
5. Recibo queda vinculado a la cita

### Enfermera Atiende Cita
1. Ve lista de citas (puede filtrar por fecha de hoy)
2. Click en cita para ver detalle
3. Revisa información del paciente
4. Realiza el tratamiento
5. Click en "Marcar como Atendida"
6. Sistema cambia estado y registra fecha/usuario

---

## 🔌 Endpoints API Utilizados

### GET /api/appointments
**Query Parameters:**
- `page` - Número de página
- `limit` - Registros por página
- `status` - Filtrar por estado
- `dateFrom` - Filtrar desde fecha
- `dateTo` - Filtrar hasta fecha

### GET /api/appointments/:id
Obtener detalle de una cita

### POST /api/appointments
Crear nueva cita

**Body:**
```json
{
  "patientId": "uuid",
  "serviceId": "uuid",
  "scheduledDate": "2024-12-25T10:00:00",
  "reservationAmount": 100,
  "notes": "Observaciones..."
}
```

### PUT /api/appointments/:id
Actualizar cita

### DELETE /api/appointments/:id
Eliminar cita

### POST /api/appointments/:id/attend
Marcar cita como atendida

### POST /api/appointments/:id/upload-receipt
Subir recibo de pago

**Body:** FormData con archivo

### GET /api/services
Obtener lista de servicios activos

---

## 🎨 Características de UI/UX

### Badges de Estado
- Colores distintos por cada estado
- Texto descriptivo en español
- Mayúsculas automáticas
- Bordes redondeados

### Filtros Inteligentes
- Filtros se aplican automáticamente
- Paginación se mantiene al filtrar
- Botón "Limpiar filtros" aparece solo cuando hay filtros activos
- Filtro de fechas con inputs nativos de tipo "date"

### Validaciones
- Fecha no puede ser en el pasado
- Monto de reserva no puede ser negativo
- Paciente y servicio son obligatorios
- Archivos solo JPG, PNG, PDF (max 5MB)

### Feedback Visual
- Loading states en todas las operaciones
- Mensajes de error claros
- Estados hover en botones
- Confirmaciones para acciones destructivas

---

## 📱 Navegación

### Desde Lista de Citas
- Click en fila → Detalle de cita
- "Nueva Cita" → Formulario de crear cita
- Filtros → Actualiza lista automáticamente

### Desde Detalle de Cita
- "Editar" → Formulario de editar cita
- "Ver Información del Paciente" → Detalle del paciente
- "Marcar como Atendida" → Actualiza estado en la misma página
- "Subir Recibo" → Abre selector de archivo

### Desde Paciente (integración)
- "Nueva Cita" con paciente preseleccionado → Formulario de cita

---

## 🔄 Integración con Otros Módulos

### Con Pacientes
- Formulario de cita lista todos los pacientes
- Botón "Nueva Cita" en detalle de paciente preselecciona paciente
- Link desde detalle de cita a detalle de paciente

### Con Servicios
- Formulario de cita muestra servicios con precios
- Precio del servicio visible en detalle de cita

### Con Comisiones (Backend)
- Al crear cita, backend genera comisión automáticamente
- Comisión vinculada al vendedor que creó la cita

---

## 📂 Estructura de Archivos

```
frontend/src/
├── pages/
│   ├── AppointmentsPage.tsx           # Lista
│   ├── AppointmentFormPage.tsx        # Crear/Editar
│   └── AppointmentDetailPage.tsx      # Detalle
├── services/
│   ├── appointments.service.ts        # API de citas
│   └── services.service.ts            # API de servicios
└── styles.css                         # Estilos actualizados
```

---

## 🎯 Casos de Uso Completos

### Caso 1: Vendedor Registra Nueva Cita
```
1. Cliente llama por teléfono
2. Vendedor busca paciente (o lo crea si es nuevo)
3. Desde detalle del paciente → "Nueva Cita"
4. Selecciona servicio "HIFU 12D - S/. 800"
5. Elige fecha: 25/12/2024 10:00 AM
6. Cliente paga reserva de S/. 200
7. Vendedor ingresa monto y guarda
8. Después sube foto del voucher de pago
9. Sistema genera comisión del 10% (S/. 20)
```

### Caso 2: Enfermera Atiende Cita del Día
```
1. Enfermera ve lista de citas
2. Filtra por fecha de hoy
3. Selecciona paciente de las 10:00 AM
4. Revisa historial del paciente
5. Realiza el tratamiento
6. Click en "Marcar como Atendida"
7. Sistema registra: atendido por enfermera, fecha/hora actual
8. Luego registra sesión de tratamiento (módulo separado)
```

### Caso 3: Admin Revisa Citas del Mes
```
1. Va a lista de citas
2. Filtra: Desde 01/12/2024 Hasta 31/12/2024
3. Ve todas las citas del mes
4. Filtra por "Atendida" para ver completadas
5. Revisa detalles de citas con problemas
6. Cancela cita si es necesario
```

---

## ✨ Mejoras Futuras Sugeridas

### Corto Plazo
1. Vista de calendario para visualizar citas
2. Vista "Citas de Hoy" dedicada para enfermeras
3. Recordatorios automáticos por WhatsApp/SMS
4. Exportar lista de citas a Excel

### Mediano Plazo
5. Reagendar citas (cambiar fecha/hora)
6. Historial de cambios en la cita
7. Notas internas (no visibles al paciente)
8. Agregar múltiples recibos/comprobantes

### Largo Plazo
9. Integración con calendario de Google
10. Sistema de colas/turnos en tiempo real
11. Check-in digital del paciente
12. Evaluación post-tratamiento

---

## 🐛 Validaciones Implementadas

### Formulario de Cita
- ✅ Paciente requerido
- ✅ Servicio requerido
- ✅ Fecha y hora requeridas
- ✅ Fecha no puede ser en el pasado
- ✅ Monto de reserva >= 0

### Subir Recibo
- ✅ Solo JPG, PNG, PDF
- ✅ Tamaño máximo 5MB
- ✅ Solo en citas con estado "Reservada"
- ✅ Un recibo por cita

### Permisos
- ✅ Solo Admin/Sales pueden crear/editar
- ✅ Solo Admin puede eliminar
- ✅ Solo Admin/Nurse pueden marcar atendida
- ✅ Todos pueden ver y subir recibos

---

## 📈 Estadísticas del Módulo

| Métrica | Cantidad |
|---------|----------|
| Páginas creadas | 3 |
| Servicios creados | 2 |
| Rutas configuradas | 4 |
| Funcionalidades principales | 8 |
| Estados de cita | 4 |
| Permisos por rol | 6 |
| Validaciones | 10+ |
| Líneas de código (aprox.) | 1,000+ |

---

## 🚀 Estado del Proyecto

- ✅ **Backend:** API completa disponible
- ✅ **Frontend:** Módulo completo implementado
- ✅ **Rutas:** Configuradas en App.tsx
- ✅ **Estilos:** CSS actualizado
- ✅ **Permisos:** Implementados por rol
- ✅ **Validaciones:** Frontend y backend
- ✅ **Integración:** Con módulos de pacientes y servicios
- ✅ **Build:** Compila sin errores

---

## 📝 Notas Técnicas

### Manejo de Fechas
- Uso de `datetime-local` para mejor UX
- Validación que fecha no sea pasada
- Formato ISO 8601 para comunicación con API
- Display en formato local (es-PE)

### Manejo de Archivos
- Uso de FormData para upload
- Validación de tipo MIME
- Validación de tamaño
- Input oculto con ref para mejor UX

### Estado de la Aplicación
- UseEffect para cargar datos automáticamente
- Loading states para feedback visual
- Error handling con mensajes claros
- Refresco automático después de operaciones

---

## ✅ TODO COMPLETADO

El módulo de citas está **100% funcional** y listo para usar:

- ✅ Lista de citas con filtros
- ✅ Crear nueva cita
- ✅ Editar cita existente
- ✅ Ver detalle completo
- ✅ Subir recibo de pago
- ✅ Marcar como atendida
- ✅ Eliminar cita
- ✅ Permisos por rol
- ✅ Validaciones completas
- ✅ Integración con pacientes
- ✅ UI profesional con badges

**El módulo está listo para testing y uso en producción!** 🎉
