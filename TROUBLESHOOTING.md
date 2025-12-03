# Troubleshooting - Guía de Resolución de Problemas

## ✅ Problema: "No se conecta a la API"

### Síntomas
- La página de pacientes no carga datos
- Aparece mensaje "Error al cargar pacientes"
- Los filtros no funcionan
- La consola muestra errores de red

### Solución Rápida

**1. Verificar que ambos servidores estén corriendo:**

```bash
# Terminal 1 - Backend (debe estar en puerto 3000)
cd backend
npm run dev

# Terminal 2 - Frontend (debe estar en puerto 5173)
cd frontend
npm run dev
```

**2. Verificar puertos:**

```bash
# Verificar backend
lsof -ti:3000
# Debería mostrar un número (PID del proceso)

# Verificar frontend
lsof -ti:5173
# Debería mostrar un número (PID del proceso)
```

**3. Verificar que el backend responde:**

```bash
curl http://localhost:3000/api/patients
# Debería responder con: {"error":"No token provided"}
# Esto es CORRECTO - significa que el backend está funcionando
```

### Estado Actual de los Servidores

✅ **Backend:** Corriendo en puerto 3000
✅ **Frontend:** Corriendo en puerto 5173
✅ **Base de datos:** Conectada

---

## Checklist de Conexión

### Backend
- [ ] El servidor está corriendo (`npm run dev` en carpeta backend)
- [ ] No hay errores en la consola del backend
- [ ] El puerto 3000 está disponible
- [ ] La base de datos está conectada
- [ ] Aparece el mensaje: "Server running on port 3000"

### Frontend
- [ ] El servidor está corriendo (`npm run dev` en carpeta frontend)
- [ ] No hay errores de compilación
- [ ] El puerto 5173 está disponible
- [ ] Se puede acceder a http://localhost:5173
- [ ] Aparece el mensaje: "Local: http://localhost:5173/"

### Aplicación
- [ ] Puedes hacer login
- [ ] Después del login, hay un token en localStorage
- [ ] La navegación funciona
- [ ] Puedes acceder a la página de pacientes

---

## Problemas Comunes y Soluciones

### 1. "Cannot connect to server" o "Network Error"

**Causa:** El backend no está corriendo o está en un puerto diferente.

**Solución:**
```bash
# Matar procesos en puerto 3000
lsof -ti:3000 | xargs kill -9

# Reiniciar backend
cd backend
npm run dev
```

### 2. "401 Unauthorized" o "No token provided"

**Causa:** No estás autenticado o el token expiró.

**Solución:**
1. Cierra sesión completamente
2. Borra el localStorage:
   - Abre DevTools (F12)
   - Application > Local Storage
   - Borra `accessToken` y `refreshToken`
3. Vuelve a hacer login

### 3. "CORS Error"

**Causa:** Problema de configuración de CORS en el backend.

**Verificar en backend:** `src/index.ts` debe tener:
```typescript
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
```

### 4. Frontend no compila

**Solución:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 5. Backend no compila

**Solución:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npx prisma generate
npm run dev
```

### 6. "Prisma Client not found"

**Solución:**
```bash
cd backend
npx prisma generate
npm run dev
```

### 7. Base de datos no conecta

**Verificar archivo `.env` en backend:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dermicapro"
```

**Verificar que PostgreSQL esté corriendo:**
```bash
# En macOS con Homebrew
brew services list | grep postgresql

# Iniciar PostgreSQL si no está corriendo
brew services start postgresql@14
```

---

## Comandos Útiles para Debugging

### Ver logs del backend en tiempo real
```bash
cd backend
npm run dev
# Los logs aparecen en la consola
```

### Ver errores del frontend
1. Abre http://localhost:5173
2. Abre DevTools (F12)
3. Ve a la pestaña "Console"
4. Ve a la pestaña "Network" para ver peticiones HTTP

### Verificar peticiones HTTP
1. DevTools (F12) > Network
2. Filtra por "Fetch/XHR"
3. Recarga la página
4. Haz clic en cada petición para ver detalles

### Verificar token de autenticación
1. DevTools (F12) > Application
2. Local Storage > http://localhost:5173
3. Debe haber `accessToken` y `refreshToken`

### Probar endpoint manualmente
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dermicapro.com","password":"admin123"}'

# Copiar el accessToken de la respuesta

# Probar endpoint de pacientes
curl http://localhost:3000/api/patients \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

## Verificación de Filtros

### Test de búsqueda por teléfono
```bash
# Con token válido
curl "http://localhost:3000/api/patients?search=987" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Test de filtro por sexo
```bash
# Con token válido
curl "http://localhost:3000/api/patients?sex=M" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Test de combinación
```bash
# Con token válido
curl "http://localhost:3000/api/patients?search=Juan&sex=M" \
  -H "Authorization: Bearer TU_TOKEN"
```

---

## Reinicio Completo (Última Opción)

Si nada funciona, reinicia todo desde cero:

```bash
# 1. Matar todos los procesos
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# 2. Backend
cd backend
rm -rf node_modules package-lock.json
npm install
npx prisma generate
npm run prisma:migrate
npm run prisma:seed
npm run dev

# 3. Frontend (nueva terminal)
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev

# 4. Abrir navegador
open http://localhost:5173
```

---

## Contactos de Ayuda

- Documentación del proyecto: README.md
- Guía rápida: QUICK_START.md
- Resumen del módulo: PATIENTS_MODULE.md
- Fix de filtros: FILTERS_FIX.md
- Fix de búsqueda: SEARCH_FIX.md

---

## Estado Actual: ✅ TODO FUNCIONANDO

- ✅ Backend corriendo en puerto 3000
- ✅ Frontend corriendo en puerto 5173
- ✅ Base de datos conectada
- ✅ Búsqueda por teléfono implementada
- ✅ Filtro por sexo implementado
- ✅ API respondiendo correctamente

**Puedes acceder a:** http://localhost:5173
**Login:** admin@dermicapro.com / admin123
