# ================================
# DermicaPro - Docker Makefile
# ================================
# Simplifica comandos de Docker Compose

.PHONY: help build up down restart logs clean migrate seed studio test

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
