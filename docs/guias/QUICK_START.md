# Quick Start Guide - DermicaPro

## Inicio Rápido (5 minutos)

### 1. Instalar PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
createdb dermicapro
```

**Windows:**
Descarga PostgreSQL desde [postgresql.org](https://www.postgresql.org/download/)

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb dermicapro
```

### 2. Backend Setup

```bash
cd dermicapro/backend

# Instalar
npm install

# Configurar
cp .env.example .env

# Editar .env (cambiar solo si es necesario):
# DATABASE_URL="postgresql://username:password@localhost:5432/dermicapro"

# Inicializar base de datos
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Iniciar
npm run dev
```

✅ Backend corriendo en http://localhost:3000

### 3. Frontend Setup

**Abrir una nueva terminal:**

```bash
cd dermicapro/frontend

# Instalar
npm install

# Iniciar
npm run dev
```

✅ Frontend corriendo en http://localhost:5173

### 4. Probar la Aplicación

Abre http://localhost:5173 y usa estas credenciales:

**Admin:**
- Email: `admin@dermicapro.com`
- Password: `admin123`

**Enfermera:**
- Email: `enfermera@dermicapro.com`
- Password: `nurse123`

**Ventas:**
- Email: `ventas@dermicapro.com`
- Password: `sales123`

---

## Flujos de Trabajo Principales

### 1. Ventas: Registrar una Cita

1. Login como ventas
2. Ir a "Pacientes" → Crear nuevo paciente
3. Ir a "Citas" → Nueva cita
4. Seleccionar paciente, servicio, fecha y monto de separación
5. Subir foto del comprobante

### 2. Enfermera: Atender Paciente

1. Login como enfermera
2. Ver citas del día
3. Seleccionar paciente
4. Revisar historial médico
5. Marcar como "Atendida"
6. Registrar sesión:
   - Subir fotos antes/después
   - Registrar peso y medidas
   - Número de sesión (ej: 2/5)
   - Monto pagado
   - Notas del tratamiento

### 3. Admin: Ver Dashboard

1. Login como admin
2. Ver estadísticas generales
3. Revisar comisiones pendientes
4. Aprobar y marcar comisiones como pagadas

---

## Estructura de la Base de Datos

```
Users (usuarios del sistema)
  ↓
Patients (pacientes/clientes)
  ↓
Appointments (citas)
  ↓
TreatmentSessions (sesiones de tratamiento)
  ↓
PatientRecords (historiales con fotos)

Commissions (comisiones de ventas)
```

---

## Comandos Útiles

### Backend

```bash
# Ver base de datos en navegador
npm run prisma:studio

# Reset completo de base de datos
npx prisma migrate reset

# Ver logs del servidor
npm run dev

# Compilar para producción
npm run build
npm run start
```

### Frontend

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview del build
npm run preview
```

---

## Troubleshooting

### Error: "Can't reach database"

```bash
# Verificar que PostgreSQL esté corriendo
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Verificar DATABASE_URL en .env
# Debe ser: postgresql://USER:PASS@localhost:5432/dermicapro
```

### Error: "Port 3000 already in use"

```bash
# Cambiar puerto en backend/.env
PORT=3001

# O matar el proceso
lsof -ti:3000 | xargs kill -9
```

### Error: "Module not found"

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Frontend no conecta con Backend

```bash
# Verificar que backend esté corriendo en puerto 3000
curl http://localhost:3000/api/health

# Verificar proxy en frontend/vite.config.ts
```

---

## API Testing con curl

```bash
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dermicapro.com","password":"admin123"}'

# Listar pacientes (necesita token)
curl http://localhost:3000/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Próximos Pasos

1. ✅ Sistema funcionando localmente
2. 📝 Personalizar servicios y precios
3. 👥 Crear usuarios reales
4. 🎨 Mejorar UI/UX (agregar CSS framework como Tailwind)
5. 📊 Implementar dashboard con gráficos
6. 🚀 Desplegar a producción

---

## Recursos Adicionales

- **Prisma Docs:** https://www.prisma.io/docs
- **React Router:** https://reactrouter.com
- **Express.js:** https://expressjs.com
- **PostgreSQL:** https://www.postgresql.org/docs

---

## Contacto

Para dudas o soporte técnico, consulta el README.md principal.
