# 🎨 Sistema de Iconos para Servicios

**Fecha:** 2025-12-04
**Estado:** Implementado

---

## 🎯 Objetivo

Agregar iconos visuales a las sesiones en la simulación de paquetes para que los usuarios puedan identificar rápidamente el tipo de servicio mediante iconografía intuitiva.

---

## 📦 Archivos Creados/Modificados

### 1. `/frontend/src/utils/serviceIcons.tsx` (NUEVO)
Sistema de mapeo de servicios a iconos SVG basado en palabras clave en el nombre del servicio.

### 2. `/frontend/src/components/PackageGroupView.tsx` (MODIFICADO)
- Agregado import de `ServiceIcon`
- Actualizado componente `SessionItem` para mostrar icono
- Icono se muestra en un contenedor circular con fondo de color

---

## 🔍 Sistema de Detección de Iconos

El sistema usa **detección por palabras clave** en el nombre del servicio (case-insensitive):

### Mapa de Iconos:

| Categoría | Palabras Clave | Icono | Descripción |
|-----------|---------------|-------|-------------|
| **Láser / Depilación** | `láser`, `laser`, `depilación`, `depilacion` | ☀️ Sol con rayos | Representación de energía luminosa |
| **HIFU / Ultrasonido** | `hifu`, `ultrasonido` | 🎵 Ondas de sonido | Representación de ondas ultrasónicas |
| **Peeling / Ácidos** | `peel`, `peeling`, `ácido`, `acido`, `hollywood` | 💧 Gota | Representación de líquidos/ácidos |
| **Radiofrecuencia** | `radiofrecuencia`, `rf ` | 📡 Ondas de radio | Ondas de energía electromagnética |
| **Botox / Toxina** | `botox`, `toxina` | ⊕ Cruz médica | Representación de inyección precisa |
| **Rellenos / Fillers** | `relleno`, `hialurónico`, `hialuronico`, `filler` | ⬆️ Flechas hacia arriba | Representación de volumen/elevación |
| **Limpieza Facial** | `limpieza`, `hidrafacial`, `facial` | 😊 Cara sonriente | Representación de rostro/cuidado facial |
| **Mesoterapia / Vitaminas** | `mesoterapia`, `vitamina`, `cocktail` | 💉 Inyección | Representación de microinyecciones |
| **Plasma / PRP** | `plasma`, `prp`, `plaquetas` | 📈 Gráfica ascendente | Representación de regeneración |
| **Microagujas** | `microaguja`, `microneedling`, `dermapen` | ⊞ Cuadrícula | Representación de múltiples puntos |
| **Consulta** | `consulta`, `evaluación`, `evaluacion` | 📄 Documento | Representación de evaluación clínica |
| **Criolipólisis** | `criolipólisis`, `criolipolisis`, `coolsculpting`, `cool` | ❄️ Cristales de hielo | Representación de frío |
| **Masaje / Drenaje** | `masaje`, `drenaje` | 📊 Barras | Representación de movimiento manual |
| **Default** | (cualquier otro) | ⭐ Estrella | Servicio general |

---

## 🎨 Diseño Visual

### Contenedor del Icono:
```tsx
<div style={{
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  background: isNewSession ? '#dcfce7' : '#f3f4f6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}}>
  <ServiceIcon
    serviceName={serviceName}
    size={20}
    color={isNewSession ? '#166534' : '#6b7280'}
  />
</div>
```

### Colores:
- **Sesión Nueva (Por Agregar):**
  - Fondo: `#dcfce7` (verde claro)
  - Icono: `#166534` (verde oscuro)

- **Sesión Existente:**
  - Fondo: `#f3f4f6` (gris claro)
  - Icono: `#6b7280` (gris medio)

---

## 📐 Estructura del Código

### `serviceIcons.tsx`:

```typescript
export interface ServiceIconProps {
  serviceName: string;
  size?: number;
  color?: string;
}

export const getServiceIcon = (
  serviceName: string,
  size: number = 20,
  color: string = 'currentColor'
): JSX.Element => {
  const lowerName = serviceName.toLowerCase();

  // Detección por palabras clave
  if (lowerName.includes('láser') || lowerName.includes('laser')) {
    return <svg>...</svg>;
  }

  // ... más categorías ...

  // Default icon
  return <svg>⭐</svg>;
};

export const ServiceIcon: React.FC<ServiceIconProps> = ({
  serviceName,
  size = 20,
  color = 'currentColor'
}) => {
  return getServiceIcon(serviceName, size, color);
};
```

---

## 🧪 Ejemplos de Uso

### Ejemplo 1: Hollywood Peel x3
```
Nombre del servicio: "Hollywood Peel x3"
Palabra clave detectada: "peel"
Icono mostrado: 💧 (Gota)
Color: Verde si es nueva sesión, gris si es existente
```

### Ejemplo 2: HIFU Facial
```
Nombre del servicio: "HIFU Facial"
Palabra clave detectada: "hifu"
Icono mostrado: 🎵 (Ondas de sonido)
Color: Verde si es nueva sesión, gris si es existente
```

### Ejemplo 3: Láser Diodo Axilas
```
Nombre del servicio: "Láser Diodo Axilas"
Palabra clave detectada: "láser"
Icono mostrado: ☀️ (Sol con rayos)
Color: Verde si es nueva sesión, gris si es existente
```

---

## 📊 Integración con PackageGroupView

### Antes:
```tsx
<div className="service-content">
  <h3>Sesión {session.calculatedSessionNumber}</h3>
  <span>...</span>
</div>
```

### Después:
```tsx
<div className="service-content" style={{ display: 'flex', gap: '12px' }}>
  {/* Icono del servicio */}
  <div style={{ width: '36px', height: '36px', ... }}>
    <ServiceIcon serviceName={serviceName} size={20} color={...} />
  </div>

  {/* Información de la sesión */}
  <div style={{ flex: 1 }}>
    <h3>Sesión {session.calculatedSessionNumber}</h3>
    <span>...</span>
  </div>
</div>
```

---

## ✅ Ventajas del Sistema

### 1. **Identificación Visual Rápida**
Los usuarios pueden identificar el tipo de servicio sin leer el nombre completo.

### 2. **Escalable**
Fácil agregar nuevos tipos de servicios editando el mapeo en `serviceIcons.tsx`.

### 3. **Consistente**
Mismo icono se usa en todos los lugares donde aparece el servicio.

### 4. **Performante**
SVG inline = sin requests HTTP adicionales.

### 5. **Personalizable**
Iconos responden a props de `size` y `color`, adaptándose al contexto.

---

## 🔧 Cómo Agregar Nuevos Iconos

### Paso 1: Identificar palabras clave
```
Servicio: "Microblading de cejas"
Palabras clave: ["microblading", "cejas"]
```

### Paso 2: Crear SVG icon
Buscar icono apropiado (ej: pluma de tatuaje) en biblioteca de iconos.

### Paso 3: Agregar a `serviceIcons.tsx`
```typescript
if (lowerName.includes('microblading') || lowerName.includes('cejas')) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="2">
      {/* SVG path del icono */}
    </svg>
  );
}
```

---

## 📈 Impacto en UX

### Antes:
- Usuario tenía que leer nombre completo del servicio
- Difícil distinguir servicios similares rápidamente
- Vista monótona sin diferenciación visual

### Después:
- ✅ Identificación visual inmediata del tipo de servicio
- ✅ Diferenciación rápida entre múltiples servicios
- ✅ Interfaz más atractiva y profesional
- ✅ Consistencia visual en toda la aplicación

---

## 🎯 Próximos Pasos (Opcional)

### Fase 2: Categorías de Servicios
- Agregar campo `category` al modelo `Service` en Prisma
- Usar categoría para mapeo más preciso de iconos
- Permitir asignación manual de icono por servicio

### Fase 3: Biblioteca de Iconos
- Crear componente `ServiceIconPicker` para admin
- Permitir personalización de iconos desde UI
- Guardar preferencia de icono en base de datos

### Fase 4: Iconos Animados
- Agregar animaciones sutiles en hover
- Efectos visuales para sesiones completadas
- Badges adicionales (nuevo, popular, promoción)

---

**✅ Estado Final:** Sistema de iconos funcionando correctamente, mejorando significativamente la identificación visual de servicios en la interfaz.
