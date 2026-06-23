# Multi-Tenant SaaS Design -- Schema por Empresa

**Fecha:** 2026-06-23
**Enfoque:** Schema de PostgreSQL por tenant + Prisma dinamico
**Estado:** Aprobado

---

## Contexto

DermicaPro es actualmente un sistema single-tenant para una clinica de dermatologia. Se busca convertirlo en una plataforma SaaS donde multiples clinicas se suscriban y operen de forma independiente. DermicaPro pasa a ser la primera clinica (tenant) de la plataforma.

### Decisiones Tomadas

- **Estrategia de aislamiento:** Schema de PostgreSQL por tenant (Enfoque A)
- **Onboarding:** Manual via panel de superadmin
- **Planes/suscripciones:** Sin logica de planes por ahora, cobro manual
- **Identificacion de tenant:** Subdominio (`clinica.plataforma.com`)
- **Catalogo de servicios:** Independiente por clinica, aislamiento total
- **Panel de superadmin:** Gestion de clinicas + metricas basicas
- **Datos existentes:** Hay datos reales que deben migrarse al primer tenant

---

## Seccion 1: Arquitectura de Schemas

La plataforma SaaS es el producto (con su propia marca). DermicaPro es el primer tenant.

### Schema `public` (plataforma)

| Tabla | Proposito |
|-------|-----------|
| `Tenant` | Clinicas registradas (nombre, slug, subdominio, estado, logo, contacto, createdAt) |
| `PlatformAdmin` | Superadmins de la plataforma |
| `TenantMetrics` | Metricas agregadas por clinica (pacientes, citas, ultimo acceso) |
| `TenantMigration` | Control de migraciones aplicadas por tenant |

### Schemas de tenant (`tenant_<slug>`)

Cada clinica tiene su propio schema con las 14 tablas actuales:

- Role, User, Patient, ServiceTemplate, ServiceInstance, Appointment, AppointmentAttendee, AppointmentNote, PatientRecord, Commission, Session, PaymentOrder, Payment, SystemSetting

### Ejemplo

```
public                → PlatformAdmin, Tenant, TenantMetrics, TenantMigration
tenant_dermicapro     → Datos actuales de DermicaPro (primer tenant, migrados)
tenant_clinica_bella  → Segunda clinica que se suscribe
tenant_skin_center    → Tercera clinica
```

### Flujo de acceso

```
dermicapro.plataforma.com    → public.Tenant(slug=dermicapro)    → SET search_path = tenant_dermicapro
clinicabella.plataforma.com  → public.Tenant(slug=clinica_bella) → SET search_path = tenant_clinica_bella
admin.plataforma.com         → Panel de superadmin (schema public)
```

---

## Seccion 2: Tenant Resolution y Middleware

### Middleware `tenantResolver`

Se ejecuta en cada request antes de llegar a los controllers:

```
1. Extraer subdominio del Host header
   dermicapro.plataforma.com → slug = "dermicapro"

2. Buscar en public.Tenant WHERE slug = slug AND isActive = true

3. Si no existe o esta inactivo → 404 "Clinica no encontrada"

4. Obtener/crear PrismaClient con search_path = tenant_<slug>

5. Inyectar en req.tenantPrisma y req.tenant
```

### Rutas excluidas del middleware

- `admin.plataforma.com/*` -- panel de superadmin, usa schema public directamente
- Healthcheck, assets estaticos

### Manejo de conexiones

- Cache de PrismaClient por tenant en memoria (`Map<slug, PrismaClient>`)
- Cada client se configura con `SET search_path TO tenant_<slug>`
- TTL para liberar clientes de tenants inactivos
- Limite maximo de clientes simultaneos en cache

### Impacto en el codigo actual

- Todos los controllers pasan de usar `prisma` (global) a usar `req.tenantPrisma`
- Los services reciben el prisma client como parametro en vez de importarlo directamente
- El auth middleware se ejecuta despues del tenant resolver (primero sabes que clinica, despues validas el usuario)

---

## Seccion 3: Autenticacion y JWT

### Flujo de login

```
1. Usuario entra a dermicapro.plataforma.com/login
2. Tenant resolver identifica slug = "dermicapro"
3. Login busca User en tenant_dermicapro (no en public)
4. JWT se genera con tenantSlug incluido
```

### Payload del JWT

```typescript
// Staff token
{
  id: "user-uuid",
  email: "admin@dermicapro.com",
  roleId: "role-uuid",
  roleName: "admin",
  tenantSlug: "dermicapro"
}

// Patient token
{
  id: "patient-uuid",
  email: "paciente@gmail.com",
  type: "patient",
  tenantSlug: "dermicapro"
}
```

### Validacion de seguridad

- El `tenantSlug` del JWT debe coincidir con el subdominio del request
- Si alguien usa un token de `dermicapro.plataforma.com` en `clinicabella.plataforma.com`, se rechaza con 403
- Previene data leaks incluso si un token se filtra

### PlatformAdmin (superadmin)

- Flujo de login propio en `admin.plataforma.com`
- Token distinto: `{ id, email, role: "platform_admin" }` -- sin tenantSlug
- Solo accede al schema public, nunca directamente a schemas de tenant

### Unicidad de email

- La unicidad pasa a ser por schema (cada schema tiene su propia constraint)
- El mismo email puede existir en dos clinicas distintas -- son usuarios diferentes

---

## Seccion 4: Gestion de Schemas y Migraciones

### Creacion de un nuevo tenant

```
1. PlatformAdmin crea clinica: nombre="Clinica Bella", slug="clinica_bella"
2. Sistema inserta registro en public.Tenant
3. Se ejecuta CREATE SCHEMA tenant_clinica_bella
4. Se aplican todas las migraciones de Prisma sobre ese schema
5. Se crea el User admin inicial de la clinica con password temporal
6. Tenant queda activo y accesible via clinicabella.plataforma.com
```

### Migraciones a todos los tenants

Prisma genera las migraciones contra un schema de referencia. Para aplicarlas a todos los tenants:

```
1. Obtener lista de tenants activos de public.Tenant
2. Para cada tenant:
   - SET search_path TO tenant_<slug>
   - Aplicar migracion pendiente (SQL raw, no prisma migrate)
3. Registrar resultado (exito/fallo por tenant) en TenantMigration
4. Si un tenant falla, continuar con los demas y reportar
```

### Tabla TenantMigration (en public)

| Campo | Tipo |
|-------|------|
| id | UUID |
| tenantId | FK a Tenant |
| migrationName | String |
| appliedAt | DateTime |
| status | success / failed |
| error | String (nullable) |

### Desactivacion/eliminacion

- **Desactivar:** `Tenant.isActive = false` -- middleware rechaza requests, schema persiste
- **Eliminar:** `DROP SCHEMA tenant_<slug> CASCADE` -- solo superadmin, confirmacion doble, backup previo

### Seed por tenant

- Al crear un tenant se aplica seed base: roles por defecto (admin, medical_staff, assistant, sales)
- Catalogo de servicios queda vacio -- la clinica lo configura

---

## Seccion 5: Panel de Superadmin y Metricas

### Acceso

`admin.plataforma.com` -- completamente separado del frontend de las clinicas.

### Funcionalidades

| Modulo | Descripcion |
|--------|-------------|
| Gestion de Tenants | Crear, editar, activar/desactivar clinicas. Ver detalle |
| Metricas agregadas | Dashboard con vision general de toda la plataforma |
| Migraciones | Ver estado de migraciones por tenant, re-aplicar si fallo |
| PlatformAdmins | CRUD de superadmins de la plataforma |

### Metricas por clinica (TenantMetrics)

| Metrica | Fuente |
|---------|--------|
| Total pacientes | `COUNT(Patient)` en schema del tenant |
| Total citas (mes) | `COUNT(Appointment)` del mes actual |
| Ultimo acceso | Timestamp del ultimo login de cualquier User |
| Usuarios activos | `COUNT(User) WHERE isActive = true` |
| Estado de pagos | Manual por ahora (campo en Tenant) |

### Actualizacion de metricas

- Cron job que recorre tenants activos y actualiza TenantMetrics cada 6 horas
- El panel lee metricas pre-calculadas, no consulta schemas de tenant en tiempo real
- Evita carga sobre los schemas de las clinicas

### Frontend del superadmin

- Aplicacion React separada o rutas separadas con lazy loading
- Propio contexto de autenticacion (`PlatformAuthContext`)
- No comparte estado ni componentes de negocio con el frontend de clinicas

---

## Seccion 6: Migracion de Datos Existentes

### Objetivo

Mover los datos actuales de DermicaPro del schema `public` al primer tenant `tenant_dermicapro`.

### Estrategia

```
1. Backup completo de la base de datos actual

2. Crear schema public nuevo (plataforma)
   - Crear tablas: Tenant, PlatformAdmin, TenantMetrics, TenantMigration

3. Crear schema tenant_dermicapro
   - Aplicar todas las migraciones de Prisma

4. Migrar datos tabla por tabla (14 tablas) con INSERT INTO ... SELECT
   Orden por dependencias de foreign keys:
    1) roles
    2) users
    3) patients
    4) service_templates
    5) service_instances
    6) appointments
    7) appointment_attendees
    8) sessions
    9) appointment_notes
    10) patient_records
    11) commissions
    12) payment_orders
    13) payments
    14) system_settings

5. Registrar Tenant en public:
   INSERT INTO public.tenants (name, slug, isActive...)
   VALUES ('DermicaPro', 'dermicapro', true...)

6. Crear PlatformAdmin (superadmin de la plataforma)

7. Verificar integridad:
   - Contar registros origen vs destino por tabla
   - Validar foreign keys
   - Probar login en dermicapro.plataforma.com

8. Renombrar/eliminar tablas viejas del public
   (solo despues de verificar que todo funciona)
```

### Rollback

Si algo falla, restaurar backup del paso 1 y volver a single-tenant.

### Downtime

Se requiere ventana de mantenimiento. Datos se migran con sistema apagado para evitar inconsistencias.

---

## Seccion 7: Impacto en el Codigo Actual

### Backend

| Area | Cambio |
|------|--------|
| `config/database.ts` | Reemplazar singleton PrismaClient por factory que crea/cachea clients por tenant con `search_path` |
| Middleware nuevo: `tenantResolver` | Extraer subdominio, buscar tenant en public, inyectar `req.tenantPrisma` y `req.tenant` |
| `middlewares/auth.ts` | Agregar `tenantSlug` al JWT. Validar coincidencia con subdominio |
| Todos los controllers (13) | Cambiar `prisma` por `req.tenantPrisma` |
| Todos los services (20+) | Recibir prisma client como parametro en vez de importar global |
| Analytics/Dashboard strategies | Recibir prisma client inyectado |
| Rutas nuevas | CRUD de tenants, login superadmin, metricas, migraciones |
| Seed | Adaptarlo para operar sobre un schema especifico |

### Frontend

| Area | Cambio |
|------|--------|
| `AuthContext` | Almacenar `tenantSlug` del JWT |
| API service (axios) | Sin cambios mayores -- subdominio viaja en Host header |
| Superadmin app | Aplicacion/rutas nuevas con su propio auth y componentes |
| Branding | Posibilidad futura de mostrar nombre/logo de la clinica |

### Infraestructura

| Area | Cambio |
|------|--------|
| Nginx | Wildcard subdomain (`*.plataforma.com`) apuntando al mismo backend |
| Docker | Sin cambios mayores -- misma instancia de PostgreSQL |
| DNS | Registro wildcard `*.plataforma.com` |
| SSL | Certificado wildcard para `*.plataforma.com` |

### Archivos subidos (uploads)

- Actualmente todo va a `backend/uploads/`
- Con multi-tenant, la estructura pasa a `backend/uploads/<tenant_slug>/`
- Cada tenant tiene su directorio aislado de archivos
- Al crear un tenant, se crea su directorio de uploads
- El middleware de upload (Multer) usa `req.tenant.slug` para determinar la ruta destino

### Archivos que NO cambian

- `schema.prisma` -- tablas de tenant son las mismas
- Validators -- validacion de datos no cambia
- Mappers -- transformacion de datos no cambia
- Utils (jwt.ts necesita cambio menor, el resto igual)
