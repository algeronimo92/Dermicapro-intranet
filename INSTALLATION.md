# Installation Guide - DermicaPro

Complete step-by-step installation guide for DermicaPro clinic management system.

---

## System Requirements

- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher
- **npm**: 9.x or higher
- **Operating System**: macOS, Linux, or Windows
- **RAM**: 4GB minimum
- **Disk Space**: 500MB free space

---

## Pre-Installation Checklist

Run the verification script to check your system:

```bash
cd dermicapro
./verify-setup.sh
```

---

## Step 1: Install Prerequisites

### macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14
```

### Linux (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows

1. Download and install Node.js from [nodejs.org](https://nodejs.org/)
2. Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)

---

## Step 2: Create Database

### macOS/Linux

```bash
# Create database
createdb dermicapro

# Verify
psql -l | grep dermicapro
```

### Windows

```cmd
# Open psql (comes with PostgreSQL)
psql -U postgres

# Inside psql:
CREATE DATABASE dermicapro;
\q
```

---

## Step 3: Backend Setup

```bash
# Navigate to backend
cd dermicapro/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Configure .env File

Open `backend/.env` and update:

```env
# Database connection
DATABASE_URL="postgresql://username:password@localhost:5432/dermicapro?schema=public"

# JWT secrets (change these in production!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"

# Server
PORT=3000
NODE_ENV="development"

# Frontend URL
CORS_ORIGIN="http://localhost:5173"
```

**Important:** Replace `username` and `password` with your PostgreSQL credentials.

### Initialize Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with initial data
npm run prisma:seed
```

You should see:
```
Admin user created: admin@dermicapro.com
Nurse user created: enfermera@dermicapro.com
Sales user created: ventas@dermicapro.com
7 services created
Seed completed!
```

### Start Backend Server

```bash
npm run dev
```

You should see:
```
Database connected successfully
Server running on port 3000
Environment: development
```

**Keep this terminal open!**

---

## Step 4: Frontend Setup

Open a **NEW terminal** window:

```bash
# Navigate to frontend
cd dermicapro/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 5: Verify Installation

### Check Backend Health

```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{"status":"OK","timestamp":"2024-12-02T..."}
```

### Check Frontend

Open your browser to: **http://localhost:5173**

You should see the DermicaPro login page.

---

## Step 6: Test Login

Use these credentials to test each role:

### Admin User
- **Email:** admin@dermicapro.com
- **Password:** admin123

### Nurse User
- **Email:** enfermera@dermicapro.com
- **Password:** nurse123

### Sales User
- **Email:** ventas@dermicapro.com
- **Password:** sales123

---

## Troubleshooting

### Backend won't start

**Error: "Can't reach database server"**

```bash
# Check if PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Start PostgreSQL
brew services start postgresql@14  # macOS
sudo systemctl start postgresql  # Linux
```

**Error: "Port 3000 already in use"**

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or change port in backend/.env
PORT=3001
```

**Error: "DATABASE_URL is not set"**

```bash
# Make sure .env file exists
cd backend
ls -la .env

# If missing, copy from example
cp .env.example .env
```

### Frontend won't start

**Error: "Module not found"**

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Error: "Port 5173 already in use"**

```bash
# Kill the process
lsof -ti:5173 | xargs kill -9
```

### Database Issues

**Reset database completely:**

```bash
cd backend
npx prisma migrate reset
npm run prisma:seed
```

**View database in browser:**

```bash
npm run prisma:studio
```

This opens Prisma Studio at http://localhost:5555

### Login Issues

**Error: "Invalid credentials"**

Make sure you've run the seed:
```bash
cd backend
npm run prisma:seed
```

**Error: "Token expired"**

Clear browser localStorage:
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Clear Local Storage
4. Refresh page

---

## Optional: VS Code Setup

### Recommended Extensions

1. **ESLint** - Code linting
2. **Prettier** - Code formatting
3. **Prisma** - Database schema support
4. **ES7+ React/Redux** - React snippets

### Install Extensions

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension Prisma.prisma
code --install-extension dsznajder.es7-react-js-snippets
```

---

## Development Workflow

### Daily Development

**Terminal 1 - Backend:**
```bash
cd dermicapro/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd dermicapro/frontend
npm run dev
```

**Optional Terminal 3 - Database GUI:**
```bash
cd dermicapro/backend
npm run prisma:studio
```

### Making Database Changes

1. Edit `backend/prisma/schema.prisma`
2. Create migration:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```
3. Prisma Client will auto-regenerate

### Adding New API Endpoints

1. Create controller in `backend/src/controllers/`
2. Create route in `backend/src/routes/`
3. Add route to `backend/src/routes/index.ts`
4. Test with curl or Postman

---

## Production Deployment

### Environment Variables for Production

**Backend:**
```env
NODE_ENV="production"
DATABASE_URL="your-production-database-url"
JWT_SECRET="strong-random-secret-minimum-32-chars"
JWT_REFRESH_SECRET="another-strong-random-secret"
CORS_ORIGIN="https://your-frontend-domain.com"
```

**Frontend:**
```env
VITE_API_URL="https://your-api-domain.com/api"
```

### Build for Production

**Backend:**
```bash
cd backend
npm run build
npm run start
```

**Frontend:**
```bash
cd frontend
npm run build
# dist/ folder contains production files
```

### Recommended Hosting

- **Backend:** Railway, Render, DigitalOcean
- **Database:** Supabase, Railway, Neon
- **Frontend:** Vercel, Netlify, Cloudflare Pages
- **Files:** AWS S3, Cloudinary, DigitalOcean Spaces

---

## Getting Help

1. Check [README.md](./README.md) for comprehensive documentation
2. Check [QUICK_START.md](./QUICK_START.md) for common issues
3. Review [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for architecture
4. Run `./verify-setup.sh` to diagnose issues

---

## Next Steps After Installation

1. ✅ System installed and running
2. 📝 Customize services and prices (Prisma Studio)
3. 👥 Create real user accounts
4. 🎨 Customize UI/UX
5. 📊 Build dashboard components
6. 🚀 Deploy to production

---

**Congratulations! DermicaPro is now ready to use.**
