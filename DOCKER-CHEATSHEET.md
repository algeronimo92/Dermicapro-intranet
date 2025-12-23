# Docker Cheatsheet - DermicaPro

## Inicio Rápido

```bash
# Primera vez
make init

# Inicio normal
make up

# Detener
make down
```

## Comandos de Make (Recomendado)

```bash
make help              # Ver todos los comandos disponibles
make init              # Primera vez: setup completo
make up                # Iniciar servicios
make down              # Detener servicios
make restart           # Reiniciar servicios
make ps                # Ver estado
make logs              # Ver logs (todos)
make logs-backend      # Logs del backend
make logs-frontend     # Logs del frontend
make logs-db           # Logs de la base de datos

make shell-backend     # Entrar al contenedor backend
make shell-frontend    # Entrar al contenedor frontend
make shell-db          # Entrar a PostgreSQL

make migrate           # Ejecutar migraciones
make migrate-create name=nombre  # Crear migración
make migrate-reset     # Resetear DB (CUIDADO!)
make seed              # Ejecutar seed

make studio            # Abrir Prisma Studio
make studio-stop       # Cerrar Prisma Studio

make test              # Ejecutar todos los tests
make test-backend      # Tests del backend
make test-frontend     # Tests del frontend
make test-coverage     # Tests con coverage

make backup-db         # Backup de base de datos
make restore-db file=backup.sql  # Restaurar backup

make clean             # Limpiar contenedores y volúmenes
make clean-all         # Limpiar TODO (imágenes también)

make build             # Construir imágenes
make build-no-cache    # Construir sin caché

make prod-build        # Build para producción
make prod-up           # Iniciar en producción
```

## Docker Compose (Comandos Directos)

### Gestión de Servicios
```bash
docker compose up -d                    # Iniciar en background
docker compose up -d --build            # Reconstruir e iniciar
docker compose down                     # Detener y eliminar contenedores
docker compose down -v                  # También eliminar volúmenes
docker compose restart                  # Reiniciar todos
docker compose restart backend          # Reiniciar solo backend
docker compose stop                     # Detener sin eliminar
docker compose start                    # Iniciar contenedores detenidos
```

### Información
```bash
docker compose ps                       # Estado de servicios
docker compose ps --format json         # Estado en JSON
docker compose config                   # Ver configuración compilada
docker compose images                   # Ver imágenes usadas
docker compose top                      # Ver procesos corriendo
```

### Logs
```bash
docker compose logs -f                  # Todos los logs
docker compose logs -f backend          # Logs de un servicio
docker compose logs --tail=100 backend  # Últimas 100 líneas
docker compose logs --since 1h          # Última hora
docker compose logs | grep ERROR        # Filtrar errores
```

### Build
```bash
docker compose build                    # Construir todas las imágenes
docker compose build --no-cache         # Sin usar caché
docker compose build backend            # Solo un servicio
docker compose pull                     # Actualizar imágenes base
```

### Exec (Ejecutar comandos)
```bash
docker compose exec backend sh          # Shell interactivo
docker compose exec backend npm test    # Ejecutar comando
docker compose exec -T backend ls       # Sin TTY
docker compose exec db psql -U dermicapro  # PostgreSQL CLI
```

## Docker (Comandos de Bajo Nivel)

### Contenedores
```bash
docker ps                               # Contenedores corriendo
docker ps -a                            # Todos los contenedores
docker stop <container>                 # Detener contenedor
docker start <container>                # Iniciar contenedor
docker restart <container>              # Reiniciar contenedor
docker rm <container>                   # Eliminar contenedor
docker rm -f <container>                # Forzar eliminación
docker logs -f <container>              # Ver logs
docker exec -it <container> sh          # Entrar al contenedor
docker inspect <container>              # Información detallada
docker stats                            # Uso de recursos en vivo
docker stats --no-stream                # Snapshot de recursos
```

### Imágenes
```bash
docker images                           # Listar imágenes
docker pull <image>                     # Descargar imagen
docker build -t <name> .                # Construir imagen
docker build --no-cache -t <name> .     # Sin caché
docker rmi <image>                      # Eliminar imagen
docker rmi -f <image>                   # Forzar eliminación
docker image prune                      # Limpiar imágenes sin usar
docker image prune -a                   # Limpiar todas no usadas
docker history <image>                  # Ver capas de imagen
```

### Volúmenes
```bash
docker volume ls                        # Listar volúmenes
docker volume inspect <volume>          # Información de volumen
docker volume rm <volume>               # Eliminar volumen
docker volume prune                     # Limpiar volúmenes huérfanos
docker volume create <name>             # Crear volumen
```

### Redes
```bash
docker network ls                       # Listar redes
docker network inspect <network>        # Información de red
docker network rm <network>             # Eliminar red
docker network prune                    # Limpiar redes sin usar
docker network create <name>            # Crear red
```

### Sistema
```bash
docker system df                        # Uso de espacio en disco
docker system prune                     # Limpiar recursos sin usar
docker system prune -a                  # Limpieza agresiva
docker system prune -a --volumes        # Incluir volúmenes
docker info                             # Información del sistema
docker version                          # Versión de Docker
```

## Base de Datos (PostgreSQL)

### Acceso a PostgreSQL
```bash
# Via docker compose
docker compose exec db psql -U dermicapro -d dermicapro_db

# Via make
make shell-db
```

### Comandos PostgreSQL
```sql
-- Listar bases de datos
\l

-- Conectar a base de datos
\c dermicapro_db

-- Listar tablas
\dt

-- Describir tabla
\d users

-- Listar esquemas
\dn

-- Ejecutar query
SELECT * FROM users LIMIT 10;

-- Salir
\q
```

### Backups
```bash
# Crear backup
docker compose exec db pg_dump -U dermicapro dermicapro_db > backup.sql

# O con make
make backup-db

# Restaurar backup
docker compose exec -T db psql -U dermicapro dermicapro_db < backup.sql

# O con make
make restore-db file=backup.sql

# Backup de volumen completo
docker run --rm \
  -v dermicapro_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-volume.tar.gz /data
```

## Prisma

```bash
# Generar Prisma Client
docker compose exec backend npx prisma generate

# Ver estado de migraciones
docker compose exec backend npx prisma migrate status

# Crear migración
docker compose exec backend npx prisma migrate dev --name nombre

# Ejecutar migraciones
docker compose exec backend npx prisma migrate deploy

# Resetear base de datos
docker compose exec backend npx prisma migrate reset

# Seed
docker compose exec backend npm run prisma:seed

# Prisma Studio
docker compose --profile tools up -d prisma-studio
open http://localhost:5555
```

## Testing

```bash
# Backend tests
docker compose exec backend npm test
docker compose exec backend npm run test:watch
docker compose exec backend npm run test:coverage

# Frontend tests
docker compose exec frontend npm test
docker compose exec frontend npm run test:watch
docker compose exec frontend npm run test:coverage

# Con make
make test
make test-backend
make test-frontend
make test-coverage
```

## Desarrollo

### Hot Reload
```bash
# Ya configurado automáticamente
# Solo edita archivos en:
#   - backend/src/
#   - frontend/src/
# Los cambios se reflejan automáticamente
```

### Instalar Dependencias
```bash
# Backend
docker compose exec backend npm install <paquete>
docker compose restart backend

# Frontend
docker compose exec frontend npm install <paquete>
docker compose restart frontend
```

### Variables de Entorno
```bash
# Editar .env
nano .env

# Reiniciar para aplicar cambios
docker compose down
docker compose up -d
```

## Troubleshooting

### Ver qué está fallando
```bash
docker compose ps                       # Estado de servicios
docker compose logs -f                  # Logs en tiempo real
docker compose logs backend | tail -50  # Últimas 50 líneas
```

### Contenedor no inicia
```bash
# Ver por qué falló
docker compose logs backend

# Inspeccionar contenedor
docker inspect dermicapro-backend

# Ver procesos
docker compose top backend
```

### Base de datos no conecta
```bash
# Verificar que esté corriendo
docker compose ps db

# Ver logs
docker compose logs db

# Verificar health check
docker inspect dermicapro-db | grep -A 10 Health

# Ping desde backend
docker compose exec backend ping db
```

### Puerto en uso
```bash
# Ver qué está usando el puerto
lsof -i :5000

# Matar proceso
kill -9 <PID>

# O cambiar puerto en .env
BACKEND_PORT=5001
```

### Limpiar todo y empezar de cero
```bash
docker compose down -v
docker system prune -af
make init
```

### Build lento
```bash
# Limpiar caché de build
docker builder prune

# Build sin caché
docker compose build --no-cache

# Ver qué está lento
docker compose build --progress=plain
```

## Producción

```bash
# Build de producción
make prod-build

# Iniciar en producción
make prod-up

# O manualmente
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Ver logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

## URLs de Acceso

```bash
# Desarrollo
Frontend:      http://localhost:5173
Backend:       http://localhost:5000
PostgreSQL:    localhost:5432
Health Check:  http://localhost:5000/health

# Prisma Studio (opcional)
Prisma Studio: http://localhost:5555

# Producción
Frontend:      http://localhost:80
Backend:       http://localhost:5000
```

## Archivos Importantes

```bash
# Configuración
docker-compose.yml          # Servicios (desarrollo)
docker-compose.prod.yml     # Override de producción
.env                        # Variables de entorno
.env.example                # Ejemplo de variables

# Dockerfiles
backend/Dockerfile          # Imagen del backend
frontend/Dockerfile         # Imagen del frontend
backend/.dockerignore       # Exclusiones backend
frontend/.dockerignore      # Exclusiones frontend

# Utilidades
Makefile                    # Comandos simplificados
start-docker.sh             # Script de inicio

# Documentación
DOCKER-README.md            # Guía completa
DOCKER-BEST-PRACTICES.md    # Mejores prácticas
DOCKER-MIGRATION-SUMMARY.md # Resumen de migración
DOCKER-CHEATSHEET.md        # Este archivo
```

## Tips y Trucos

```bash
# Ver solo contenedores de este proyecto
docker compose ps

# Seguir logs de múltiples servicios
docker compose logs -f backend frontend

# Ejecutar comando sin entrar al contenedor
docker compose exec backend npm test

# Ver variables de entorno de un servicio
docker compose exec backend env

# Ver configuración compilada de docker-compose
docker compose config

# Validar docker-compose.yml
docker compose config --quiet

# Ver recursos usados
docker stats --no-stream

# Inspeccionar red
docker network inspect dermicapro_dermicapro-network

# Shell de PostgreSQL con query
docker compose exec db psql -U dermicapro -d dermicapro_db -c "SELECT COUNT(*) FROM users"

# Copiar archivo a contenedor
docker cp archivo.txt dermicapro-backend:/app/

# Copiar archivo desde contenedor
docker cp dermicapro-backend:/app/archivo.txt ./
```

## Atajos Útiles

```bash
# Alias útiles (agregar a ~/.bashrc o ~/.zshrc)
alias dc='docker compose'
alias dcu='docker compose up -d'
alias dcd='docker compose down'
alias dcl='docker compose logs -f'
alias dcp='docker compose ps'
alias dcr='docker compose restart'

# Uso
dcu              # docker compose up -d
dcl backend      # docker compose logs -f backend
```

---

**Pro Tip**: Usa `make help` para ver todos los comandos disponibles con descripciones.
