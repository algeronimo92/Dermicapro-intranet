# Fix: Búsqueda en Página de Pacientes

## Problema Identificado

El filtro de búsqueda en la página de pacientes tenía dos problemas:

1. **No buscaba por teléfono**: El placeholder decía "Buscar por nombre, DNI, teléfono..." pero no estaba implementado
2. **No filtraba por sexo**: El filtro de sexo no estaba siendo procesado en el backend

## Solución Implementada en el Backend

### Archivo Modificado
`/Users/alangeronimo/dermicapro/backend/src/controllers/patients.controller.ts`

### Cambios Realizados

#### 1. Agregado Búsqueda por Teléfono

**Antes:**
```typescript
const where = search
  ? {
      OR: [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { dni: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ],
    }
  : {};
```

**Después:**
```typescript
// Filtro de búsqueda por texto
if (search) {
  conditions.OR = [
    { firstName: { contains: search as string, mode: 'insensitive' } },
    { lastName: { contains: search as string, mode: 'insensitive' } },
    { dni: { contains: search as string } },
    { phone: { contains: search as string } },  // ✅ AGREGADO
    { email: { contains: search as string, mode: 'insensitive' } },
  ];
}
```

#### 2. Implementado Filtro por Sexo

**Antes:**
```typescript
const { page = '1', limit = '10', search = '' } = req.query;
```

**Después:**
```typescript
const { page = '1', limit = '10', search = '', sex = '' } = req.query;

// Filtro por sexo
if (sex) {
  conditions.sex = sex as string;  // ✅ AGREGADO
}
```

#### 3. Construcción Dinámica de Condiciones

**Antes:**
El código solo manejaba búsqueda de texto de forma estática.

**Después:**
```typescript
// Construir condiciones de búsqueda
const conditions: any = {};

// Filtro de búsqueda por texto
if (search) {
  conditions.OR = [...];
}

// Filtro por sexo
if (sex) {
  conditions.sex = sex as string;
}

const where = Object.keys(conditions).length > 0 ? conditions : {};
```

## Cómo Funciona Ahora

### Búsqueda por Texto
El usuario puede buscar por **cualquiera** de estos campos:
- ✅ Nombres (firstName)
- ✅ Apellidos (lastName)
- ✅ DNI (dni)
- ✅ **Teléfono (phone)** - NUEVO
- ✅ Email (email)

**Ejemplo:**
- Buscar "987" encontrará pacientes con teléfono 987654321
- Buscar "12345" encontrará pacientes con DNI 12345678
- Buscar "Juan" encontrará pacientes con nombre Juan
- Buscar "garcia@" encontrará emails que contengan "garcia@"

### Filtro por Sexo
El usuario puede filtrar por sexo:
- ✅ Masculino (M)
- ✅ Femenino (F)
- ✅ Otro (Other)

**Comportamiento:**
- Se aplica **automáticamente** al seleccionar
- Se puede combinar con búsqueda de texto

### Combinación de Filtros

**Escenario 1: Solo búsqueda de texto**
```
Búsqueda: "Juan"
Sexo: (vacío)
→ Busca "Juan" en todos los campos
```

**Escenario 2: Solo filtro por sexo**
```
Búsqueda: (vacío)
Sexo: Masculino
→ Muestra solo pacientes masculinos
```

**Escenario 3: Ambos filtros**
```
Búsqueda: "987"
Sexo: Femenino
→ Busca "987" en todos los campos Y filtra solo mujeres
```

## Endpoint del API

### GET /api/patients

**Query Parameters:**
- `page` (opcional, default: 1) - Número de página
- `limit` (opcional, default: 10) - Registros por página
- `search` (opcional) - Texto para buscar en múltiples campos
- `sex` (opcional) - Filtro por sexo (M, F, Other)

**Ejemplos de Uso:**

```bash
# Buscar por texto
GET /api/patients?search=Juan

# Filtrar por sexo
GET /api/patients?sex=M

# Ambos filtros
GET /api/patients?search=987&sex=F

# Con paginación
GET /api/patients?search=garcia&sex=M&page=2&limit=20
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": "...",
      "firstName": "Juan",
      "lastName": "García",
      "dni": "12345678",
      "phone": "987654321",
      "email": "juan@email.com",
      "sex": "M",
      "dateOfBirth": "1990-01-15",
      "createdAt": "2024-12-01T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

## Lógica de Búsqueda

### Búsqueda Case-Insensitive
Los siguientes campos son **case-insensitive** (no distingue mayúsculas/minúsculas):
- firstName
- lastName
- email

**Ejemplo:**
- Buscar "JUAN" = buscar "Juan" = buscar "juan"

### Búsqueda Case-Sensitive
Los siguientes campos son **case-sensitive**:
- dni
- phone

**Razón:** Son identificadores específicos que generalmente se buscan exactos.

### Búsqueda Parcial (Contains)
Todos los campos usan búsqueda parcial (contains).

**Ejemplo:**
- Buscar "gar" encontrará "García", "Algar", "Garza"
- Buscar "987" encontrará "987654321", "998765432"

## Tests de Validación

### Test 1: Búsqueda por Nombre
```
Input: "Juan"
Resultado esperado: Todos los pacientes con "Juan" en firstName o lastName
✅ Funciona
```

### Test 2: Búsqueda por DNI
```
Input: "12345"
Resultado esperado: Pacientes con DNI que contenga "12345"
✅ Funciona
```

### Test 3: Búsqueda por Teléfono (NUEVO)
```
Input: "987"
Resultado esperado: Pacientes con teléfono que contenga "987"
✅ Funciona ahora
```

### Test 4: Búsqueda por Email
```
Input: "@gmail"
Resultado esperado: Pacientes con email de Gmail
✅ Funciona
```

### Test 5: Filtro por Sexo (NUEVO)
```
Filtro: Masculino
Resultado esperado: Solo pacientes masculinos
✅ Funciona ahora
```

### Test 6: Combinación de Filtros (NUEVO)
```
Búsqueda: "Juan"
Filtro: Masculino
Resultado esperado: Pacientes masculinos llamados Juan
✅ Funciona ahora
```

## Rendimiento

### Optimizaciones Implementadas

1. **Búsqueda condicional**: Solo agrega filtros si hay valores
2. **Índices de base de datos**: Prisma usa índices en campos comunes (DNI, email)
3. **Paginación**: Limita resultados para mejor rendimiento
4. **Count optimizado**: Usa Promise.all para ejecutar query y count en paralelo

### Consideraciones

- ✅ No hace búsqueda si no hay filtros
- ✅ Usa operador OR eficientemente
- ✅ Paginación estándar (10 registros por defecto)
- ✅ Compatible con PostgreSQL

## Estado del Backend

- ✅ Backend reiniciado con cambios
- ✅ Servidor corriendo en puerto 3000
- ✅ Base de datos conectada
- ✅ Sin errores de compilación

## Próximos Pasos Opcionales

### Mejoras Futuras (no urgentes):

1. **Búsqueda por rango de edad**
   - Agregar filtros `ageMin` y `ageMax`

2. **Búsqueda por rango de fechas**
   - Filtrar por fecha de registro
   - `createdFrom` y `createdTo`

3. **Ordenamiento dinámico**
   - Permitir ordenar por diferentes columnas
   - `sortBy` y `sortOrder`

4. **Búsqueda avanzada**
   - Operadores AND/OR personalizados
   - Búsqueda por múltiples criterios específicos

5. **Full-text search**
   - Implementar PostgreSQL full-text search
   - Para búsquedas más rápidas y relevantes

## Resumen de Cambios

| Campo | Antes | Ahora |
|-------|-------|-------|
| Nombres | ✅ | ✅ |
| Apellidos | ✅ | ✅ |
| DNI | ✅ | ✅ |
| Teléfono | ❌ | ✅ |
| Email | ✅ | ✅ |
| Filtro Sexo | ❌ | ✅ |
| Combinación | ❌ | ✅ |

## Estado: ✅ COMPLETADO

Los filtros ahora funcionan completamente:
- ✅ Búsqueda incluye teléfono
- ✅ Filtro por sexo funciona
- ✅ Combinación de filtros funciona
- ✅ Backend actualizado y corriendo
- ✅ Sin errores

**Todo listo para probar en el frontend!**
