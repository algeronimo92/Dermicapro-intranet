#!/usr/bin/env bash
# Blue-green deploy para producción.
# Determina el color inactivo, lo construye y levanta, verifica health,
# cambia el tráfico via Traefik file provider, drena y baja el color viejo.
set -euo pipefail

REPO_DIR="/docker/dermicapro-intranet"
STATE_FILE="${REPO_DIR}/active-color.txt"
TRAEFIK_DYNAMIC="${REPO_DIR}/traefik/dynamic/production.yml"

# Cargar variables de entorno de producción
set -a
source "${REPO_DIR}/.env.production"
set +a

# Determinar colores
ACTIVE=$(cat "$STATE_FILE" 2>/dev/null || echo "blue")
NEW_COLOR=$([ "$ACTIVE" = "blue" ] && echo "green" || echo "blue")

echo "[deploy] Activo: $ACTIVE → Desplegando: $NEW_COLOR"

# 1. Pull código
git pull origin main

# 2. Build imagen del nuevo color
echo "[deploy] Construyendo imagen $NEW_COLOR..."
docker compose -p "dermicapro-${NEW_COLOR}" \
  -f "${REPO_DIR}/docker-compose.prod-${NEW_COLOR}.yml" \
  build --no-cache

# 3. Migrations — corren UNA sola vez antes de arrancar el nuevo color.
#    El color activo sigue sirviendo tráfico durante este paso.
echo "[deploy] Ejecutando migraciones..."
docker compose -p "dermicapro-${NEW_COLOR}" \
  -f "${REPO_DIR}/docker-compose.prod-${NEW_COLOR}.yml" \
  run --rm "backend-${NEW_COLOR}" sh -c "npx prisma migrate deploy"

# 4. Levantar nuevo color
echo "[deploy] Levantando stack $NEW_COLOR..."
docker compose -p "dermicapro-${NEW_COLOR}" \
  -f "${REPO_DIR}/docker-compose.prod-${NEW_COLOR}.yml" \
  up -d --no-build

# 5. Esperar backend healthy (máx 150s)
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
  echo "  ($i/30) backend=$STATUS"
  sleep 5
done

# 6. Esperar frontend healthy (máx 60s)
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
  echo "  ($i/12) frontend=$STATUS"
  sleep 5
done

# 7. Cambiar tráfico — Traefik detecta el archivo en ~1-2s sin reinicio
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

# 8. Drain 30s para que las conexiones activas del color viejo terminen
echo "[deploy] Drenando conexiones del stack $ACTIVE (30s)..."
sleep 30

# 9. Bajar color viejo
echo "[deploy] Bajando stack $ACTIVE..."
docker compose -p "dermicapro-${ACTIVE}" \
  -f "${REPO_DIR}/docker-compose.prod-${ACTIVE}.yml" down

docker image prune -f
echo "[deploy] ✓ Deploy completo. Activo: $NEW_COLOR"
