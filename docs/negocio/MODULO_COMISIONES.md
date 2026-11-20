# Módulo de Gestión de Comisiones - DermicaPro

## 📋 Descripción General

Se ha implementado un módulo completo y profesional para gestionar las comisiones de ventas de los vendedores en DermicaPro. El sistema calcula automáticamente las comisiones cuando se crean citas con servicios, y permite un flujo completo de aprobación y pago.

## ✨ Características Principales

### 1. **Configuración Flexible de Comisiones**
- Cada servicio puede tener su propia tasa de comisión (ej: 10%, 15%, etc.)
- Tasa configurable por servicio o tasa por defecto (10%)
- Notas descriptivas por servicio

### 2. **Generación Automática**
- Las comisiones se crean automáticamente al reservar/vender un servicio
- Se calcula sobre el precio final del paquete vendido (después de descuentos)
- Una comisión por cada paquete/orden vendido

### 3. **Flujo de Estados**
```
PENDING → APPROVED → PAID
   ↓          ↓
REJECTED  CANCELLED
```

- **Pending**: Generada, esperando aprobación del administrador
- **Approved**: Aprobada, lista para pagar
- **Paid**: Pagada al vendedor
- **Rejected**: Rechazada por el administrador (con motivo)
- **Cancelled**: Cancelada (ej: si se cancela la cita)

### 4. **Gestión Completa**
- Vista filtrable de todas las comisiones
- Filtros por: estado, vendedor, fecha, servicio
- Aprobación individual o masiva
- Pago individual o masivo
- Rechazo con motivo obligatorio
- Historial completo de aprobaciones y pagos

### 5. **Reportes y Resúmenes**
- Resumen por estado con totales
- Vista por vendedor
- Exportable para contabilidad

## 🗄️ Cambios en la Base de Datos

### Modelo de Servicio (actualizado)
```prisma
model Service {
  // ... campos existentes
  commissionRate  Decimal?  // Porcentaje de comisión (0.1000 = 10%)
  commissionNotes String?   // Notas sobre la comisión
  commissions     Commission[]
}
```

### Modelo de Comisión (mejorado)
```prisma
model Commission {
  id               String           @id @default(uuid())
  salesPersonId    String           // El vendedor
  appointmentId    String           // La cita que generó la comisión
  orderId          String?          // El paquete específico
  serviceId        String?          // El servicio

  commissionRate   Decimal          // Tasa aplicada (copia del momento de venta)
  baseAmount       Decimal          // Precio del paquete
  commissionAmount Decimal          // Monto final de comisión
  status           CommissionStatus // Estado actual

  // Aprobación
  approvedAt       DateTime?
  approvedById     String?

  // Pago
  paidAt           DateTime?
  paidById         String?
  paymentMethod    PaymentMethod?
  paymentReference String?          // Número de transferencia, etc.

  // Metadata
  notes            String?
  rejectionReason  String?
  createdAt        DateTime
  updatedAt        DateTime
}
```

### Estados Posibles
```typescript
enum CommissionStatus {
  pending      // Esperando aprobación
  approved     // Aprobada, lista para pagar
  paid         // Pagada
  cancelled    // Cancelada
  rejected     // Rechazada
}
```

## 🔌 API Endpoints

### Consulta
```
GET    /api/commissions                    // Listar con filtros
GET    /api/commissions/:id                // Ver detalle
GET    /api/commissions/summary            // Resumen por vendedor
```

### Gestión (solo admin)
```
POST   /api/commissions/:id/approve        // Aprobar
POST   /api/commissions/:id/reject         // Rechazar
POST   /api/commissions/:id/pay            // Marcar como pagada
POST   /api/commissions/:id/cancel         // Cancelar
POST   /api/commissions/batch/approve      // Aprobar varias
POST   /api/commissions/batch/pay          // Pagar varias
```

### Permisos
- **Vendedores**: Pueden ver solo sus propias comisiones
- **Administradores**: Pueden ver todas y gestionar (aprobar/rechazar/pagar)

## 📱 Interfaz de Usuario

### Página de Comisiones (`/commissions`)

**Componentes principales:**

1. **Cards de Resumen**
   - Total pendiente
   - Total aprobado
   - Total pagado
   - Total rechazado/cancelado

2. **Filtros**
   - Por estado
   - Por vendedor
   - Por rango de fechas
   - Por servicio

3. **Tabla de Comisiones**
   - Checkbox para selección múltiple
   - Información del vendedor
   - Servicio y paciente
   - Montos: base, tasa, comisión
   - Estado con badge colorido
   - Acciones según estado

4. **Acciones Masivas**
   - Aprobar seleccionadas
   - Marcar como pagadas
   - Limpiar selección

5. **Modales**
   - Modal de aprobación (con notas opcionales)
   - Modal de pago (método, referencia, notas)
   - Modal de rechazo (motivo obligatorio)

## 💻 Uso del Sistema

### Para Administradores

#### 1. Configurar Comisiones en Servicios
```typescript
// Al crear o editar un servicio:
{
  name: "Láser Corporal",
  basePrice: 500,
  commissionRate: 0.12,  // 12% de comisión
  commissionNotes: "Comisión especial por servicio premium"
}
```

#### 2. Revisar Comisiones Pendientes
1. Ir a `/commissions`
2. Filtrar por estado "Pendiente"
3. Revisar cada comisión
4. Aprobar o rechazar

#### 3. Pagar Comisiones Aprobadas
1. Filtrar por estado "Aprobada"
2. Seleccionar las que se van a pagar
3. Clic en "Marcar como pagadas"
4. Indicar método y referencia de pago
5. Confirmar

### Para Vendedores

#### 1. Ver Sus Comisiones
- Solo verán sus propias comisiones
- Pueden filtrar por estado y fecha
- No pueden aprobar ni pagar

#### 2. Seguimiento
- Ver estado actual de cada comisión
- Ver cuándo fueron aprobadas
- Ver cuándo fueron pagadas

## 🔄 Flujo de Trabajo

### 1. Creación Automática
```
Vendedor crea cita con servicio
  ↓
Sistema calcula comisión basada en:
  - Precio final del paquete
  - Tasa de comisión del servicio (o 10% por defecto)
  ↓
Se crea Commission con status: PENDING
```

### 2. Aprobación
```
Administrador revisa comisión
  ↓
¿Es correcta?
  ├── SÍ: Aprobar → status: APPROVED
  └── NO: Rechazar con motivo → status: REJECTED
```

### 3. Pago
```
Administrador filtra aprobadas
  ↓
Selecciona las que va a pagar
  ↓
Indica método y referencia de pago
  ↓
Se marcan como: PAID
```

## 📊 Ejemplo de Cálculo

```typescript
// Servicio: Láser Corporal
// Precio base: S/ 500
// Descuento: S/ 50
// Precio final: S/ 450
// Tasa comisión: 12%

const baseAmount = 450;  // Precio final del paquete
const commissionRate = 0.12;  // 12%
const commissionAmount = 450 * 0.12 = 54;  // S/ 54

// La comisión generada:
{
  salesPersonId: "vendedor-id",
  baseAmount: 450,
  commissionRate: 0.12,
  commissionAmount: 54,
  status: "pending"
}
```

## 🔒 Seguridad

- Solo usuarios autenticados pueden acceder
- Vendedores solo ven sus comisiones
- Solo administradores pueden aprobar/rechazar/pagar
- Todas las acciones quedan registradas con usuario y fecha
- No se pueden modificar comisiones pagadas

## 📁 Archivos Creados/Modificados

### Backend
```
✓ backend/prisma/schema.prisma (actualizado)
✓ backend/prisma/migrations/20251229_add_commission_enhancements/migration.sql
✓ backend/src/controllers/commissions.controller.ts (nuevo)
✓ backend/src/routes/commissions.routes.ts (nuevo)
✓ backend/src/routes/index.ts (actualizado)
✓ backend/src/controllers/appointments.controller.ts (actualizado)
✓ backend/src/controllers/services.controller.ts (actualizado)
```

### Frontend
```
✓ frontend/src/services/commissions.service.ts (nuevo)
✓ frontend/src/pages/CommissionsPage.tsx (nuevo)
✓ frontend/src/styles/commissions-page.css (nuevo)
```

## 🚀 Próximos Pasos

### 1. Agregar Ruta al Router
Editar `frontend/src/App.tsx` y agregar:
```typescript
import CommissionsPage from './pages/CommissionsPage';

// En las rutas:
<Route path="/commissions" element={<CommissionsPage />} />
```

### 2. Agregar al Menú de Navegación
Agregar enlace en el menú principal (solo para admin):
```typescript
{userRole === 'admin' && (
  <Link to="/commissions">Comisiones</Link>
)}
```

### 3. Actualizar Página de Servicios
Agregar campos de comisión al formulario de creación/edición de servicios:
```tsx
<div className="form-group">
  <label>Tasa de Comisión (%):</label>
  <input
    type="number"
    step="0.1"
    min="0"
    max="100"
    value={commissionRate * 100}
    onChange={(e) => setCommissionRate(Number(e.target.value) / 100)}
  />
</div>
```

## 📈 Mejoras Futuras Opcionales

1. **Dashboard de Comisiones**
   - Gráficas de comisiones por mes
   - Ranking de vendedores
   - Proyecciones

2. **Notificaciones**
   - Email al vendedor cuando se aprueba su comisión
   - Email cuando se paga

3. **Exportación**
   - Exportar a Excel/PDF
   - Generar reportes contables

4. **Metas de Ventas**
   - Configurar metas mensuales
   - Bonos por cumplimiento

5. **Comisiones Variables**
   - Por volumen de ventas
   - Por temporada
   - Por tipo de cliente

## ❓ Preguntas Frecuentes

### ¿Qué pasa si cancelo una cita que ya tiene comisión?
La comisión puede ser cancelada manualmente por un administrador.

### ¿Se puede editar una comisión?
No directamente. Si hay un error, se debe rechazar y generar una nueva manualmente.

### ¿Qué pasa si cambio el precio de un servicio?
Las comisiones ya generadas mantienen la tasa que tenían al momento de la venta (se hace copia).

### ¿Los vendedores pueden ver cuánto van a ganar?
Sí, pueden ver todas sus comisiones y filtrar por estado para saber cuánto tienen pendiente, aprobado o ya pagado.

---

## 🎉 ¡Listo!

El módulo de comisiones está completamente implementado y listo para usar. Solo falta agregarlo al router y menú de navegación del frontend.
