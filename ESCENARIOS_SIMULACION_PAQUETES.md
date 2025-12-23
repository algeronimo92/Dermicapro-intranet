# 📋 Escenarios Completos de Simulación de Paquetes

## 🎯 Contexto: Clínica Dermatológica DermicaPro

**Sistema de Paquetes de Tratamientos:**
- Servicios tienen `defaultSessions` (ej: Hollywood Peel x3 = 3 sesiones)
- Cada paquete (Order) tiene sesiones numeradas (1, 2, 3, etc.)
- Una cita puede incluir múltiples servicios/sesiones
- Las sesiones pueden ser de paquetes existentes o nuevos

---

## 📊 Matriz Completa de Escenarios

### Categorías de Escenarios:

1. **Servicios de Sesión Única** (defaultSessions = 1)
2. **Paquetes Nuevos** (crear Order automáticamente + asignar a paquetes simulados)
3. **Paquetes Existentes** (consumir Order del paciente)
4. **Paquetes Múltiples del Mismo Servicio**
5. **Sesiones Canceladas** (afectan disponibilidad)
6. **Sesiones con Reservas Pendientes**
7. **Mezclas Complejas** (múltiples servicios en una cita)

---

## 🔷 CATEGORÍA 1: Servicios de Sesión Única

### Escenario 1.1: HIFU (1 sesión) - Primera vez
**Given:**
- Servicio: HIFU Facial (defaultSessions = 1)
- Paciente no tiene órdenes de HIFU

**When:**
- Usuario selecciona "HIFU Facial"

**Then:**
- ❌ NO debe aparecer selector "¿Asociar a un paquete?"
- ✅ Debe mostrar: "Se creará un nuevo paquete de 1 sesión automáticamente"
- ✅ Simulación: Paquete Nuevo → Sesión 1 de 1

---

### Escenario 1.2: HIFU (1 sesión) - Segunda vez
**Given:**
- Servicio: HIFU Facial (defaultSessions = 1)
- Paciente ya tiene 1 orden de HIFU (completada)

**When:**
- Usuario selecciona "HIFU Facial"

**Then:**
- ❌ NO debe aparecer selector de paquetes (orden anterior completa)
- ✅ Debe crear NUEVO paquete automáticamente
- ✅ Simulación: Paquete Nuevo → Sesión 1 de 1

**Razón:** Servicios de 1 sesión SIEMPRE crean paquetes nuevos.

---

### Escenario 1.3: Múltiples HIFU en una cita
**Given:**
- Usuario agrega 2 sesiones de "HIFU Facial" a la cita

**When:**
- Guarda la cita

**Then:**
- ✅ Se crean 2 órdenes diferentes
- ✅ Simulación muestra:
  ```
  📦 Paquete 1: HIFU Facial (Nuevo)
    - Sesión 1 de 1 [+Por Agregar] S/. 450.00

  📦 Paquete 2: HIFU Facial (Nuevo)
    - Sesión 1 de 1 [+Por Agregar] S/. 450.00
  ```

---

## 🔷 CATEGORÍA 2: Paquetes Nuevos

### Escenario 2.1: Hollywood Peel x3 - Crear 3 sesiones a la vez
**Given:**
- Servicio: Hollywood Peel x3 (defaultSessions = 3)
- Paciente no tiene órdenes de Hollywood Peel

**When:**
- Usuario agrega 3 sesiones sin asociar a paquete existente

**Then:**
- ✅ Simulación:
  ```
  📦 Paquete Nuevo: Hollywood Peel x3
    🆕 Sesión 1 de 3 [+Por Agregar] S/. 200.00
    🆕 Sesión 2 de 3 [+Por Agregar] S/. 200.00
    🆕 Sesión 3 de 3 [+Por Agregar] S/. 200.00
  ```
- ✅ Subtotal: S/. 600.00
- ✅ Al guardar: Se crea 1 Order con totalSessions=3

---

### Escenario 2.2: Hollywood Peel x3 - Crear solo 2 sesiones
**Given:**
- Servicio: Hollywood Peel x3 (defaultSessions = 3)
- Usuario agrega solo 2 sesiones

**When:**
- Guarda la cita

**Then:**
- ✅ Simulación:
  ```
  📦 Paquete Nuevo: Hollywood Peel x3
    🆕 Sesión 1 de 3 [+Por Agregar] S/. 200.00
    🆕 Sesión 2 de 3 [+Por Agregar] S/. 200.00
  ```
- ⚠️ Indicador: "Sesión 3 no agendada aún"
- ✅ Al guardar: Se crea Order con totalSessions=3 (falta sesión 3)

---

### Escenario 2.3: Dos paquetes nuevos del mismo servicio
**Given:**
- Usuario quiere agendar 6 sesiones de Hollywood Peel x3

**When:**
- Agrega 3 sesiones → No asocia a paquete → Crea Paquete 1
- Agrega 3 sesiones más → No asocia a paquete → Crea Paquete 2

**Then:**
- ✅ Simulación:
  ```
  📦 Paquete 1 Nuevo: Hollywood Peel x3
    🆕 Sesión 1 de 3 [+Por Agregar] S/. 200.00
    🆕 Sesión 2 de 3 [+Por Agregar] S/. 200.00
    🆕 Sesión 3 de 3 [+Por Agregar] S/. 200.00

  📦 Paquete 2 Nuevo: Hollywood Peel x3
    🆕 Sesión 1 de 3 [+Por Agregar] S/. 200.00
    🆕 Sesión 2 de 3 [+Por Agregar] S/. 200.00
    🆕 Sesión 3 de 3 [+Por Agregar] S/. 200.00
  ```
- ✅ Al guardar: Se crean 2 Orders diferentes

**⚠️ CRÍTICO:** Cada `tempPackageId` único debe generar un Order diferente.

---

### Escenario 2.4: Asignar sesiones a un paquete simulado existente
**Given:**
- Servicio: Hollywood Peel x3 (defaultSessions = 3)
- Usuario ya agregó 1 sesión → Se creó Paquete Simulado 1 (temp-hollywood-peel-0)

**When:**
- Usuario selecciona de nuevo "Hollywood Peel x3"
- Aparece selector: "🆕 Paquete Simulado 1: Sesión 2 de 3"
- Usuario selecciona el paquete simulado
- Hace clic en "Agregar"

**Then:**
- ✅ La sesión se asigna al mismo paquete simulado (temp-hollywood-peel-0)
- ✅ Simulación:
  ```
  🆕 Paquete Nuevo: Hollywood Peel x3  2 de 3
    Sesión 1 [+Por Agregar] S/. 200.00
    Sesión 2 [+Por Agregar] S/. 200.00
  ```
- ✅ Al guardar: Se crea 1 solo Order con 2 AppointmentServices

**Caso de Uso Real:**
```
Estado Inicial:
  - Paquete 1 Existente (BD):
    - Sesión 1 (existente)
    - Sesión 2 (simulada)
    - Sesión 3 (simulada)

  - Paquete 2 Simulado:
    - Sesión 1 (simulado)

Acción:
  Usuario selecciona "Hollywood Peel x3" de nuevo

Selector Muestra:
  ○ No, crear nuevo paquete
  ○ 📦 Paquete 1: Sesión 4 de 3  [DESHABILITADO - Completo]
  ○ 🆕 Paquete Simulado 2: Sesión 2 de 3  [✅ DISPONIBLE]

Resultado:
  Usuario puede asignar la sesión al Paquete Simulado 2
```

**✅ NUEVO:** Esta funcionalidad permite construir paquetes sesión por sesión, sin tener que agregar todas las sesiones de golpe.

---

## 🔷 CATEGORÍA 3: Paquetes Existentes

### Escenario 3.1: Consumir sesión de paquete existente
**Given:**
- Paciente tiene Order de Hollywood Peel x3
- Ya consumió sesión 1 (status: attended)

**When:**
- Usuario edita cita y agrega Hollywood Peel
- Selecciona "Asociar a Paquete 1: Sesión 2 de 3"

**Then:**
- ✅ Simulación:
  ```
  📦 Paquete 1 Existente: Hollywood Peel x3 - Creado 01/12/2025
    Sesión 1 de 3  S/. 200.00
    🆕 Sesión 2 de 3 [+Por Agregar] S/. 200.00
  ```
- ✅ Subtotal correcto: S/. 200.00 (solo la nueva)

---

### Escenario 3.2: Paquete existente con sesiones pendientes
**Given:**
- Paciente tiene Order de Hollywood Peel x3
- Sesión 1: attended
- Sesión 2: reserved (otra cita futura)

**When:**
- Usuario intenta agregar Hollywood Peel a cita actual

**Then:**
- ⚠️ Selector muestra: "Paquete 1: Sesión 3 de 3 ⚠️"
- ⚠️ Warning: "Este paquete tiene sesiones reservadas pendientes"
- ✅ Se permite seleccionar (sesión 3)
- ✅ Simulación:
  ```
  📦 Paquete 1 Existente: Hollywood Peel x3 - Creado 01/12/2025
    Sesión 1 de 3 ✓ Atendida
    Sesión 2 de 3 ⚠️ Reservada (Cita: 05/12/2025)
    🆕 Sesión 3 de 3 [+Por Agregar] S/. 200.00
  ```

---

### Escenario 3.3: Paquete completo
**Given:**
- Paciente tiene Order de Hollywood Peel x3
- Las 3 sesiones ya están agendadas (reserved o attended)

**When:**
- Usuario intenta agregar Hollywood Peel

**Then:**
- ❌ Selector NO muestra el paquete completo
- ✅ Solo opción: "No, crear nuevo paquete"
- ✅ Mensaje: "Todos los paquetes existentes están completos. Se creará un nuevo paquete automáticamente."

---

### Escenario 3.4: Sesiones canceladas disponibles
**Given:**
- Paciente tiene Order de Hollywood Peel x3
- Sesión 1: attended
- Sesión 2: cancelled
- Sesión 3: sin agendar

**When:**
- Usuario agrega Hollywood Peel asociado a este paquete

**Then:**
- ✅ Se asigna sesión 2 (reutiliza el número cancelado)
- ✅ Simulación:
  ```
  📦 Paquete 1 Existente: Hollywood Peel x3 - Creado 01/12/2025
    Sesión 1 de 3 ✓ Atendida
    🆕 Sesión 2 de 3 [+Por Agregar] S/. 200.00 (Reemplaza cancelada)
  ```

**Regla:** Las sesiones canceladas liberan su número para reutilización.

---

## 🔷 CATEGORÍA 4: Paquetes Múltiples del Mismo Servicio

### Escenario 4.1: Dos paquetes existentes + Uno nuevo
**Given:**
- Paciente tiene 2 Orders de Hollywood Peel x3:
  - Order 1: Sesiones 1,2 atendidas. Sesión 3 libre
  - Order 2: Sesiones 1,2 atendidas. Sesión 3 libre

**When:**
- Usuario agrega 5 sesiones de Hollywood Peel:
  - 1 sesión → Asociar a Order 1
  - 1 sesión → Asociar a Order 2
  - 3 sesiones → Crear nuevo paquete

**Then:**
- ✅ Simulación:
  ```
  📦 Paquete 1 Existente: Hollywood Peel x3 - Creado 15/11/2025
    Sesión 1 de 3 ✓ Atendida
    Sesión 2 de 3 ✓ Atendida
    🆕 Sesión 3 de 3 [+Por Agregar] S/. 200.00

  📦 Paquete 2 Existente: Hollywood Peel x3 - Creado 20/11/2025
    Sesión 1 de 3 ✓ Atendida
    Sesión 2 de 3 ✓ Atendida
    🆕 Sesión 3 de 3 [+Por Agregar] S/. 200.00

  📦 Paquete 3 Nuevo: Hollywood Peel x3
    🆕 Sesión 1 de 3 [+Por Agregar] S/. 200.00
    🆕 Sesión 2 de 3 [+Por Agregar] S/. 200.00
    🆕 Sesión 3 de 3 [+Por Agregar] S/. 200.00
  ```
- ✅ Subtotal: S/. 1,000.00

---

### Escenario 4.2: Selector muestra todos los paquetes
**Given:**
- Paciente tiene 3 Orders de Hollywood Peel x3 con espacio disponible

**When:**
- Usuario selecciona Hollywood Peel

**Then:**
- ✅ Selector muestra:
  ```
  ¿Asociar a un paquete? (opcional)
  [ ] No, crear nuevo paquete
  [ ] Paquete 1: Sesión 2 de 3 - Creado 01/11/2025
  [ ] Paquete 2: Sesión 3 de 3 - Creado 15/11/2025
  [ ] Paquete 3: Sesión 1 de 3 - Creado 20/11/2025 ⚠️
  ```

**UI Mejorada:**
- Fechas de creación para diferenciar
- Warnings para paquetes con sesiones pendientes
- Numeración clara

---

## 🔷 CATEGORÍA 5: Sesiones Canceladas

### Escenario 5.1: Cita con sesión cancelada en edición
**Given:**
- Cita existente (ID: abc123) con:
  - Hollywood Peel Sesión 1 (status: cancelled)
  - Botox 1ml Sesión 1 (status: attended)

**When:**
- Usuario edita la cita

**Then:**
- ✅ Simulación muestra:
  ```
  📦 Paquete 1 Existente: Hollywood Peel x3
    Sesión 1 de 3 ❌ CANCELADA (esta cita)

  📦 Paquete 2 Existente: Botox 1ml x1
    Sesión 1 de 1 ✓ Atendida
  ```
- ⚠️ Sesiones canceladas tienen estilo visual diferente
- ⚠️ No se cuentan en subtotal

---

## 🔷 CATEGORÍA 6: Mezclas Complejas

### Escenario 6.1: Múltiples servicios en una cita
**Given:**
- Usuario agrega en una cita:
  - 2 sesiones de Hollywood Peel x3 (paquete nuevo)
  - 1 sesión de Botox 1ml (paquete nuevo)
  - 1 sesión de PRP Capilar x5 (asociado a paquete existente)

**Then:**
- ✅ Simulación:
  ```
  📦 Paquete 1 Nuevo: Hollywood Peel x3
    🆕 Sesión 1 de 3 [+Por Agregar] S/. 200.00
    🆕 Sesión 2 de 3 [+Por Agregar] S/. 200.00

  📦 Paquete 2 Nuevo: Botox 1ml x1
    🆕 Sesión 1 de 1 [+Por Agregar] S/. 450.00

  📦 Paquete 3 Existente: PRP Capilar x5 - Creado 10/11/2025
    Sesión 1 de 5 ✓ Atendida
    Sesión 2 de 5 ✓ Atendida
    🆕 Sesión 3 de 5 [+Por Agregar] S/. 350.00
  ```
- ✅ Subtotal: S/. 1,200.00
- ✅ Ordenamiento: Existentes primero, luego nuevos

---

## 🎨 Mejoras de UI Requeridas

### 1. **Badges y Visualización**

```tsx
// Estado de sesión
✓ Atendida         → Badge verde
⚠️ Reservada       → Badge amarillo
❌ Cancelada       → Badge rojo tachado
🆕 Por Agregar     → Badge azul brillante

// Estado de paquete
📦 Paquete Existente → Fondo gris claro
🆕 Paquete Nuevo     → Fondo azul claro con gradiente
```

### 2. **Información Contextual**

Cada paquete debe mostrar:
- Nombre del servicio
- Tipo (Existente/Nuevo)
- Fecha de creación (si es existente)
- Progreso: "X de Y sesiones"
- Warning si tiene sesiones reservadas
- Subtotal del paquete

### 3. **Selector de Paquetes Mejorado**

```tsx
<Select>
  <option value="">❌ No, crear nuevo paquete</option>
  <optgroup label="Paquetes Disponibles">
    <option value="order-1">
      📦 Paquete 1: Sesión 2 de 3 - Creado 01/12/2025
    </option>
    <option value="order-2" disabled>
      📦 Paquete 2: Sesión 3 de 3 - Creado 15/11/2025 ⚠️ (Tiene reservas)
    </option>
  </optgroup>
</Select>
```

### 4. **Warnings y Alertas**

```tsx
// Si hay sesiones pendientes
<Alert type="warning">
  ⚠️ Este paquete tiene 1 sesión reservada pendiente en otra cita
</Alert>

// Si todos los paquetes están completos
<Alert type="info">
  ℹ️ Todos los paquetes de "Hollywood Peel x3" están completos.
  Se creará un nuevo paquete automáticamente.
</Alert>

// Si se crean múltiples paquetes nuevos
<Alert type="success">
  ✅ Se crearán 2 paquetes nuevos de "Hollywood Peel x3"
</Alert>
```

---

## 🔧 Validaciones Requeridas

### Validación 1: Servicios de 1 sesión
```typescript
if (service.defaultSessions === 1) {
  // NO mostrar selector de paquetes
  // SIEMPRE crear nuevo paquete
}
```

### Validación 2: Paquetes completos
```typescript
const isPackageComplete = (order, allSessions) => {
  const nonCancelledSessions = order.appointmentServices
    .filter(as => as.appointment.status !== 'cancelled').length;

  const newSessionsForThisOrder = allSessions
    .filter(s => s.orderId === order.id).length;

  return (nonCancelledSessions + newSessionsForThisOrder) >= order.totalSessions;
};
```

### Validación 3: Sesiones canceladas reutilizables
```typescript
const getAvailableSessionNumbers = (order) => {
  const allNumbers = Array.from({length: order.totalSessions}, (_, i) => i + 1);
  const occupiedNumbers = order.appointmentServices
    .filter(as => as.appointment.status !== 'cancelled')
    .map(as => as.sessionNumber);

  return allNumbers.filter(n => !occupiedNumbers.includes(n));
};
```

### Validación 4: TempPackageId único
```typescript
const generateTempPackageId = (serviceId, counter) => {
  return `temp-${serviceId}-${Date.now()}-${counter}`;
};
```

---

## 📊 Datos de Simulación Completos

### SessionInput Mejorado
```typescript
interface SessionInput {
  serviceId: string;
  orderId?: string;
  sessionNumber?: number;
  appointmentServiceId?: string;
  tempPackageId?: string;

  // Nuevos campos para simulación avanzada
  status?: 'new' | 'existing_pending' | 'existing_attended' | 'existing_cancelled';
  appointmentDate?: string;  // Para sesiones reservadas
}
```

### PackageGroup Mejorado
```typescript
interface PackageGroup {
  id: string;
  type: 'existing' | 'new';
  serviceId: string;
  serviceName: string;
  orderId?: string;
  totalSessions: number;
  sessions: SimulatedSession[];
  hasNewSessions: boolean;
  orderCreatedAt?: string;

  // Nuevos campos
  hasPendingReservations: boolean;  // Para warnings
  completedSessions: number;         // Progreso visual
  cancelledSessions: number;         // Info adicional
  isComplete: boolean;               // Si ya está lleno
}
```

---

## 🧪 Casos de Prueba

### Test 1: Servicio de 1 sesión no muestra selector
```typescript
test('HIFU single session should not show package selector', () => {
  const service = { id: '1', name: 'HIFU', defaultSessions: 1 };
  const orders = [];

  const result = shouldShowPackageSelector(service, orders);

  expect(result).toBe(false);
});
```

### Test 2: Paquetes completos no aparecen
```typescript
test('Complete packages should not appear in selector', () => {
  const service = { id: '1', name: 'Hollywood Peel', defaultSessions: 3 };
  const orders = [{
    id: 'order-1',
    totalSessions: 3,
    appointmentServices: [
      { sessionNumber: 1, appointment: { status: 'attended' } },
      { sessionNumber: 2, appointment: { status: 'attended' } },
      { sessionNumber: 3, appointment: { status: 'reserved' } },
    ]
  }];

  const available = getAvailablePackages(service, orders, []);

  expect(available).toHaveLength(0);
});
```

### Test 3: Múltiples paquetes nuevos se separan
```typescript
test('Multiple new packages should create separate groups', () => {
  const sessions = [
    { serviceId: 's1', tempPackageId: 'temp-s1-0' },
    { serviceId: 's1', tempPackageId: 'temp-s1-0' },
    { serviceId: 's1', tempPackageId: 'temp-s1-1' },
    { serviceId: 's1', tempPackageId: 'temp-s1-1' },
  ];

  const groups = packageSimulator.simulatePackages(sessions, services, orders, false);

  expect(groups).toHaveLength(2);
  expect(groups[0].sessions).toHaveLength(2);
  expect(groups[1].sessions).toHaveLength(2);
});
```

---

## 🚀 Implementación Priorizada

### Fase 1: Crítico (Ya implementado)
- ✅ TempPackageId para distinguir paquetes nuevos
- ✅ Simulación básica con Strategy + Factory patterns

### Fase 2: Alta Prioridad (Implementar ahora)
- 🔴 Validación de servicios de 1 sesión
- 🔴 Filtro de paquetes completos
- 🔴 UI mejorada con badges y estados
- 🔴 Warnings para sesiones pendientes

### Fase 3: Media Prioridad
- 🟡 Sesiones canceladas reutilizables
- 🟡 Información de progreso visual
- 🟡 Subtotales por paquete

### Fase 4: Mejoras Futuras
- 🟢 Drag & drop para reorganizar sesiones
- 🟢 Vista de línea de tiempo
- 🟢 Conflictos de horario

---

**Última actualización:** 2025-12-04
**Autor:** Claude Code - Análisis exhaustivo de escenarios
