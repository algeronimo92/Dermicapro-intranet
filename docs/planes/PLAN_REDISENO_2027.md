# Plan de rediseño y evolución de DermicaPro

**Fecha:** 2026-11-20 · **Estado:** borrador para revisión · **Rama base:** `qa`

Este plan reúne lo que encontré al revisar el repositorio y propone cómo
rediseñar la interfaz, sanear la base técnica, cerrar los problemas conocidos
y sumar funciones nuevas. Las fases están ordenadas para que cada una deje el
sistema en producción y funcionando; ninguna exige un "big bang".

Las secciones marcadas con **❓ Decisión** necesitan una respuesta antes de
arrancar esa fase.

---

## 1. Diagnóstico

### 1.1 Stack real (la documentación está desfasada)

`CLAUDE.md` y `README.md` hablan de React 18 y React Router v6, pero el
código ya usa:

| Capa | Versión actual |
|---|---|
| Frontend | React 19, React Router 7, Vite 8, TypeScript 6, Recharts 3, lucide-react |
| Backend | Express 5, Prisma 7 (adapter-pg), Zod 4, express-validator, Multer 2, sharp, S3 |
| Calidad | Jest 30 (unit), Cypress 15 (e2e), ESLint 9 |
| Infra | Docker Compose (dev, prod blue/green, db, observabilidad), Traefik, Prometheus/Grafana |

Dependencias instaladas sin uso real: `zustand` (0 imports). `@stripe/*`
aparece en un solo archivo: confirmar si el cobro en línea sigue en los planes.

### 1.2 Frontend

| Hallazgo | Medida | Impacto |
|---|---|---|
| Páginas y componentes gigantes | `StyleGuidePage` 3 536 líneas, `AppointmentDetailPage` 1 781, `AppointmentFormPage` 1 401, `Calendar` 1 144 | Difíciles de mantener y de probar |
| Estilos en línea | 1 623 usos de `style={{…}}` | El tema dark/light y los tokens no se aplican de forma pareja |
| CSS disperso | 32 archivos, ~18 900 líneas; `styles.css` solo tiene 5 084 | Reglas duplicadas, colisiones de nombres |
| Colores sin token | 522 hex escritos a mano, pese a existir `design-tokens.css` | Inconsistencia visual entre pantallas |
| Accesibilidad | Solo 13 archivos usan atributos `aria-*` | Modales y formularios poco navegables con teclado |
| Carga de datos | 20 páginas hacen `useEffect` + axios a mano, sin caché | Recargas innecesarias, estados de carga y error repetidos |
| Tipado | ~180 anotaciones `: any` entre front y back | Errores que TypeScript no detecta |
| Sesión | Access y refresh token en `localStorage` | Expuestos ante cualquier XSS |

### 1.3 Backend

- `appointments.controller.ts` tiene 1 355 líneas y concentra lógica de negocio
  (creación de `ServiceInstance`, sesiones, transiciones). Lo mismo, en menor
  grado, `commissions` (679) y `patients` (594). La capa `services/` existe pero
  se usa poco fuera de analytics, dashboard y órdenes de pago.
- Validación mezclada: `express-validator` en unas rutas y Zod en otras.
- Pruebas: 7 archivos unitarios en backend, 1 en frontend, 15 specs de Cypress.
  Los flujos de dinero (pagos, anulaciones, créditos, comisiones) casi no
  tienen cobertura unitaria.

### 1.4 Problemas conocidos todavía abiertos

1. **Doble reserva:** no hay validación de choques de horario.
2. **`sessionNumber` > `totalSessions`:** sin validación al crear; solo la
   métrica `dermicapro_sessions_over_package` lo detecta después.
3. **Permisos de servicios:** endpoints que deberían ser solo de admin aceptan
   a cualquier usuario autenticado.
4. **Estado de `PaymentOrder`:** su actualización tras cada pago podría ser
   más automática.
5. TODOs en código:
   - `OperationsAnalyticsStrategy.ts:122`: tiempo de espera fijo en 15 min.
   - `sales.strategy.ts:174`: meta mensual de ventas escrita en el código.
   - `AppointmentDetailPage.tsx:215`: falta navegar a las órdenes de pago.

### 1.5 Repositorio y ramas

- Ramas remotas con trabajo que no llegó a `qa` (verificar cada una):
  `feature/multi-tenant` (44 commits), `feature/login`, `feature/indices-db`,
  `feature/services-page-package-panel-ui`, `feat/photo-upload-ux`.
- Archivos sueltos en la raíz: `ex.json`, `project_structure.txt`,
  `start-docker.sh`, `verify-setup.sh` (los dos últimos duplican el Makefile).
- Muchos documentos antiguos usan nombres de modelos que ya no existen. Ya
  quedaron ordenados en `docs/`, pero su contenido no se actualizó.

---

## 2. Objetivos

1. Una interfaz coherente, rápida y usable en móvil (recepción y asistentes
   trabajan desde tablet o celular).
2. Cero errores de dinero: pagos, saldos, créditos y comisiones verificados
   por pruebas.
3. Cerrar los problemas conocidos antes de sumar funciones.
4. Funciones nuevas que ahorren tiempo a recepción y aumenten la recurrencia
   de pacientes.

---

## 3. Fases

Cada fase es un conjunto de ramas `feature/*` o `fix/*` desde `qa`, con PR
hacia `qa` y luego `qa` → `main` al cerrar la fase.

### Fase 0 — Higiene y decisiones (1 semana)

- [ ] Responder las decisiones de la sección 5.
- [ ] Actualizar `CLAUDE.md` y `README.md` al stack real.
- [ ] Revisar cada rama pendiente de la sección 1.5: integrar, rescatar partes
      o borrar.
- [ ] Quitar dependencias sin uso y los archivos sueltos de la raíz.
- [ ] Marcar los documentos de `docs/historial/` y `docs/planes/` antiguos
      como históricos (o borrarlos cuando estén cubiertos por este plan).

Ramas: `chore/actualizar-claude-md`, `chore/limpieza-dependencias`.

### Fase 1 — Correcciones críticas de negocio (1–2 semanas)

Antes del rediseño, porque afectan dinero y agenda.

- [ ] **Anti doble reserva:** validar en el backend que el profesional (y la
      cabina, si se adopta) no tenga otra cita solapada; aviso en el
      formulario antes de guardar. Índice en `(scheduledDate, …)` para que la
      consulta sea barata.
- [ ] **Límite de sesiones:** rechazar `sessionNumber > totalSessions` dentro
      de la transacción de creación/edición de cita.
- [ ] **Permisos:** pasar los endpoints de servicios y paquetes a
      `requirePermission`; retirar el `authorize` obsoleto de todas las rutas.
- [ ] **Estado de `PaymentOrder`:** recalcular `pending/partial/paid` en un
      único servicio, invocado al crear, anular o eliminar un pago.
- [ ] Meta mensual por vendedor configurable (`SystemSetting` o campo en
      `User`).
- [ ] Pruebas unitarias para cada punto anterior.

Ramas: `fix/doble-reserva`, `fix/limite-sesiones-paquete`,
`fix/permisos-servicios`, `feat/estado-orden-pago-automatico`,
`feat/meta-ventas-configurable`.

### Fase 2 — Base técnica (2–3 semanas, en paralelo con el inicio de la Fase 3)

Frontend:

- [ ] **Capa de datos:** adoptar TanStack Query para caché, reintentos e
      invalidación; migrar página por página empezando por Citas y Pacientes.
- [ ] **Formularios:** React Hook Form + Zod; compartir los esquemas Zod con
      el backend en un paquete `shared/` para que la validación sea la misma
      en ambos lados.
- [ ] **Sesión segura:** refresh token en cookie `httpOnly` + `SameSite`;
      access token solo en memoria.
- [ ] Tipos generados a partir de los esquemas compartidos; eliminar `any`.

Backend:

- [ ] Extraer la lógica de `appointments`, `commissions` y `patients` a
      servicios con pruebas; los controllers solo validan y responden.
- [ ] Unificar validación en Zod (retirar `express-validator`).
- [ ] Formato de error único (`AppError` → `{ error: { code, message, details } }`).

Calidad:

- [ ] Cobertura mínima del 70 % en `services/` de pagos, órdenes, créditos y
      comisiones; el CI falla si baja.
- [ ] Cypress: un flujo e2e completo "paciente nuevo → cita → atención →
      pago → comisión".

Ramas: `refactor/tanstack-query`, `refactor/formularios-zod`,
`feat/refresh-token-cookie`, `refactor/servicio-citas`,
`refactor/validacion-zod`, `test/flujo-dinero`.

### Fase 3 — Rediseño de la interfaz (4–6 semanas, incremental)

**3.1 Sistema de diseño**

- [ ] Auditar `design-tokens.css` y definir la paleta, tipografía, espaciado,
      radios y sombras finales para modo claro y oscuro.
- [ ] Construir una librería de componentes base en `frontend/src/ui/`:
      Button, Input, Select, Combobox, DatePicker, Modal/Drawer, Tabs, Table
      con paginación, Badge de estado, Toast, Skeleton, EmptyState,
      Card/StatTile.
- [ ] Reemplazar `StyleGuidePage` (3 536 líneas) por un catálogo vivo de esos
      componentes (o Storybook, ver decisiones).
- [ ] Regla de lint que prohíba `style={{…}}` y colores hex fuera de los
      tokens en código nuevo.

**3.2 Estructura de navegación**

- [ ] Shell nuevo: sidebar colapsable en escritorio, barra inferior en móvil,
      buscador global (paciente por nombre/DNI/teléfono) con atajo de teclado.
- [ ] Rutas agrupadas por módulo y cargadas con `lazy()`.

**3.3 Pantallas, en orden de uso**

| # | Pantalla | Cambio principal |
|---|---|---|
| 1 | Agenda / Citas | Vista día/semana por profesional y cabina, arrastrar para reprogramar, aviso de choques |
| 2 | Formulario de cita | Asistente en pasos (paciente → servicios/paquete → horario → adelanto), dividido en componentes |
| 3 | Detalle de cita | Una sola barra de acciones según el estado; separar en pestañas (resumen, sesiones, pagos, notas, fotos) |
| 4 | Paciente | Ficha con línea de tiempo (citas, pagos, fotos, mediciones) y saldo visible |
| 5 | Pagos y órdenes | Flujo de cobro en un drawer; recibo imprimible |
| 6 | Dashboards por rol | Tarjetas KPI consistentes y gráficos con la misma paleta |
| 7 | Servicios, empleados, comisiones, ajustes | Tablas y formularios con los componentes base |
| 8 | Portal del paciente | Mismo sistema de diseño, enfoque móvil |

Cada pantalla se entrega en su propia rama `feat/rediseno-<pantalla>`, sin
dejar páginas a medio migrar en `qa`.

**3.4 Accesibilidad y rendimiento**

- [ ] Navegación completa por teclado en modales y formularios; foco visible.
- [ ] Contraste AA en ambos temas.
- [ ] Presupuesto: carga inicial < 250 KB gzip; Lighthouse ≥ 90 en móvil.

### Fase 4 — Funciones nuevas (priorizar con la clínica)

Propuestas ordenadas por impacto estimado; validar cuáles se hacen.

| Prioridad | Función | Descripción |
|---|---|---|
| Alta | Recordatorios de citas | WhatsApp o correo 24 h antes, con confirmar/cancelar; reduce inasistencias (`no_show`) |
| Alta | Cierre de caja diario | Resumen por método de pago (efectivo, Yape, Plin, tarjeta) y cuadre por usuario |
| Alta | Agenda por cabina/equipo | Evitar que dos citas usen el mismo equipo (HIFU, láser) a la vez |
| Media | Consentimiento informado digital | Plantilla por servicio, firma en tablet, PDF guardado en el historial |
| Media | Comparador antes/después | Fotos lado a lado por zona y fecha, para seguimiento y para mostrar al paciente |
| Media | Seguimiento de tratamientos | Avisar a recepción cuando un paciente tiene sesiones pendientes y no ha reservado |
| Media | Reportes exportables | Ventas, cobranzas y comisiones a Excel/PDF (ExcelJS ya está instalado) |
| Media | Auditoría | Registro de quién anuló, editó o eliminó pagos, órdenes y citas |
| Baja | Inventario de insumos | Stock por producto y consumo por sesión |
| Baja | Portal del paciente ampliado | Reservar y pagar en línea (decidir si se usa Stripe u otra pasarela local) |
| Baja | Multi-sede / multi-tenant | Retomar `feature/multi-tenant` solo si hay una segunda clínica en el horizonte |

---

## 4. Cronograma tentativo

```
Semana   1   2   3   4   5   6   7   8   9  10  11  12  13+
Fase 0  ███
Fase 1      ███████
Fase 2          ███████████
Fase 3              ████████████████████████
Fase 4                                  ████████████████ →
```

---

## 5. ❓ Decisiones pendientes

1. **Estilos del rediseño:** ¿seguir con CSS propio + tokens (más trabajo,
   cero dependencias) o adoptar Tailwind v4 + componentes Radix/shadcn en el
   repo (migración más rápida, tema dark/light resuelto)?
   *Recomendación:* Tailwind + Radix, por la cantidad de estilos en línea y
   CSS duplicado que hay que reescribir de todos modos.
2. **Catálogo de componentes:** página interna (como hoy) o Storybook.
3. **Canal de recordatorios:** WhatsApp Business API (costo por mensaje),
   correo, o ambos.
4. **Ramas pendientes:** qué hacer con `feature/multi-tenant` y
   `feature/login`.
5. **Pasarela de pago en línea:** Stripe, Culqi/Niubiz/Izipay, o no por ahora.
6. **Prioridad de la Fase 4:** qué tres funciones van primero.

---

## 6. Convenciones de trabajo

- **Gitflow:** `main` = producción, `qa` = integración. Ramas desde `qa`:
  `feature/*` o `feat/*`, `fix/*`, `refactor/*`, `chore/*`, `docs/*`, `test/*`;
  `hotfix/*` desde `main` cuando algo urge en producción.
- **Conventional Commits** en español:
  `feat(citas): validar choques de horario`,
  `fix(pagos): recalcular estado de la orden al anular`,
  `refactor(frontend): migrar pacientes a TanStack Query`.
- Un PR por rama, con CI verde y descripción de qué se probó.
- Cada fase termina con PR `qa` → `main` y una nota de cambios.
