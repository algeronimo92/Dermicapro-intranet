# DermicaPro - Arquitectura Docker

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     DermicaPro Docker Stack                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Cliente (Navegador)                       │
│                     http://localhost:5173                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP Requests
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend Container                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Development Mode                        │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │  Vite Dev Server (Port 5173)                     │    │  │
│  │  │  - Hot Module Replacement (HMR)                  │    │  │
│  │  │  - React 18 + TypeScript                         │    │  │
│  │  │  - Source mounted as volume                      │    │  │
│  │  └──────────────────────────────────────────────────┘    │  │
│  │                                                            │  │
│  │                   Production Mode                          │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │  Nginx Server (Port 80)                          │    │  │
│  │  │  - Serve static files from /dist                 │    │  │
│  │  │  - Gzip compression                               │    │  │
│  │  │  - SPA routing configured                         │    │  │
│  │  │  - Cache headers for assets                       │    │  │
│  │  └──────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Image: dermicapro-frontend                                      │
│  Base: node:18-alpine (dev), nginx:alpine (prod)                │
│  Build: Multi-stage Dockerfile                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ API Calls (axios)
                              │ http://localhost:5000/api
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend Container                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Development Mode                        │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │  tsx watch (Port 5000)                           │    │  │
│  │  │  - Node.js + Express + TypeScript                │    │  │
│  │  │  - Hot reload with tsx watch                     │    │  │
│  │  │  - Source mounted as volume                      │    │  │
│  │  │  - Prisma Client generated                       │    │  │
│  │  └──────────────────────────────────────────────────┘    │  │
│  │                                                            │  │
│  │                   Production Mode                          │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │  Node.js (Port 5000)                             │    │  │
│  │  │  - Compiled JavaScript from /dist                │    │  │
│  │  │  - Production dependencies only                  │    │  │
│  │  │  - Non-root user (node)                          │    │  │
│  │  │  - Health check endpoint: /health                │    │  │
│  │  └──────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Endpoints:                                                      │
│    GET  /health                 - Health check                  │
│    POST /api/auth/login         - Authentication                │
│    GET  /api/patients           - Patients API                  │
│    GET  /api/appointments       - Appointments API              │
│    ...                                                           │
│                                                                   │
│  Image: dermicapro-backend                                       │
│  Base: node:18-alpine                                            │
│  Build: Multi-stage Dockerfile                                  │
│                                                                   │
│  Volumes:                                                        │
│    backend_uploads:/app/uploads - File uploads (photos, PDFs)   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ Prisma Client
                              │ DATABASE_URL: postgresql://...@db:5432/...
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database Container                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL 14 (Port 5432)                                │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Database: dermicapro_db                           │  │  │
│  │  │  User: dermicapro                                  │  │  │
│  │  │                                                     │  │  │
│  │  │  Tables:                                           │  │  │
│  │  │    - users                                         │  │  │
│  │  │    - patients                                      │  │  │
│  │  │    - appointments                                  │  │  │
│  │  │    - services                                      │  │  │
│  │  │    - orders                                        │  │  │
│  │  │    - patient_records                               │  │  │
│  │  │    - invoices                                      │  │  │
│  │  │    - payments                                      │  │  │
│  │  │    - commissions                                   │  │  │
│  │  │    ...                                             │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Image: postgres:14-alpine                                       │
│  Health Check: pg_isready                                        │
│                                                                   │
│  Volumes:                                                        │
│    postgres_data:/var/lib/postgresql/data - Persistent storage  │
└───────────────────────────────────────────────────────────────┬─┘
                                                                  │
                                                                  │ (Optional)
                                                                  │ Port 5555
┌─────────────────────────────────────────────────────────────────┐
│                  Prisma Studio Container (Optional)              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Prisma Studio (Port 5555)                                │  │
│  │  - Web GUI for database management                        │  │
│  │  - Start with: make studio                                │  │
│  │  - Access: http://localhost:5555                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Profile: tools (only starts with --profile tools)              │
└─────────────────────────────────────────────────────────────────┘
```

## Networking

```
┌─────────────────────────────────────────────────────────────────┐
│                  dermicapro-network (bridge)                     │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   frontend   │───▶│   backend    │───▶│      db      │      │
│  │  container   │    │  container   │    │  container   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│        │                     │                    │              │
│        │                     │                    │              │
│  Port: 5173            Port: 5000          Port: 5432           │
│  (mapped)              (mapped)            (internal only)      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
        │                     │                    │
        ▼                     ▼                    ▼
   localhost:5173       localhost:5000      localhost:5432
     (browser)            (browser)          (dev tools)
```

### Comunicación Interna

Dentro de la red Docker, los servicios se comunican por nombre:
- `backend` → `db:5432` (database connection)
- `frontend` → NO se comunica directamente con db
- Browser → `localhost:5000` (API calls desde el navegador)

### Puertos Mapeados

| Servicio | Puerto Interno | Puerto Externo | Acceso |
|----------|----------------|----------------|--------|
| Frontend (dev) | 5173 | 5173 | http://localhost:5173 |
| Frontend (prod) | 80 | 80 | http://localhost:80 |
| Backend | 5000 | 5000 | http://localhost:5000 |
| PostgreSQL | 5432 | 5432 | localhost:5432 |
| Prisma Studio | 5555 | 5555 | http://localhost:5555 |

## Volúmenes y Persistencia

```
┌─────────────────────────────────────────────────────────────────┐
│                      Docker Volumes                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  postgres_data (Named Volume)                                    │
│  ├── /var/lib/postgresql/data                                   │
│  │   └── Database files (persistent)                            │
│  └── Survives container recreation                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  backend_uploads (Named Volume)                                  │
│  ├── /app/uploads                                               │
│  │   ├── photos/                                                │
│  │   ├── receipts/                                              │
│  │   └── documents/                                             │
│  └── Survives container recreation                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Development Volumes (Bind Mounts)                               │
│  ├── ./backend/src → /app/src (hot reload)                      │
│  ├── ./frontend/src → /app/src (hot reload)                     │
│  └── Removed in production mode                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Build Process (Multi-Stage)

### Frontend Dockerfile

```
┌─────────────────────────────────────────────────────────────────┐
│  Stage 1: Builder                                                │
│  ├── FROM node:18-alpine                                        │
│  ├── COPY package*.json ./                                      │
│  ├── RUN npm ci                                                 │
│  ├── COPY . .                                                   │
│  └── RUN npm run build → /app/dist                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 2: Production                                             │
│  ├── FROM nginx:alpine                                          │
│  ├── COPY nginx.conf → /etc/nginx/conf.d/                      │
│  ├── COPY --from=builder /app/dist → /usr/share/nginx/html     │
│  └── Final image: ~50MB                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Dockerfile

```
┌─────────────────────────────────────────────────────────────────┐
│  Stage 1: Builder                                                │
│  ├── FROM node:18-alpine                                        │
│  ├── COPY package*.json ./                                      │
│  ├── RUN npm ci (all deps)                                     │
│  ├── COPY prisma/ → generate Prisma Client                     │
│  ├── COPY . .                                                   │
│  └── RUN npm run build → /app/dist                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 2: Production                                             │
│  ├── FROM node:18-alpine                                        │
│  ├── RUN npm ci --only=production                              │
│  ├── COPY --from=builder /app/dist → /app/dist                 │
│  ├── COPY --from=builder /app/node_modules/.prisma             │
│  ├── USER node (non-root)                                      │
│  └── Final image: ~200MB                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### Creación de una Cita (Ejemplo)

```
┌────────────┐
│  Browser   │
└─────┬──────┘
      │ 1. User fills form
      ▼
┌────────────────────────────────┐
│  Frontend Container            │
│  POST /appointments            │
└─────┬──────────────────────────┘
      │ 2. axios.post()
      │    http://localhost:5000/api/appointments
      ▼
┌────────────────────────────────┐
│  Backend Container             │
│  Express Router                │
│  ├── authMiddleware            │
│  ├── validateAppointment       │
│  └── appointmentsController    │
└─────┬──────────────────────────┘
      │ 3. Prisma ORM
      │    prisma.appointment.create()
      ▼
┌────────────────────────────────┐
│  Database Container            │
│  PostgreSQL                    │
│  INSERT INTO appointments...   │
└─────┬──────────────────────────┘
      │ 4. Return created record
      ▼
┌────────────────────────────────┐
│  Backend Container             │
│  Response: { id, patient, ... }│
└─────┬──────────────────────────┘
      │ 5. HTTP 201 Created
      ▼
┌────────────────────────────────┐
│  Frontend Container            │
│  Update UI state               │
└─────┬──────────────────────────┘
      │ 6. Show success message
      ▼
┌────────────┐
│  Browser   │
└────────────┘
```

## Comparación: Desarrollo vs Producción

| Aspecto | Desarrollo | Producción |
|---------|-----------|------------|
| **Frontend Server** | Vite dev (5173) | Nginx (80) |
| **Backend Build** | tsx watch (TypeScript) | Compiled JS |
| **Hot Reload** | ✅ Enabled | ❌ Disabled |
| **Source Volumes** | ✅ Mounted | ❌ Not mounted |
| **Image Size** | ~500MB | ~250MB |
| **Security** | Less strict | Non-root user |
| **Optimizations** | Minimal | Gzip, cache, minified |
| **Database Port** | Exposed (5432) | Internal only |
| **Logs** | Verbose | Production level |

## Health Checks

Todos los servicios tienen health checks configurados:

### Backend
```bash
curl http://localhost:5000/health

# Response:
{
  "status": "healthy",
  "timestamp": "2024-12-22T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

### Frontend (Production)
```bash
curl http://localhost:80/health

# Response:
healthy
```

### Database
```bash
docker compose exec db pg_isready -U dermicapro

# Response:
/var/run/postgresql:5432 - accepting connections
```

## Escalabilidad

La arquitectura actual soporta:

1. **Escalado Horizontal del Backend**:
   ```yaml
   backend:
     deploy:
       replicas: 3
   ```

2. **Load Balancer** (futuro):
   - Nginx como reverse proxy
   - Distribución de carga entre múltiples backends

3. **Database Replication** (futuro):
   - PostgreSQL primary-replica
   - Read replicas para consultas

4. **CDN para Frontend** (producción):
   - Servir assets estáticos desde CDN
   - Reducir carga en servidor

## Seguridad

### Capas de Seguridad Implementadas

1. **Network Isolation**: Red bridge privada
2. **Non-Root User**: Backend corre como usuario `node`
3. **Health Checks**: Detección automática de fallos
4. **No Exposed Ports**: DB no expuesta en producción
5. **Environment Variables**: Secrets vía `.env`
6. **Security Headers**: Nginx headers en frontend
7. **Input Validation**: Express-validator en backend
8. **JWT Authentication**: Tokens con expiración
9. **Password Hashing**: Bcrypt en base de datos

## Monitoreo

### Comandos de Monitoreo

```bash
# Estado de servicios
docker compose ps

# Recursos en tiempo real
docker stats

# Logs
docker compose logs -f

# Health checks
curl http://localhost:5000/health
curl http://localhost:80/health
docker compose exec db pg_isready
```

## Backups

### Estrategia de Backup

1. **Base de Datos**:
   ```bash
   make backup-db
   # Crea: backups/backup-20241222-103000.sql
   ```

2. **Volúmenes**:
   ```bash
   docker run --rm \
     -v dermicapro_postgres_data:/data \
     -v $(pwd):/backup \
     alpine tar czf /backup/postgres-volume.tar.gz /data
   ```

3. **Código** (Git):
   ```bash
   git commit -am "Backup"
   git push origin master
   ```

---

**Diseñado y optimizado para DermicaPro**
**Fecha**: Diciembre 2024
