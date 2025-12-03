#!/bin/bash

echo "=========================================="
echo "  DermicaPro Setup Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Found $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found"
    echo "  Install from: https://nodejs.org/"
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} Found v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
fi

# Check PostgreSQL
echo -n "Checking PostgreSQL... "
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    echo -e "${GREEN}✓${NC} Found v$PSQL_VERSION"
else
    echo -e "${RED}✗${NC} PostgreSQL not found"
    echo "  macOS: brew install postgresql@14"
    echo "  Linux: sudo apt-get install postgresql"
fi

echo ""
echo "=========================================="
echo "  Backend Setup"
echo "=========================================="

# Check backend dependencies
cd backend 2>/dev/null
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Backend dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Backend dependencies not installed"
    echo "  Run: cd backend && npm install"
fi

# Check .env
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
else
    echo -e "${YELLOW}⚠${NC} .env file missing"
    echo "  Run: cp .env.example .env"
fi

# Check Prisma Client
if [ -d "node_modules/.prisma" ]; then
    echo -e "${GREEN}✓${NC} Prisma Client generated"
else
    echo -e "${YELLOW}⚠${NC} Prisma Client not generated"
    echo "  Run: npm run prisma:generate"
fi

cd ..

echo ""
echo "=========================================="
echo "  Frontend Setup"
echo "=========================================="

# Check frontend dependencies
cd frontend 2>/dev/null
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Frontend dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Frontend dependencies not installed"
    echo "  Run: cd frontend && npm install"
fi

cd ..

echo ""
echo "=========================================="
echo "  Next Steps"
echo "=========================================="
echo ""
echo "1. If PostgreSQL is not running:"
echo "   macOS: brew services start postgresql@14"
echo "   Linux: sudo systemctl start postgresql"
echo ""
echo "2. Create database:"
echo "   createdb dermicapro"
echo ""
echo "3. Setup backend:"
echo "   cd backend"
echo "   npm install"
echo "   cp .env.example .env"
echo "   npm run prisma:generate"
echo "   npm run prisma:migrate"
echo "   npm run prisma:seed"
echo "   npm run dev"
echo ""
echo "4. Setup frontend (new terminal):"
echo "   cd frontend"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "5. Open http://localhost:5173"
echo ""
echo "=========================================="
