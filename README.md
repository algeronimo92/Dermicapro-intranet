# DermicaPro - Sistema de Gestión de Clínica

Sistema completo de gestión para DermicaPro, centro de estética avanzada en Trujillo, Perú. Incluye gestión de pacientes, citas, historiales médicos, comisiones y analíticas.

## Características Principales

- **Gestión de Pacientes**: Registro completo con DNI, datos personales y historial médico
- **Sistema de Citas**: Reservas, atención y seguimiento de tratamientos
- **Historiales Clínicos**: Fotos antes/después, mediciones y notas de seguimiento
- **Control de Sesiones**: Paquetes de tratamiento con seguimiento por sesión
- **Sistema de Comisiones**: Cálculo automático para personal de ventas
- **Roles y Permisos**: Admin, Enfermera y Ventas con permisos específicos
- **Dashboard Analítico**: Estadísticas y reportes para administradores

## Tecnologías Utilizadas

### Backend
- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Multer (File uploads)
- Bcrypt (Password hashing)

### Frontend
- React 18 + TypeScript
- React Router v6
- Axios
- Vite
- Context API

## Estructura del Proyecto

```
dermicapro/
├── backend/                 # API REST
│   ├── prisma/             # Database schema & migrations
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middlewares/    # Auth, upload, error handling
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Helper functions
│   └── package.json
│
└── frontend/               # React SPA
    ├── src/
    │   ├── components/     # Reusable components
    │   ├── contexts/       # React contexts
    │   ├── pages/          # Page components
    │   ├── services/       # API calls
    │   ├── types/          # TypeScript types
    │   └── utils/          # Helper functions
    └── package.json
```

## Guía de Instalación

### Opción 1: Con Docker (Recomendado) 🐳

**Requisitos:**
- Docker y Docker Compose instalados
- 4GB RAM y 10GB de espacio en disco

```bash
# Inicio rápido
make init

# O manualmente
cp .env.example .env
docker compose up -d
docker compose exec backend npx prisma migrate deploy
```

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- PostgreSQL: localhost:5432

**Documentación completa:** Ver [DOCKER-README.md](DOCKER-README.md)

### Opción 2: Instalación Local

**Requisitos:**
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### 1. Configurar la Base de Datos

```bash
# Instalar PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Crear base de datos
createdb dermicapro
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tus credenciales
# DATABASE_URL="postgresql://username:password@localhost:5432/dermicapro"

# Generar Prisma Client
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# Cargar datos iniciales (usuarios y servicios)
npm run prisma:seed

# Iniciar servidor de desarrollo
npm run dev
```

El servidor estará corriendo en `http://localhost:3000`

### 3. Configurar Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Usuarios de Prueba

Después de ejecutar el seed, tendrás estos usuarios disponibles:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@dermicapro.com | admin123 |
| Enfermera | enfermera@dermicapro.com | nurse123 |
| Ventas | ventas@dermicapro.com | sales123 |

## Servicios Disponibles

El sistema incluye los siguientes servicios precargados:

1. **HIFU 12D** (Lifting sin Cirugía) - S/. 800
2. **Borrado de Manchas** (Pico Láser) - S/. 300
3. **Hollywood Peel** - S/. 250
4. **Enzimas Recombinantes** - S/. 350
5. **Reducción de Papada** (Enzimas + HIFU) - S/. 600
6. **Borrado de Tatuajes** - S/. 400
7. **Borrado de Micropigmentación** - S/. 350

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/me` - Obtener usuario actual

### Pacientes
- `GET /api/patients` - Listar pacientes (paginado)
- `GET /api/patients/:id` - Obtener paciente
- `POST /api/patients` - Crear paciente
- `PUT /api/patients/:id` - Actualizar paciente
- `DELETE /api/patients/:id` - Eliminar paciente (Admin)
- `GET /api/patients/:id/history` - Historial del paciente

### Citas
- `GET /api/appointments` - Listar citas (filtrable)
- `GET /api/appointments/:id` - Obtener cita
- `POST /api/appointments` - Crear cita (Sales)
- `PUT /api/appointments/:id` - Actualizar cita (Sales)
- `DELETE /api/appointments/:id` - Cancelar cita
- `POST /api/appointments/:id/attend` - Marcar como atendida (Nurse)
- `POST /api/appointments/:id/upload-receipt` - Subir comprobante

### Sesiones de Tratamiento
- `GET /api/sessions/appointments/:appointmentId/sessions` - Sesiones por cita
- `POST /api/sessions/appointments/:appointmentId/sessions` - Registrar sesión
- `PUT /api/sessions/:id` - Actualizar sesión
- `POST /api/sessions/:id/upload-photos` - Subir fotos antes/después

## Roles y Permisos

### Admin
- Acceso total al sistema
- Gestión de usuarios
- Dashboard con analíticas
- Gestión de comisiones

### Enfermera (Nurse)
- Ver y editar pacientes
- Ver historial completo de pacientes
- Marcar citas como atendidas
- Registrar sesiones de tratamiento
- Subir fotos antes/después

### Ventas (Sales)
- Ver y editar pacientes
- Crear, editar y cancelar citas
- Subir comprobantes de pago
- Ver sus propias comisiones

## Scripts Disponibles

### Backend
```bash
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar TypeScript
npm run start        # Producción
npm run prisma:generate  # Generar Prisma Client
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:studio    # Abrir Prisma Studio (GUI)
npm run prisma:seed      # Cargar datos iniciales
```

### Frontend
```bash
npm run dev      # Desarrollo
npm run build    # Compilar para producción
npm run preview  # Preview del build
npm run lint     # Linter
```

## Variables de Entorno

### Backend (.env)
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dermicapro"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
UPLOAD_DIR="./uploads"
CORS_ORIGIN="http://localhost:5173"
```

### Frontend (.env)
```env
VITE_API_URL="http://localhost:3000/api"
```

## Próximos Pasos

### Funcionalidades Pendientes
- [ ] Sistema de notificaciones (email/SMS)
- [ ] Recordatorios automáticos de citas
- [ ] Reportes exportables (PDF/Excel)
- [ ] Dashboard con gráficos interactivos
- [ ] Sistema de inventario de productos
- [ ] Integración con pasarelas de pago
- [ ] App móvil para pacientes
- [ ] Sistema de valoraciones/reseñas

### Mejoras Técnicas
- [ ] Tests unitarios y de integración
- [ ] CI/CD pipeline
- [ ] Documentación API con Swagger
- [ ] Monitoreo y logging
- [ ] Rate limiting avanzado
- [ ] Backup automático de base de datos

## Despliegue a Producción

### Recomendaciones

**Backend:**
- Railway, Render o DigitalOcean
- Base de datos: PostgreSQL en Supabase o Railway

**Frontend:**
- Vercel, Netlify o Cloudflare Pages

**Archivos:**
- AWS S3, Cloudinary o DigitalOcean Spaces

## Soporte

Para reportar bugs o solicitar funcionalidades, contacta al equipo de desarrollo.

## Licencia

Uso privado - DermicaPro © 2024
# Dermicapro-intranet
