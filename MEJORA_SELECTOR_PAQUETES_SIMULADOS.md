# ✅ Mejora: Selector de Paquetes Simulados

**Fecha:** 2025-12-04
**Estado:** Completado

---

## 🎯 Problema Resuelto

### Escenario Original:
```
given
paquete 1 existente:
 - sesion 1 existente
 - sesion 2 simulada
 - sesion 3 simulada
paquete 2 simulado:
 - sesion 1 simulado

when
selecciono hollywood peel x3 (paquete de 3 sesiones)

then
❌ ANTES: Solo podía crear un NUEVO paquete o asignar a paquete existente de BD
✅ AHORA: Puedo asignar a "paquete 2 simulado" (paquete temporal)
```

### Issue:
El selector "¿Asociar a un paquete?" solo mostraba:
- Paquetes EXISTENTES (guardados en base de datos)
- Opción "No, crear nuevo paquete"

**Faltaba:** Mostrar paquetes SIMULADOS (temporales) que se están creando en la sesión actual del formulario.

---

## 📝 Solución Implementada

### 1. Identificar Paquetes Simulados

Se agregó lógica para agrupar sesiones temporales por `tempPackageId`:

```typescript
// 2. Identificar paquetes SIMULADOS (temporales) en allSessions
const simulatedPackages = allSessions
  .filter(s => s.tempPackageId && s.serviceId === selectedSessionServiceId)
  .reduce((acc, session) => {
    const key = session.tempPackageId!;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(session);
    return acc;
  }, {} as Record<string, typeof allSessions>);

const availableSimulatedPackages = Object.entries(simulatedPackages).map(([tempPackageId, sessions]) => {
  const nextSession = sessions.length + 1;
  const isComplete = nextSession > selectedService.defaultSessions;
  return {
    type: 'simulated' as const,
    tempPackageId,
    sessions,
    nextSession,
    totalSessions: selectedService.defaultSessions,
    isComplete
  };
}).filter(item => !item.isComplete);
```

### 2. Combinar Paquetes en el Selector

Se unificaron paquetes existentes y simulados:

```typescript
// 3. Combinar ambos tipos de paquetes
const allAvailablePackages = [
  ...availableOrders,        // Paquetes de BD
  ...availableSimulatedPackages  // Paquetes temporales
];
```

### 3. Actualizar Opciones del Selector

Se diferencian visualmente con emojis:

```typescript
options={[
  { value: '', label: 'No, crear nuevo paquete' },
  ...allAvailablePackages.map((item, idx) => {
    if (item.type === 'existing') {
      // Paquete EXISTENTE (de base de datos)
      return {
        value: item.order.id,
        label: `📦 Paquete ${idx + 1}: Sesión ${item.nextSession} de ${item.order.totalSessions}...`,
        disabled: item.hasPending
      };
    } else {
      // Paquete SIMULADO (temporal)
      return {
        value: item.tempPackageId,
        label: `🆕 Paquete Simulado ${idx + 1}: Sesión ${item.nextSession} de ${item.totalSessions}`,
        disabled: false
      };
    }
  })
]}
```

### 4. Modificar `handleAddSession`

Se agregó lógica para detectar si el valor seleccionado es un `tempPackageId`:

```typescript
const handleAddSession = () => {
  if (!selectedSessionServiceId) return;

  let sessionNumber: number | undefined = undefined;
  let tempPackageId: string | undefined = undefined;
  let orderId: string | undefined = undefined;

  if (selectedSessionOrderId) {
    // Verificar si es un paquete EXISTENTE (de BD) o SIMULADO (tempPackageId)
    const isSimulatedPackage = selectedSessionOrderId.startsWith('temp-');

    if (isSimulatedPackage) {
      // Asignar a paquete SIMULADO existente
      tempPackageId = selectedSessionOrderId;
      // La simulación calculará el sessionNumber automáticamente
    } else {
      // Asignar a paquete EXISTENTE (de BD)
      orderId = selectedSessionOrderId;
      // ... calcular sessionNumber ...
    }
  } else {
    // No se seleccionó ningún paquete → crear NUEVO paquete
    tempPackageId = `temp-${selectedSessionServiceId}-${tempPackageCounter}`;
    setTempPackageCounter(prev => prev + 1);
  }

  const newSession = {
    serviceId: selectedSessionServiceId,
    orderId,
    sessionNumber,
    tempPackageId
  };

  setAllSessions(prev => [...prev, newSession]);
  // ...
};
```

---

## 📦 Archivos Modificados

### `/Users/alangeronimo/dermicapro/frontend/src/pages/AppointmentFormPage.tsx`

#### Cambios en Líneas 759-830:
**Antes:**
```typescript
const availableOrders = patientOrders
  .filter(order => order.serviceId === selectedSessionServiceId)
  .map(order => { /* ... */ })
  .filter(item => !item.isComplete);
```

**Después:**
```typescript
// 1. Filtrar paquetes EXISTENTES disponibles (no completos)
const availableOrders = patientOrders
  .filter(order => order.serviceId === selectedSessionServiceId)
  .map(order => ({
    type: 'existing' as const,
    order,
    nextSession,
    hasPending,
    isComplete
  }))
  .filter(item => !item.isComplete);

// 2. Identificar paquetes SIMULADOS (temporales) en allSessions
const simulatedPackages = allSessions
  .filter(s => s.tempPackageId && s.serviceId === selectedSessionServiceId)
  .reduce((acc, session) => { /* ... */ }, {});

const availableSimulatedPackages = Object.entries(simulatedPackages)
  .map(([tempPackageId, sessions]) => ({
    type: 'simulated' as const,
    tempPackageId,
    sessions,
    nextSession: sessions.length + 1,
    totalSessions: selectedService.defaultSessions,
    isComplete: sessions.length + 1 > selectedService.defaultSessions
  }))
  .filter(item => !item.isComplete);

// 3. Combinar ambos tipos de paquetes
const allAvailablePackages = [
  ...availableOrders,
  ...availableSimulatedPackages
];
```

#### Cambios en Líneas 253-311:
**Antes:**
```typescript
if (selectedSessionOrderId) {
  const selectedOrder = patientOrders.find(o => o.id === selectedSessionOrderId);
  // ... solo lógica para paquetes de BD ...
}
```

**Después:**
```typescript
if (selectedSessionOrderId) {
  const isSimulatedPackage = selectedSessionOrderId.startsWith('temp-');

  if (isSimulatedPackage) {
    // Asignar a paquete SIMULADO existente
    tempPackageId = selectedSessionOrderId;
  } else {
    // Asignar a paquete EXISTENTE (de BD)
    orderId = selectedSessionOrderId;
    // ... calcular sessionNumber ...
  }
}
```

---

## 🎨 Mejoras de UI

### Selector de Paquetes

**Opciones Visibles:**
```
┌─────────────────────────────────────────────────────────┐
│ ¿Asociar a un paquete? (opcional)                       │
├─────────────────────────────────────────────────────────┤
│ ○ No, crear nuevo paquete                               │
│ ○ 📦 Paquete 1: Sesión 2 de 3 - Creado 01/12/2025      │
│ ○ 🆕 Paquete Simulado 2: Sesión 2 de 3                  │
└─────────────────────────────────────────────────────────┘
```

### Badges:
- **📦 Paquete Existente**: Paquetes guardados en BD
- **🆕 Paquete Simulado**: Paquetes temporales (aún no guardados)

---

## ✅ Flujo Completo

### Ejemplo: Agregar 2 sesiones al mismo paquete simulado

1. **Usuario selecciona servicio:** "Hollywood Peel x3"
2. **Usuario hace clic en "Agregar"** sin seleccionar paquete
   - Se crea `temp-hollywood-peel-0` con sesión 1
3. **Usuario selecciona de nuevo:** "Hollywood Peel x3"
4. **Ahora aparece en selector:**
   ```
   🆕 Paquete Simulado 1: Sesión 2 de 3
   ```
5. **Usuario selecciona el paquete simulado** y hace clic en "Agregar"
   - Se agrega sesión 2 a `temp-hollywood-peel-0`
6. **Simulación muestra:**
   ```
   🆕 Paquete Nuevo  2 de 3
     Sesión 1
     Sesión 2 [Por Agregar]
   ```

---

## 🧪 Testing Manual

### Test 1: Crear y Asignar a Paquete Simulado
1. Crear cita
2. Agregar "Hollywood Peel x3" → Sesión 1 (paquete nuevo)
3. Agregar "Hollywood Peel x3" de nuevo
4. ✅ Verificar: Aparece opción "🆕 Paquete Simulado 1"
5. Seleccionar paquete simulado
6. ✅ Verificar: Sesión 2 se asigna al mismo paquete

### Test 2: Múltiples Paquetes Simulados
1. Crear cita
2. Agregar 2 sesiones de "Hollywood Peel x3" sin asociar
3. ✅ Verificar: Se crea "Paquete Simulado 1" con 2 sesiones
4. Agregar 1 sesión más sin asociar
5. ✅ Verificar: Se crea "Paquete Simulado 2" separado

### Test 3: Combinación Existente + Simulado
1. Paciente tiene paquete existente con 1 sesión de 3
2. Crear cita y agregar sesión del mismo servicio
3. ✅ Verificar: Selector muestra:
   - 📦 Paquete 1 (existente)
   - Opción crear nuevo
4. Crear nuevo paquete simulado
5. Agregar otra sesión
6. ✅ Verificar: Selector ahora muestra:
   - 📦 Paquete 1 (existente)
   - 🆕 Paquete Simulado 2

---

## 📊 Casos de Uso Cubiertos

| Escenario | Antes | Después |
|-----------|-------|---------|
| Paquete existente incompleto | ✅ Se puede asignar | ✅ Se puede asignar |
| Paquete simulado incompleto | ❌ No aparecía | ✅ Aparece en selector |
| Crear nuevo paquete | ✅ Funcional | ✅ Funcional |
| Múltiples paquetes simulados del mismo servicio | ❌ Confuso | ✅ Aparecen separados |
| Diferenciar existente vs simulado | ❌ N/A | ✅ Emojis 📦/🆕 |

---

## 🔧 Validaciones Implementadas

### 1. Filtrado de Paquetes Completos
```typescript
const isComplete = nextSession > totalSessions;
// Paquetes completos NO aparecen en selector
```

### 2. Detección de Tipo de Paquete
```typescript
const isSimulatedPackage = selectedSessionOrderId.startsWith('temp-');
// Identifica si es BD o temporal
```

### 3. Agrupación Correcta
```typescript
// Sesiones con mismo tempPackageId se agrupan juntas
const simulatedPackages = allSessions.reduce((acc, session) => {
  const key = session.tempPackageId!;
  if (!acc[key]) acc[key] = [];
  acc[key].push(session);
  return acc;
}, {});
```

---

## 📈 Impacto en UX

### Antes:
- ❌ Para agregar varias sesiones a un paquete temporal, el usuario tenía que crearlas todas sin asociar
- ❌ No había forma de "continuar" agregando sesiones a un paquete simulado
- ❌ Flujo confuso cuando se querían múltiples paquetes del mismo servicio

### Después:
- ✅ Usuario puede crear paquete simulado e ir agregándole sesiones
- ✅ Selector muestra claramente qué paquetes están disponibles
- ✅ Diferenciación visual entre paquetes guardados (📦) y temporales (🆕)
- ✅ Flujo natural para construir paquetes sesión por sesión

---

## 🎯 Próximos Pasos (Opcional)

### Mejoras Adicionales:
- 🟢 Permitir editar número de sesiones de un paquete simulado
- 🟢 Vista previa visual más detallada de paquetes simulados
- 🟢 Advertencia si se intenta crear un paquete cuando ya hay uno incompleto

---

**✅ Estado Final:** El selector de paquetes ahora soporta completamente paquetes simulados (temporales), permitiendo un flujo más natural para construir paquetes sesión por sesión.
