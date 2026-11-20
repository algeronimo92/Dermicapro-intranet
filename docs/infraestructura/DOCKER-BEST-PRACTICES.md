# DermicaPro - Mejores Prácticas de Docker

## Arquitectura y Diseño

### Multi-Stage Builds ✅
Nuestros Dockerfiles usan multi-stage builds para:
- Reducir tamaño de imágenes finales (producción es ~50% más pequeña)
- Separar dependencias de desarrollo y producción
- Mejorar seguridad al no incluir herramientas de build en producción

### Imágenes Base Alpine
Usamos `node:18-alpine` y `nginx:alpine`:
- Imágenes más pequeñas (~50MB vs ~900MB)
- Menor superficie de ataque
- Arranque más rápido

## Seguridad

### 1. Usuario No-Root
```dockerfile
USER node  # El contenedor corre como usuario no-root
```
Nunca ejecutar contenedores como root en producción.

### 2. Secrets Management
```bash
# NUNCA hacer esto:
ENV JWT_SECRET=mi-secreto-en-texto-plano

# HACER esto:
# En docker-compose.yml
environment:
  JWT_SECRET: ${JWT_SECRET}  # Lee de .env

# O usar Docker Secrets (producción)
secrets:
  - jwt_secret
```

### 3. Escaneo de Vulnerabilidades
```bash
# Escanear imágenes regularmente
docker scan dermicapro-backend:latest

# O usar Trivy
docker run aquasec/trivy image dermicapro-backend:latest
```

### 4. No Exponer Puertos Innecesarios
```yaml
# Desarrollo: OK exponer PostgreSQL
db:
  ports:
    - "5432:5432"

# Producción: NO exponer PostgreSQL
db:
  # Sin ports, solo comunicación interna
```

### 5. Health Checks
Todos los servicios tienen health checks:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

## Performance

### 1. Caché de Layers
Orden óptimo de instrucciones en Dockerfile:
```dockerfile
# 1. Copiar solo package.json primero (cambia poco)
COPY package*.json ./

# 2. Instalar dependencias (se cachea si package.json no cambió)
RUN npm ci

# 3. Copiar código fuente (cambia frecuentemente)
COPY . .
```

### 2. .dockerignore
Siempre usar `.dockerignore` para:
- Reducir contexto de build
- Evitar enviar archivos innecesarios a Docker daemon
- Acelerar builds

```dockerignore
node_modules/
dist/
.git/
*.md
```

### 3. npm ci vs npm install
```dockerfile
# PRODUCCIÓN: Usar npm ci (más rápido, determinista)
RUN npm ci --only=production

# DESARROLLO: npm install está OK
RUN npm install
```

### 4. Build Args para Optimización
```dockerfile
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Instalar solo dependencias necesarias
RUN npm ci --only=${NODE_ENV}
```

## Desarrollo

### 1. Hot Reload con Volúmenes
```yaml
volumes:
  # Montar código fuente para hot reload
  - ./backend/src:/app/src:ro  # read-only

  # IMPORTANTE: Prevenir sobrescritura de node_modules
  - /app/node_modules
```

### 2. Separación Dev/Prod
Usar targets diferentes en docker-compose:
```yaml
backend:
  build:
    target: development  # o production
```

### 3. Profiles para Servicios Opcionales
```yaml
prisma-studio:
  profiles:
    - tools  # Solo inicia con --profile tools
```

```bash
# Iniciar solo servicios principales
docker compose up -d

# Iniciar con tools
docker compose --profile tools up -d
```

## Networking

### 1. Red Bridge Dedicada
```yaml
networks:
  dermicapro-network:
    driver: bridge
```
Aislamiento de red entre proyectos.

### 2. Nombres de Host
Dentro de Docker, usar nombres de servicio:
```typescript
// En backend, conectar a db por nombre de servicio
DATABASE_URL=postgresql://user:pass@db:5432/dbname
//                                   ^^
//                                   nombre del servicio
```

### 3. Comunicación Frontend-Backend
```yaml
# Frontend necesita URL del backend
frontend:
  environment:
    VITE_API_URL: http://localhost:5000  # Desde el navegador
```

Nota: El navegador no está dentro de Docker, así que usa `localhost`.

## Persistencia de Datos

### 1. Named Volumes (Preferido)
```yaml
volumes:
  postgres_data:
    driver: local
```
Docker gestiona el volumen, más portable.

### 2. Bind Mounts (Solo Desarrollo)
```yaml
volumes:
  - ./backend/src:/app/src  # Solo para hot reload
```

### 3. Backups de Volúmenes
```bash
# Backup
docker run --rm \
  -v dermicapro_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore
docker run --rm \
  -v dermicapro_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

## Logs

### 1. Logs a STDOUT/STDERR
```typescript
// Siempre usar console.log/console.error
console.log('Server started');
console.error('Error:', error);

// Docker capturará estos logs
```

### 2. Ver Logs
```bash
# Todos los servicios
docker compose logs -f

# Servicio específico
docker compose logs -f backend

# Últimas 100 líneas
docker compose logs --tail=100 backend

# Filtrar errores
docker compose logs backend | grep ERROR
```

### 3. Rotación de Logs (Producción)
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## CI/CD

### 1. GitHub Actions
Ver [.github/workflows/docker-ci.yml](.github/workflows/docker-ci.yml)

### 2. Cache de GitHub Actions
```yaml
- name: Build with cache
  uses: docker/build-push-action@v4
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### 3. Multi-Platform Builds
```bash
# Build para múltiples arquitecturas
docker buildx build --platform linux/amd64,linux/arm64 -t myimage .
```

## Monitoreo

### 1. Health Checks
Todos los servicios exponen `/health`:
```bash
curl http://localhost:5000/health
```

### 2. Resource Limits (Producción)
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 3. Métricas
```bash
# Ver uso de recursos en tiempo real
docker stats

# Ver uso de recursos sin stream
docker stats --no-stream
```

## Troubleshooting

### 1. Build Lento
```bash
# Limpiar caché de build
docker builder prune

# Build sin caché
docker compose build --no-cache

# Ver qué layer es lento
docker compose build --progress=plain
```

### 2. Contenedor No Inicia
```bash
# Ver logs completos
docker compose logs backend

# Ver últimos logs
docker compose logs --tail=50 backend

# Entrar al contenedor (si está corriendo)
docker compose exec backend sh

# Inspeccionar contenedor
docker inspect dermicapro-backend
```

### 3. Problemas de Conexión
```bash
# Verificar red
docker network inspect dermicapro_dermicapro-network

# Ping entre servicios
docker compose exec backend ping db

# Ver variables de entorno
docker compose exec backend env
```

### 4. Espacio en Disco
```bash
# Ver uso de espacio
docker system df

# Limpiar recursos no usados
docker system prune -a

# Limpiar volúmenes huérfanos
docker volume prune
```

## Checklist de Producción

Antes de desplegar a producción:

- [ ] Cambiar target a `production` en docker-compose
- [ ] Usar secretos fuertes (JWT_SECRET, DB_PASSWORD)
- [ ] No exponer puertos de base de datos
- [ ] Configurar resource limits
- [ ] Habilitar rotación de logs
- [ ] Configurar health checks
- [ ] Usar HTTPS (reverse proxy con nginx/traefik)
- [ ] Hacer backup de volúmenes
- [ ] Escanear vulnerabilidades
- [ ] Probar restore de backups
- [ ] Configurar monitoreo (Prometheus, Grafana)
- [ ] Documentar procedimientos de deployment
- [ ] Configurar alertas
- [ ] Hacer load testing

## Recursos

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Docker Compose Best Practices](https://docs.docker.com/compose/production/)

---

Mantenido por el equipo de DermicaPro
