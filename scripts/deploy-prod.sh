#!/usr/bin/env bash
# Blue-green deploy para producción.
# El primer deploy hace bootstrap automático (migra red, volúmenes y DB).
# Los deploys siguientes son zero-downtime alternando blue/green.
set -euo pipefail

REPO_DIR="/docker/dermicapro-intranet"
STATE_FILE="${REPO_DIR}/active-color.txt"
TRAEFIK_DYNAMIC="${REPO_DIR}/traefik/dynamic/production.yml"

# -----------------------------------------------
# Bootstrap — solo corre si falta la red o la DB
# -----------------------------------------------
bootstrap_if_needed() {
  local net_ok db_ok
  docker network inspect dermicapro-prod-network >/dev/null 2>&1 && net_ok=1 || net_ok=0
  docker ps --format '{{.Names}}' | grep -q 'dermicapro-db-prod' && db_ok=1 || db_ok=0

  [ "$net_ok" -eq 1 ] && [ "$db_ok" -eq 1 ] && return 0

  echo "[bootstrap] Primera ejecución — configurando infraestructura..."

  # Bajar stack anterior (causa breve downtime de migración — solo ocurre una vez)
  docker compose -f "${REPO_DIR}/docker-compose.prod.yml" down 2>/dev/null || true

  # Crear red con nombre fijo
  if [ "$net_ok" -eq 0 ]; then
    echo "[bootstrap] Creando red dermicapro-prod-network..."
    docker network create dermicapro-prod-network
  fi

  # Migrar volumen de DB si existe con el nombre viejo del proyecto
  local old_db_vol="dermicapro-intranet_postgres_data"
  if docker volume inspect "$old_db_vol" >/dev/null 2>&1 && \
     ! docker volume inspect dermicapro_postgres_data >/dev/null 2>&1; then
    echo "[bootstrap] Migrando volumen de base de datos..."
    docker volume create dermicapro_postgres_data
    docker run --rm \
      -v "${old_db_vol}:/src" \
      -v "dermicapro_postgres_data:/dst" \
      alpine sh -c "cp -av /src/. /dst/"
  fi

  # Migrar volumen de uploads si existe con el nombre viejo
  local old_uploads_vol="dermicapro-intranet_backend_uploads"
  if docker volume inspect "$old_uploads_vol" >/dev/null 2>&1 && \
     ! docker volume inspect dermicapro_backend_uploads >/dev/null 2>&1; then
    echo "[bootstrap] Migrando volumen de uploads..."
    docker volume create dermicapro_backend_uploads
    docker run --rm \
      -v "${old_uploads_vol}:/src" \
      -v "dermicapro_backend_uploads:/dst" \
      alpine sh -c "cp -av /src/. /dst/"
  fi

  # Arrancar DB permanente
  echo "[bootstrap] Arrancando base de datos..."
  docker compose -p dermicapro-db \
    -f "${REPO_DIR}/docker-compose.prod-db.yml" \
    up -d

  # Esperar DB healthy
  for i in $(seq 1 20); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' \
      dermicapro-db-prod 2>/dev/null || echo "missing")
    [ "$STATUS" = "healthy" ] && { echo "[bootstrap] DB lista."; break; }
    [ "$i" -eq 20 ] && { echo "[bootstrap] ERROR: DB no respondió."; exit 1; }
    echo "  ($i/20) db=$STATUS"; sleep 3
  done

  echo "[bootstrap] Listo."
}

bootstrap_if_needed

# -----------------------------------------------
# Deploy blue-green
# -----------------------------------------------
ACTIVE=$(cat "$STATE_FILE" 2>/dev/null || echo "blue")
NEW_COLOR=$([ "$ACTIVE" = "blue" ] && echo "green" || echo "blue")

echo "[deploy] Activo: $ACTIVE → Desplegando: $NEW_COLOR"

# 1. Build imagen del nuevo color
echo "[deploy] Construyendo imagen $NEW_COLOR..."
docker compose -p "dermicapro-${NEW_COLOR}" \
  -f "${REPO_DIR}/docker-compose.prod-${NEW_COLOR}.yml" \
  build --no-cache

# 2. Migrations — una sola vez, mientras el color activo sigue sirviendo tráfico
echo "[deploy] Ejecutando migraciones..."
docker compose -p "dermicapro-${NEW_COLOR}" \
  -f "${REPO_DIR}/docker-compose.prod-${NEW_COLOR}.yml" \
  run --rm "backend-${NEW_COLOR}" sh -c "npx prisma migrate deploy"

# 3. Levantar nuevo color
echo "[deploy] Levantando stack $NEW_COLOR..."
docker compose -p "dermicapro-${NEW_COLOR}" \
  -f "${REPO_DIR}/docker-compose.prod-${NEW_COLOR}.yml" \
  up -d --no-build

# 4. Esperar backend healthy (máx 150s)
echo "[deploy] Esperando backend-${NEW_COLOR}..."
for i in $(seq 1 30); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' \
    "dermicapro-backend-${NEW_COLOR}" 2>/dev/null || echo "missing")
  if [ "$STATUS" = "healthy" ]; then
    echo "[deploy] Backend OK"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[deploy] ERROR: backend-${NEW_COLOR} no alcanzó estado healthy. Rollback."
    docker compose -p "dermicapro-${NEW_COLOR}" \
      -f "${REPO_DIR}/docker-compose.prod-${NEW_COLOR}.yml" down
    exit 1
  fi
  echo "  ($i/30) backend=$STATUS"; sleep 5
done

# 5. Esperar frontend healthy (máx 60s)
echo "[deploy] Esperando frontend-${NEW_COLOR}..."
for i in $(seq 1 12); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' \
    "dermicapro-frontend-${NEW_COLOR}" 2>/dev/null || echo "missing")
  if [ "$STATUS" = "healthy" ]; then
    echo "[deploy] Frontend OK"
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo "[deploy] ERROR: frontend-${NEW_COLOR} no alcanzó estado healthy. Rollback."
    docker compose -p "dermicapro-${NEW_COLOR}" \
      -f "${REPO_DIR}/docker-compose.prod-${NEW_COLOR}.yml" down
    exit 1
  fi
  echo "  ($i/12) frontend=$STATUS"; sleep 5
done

# 6. Cambiar tráfico — Traefik detecta el archivo en ~1-2s sin reinicio
echo "[deploy] Cambiando tráfico a $NEW_COLOR..."
cat > "$TRAEFIK_DYNAMIC" << YAML
# Gestionado por scripts/deploy-prod.sh — no editar manualmente
http:
  routers:
    production:
      rule: "Host(\`dermicapro.app\`) || Host(\`www.dermicapro.app\`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      service: production-active

  services:
    production-active:
      loadBalancer:
        servers:
          - url: "http://dermicapro-frontend-${NEW_COLOR}:80"
        healthCheck:
          path: /health
          interval: 10s
          timeout: 3s
YAML

echo "$NEW_COLOR" > "$STATE_FILE"
echo "[deploy] Tráfico → $NEW_COLOR"

# 7. Drain 30s para que las conexiones activas del color viejo terminen
echo "[deploy] Drenando conexiones del stack $ACTIVE (30s)..."
sleep 30

# 8. Bajar color viejo (en el primer deploy no habrá color viejo corriendo)
if docker ps --format '{{.Names}}' | grep -q "dermicapro-backend-${ACTIVE}"; then
  echo "[deploy] Bajando stack $ACTIVE..."
  docker compose -p "dermicapro-${ACTIVE}" \
    -f "${REPO_DIR}/docker-compose.prod-${ACTIVE}.yml" down
fi

docker image prune -f
echo "[deploy] ✓ Deploy completo. Activo: $NEW_COLOR"
