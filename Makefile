# ================================
# DermicaPro - Docker Makefile
# ================================
# Simplifica comandos de Docker Compose

.PHONY: help build up down restart logs clean migrate seed studio test \
        obs-secrets obs-check obs-up obs-down obs-restart obs-ps obs-logs \
        obs-reload obs-targets obs-alerts obs-clean obs-db-role obs-db-role-rotate

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Mostrar ayuda
	@echo "$(GREEN)DermicaPro - Comandos Docker$(NC)"
	@echo ""
	@echo "$(BLUE)Uso:$(NC) make [comando]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

init: ## Inicializar proyecto (primera vez)
	@echo "$(GREEN)Inicializando proyecto DermicaPro...$(NC)"
	@if [ ! -f .env ]; then cp .env.example .env && echo "$(GREEN)✓ Archivo .env creado$(NC)"; else echo "$(YELLOW)⚠ .env ya existe$(NC)"; fi
	@docker compose build
	@docker compose up -d
	@echo "$(GREEN)Esperando a que la base de datos esté lista...$(NC)"
	@sleep 10
	@docker compose exec backend npx prisma migrate deploy
	@docker compose exec backend npx prisma db seed
	@echo ""
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)  DermicaPro iniciado correctamente!$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo ""
	@echo "  Frontend:      $(BLUE)http://localhost:5173$(NC)"
	@echo "  Backend API:   $(BLUE)http://localhost:5000$(NC)"
	@echo "  Prisma Studio: $(BLUE)make studio$(NC)"
	@echo ""

build: ## Construir imágenes Docker
	@echo "$(GREEN)Construyendo imágenes...$(NC)"
	@docker compose build

build-no-cache: ## Construir sin caché
	@echo "$(GREEN)Construyendo sin caché...$(NC)"
	@docker compose build --no-cache

up: ## Iniciar servicios
	@echo "$(GREEN)Iniciando servicios...$(NC)"
	@docker compose up -d
	@echo "$(GREEN)Servicios iniciados!$(NC)"
	@make ps

down: ## Detener servicios
	@echo "$(YELLOW)Deteniendo servicios...$(NC)"
	@docker compose down
	@echo "$(GREEN)Servicios detenidos$(NC)"

restart: ## Reiniciar servicios
	@echo "$(YELLOW)Reiniciando servicios...$(NC)"
	@docker compose restart
	@echo "$(GREEN)Servicios reiniciados!$(NC)"

ps: ## Ver estado de servicios
	@docker compose ps

logs: ## Ver logs de todos los servicios
	@docker compose logs -f

logs-backend: ## Ver logs del backend
	@docker compose logs -f backend

logs-frontend: ## Ver logs del frontend
	@docker compose logs -f frontend

logs-db: ## Ver logs de la base de datos
	@docker compose logs -f db

shell-backend: ## Entrar al contenedor backend
	@docker compose exec backend sh

shell-frontend: ## Entrar al contenedor frontend
	@docker compose exec frontend sh

shell-db: ## Entrar a PostgreSQL
	@docker compose exec db psql -U $(shell grep DB_USER .env | cut -d '=' -f2) -d $(shell grep DB_NAME .env | cut -d '=' -f2)

migrate: ## Ejecutar migraciones de Prisma
	@echo "$(GREEN)Ejecutando migraciones...$(NC)"
	@docker compose exec backend npx prisma migrate deploy
	@echo "$(GREEN)Migraciones completadas!$(NC)"

migrate-create: ## Crear nueva migración (uso: make migrate-create name=nombre)
	@if [ -z "$(name)" ]; then \
		echo "$(RED)Error: Especifica el nombre de la migración$(NC)"; \
		echo "Uso: make migrate-create name=nombre_migracion"; \
		exit 1; \
	fi
	@echo "$(GREEN)Creando migración: $(name)$(NC)"
	@docker compose exec backend npx prisma migrate dev --name $(name)

migrate-reset: ## Resetear base de datos (CUIDADO: elimina datos)
	@echo "$(RED)ADVERTENCIA: Esto eliminará todos los datos!$(NC)"
	@read -p "¿Estás seguro? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose exec backend npx prisma migrate reset --force; \
		echo "$(GREEN)Base de datos reseteada$(NC)"; \
	else \
		echo "$(YELLOW)Operación cancelada$(NC)"; \
	fi

seed: ## Ejecutar seed de base de datos
	@echo "$(GREEN)Ejecutando seed...$(NC)"
	@docker compose exec backend npm run prisma:seed
	@echo "$(GREEN)Seed completado!$(NC)"

studio: ## Abrir Prisma Studio
	@echo "$(GREEN)Abriendo Prisma Studio...$(NC)"
	@docker compose --profile tools up -d prisma-studio
	@echo "$(GREEN)Prisma Studio disponible en: $(BLUE)http://localhost:5555$(NC)"
	@sleep 2
	@open http://localhost:5555 2>/dev/null || xdg-open http://localhost:5555 2>/dev/null || echo "Abre http://localhost:5555 en tu navegador"

studio-stop: ## Detener Prisma Studio
	@docker compose --profile tools stop prisma-studio

test: ## Ejecutar tests
	@echo "$(GREEN)Ejecutando tests...$(NC)"
	@docker compose exec backend npm test
	@docker compose exec frontend npm test

test-backend: ## Ejecutar tests del backend
	@docker compose exec backend npm test

test-frontend: ## Ejecutar tests del frontend
	@docker compose exec frontend npm test

test-coverage: ## Ejecutar tests con coverage
	@docker compose exec backend npm run test:coverage
	@docker compose exec frontend npm run test:coverage

backup-db: ## Backup de base de datos
	@echo "$(GREEN)Creando backup...$(NC)"
	@mkdir -p backups
	@docker compose exec db pg_dump -U $(shell grep DB_USER .env | cut -d '=' -f2) $(shell grep DB_NAME .env | cut -d '=' -f2) > backups/backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "$(GREEN)Backup creado en backups/$(NC)"

restore-db: ## Restaurar backup (uso: make restore-db file=backup.sql)
	@if [ -z "$(file)" ]; then \
		echo "$(RED)Error: Especifica el archivo de backup$(NC)"; \
		echo "Uso: make restore-db file=backups/backup-20240101-120000.sql"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restaurando backup: $(file)$(NC)"
	@docker compose exec -T db psql -U $(shell grep DB_USER .env | cut -d '=' -f2) $(shell grep DB_NAME .env | cut -d '=' -f2) < $(file)
	@echo "$(GREEN)Backup restaurado!$(NC)"

clean: ## Limpiar contenedores y volúmenes (CUIDADO: elimina datos)
	@echo "$(RED)ADVERTENCIA: Esto eliminará todos los contenedores y volúmenes!$(NC)"
	@read -p "¿Estás seguro? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		echo "$(GREEN)Limpieza completada$(NC)"; \
	else \
		echo "$(YELLOW)Operación cancelada$(NC)"; \
	fi

clean-all: ## Limpiar todo (contenedores, volúmenes, imágenes)
	@echo "$(RED)ADVERTENCIA: Esto eliminará TODO (contenedores, volúmenes, imágenes)!$(NC)"
	@read -p "¿Estás seguro? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v --rmi all; \
		docker system prune -af --volumes; \
		echo "$(GREEN)Limpieza total completada$(NC)"; \
	else \
		echo "$(YELLOW)Operación cancelada$(NC)"; \
	fi

stats: ## Ver uso de recursos
	@docker stats --no-stream

prod-build: ## Build para producción
	@echo "$(GREEN)Construyendo para producción...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.prod.yml build
	@echo "$(GREEN)Build de producción completado!$(NC)"

prod-up: ## Iniciar en modo producción
	@echo "$(GREEN)Iniciando en modo producción...$(NC)"
	@docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "$(GREEN)Servicios de producción iniciados!$(NC)"

prod-down: ## Detener modo producción
	@docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# ================================
# Observabilidad (Grafana + Loki + Prometheus)
# ================================
# Stack independiente: se levanta con su propio project name para que los
# deploys blue-green no lo toquen.

OBS := docker compose -p dermicapro-obs -f docker-compose.observability.yml

obs-secrets: ## Generar ficheros de secretos del stack de observabilidad
	@set -a; . ./.env; set +a; \
	if [ -z "$$METRICS_TOKEN" ]; then \
		echo "$(RED)Falta METRICS_TOKEN en .env$(NC)"; \
		echo "Genera uno con: $(YELLOW)openssl rand -hex 32$(NC)"; \
		exit 1; \
	fi; \
	if [ -n "$$DB_EXPORTER_USER" ] && [ -z "$$DB_EXPORTER_PASSWORD" ]; then \
		echo "$(RED)DB_EXPORTER_USER está definido pero DB_EXPORTER_PASSWORD está vacía$(NC)"; \
		echo "El DSN caería a la contraseña del dueño de la base, el exporter no"; \
		echo "podría conectar y saltaría PostgresCaido (critical) siendo falso."; \
		echo "Crea el rol y rellena la contraseña con: $(YELLOW)make obs-db-role-rotate$(NC)"; \
		exit 1; \
	fi; \
	printf '%s' "$$METRICS_TOKEN" > observability/prometheus/metrics_token; \
	printf '%s' "$${N8N_ALERT_WEBHOOK:?define N8N_ALERT_WEBHOOK en .env}" > observability/alertmanager/n8n_webhook_url; \
	chmod 644 observability/prometheus/metrics_token observability/alertmanager/n8n_webhook_url; \
	echo "$(GREEN)Secretos generados$(NC)"

# NOTA sobre el 644: Alertmanager y Prometheus corren como nobody (UID 65534),
# que no coincide con ningún usuario del host. Con 600 y el fichero en manos de
# root, el proceso no puede leerlo: Alertmanager no sólo falla la notificación,
# se cae con un nil pointer al intentar usar url_file. Mismo criterio que
# cualquier .env de este repo: sólo root escribe, todos pueden leer.

obs-db-role: ## Crear/verificar el rol de sólo lectura de postgres-exporter
	@./scripts/monitoring-setup.sh

obs-db-role-rotate: ## Rotar la contraseña del rol de postgres-exporter
	@./scripts/monitoring-setup.sh --rotate-secret

obs-check: obs-secrets ## Validar configs de Prometheus, Alertmanager y Alloy
	@echo "$(BLUE)Prometheus y reglas de alerta...$(NC)"
	@docker run --rm -v "$(CURDIR)/observability/prometheus:/etc/prometheus:ro" \
		--entrypoint promtool prom/prometheus:v3.2.1 \
		check config /etc/prometheus/prometheus.yml
	@echo "$(BLUE)Alertmanager...$(NC)"
	@docker run --rm -v "$(CURDIR)/observability/alertmanager:/etc/alertmanager:ro" \
		--entrypoint amtool prom/alertmanager:v0.28.1 \
		check-config /etc/alertmanager/alertmanager.yml
	@echo "$(BLUE)Alloy...$(NC)"
	@docker run --rm -v "$(CURDIR)/observability/alloy:/cfg:ro" grafana/alloy:v1.7.5 \
		fmt /cfg/config.alloy > /dev/null
	@echo "$(BLUE)Dashboards de Grafana...$(NC)"
	@# Se prueba a ejecutar el intérprete, no sólo a localizarlo: en Windows
	@# 'command -v python3' encuentra el stub de la Microsoft Store, que existe
	@# como fichero pero no es Python y hace fallar el check entero.
	@if python3 -c "pass" > /dev/null 2>&1; then \
		for f in observability/grafana/dashboards/*.json; do \
			python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$$f" || exit 1; \
		done; \
	elif node -e "0" > /dev/null 2>&1; then \
		for f in observability/grafana/dashboards/*.json; do \
			node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$$f" || exit 1; \
		done; \
	else \
		echo "$(YELLOW)  (omitido: no hay python3 ni node)$(NC)"; \
	fi
	@echo "$(GREEN)Todas las configuraciones son válidas$(NC)"

obs-up: obs-secrets ## Iniciar stack de observabilidad
	@echo "$(GREEN)Iniciando observabilidad...$(NC)"
	@$(OBS) up -d
	@echo ""
	@set -a; . ./.env; set +a; \
	echo "  Grafana:   $(BLUE)https://$${GRAFANA_DOMAIN:-grafana.dermicapro.app}$(NC)"
	@echo "  Túnel SSH: $(BLUE)ssh -L 3000:localhost:3000 <vps>  →  http://localhost:3000$(NC)"
	@echo ""

obs-down: ## Detener stack de observabilidad (conserva los datos)
	@$(OBS) down

obs-restart: ## Reiniciar stack de observabilidad
	@$(OBS) restart

obs-ps: ## Ver estado del stack de observabilidad
	@$(OBS) ps

obs-logs: ## Ver logs del stack de observabilidad
	@$(OBS) logs -f --tail=100

obs-reload: ## Recargar configuración de Prometheus sin reiniciar
	@$(OBS) exec prometheus wget --quiet --post-data='' -O - http://localhost:9090/-/reload \
		&& echo "$(GREEN)Configuración recargada$(NC)"

obs-targets: ## Ver qué targets está scrapeando Prometheus
	@$(OBS) exec prometheus wget -qO - 'http://localhost:9090/api/v1/targets?state=any' \
		| python3 -m json.tool 2>/dev/null || $(OBS) exec prometheus wget -qO - 'http://localhost:9090/api/v1/targets?state=any'

obs-alerts: ## Ver alertas activas
	@$(OBS) exec alertmanager wget -qO - http://localhost:9093/api/v2/alerts \
		| python3 -m json.tool 2>/dev/null || $(OBS) exec alertmanager wget -qO - http://localhost:9093/api/v2/alerts

obs-clean: ## Eliminar el stack de observabilidad Y SUS DATOS (métricas e histórico de logs)
	@echo "$(RED)ADVERTENCIA: esto borra el histórico de métricas y logs!$(NC)"
	@read -p "¿Estás seguro? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(OBS) down -v; \
		echo "$(GREEN)Stack de observabilidad eliminado$(NC)"; \
	else \
		echo "$(YELLOW)Operación cancelada$(NC)"; \
	fi
