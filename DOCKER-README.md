# DermicaPro - Guía de Docker

Esta guía te ayudará a ejecutar DermicaPro usando Docker y Docker Compose.

## Requisitos Previos

- [Docker](https://docs.docker.com/get-docker/) instalado (versión 20.10 o superior)
- [Docker Compose](https://docs.docker.com/compose/install/) instalado (versión 2.0 o superior)
- Al menos 4GB de RAM disponible
- Al menos 10GB de espacio en disco

## Arquitectura de Contenedores

El proyecto está dividido en 3 servicios principales:

1. **db** - PostgreSQL 14 (base de datos)
2. **backend** - Node.js + Express + Prisma (API REST)
3. **frontend** - React + Vite (interfaz de usuario)
4. **prisma-studio** - Prisma Studio (opcional, GUI para la base de datos)

## Inicio Rápido

### 1. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores (opcional para desarrollo local)
nano .env
```

### 2. Iniciar los Servicios

```bash
# Construir e iniciar todos los servicios
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
```

### 3. Acceder a la Aplicación

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Prisma Studio**: http://localhost:5555 (requiere `--profile tools`)

### 4. Verificar que Todo Funciona

```bash
# Ver estado de los contenedores
docker compose ps

# Verificar salud de los servicios
docker compose ps --format json | jq '.[].Health'
```

## Comandos Útiles

### Gestión de Contenedores

```bash
# Iniciar servicios
docker compose up -d

# Detener servicios
docker compose down

# Detener y eliminar volúmenes (CUIDADO: elimina datos)
docker compose down -v

# Reconstruir imágenes
docker compose build

# Reconstruir sin caché
docker compose build --no-cache

# Ver logs
docker compose logs -f

# Reiniciar un servicio
docker compose restart backend
```

### Base de Datos

```bash
# Ejecutar migraciones de Prisma
docker compose exec backend npx prisma migrate deploy

# Crear una nueva migración
docker compose exec backend npx prisma migrate dev --name nombre_migracion

# Resetear base de datos (CUIDADO: elimina datos)
docker compose exec backend npx prisma migrate reset

# Ejecutar seed
docker compose exec backend npx prisma db seed

# Abrir shell de PostgreSQL
docker compose exec db psql -U dermicapro -d dermicapro_db

# Backup de la base de datos
docker compose exec db pg_dump -U dermicapro dermicapro_db > backup.sql

# Restaurar backup
docker compose exec -T db psql -U dermicapro dermicapro_db < backup.sql
```

### Prisma Studio (GUI de Base de Datos)

```bash
# Iniciar Prisma Studio
docker compose --profile tools up -d prisma-studio

# Acceder en navegador
open http://localhost:5555

# Detener Prisma Studio
docker compose --profile tools down prisma-studio
```

### Desarrollo

```bash
# Entrar al contenedor del backend
docker compose exec backend sh

# Entrar al contenedor del frontend
docker compose exec frontend sh

# Ejecutar tests en backend
docker compose exec backend npm test

# Ejecutar tests en frontend
docker compose exec frontend npm test

# Instalar nueva dependencia en backend
docker compose exec backend npm install nombre-paquete

# Reconstruir después de cambios en package.json
docker compose up -d --build
```

### Monitoreo y Debugging

```bash
# Ver uso de recursos
docker stats

# Inspeccionar un contenedor
docker compose exec backend sh
ps aux
df -h
env

# Ver logs de errores
docker compose logs backend | grep ERROR

# Ver logs de los últimos 100 eventos
docker compose logs --tail=100

# Verificar conectividad entre servicios
docker compose exec backend ping db
docker compose exec frontend ping backend
```

## Modos de Ejecución

### Modo Desarrollo (Por Defecto)

Hot reload habilitado para frontend y backend.

```bash
docker compose up -d
```

Características:
- Código fuente montado como volúmenes
- Cambios en el código se reflejan automáticamente
- Modo watch de tsx para backend
- Modo dev de Vite para frontend

### Modo Producción

Build optimizado y servido por Nginx.

```bash
# Editar docker-compose.yml y cambiar target: production
# Luego ejecutar:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Estructura de Archivos Docker

```
dermicapro/
├── docker-compose.yml           # Orquestación de servicios
├── .env.example                 # Variables de entorno de ejemplo
├── .env                         # Variables de entorno (gitignored)
├── DOCKER-README.md            # Esta documentación
├── backend/
│   ├── Dockerfile              # Multi-stage: builder, production, development
│   └── .dockerignore           # Archivos excluidos del build
└── frontend/
    ├── Dockerfile              # Multi-stage: builder, production, development
    ├── nginx.conf              # Configuración de Nginx para producción
    └── .dockerignore           # Archivos excluidos del build
```

## Volúmenes Persistentes

Los siguientes volúmenes persisten datos:

- `postgres_data` - Datos de PostgreSQL
- `backend_uploads` - Archivos subidos (fotos, recibos)

### Gestionar Volúmenes

```bash
# Listar volúmenes
docker volume ls

# Inspeccionar volumen
docker volume inspect dermicapro_postgres_data

# Eliminar volúmenes huérfanos
docker volume prune

# Backup de volumen
docker run --rm -v dermicapro_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

## Networking

Todos los servicios están en la red `dermicapro-network` (bridge).

```bash
# Inspeccionar red
docker network inspect dermicapro_dermicapro-network

# Probar conectividad
docker compose exec backend ping db
docker compose exec frontend wget -O- http://backend:5000/health
```

## Solución de Problemas

### El backend no puede conectar a la base de datos

```bash
# Verificar que db esté corriendo
docker compose ps db

# Ver logs de db
docker compose logs db

# Verificar variables de entorno
docker compose exec backend env | grep DATABASE_URL
```

### Migraciones de Prisma fallan

```bash
# Reiniciar base de datos
docker compose restart db

# Esperar a que esté saludable
docker compose ps db

# Ejecutar migraciones manualmente
docker compose exec backend npx prisma migrate deploy
```

### Cambios en package.json no se reflejan

```bash
# Reconstruir imagen
docker compose build backend

# Reiniciar servicio
docker compose up -d backend
```

### Puerto ya en uso

```bash
# Cambiar puertos en .env
BACKEND_PORT=5001
FRONTEND_PORT=5174

# Reiniciar servicios
docker compose down && docker compose up -d
```

### Limpiar todo y empezar de cero

```bash
# CUIDADO: Esto eliminará todos los datos
docker compose down -v
docker system prune -a
docker compose up -d --build
```

## Mejores Prácticas

### Seguridad

1. Nunca commitear `.env` al repositorio
2. Usar secretos fuertes en producción
3. No exponer puertos de base de datos en producción
4. Mantener imágenes actualizadas: `docker compose pull`
5. Escanear vulnerabilidades: `docker scan dermicapro-backend`

### Performance

1. Usar multi-stage builds (ya implementado)
2. Aprovechar caché de Docker: ordenar COPY correctamente
3. Usar `.dockerignore` para reducir contexto de build
4. Usar volúmenes named en lugar de bind mounts en producción

### Desarrollo

1. Usar modo development para hot reload
2. Montar solo directorios necesarios
3. No montar `node_modules` (prevenir con `/app/node_modules`)
4. Usar `--profile tools` para servicios opcionales

## Despliegue en Producción

### Usando docker-compose.prod.yml

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      target: production
    environment:
      NODE_ENV: production
    volumes: []  # No montar código fuente

  frontend:
    build:
      target: production
    volumes: []  # No montar código fuente

  db:
    ports: []  # No exponer puerto
```

```bash
# Desplegar en producción
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Variables de Entorno de Producción

```bash
# .env.production
NODE_ENV=production
DB_PASSWORD=secure-random-password-here
JWT_SECRET=super-secure-jwt-secret-at-least-32-characters-long
CORS_ORIGIN=https://dermicapro.com
VITE_API_URL=https://api.dermicapro.com
```

## Recursos Adicionales

- [Documentación de Docker](https://docs.docker.com/)
- [Documentación de Docker Compose](https://docs.docker.com/compose/)
- [Prisma con Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [Nginx con Docker](https://hub.docker.com/_/nginx)

## Soporte

Si encuentras problemas:

1. Revisa los logs: `docker compose logs`
2. Verifica el estado: `docker compose ps`
3. Consulta esta documentación
4. Revisa los issues del proyecto

---

Desarrollado con para DermicaPro
