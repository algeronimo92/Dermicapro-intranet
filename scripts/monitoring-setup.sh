#!/usr/bin/env bash
# Crea (o repara) el rol de sólo lectura que usa postgres-exporter.
#
#   ./scripts/monitoring-setup.sh                  # crear o verificar
#   ./scripts/monitoring-setup.sh --rotate-secret  # generar contraseña nueva
#
# Es idempotente: se puede correr las veces que haga falta. Existe para que el
# rol no se cree copiando SQL a mano desde OBSERVABILIDAD.md, que es donde se
# cuela un GRANT de más y el exporter acaba conectándose con permisos de
# escritura sobre datos de pacientes.
#
# pg_monitor da acceso a todas las vistas de estadísticas (pg_stat_*) y a nada
# más: ni SELECT sobre las tablas de la aplicación, ni superuser.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${REPO_DIR}/.env}"

ROTATE=0
[ "${1:-}" = "--rotate-secret" ] && ROTATE=1

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: no existe ${ENV_FILE}. Copia .env.example y complétalo." >&2
  exit 1
fi

# El entorno explícito gana sobre .env. Sin esto el script sólo puede apuntar a
# la base que diga el fichero, y probarlo contra la de desarrollo obligaría a
# editar el .env de producción:
#   DB_HOST=dermicapro-db ./scripts/monitoring-setup.sh
OVERRIDE_DB_HOST="${DB_HOST:-}"
OVERRIDE_DB_NAME="${DB_NAME:-}"
OVERRIDE_DB_USER="${DB_USER:-}"

set -a; . "$ENV_FILE"; set +a

DB_CONTAINER="${OVERRIDE_DB_HOST:-${DB_HOST:-dermicapro-db-prod}}"
DB_NAME="${OVERRIDE_DB_NAME:-${DB_NAME:-dermicapro_db}}"
DB_OWNER="${OVERRIDE_DB_USER:-${DB_USER:-dermicapro}}"
EXPORTER_USER="${DB_EXPORTER_USER:-dermicapro_monitor}"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "ERROR: el contenedor '${DB_CONTAINER}' no está corriendo." >&2
  echo "       Ajusta DB_HOST en .env o levanta la base primero." >&2
  exit 1
fi

# El dueño de la base es quien puede crear roles; el exporter jamás.
psql_owner() {
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_OWNER" -d "$DB_NAME" "$@"
}

# -----------------------------------------------
# Contraseña
# -----------------------------------------------
# Hex para que la contraseña no necesite escaparse dentro del DSN de tipo URL
# que arma docker-compose.observability.yml.
if [ "$ROTATE" -eq 1 ]; then
  EXPORTER_PASSWORD="$(openssl rand -hex 24)"
  echo "[setup] Generando contraseña nueva para ${EXPORTER_USER}..."
elif [ -n "${DB_EXPORTER_PASSWORD:-}" ]; then
  EXPORTER_PASSWORD="$DB_EXPORTER_PASSWORD"
else
  EXPORTER_PASSWORD="$(openssl rand -hex 24)"
  echo "[setup] DB_EXPORTER_PASSWORD estaba vacía; generando una."
  ROTATE=1
fi

# -----------------------------------------------
# Rol
# -----------------------------------------------
# CREATE ROLE no admite IF NOT EXISTS, de ahí el bloque DO. El ALTER posterior
# corre siempre: así una ejecución con --rotate-secret repara también un rol que
# ya existía con otra contraseña.
echo "[setup] Aplicando rol ${EXPORTER_USER} en ${DB_NAME}..."
psql_owner <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${EXPORTER_USER}') THEN
    CREATE ROLE ${EXPORTER_USER} LOGIN;
  END IF;
END
\$\$;

ALTER ROLE ${EXPORTER_USER} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
  PASSWORD '${EXPORTER_PASSWORD}';

GRANT pg_monitor TO ${EXPORTER_USER};
GRANT CONNECT ON DATABASE ${DB_NAME} TO ${EXPORTER_USER};
SQL

# -----------------------------------------------
# Persistir la contraseña
# -----------------------------------------------
if [ "$ROTATE" -eq 1 ]; then
  if grep -q '^DB_EXPORTER_PASSWORD=' "$ENV_FILE"; then
    tmp="$(mktemp)"
    sed "s|^DB_EXPORTER_PASSWORD=.*|DB_EXPORTER_PASSWORD=${EXPORTER_PASSWORD}|" \
      "$ENV_FILE" > "$tmp"
    cat "$tmp" > "$ENV_FILE"   # conserva permisos y dueño del .env original
    rm -f "$tmp"
  else
    printf '\nDB_EXPORTER_PASSWORD=%s\n' "$EXPORTER_PASSWORD" >> "$ENV_FILE"
  fi
  echo "[setup] .env actualizado."
fi

# -----------------------------------------------
# Verificación
# -----------------------------------------------
# Comprobar que el rol conecta y ve las vistas de estadísticas. Sin esto el
# fallo aparecería más tarde y en silencio: postgres-exporter arranca igual y
# sólo deja de publicar métricas, así que la única señal sería que los paneles
# de PostgreSQL están vacíos.
echo "[setup] Verificando acceso..."
if docker exec -i -e PGPASSWORD="$EXPORTER_PASSWORD" "$DB_CONTAINER" \
     psql -v ON_ERROR_STOP=1 -U "$EXPORTER_USER" -d "$DB_NAME" \
     -tAc 'SELECT count(*) FROM pg_stat_database' > /dev/null 2>&1; then
  echo "[setup] OK: ${EXPORTER_USER} conecta y lee pg_stat_*."
else
  echo "ERROR: ${EXPORTER_USER} no consigue conectar o leer las estadísticas." >&2
  echo "       Revisa pg_hba.conf del contenedor ${DB_CONTAINER}." >&2
  exit 1
fi

# Que NO pueda leer datos de pacientes es el motivo entero de este script, así
# que se comprueba explícitamente en vez de asumirlo del GRANT.
if docker exec -i -e PGPASSWORD="$EXPORTER_PASSWORD" "$DB_CONTAINER" \
     psql -U "$EXPORTER_USER" -d "$DB_NAME" \
     -tAc 'SELECT 1 FROM patients LIMIT 1' > /dev/null 2>&1; then
  echo "AVISO: ${EXPORTER_USER} puede leer la tabla patients." >&2
  echo "       Tiene más permisos de los que necesita. Revisa GRANTs previos" >&2
  echo "       y los privilegios por defecto de PUBLIC en el esquema." >&2
else
  echo "[setup] OK: ${EXPORTER_USER} no tiene acceso a los datos de la aplicación."
fi

if [ "$ROTATE" -eq 1 ]; then
  echo
  echo "Recrea el exporter para que tome la contraseña nueva:"
  echo "  make obs-up"
fi
