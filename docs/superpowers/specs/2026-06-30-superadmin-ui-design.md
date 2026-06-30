# Superadmin UI — Panel de Gestión de Plataforma

**Fecha:** 2026-06-30
**Estado:** Aprobado

---

## Contexto

La plataforma multi-tenant DermicaPro tiene los endpoints de superadmin (`/platform/*`) implementados en el backend pero sin UI. Este spec define la interfaz para que el `platform_admin` gestione clínicas (tenants), vea métricas y controle el estado de migraciones, todo desde el navegador.

---

## Decisiones

- **Ubicación:** Rutas `/superadmin/*` en el mismo proyecto frontend (no app separada), con lazy loading
- **Auth:** `PlatformAuthContext` propio, independiente del `AuthContext` de clínicas
- **Visual:** Mismo design system que el ERP (mismos CSS tokens, componentes base)
- **Pantallas:** Login, Dashboard, Tenants (lista + crear), Detalle de tenant (con migraciones)
- **Creación de tenants:** Formulario en el panel (complementa el registro público `/register`)

---

## Arquitectura

### Archivos nuevos

```
frontend/src/
├── contexts/
│   └── PlatformAuthContext.tsx          ← token platform_admin, login/logout
├── pages/superadmin/
│   ├── SuperAdminLoginPage.tsx           ← login con email + password
│   ├── SuperAdminDashboardPage.tsx       ← métricas globales de la plataforma
│   ├── SuperAdminTenantsPage.tsx         ← tabla de clínicas + botón crear
│   └── SuperAdminTenantDetailPage.tsx    ← detalle + tabs: Info, Migraciones
├── components/superadmin/
│   ├── SuperAdminLayout.tsx              ← layout con sidebar propio
│   └── RequirePlatformAuth.tsx           ← guard: redirige a /superadmin/login si no autenticado
└── services/
    └── platformAdminApi.ts               ← funciones API usando token platform_admin
```

### Archivos modificados

- `frontend/src/App.tsx` — agrega bloque de rutas `/superadmin/*` con `React.lazy`
- `frontend/src/services/platformApi.ts` — reutilizado/extendido por `platformAdminApi.ts`

---

## PlatformAuthContext

```typescript
interface PlatformAuthContextType {
  platformAdmin: { id: string; email: string; firstName: string; lastName: string } | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}
```

- Token guardado en `localStorage` bajo la key `platform_admin_token` (distinta a `access_token` del ERP)
- `login()` llama a `POST /platform/auth/login`, guarda token y datos del admin
- `logout()` limpia localStorage y redirige a `/superadmin/login`

---

## Rutas

```
/superadmin/login              → SuperAdminLoginPage (pública)
/superadmin/dashboard          → SuperAdminDashboardPage (protegida)
/superadmin/tenants            → SuperAdminTenantsPage (protegida)
/superadmin/tenants/:slug      → SuperAdminTenantDetailPage (protegida)
/superadmin                    → redirect a /superadmin/dashboard
```

Guard `RequirePlatformAuth` envuelve todas las rutas protegidas.

---

## Pantallas

### SuperAdminLoginPage

- Formulario: email + password
- Llama a `POST /platform/auth/login`
- En éxito: redirige a `/superadmin/dashboard`
- En error: muestra mensaje inline

### SuperAdminDashboardPage

Métricas globales (leídas de `TenantMetrics` pre-calculadas):

| Tarjeta | Dato |
|---------|------|
| Clínicas activas | count de tenants con `isActive=true` |
| Total pacientes | suma de `totalPatients` de todos los tenants |
| Citas este mes | suma de `totalAppointmentsMonth` |
| Último acceso (plataforma) | fecha más reciente de `lastAccess` |

Tabla resumen de los tenants con columnas: Nombre, Slug, Estado, Pacientes, Citas/mes, Último acceso.

### SuperAdminTenantsPage

- Tabla de clínicas: Nombre, Slug, Estado (chip activo/inactivo), Email contacto, Fecha creación
- Acciones por fila: Ver detalle, Activar/Desactivar (toggle)
- Botón "Nueva clínica" → abre modal con formulario:
  - Nombre de la clínica (requerido)
  - Slug (requerido, solo `a-z0-9_`, auto-sugerido desde el nombre)
  - Email de contacto (opcional)
  - Email del admin inicial (requerido)
  - Contraseña temporal del admin (requerida)
- Al crear: llama `POST /platform/tenants` (que ejecuta `provisionTenant` en el backend)
- Loading state durante la provisión (puede tardar varios segundos mientras aplica 54 migraciones)

### SuperAdminTenantDetailPage

Dos tabs:

**Tab Información:**
- Datos del tenant: nombre, slug, estado, email, teléfono, fecha creación
- Botón activar/desactivar con confirmación
- Métricas de la clínica: pacientes, citas del mes, usuarios activos, último acceso

**Tab Migraciones:**
- Tabla: Nombre de migración, Estado (success/failed), Fecha aplicada, Error (si falló)
- Botón "Refrescar métricas" → `POST /platform/tenants/:slug/metrics/refresh`
- Si hay migraciones fallidas: botón "Re-aplicar" (llama al endpoint de re-apply si existe, o instrucción manual)

---

## platformAdminApi.ts

Funciones que envían `Authorization: Bearer <token>` usando el token de `PlatformAuthContext`:

```typescript
login(email, password)         → POST /platform/auth/login
listTenants()                  → GET /platform/tenants
getTenant(slug)                → GET /platform/tenants/:slug
createTenant(dto)              → POST /platform/tenants
activateTenant(slug)           → POST /platform/tenants/:slug/activate
deactivateTenant(slug)         → POST /platform/tenants/:slug/deactivate
getTenantMigrations(slug)      → GET /platform/tenants/:slug/migrations
getTenantMetrics(slug)         → GET /platform/tenants/:slug/metrics
refreshTenantMetrics(slug)     → POST /platform/tenants/:slug/metrics/refresh
```

Axios instance con `baseURL` apuntando a `/platform` (funciona via el proxy de Vite ya configurado).

---

## SuperAdminLayout

- Sidebar izquierdo con navegación: Dashboard, Clínicas
- Header con nombre del admin logueado y botón logout
- Contenido principal en el área derecha
- Mismo esquema de colores que el ERP (no dark mode distinto)

---

## Manejo de errores y estados

- Loading spinners en cada fetch
- Mensajes de error inline (no alertas del browser)
- Creación de tenant con feedback de progreso ("Aplicando migraciones…")
- 401 desde el backend → logout automático y redirect a `/superadmin/login`

---

## Lo que NO incluye este spec

- CRUD de platform_admins (agregar/eliminar superadmins)
- Eliminación de tenants (operación destructiva, queda fuera de scope)
- Impersonación de tenant (acceder como si fueras una clínica)
- Internacionalización
