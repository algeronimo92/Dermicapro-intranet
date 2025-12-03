# Inicio Rápido - Módulo de Pacientes

## 🚀 Arranque Rápido (5 minutos)

### 1. Asegúrate que el backend esté corriendo
```bash
# Terminal 1
cd backend
npm run dev
```
Deberías ver: `Server running on port 3000`

### 2. Inicia el frontend
```bash
# Terminal 2
cd frontend
npm run dev
```
Deberías ver: `Local: http://localhost:5173/`

### 3. Abre el navegador
- Navega a: **http://localhost:5173**
- Login con: **admin@dermicapro.com** / **admin123**
- Haz clic en **"Pacientes"** en el menú lateral

---

## 🎯 Prueba Rápida del Módulo

### Test 1: Ver Lista de Pacientes
1. Clic en "Pacientes" en el menú
2. Deberías ver la lista de pacientes con paginación
3. Prueba la búsqueda escribiendo un nombre
4. Prueba el filtro por sexo

### Test 2: Crear Paciente
1. Clic en "Nuevo Paciente"
2. Llena el formulario:
   - **Nombres:** Juan Carlos
   - **Apellidos:** Pérez García
   - **DNI:** 12345678
   - **Fecha de Nacimiento:** 1990-01-15
   - **Sexo:** Masculino
   - **Teléfono:** 987654321
   - **Email:** juan@email.com
3. Clic en "Crear Paciente"
4. Deberías ser redirigido a la lista

### Test 3: Ver Detalle
1. En la lista, haz clic en cualquier paciente
2. Verás toda la información del paciente
3. Nota los botones de acción disponibles

### Test 4: Editar Paciente
1. En el detalle del paciente, clic en "Editar"
2. Modifica algún campo (por ejemplo, el teléfono)
3. Clic en "Guardar Cambios"
4. Verás los cambios reflejados

### Test 5: Eliminar Paciente (Solo Admin)
1. En el detalle, clic en "Eliminar"
2. Aparecerá un modal de confirmación
3. Clic en "Eliminar Paciente"
4. Serás redirigido a la lista

---

## 📱 Prueba en Móvil

1. Abre Chrome DevTools (F12)
2. Clic en el ícono de "Toggle Device Toolbar"
3. Selecciona un dispositivo móvil
4. Navega por el módulo
5. Todo debería verse bien en móvil

---

## ✅ Checklist de Funcionalidades

### Lista de Pacientes
- [ ] La tabla se muestra correctamente
- [ ] La búsqueda funciona
- [ ] Los filtros funcionan
- [ ] La paginación funciona
- [ ] El contador de resultados es correcto
- [ ] Click en fila navega al detalle

### Crear Paciente
- [ ] Formulario se muestra correctamente
- [ ] Validación de campos obligatorios funciona
- [ ] Validación de DNI (8 dígitos) funciona
- [ ] Validación de teléfono (9 dígitos) funciona
- [ ] Validación de email funciona
- [ ] Botón "Cancelar" regresa a la lista
- [ ] Se crea el paciente correctamente
- [ ] Redirección funciona

### Detalle de Paciente
- [ ] Información se muestra correctamente
- [ ] Edad se calcula correctamente
- [ ] Botones de acción funcionan
- [ ] Botón "Volver" regresa a la lista

### Editar Paciente
- [ ] Datos se precargan correctamente
- [ ] Validaciones funcionan
- [ ] Actualización funciona
- [ ] Redirección funciona

### Eliminar Paciente
- [ ] Modal de confirmación aparece
- [ ] Solo visible para Admin
- [ ] Eliminación funciona
- [ ] Redirección funciona

---

## 🐛 Troubleshooting

### Error: "Cannot connect to server"
**Solución:** Verifica que el backend esté corriendo en el puerto 3000
```bash
cd backend
npm run dev
```

### Error: "Unauthorized" o "401"
**Solución:** Cierra sesión y vuelve a iniciar sesión
```
Clic en "Cerrar Sesión" y vuelve a login
```

### La tabla está vacía
**Solución:** Verifica que el backend tenga datos seed
```bash
cd backend
npm run prisma:seed
```

### Estilos no se ven bien
**Solución:** Recarga la página con Ctrl+F5 (hard refresh)

### Error de compilación TypeScript
**Solución:** Limpia y reinstala dependencias
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Usuarios de Prueba

| Usuario | Email | Password | Permisos |
|---------|-------|----------|----------|
| Admin | admin@dermicapro.com | admin123 | Todos |
| Enfermera | enfermera@dermicapro.com | nurse123 | Ver, Crear, Editar |
| Ventas | ventas@dermicapro.com | sales123 | Ver, Crear, Editar |

---

## 🎨 Capturas Esperadas

### Lista de Pacientes
- Tabla con columnas: DNI, Nombres, Apellidos, Sexo, Teléfono, Email, Fecha Nacimiento, Registrado
- Barra de búsqueda y filtros arriba
- Paginación abajo
- Botón "Nuevo Paciente" arriba a la derecha

### Formulario de Paciente
- Dos columnas en desktop
- Una columna en móvil
- Campos con labels claros
- Mensajes de error en rojo
- Botones "Cancelar" y "Crear/Guardar"

### Detalle de Paciente
- Secciones con títulos: "Información Personal", "Información de Contacto", "Información del Sistema"
- Datos organizados en grid
- Botones de acción arriba
- Botón "Volver" arriba a la izquierda

---

## 🚦 Indicadores de Éxito

Si todo funciona correctamente, deberías ver:
- ✅ Build sin errores
- ✅ Servidor corriendo sin errores
- ✅ Login exitoso
- ✅ Lista de pacientes visible
- ✅ Búsqueda y filtros funcionando
- ✅ Crear paciente funciona
- ✅ Editar paciente funciona
- ✅ Ver detalle funciona
- ✅ Eliminar funciona (solo admin)
- ✅ Diseño responsive funciona

---

## 📞 Próximos Pasos

Una vez que hayas probado el módulo de pacientes:

1. **Historial Médico** - Implementar vista de historial del paciente
2. **Módulo de Citas** - Sistema de gestión de citas
3. **Dashboard** - Estadísticas y gráficos
4. **Sesiones** - Registro de sesiones de tratamiento
5. **Comisiones** - Gestión de comisiones de ventas

---

**¡Listo para probar!** 🎉
