#!/bin/bash

# ================================
# DermicaPro - Script de Inicio Rápido
# ================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  DermicaPro - Docker Setup${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker no está instalado${NC}"
    echo "Instala Docker desde: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose no está instalado${NC}"
    echo "Instala Docker Compose desde: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker está instalado${NC}"
echo -e "${GREEN}✓ Docker Compose está instalado${NC}"
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creando archivo .env...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Archivo .env creado${NC}"
    echo -e "${YELLOW}⚠ Revisa y actualiza .env con tus valores si es necesario${NC}"
    echo ""
else
    echo -e "${GREEN}✓ Archivo .env existe${NC}"
    echo ""
fi

# Build images
echo -e "${BLUE}Construyendo imágenes Docker...${NC}"
docker compose build

# Start services
echo -e "${BLUE}Iniciando servicios...${NC}"
docker compose up -d

# Wait for database to be ready
echo -e "${BLUE}Esperando a que la base de datos esté lista...${NC}"
sleep 10

# Run migrations
echo -e "${BLUE}Ejecutando migraciones de Prisma...${NC}"
docker compose exec backend npx prisma migrate deploy

# Run seed (optional, uncomment if needed)
# echo -e "${BLUE}Ejecutando seed de base de datos...${NC}"
# docker compose exec backend npm run prisma:seed

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DermicaPro iniciado correctamente!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Frontend:      ${BLUE}http://localhost:5173${NC}"
echo -e "  Backend API:   ${BLUE}http://localhost:5000${NC}"
echo -e "  Base de datos: ${BLUE}localhost:5432${NC}"
echo ""
echo -e "${YELLOW}Comandos útiles:${NC}"
echo -e "  Ver logs:           ${BLUE}docker compose logs -f${NC}"
echo -e "  Detener servicios:  ${BLUE}docker compose down${NC}"
echo -e "  Reiniciar:          ${BLUE}docker compose restart${NC}"
echo -e "  Abrir Prisma Studio:${BLUE}make studio${NC}"
echo ""
echo -e "${GREEN}Para más información, consulta DOCKER-README.md${NC}"
