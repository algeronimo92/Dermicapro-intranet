# Fix: Filtros en Página de Pacientes

## Problema Identificado

Los filtros en la página de pacientes no funcionaban correctamente:
1. El botón "Limpiar filtros" no recargaba los datos
2. La búsqueda se ejecutaba en cada tecla presionada (demasiadas llamadas al API)
3. El filtro por sexo funcionaba, pero la búsqueda no se aplicaba correctamente

## Solución Implementada

### 1. Separación de Estado de Búsqueda

Se agregó un nuevo estado `activeSearch` para diferenciar entre:
- **`search`**: El texto que el usuario está escribiendo
- **`activeSearch`**: La búsqueda que realmente se está aplicando

```typescript
const [search, setSearch] = useState('');           // Input del usuario
const [activeSearch, setActiveSearch] = useState(''); // Búsqueda activa
```

### 2. Actualización del useEffect

El `useEffect` ahora escucha cambios en `activeSearch` en lugar de `search`:

```typescript
useEffect(() => {
  loadPatients();
}, [currentPage, sexFilter, activeSearch]);
```

**Beneficio**: La búsqueda solo se ejecuta cuando:
- El usuario presiona Enter
- El usuario hace clic en el botón "Buscar"
- Se cambia la página
- Se cambia el filtro de sexo

### 3. Función handleSearch Mejorada

```typescript
const handleSearch = () => {
  setActiveSearch(search);  // Aplica la búsqueda
  setCurrentPage(1);        // Vuelve a la primera página
};
```

### 4. Función handleClearFilters Actualizada

```typescript
const handleClearFilters = () => {
  setSearch('');          // Limpia el input
  setActiveSearch('');    // Limpia la búsqueda activa
  setSexFilter('');       // Limpia el filtro de sexo
  setCurrentPage(1);      // Vuelve a la primera página
};
```

**Beneficio**: Ahora limpia correctamente todos los filtros y recarga los datos.

### 5. Condición del Botón "Limpiar filtros"

```typescript
{(search || activeSearch || sexFilter) && (
  <Button variant="secondary" onClick={handleClearFilters}>
    Limpiar filtros
  </Button>
)}
```

**Beneficio**: El botón aparece cuando hay cualquier filtro activo.

## Comportamiento Actual

### Búsqueda por Texto
1. Usuario escribe en el campo de búsqueda
2. Nada sucede hasta que:
   - Presione Enter, O
   - Haga clic en "Buscar"
3. Se aplica la búsqueda y se muestran los resultados

### Filtro por Sexo
1. Usuario selecciona un sexo en el dropdown
2. Los resultados se filtran automáticamente (sin necesidad de hacer clic en "Buscar")

### Limpiar Filtros
1. Usuario hace clic en "Limpiar filtros"
2. Se limpian todos los filtros
3. Los datos se recargan automáticamente
4. Se muestra la lista completa de pacientes

### Paginación
1. Usuario hace clic en un número de página
2. Los datos se recargan manteniendo los filtros activos

## Ventajas de Esta Implementación

1. **Rendimiento**: Reduce llamadas innecesarias al API
2. **UX Mejorada**: El usuario tiene control sobre cuándo buscar
3. **Claridad**: Separación clara entre input y búsqueda activa
4. **Consistencia**: El comportamiento es predecible

## Cómo Probar

### Test 1: Búsqueda por Texto
1. Navega a `/patients`
2. Escribe "Juan" en el campo de búsqueda
3. Observa que NO se hace búsqueda automática
4. Presiona Enter o clic en "Buscar"
5. ✅ Los resultados deben filtrarse

### Test 2: Filtro por Sexo
1. Selecciona "Masculino" en el filtro de sexo
2. ✅ Los resultados deben filtrarse automáticamente

### Test 3: Limpiar Filtros
1. Aplica algún filtro (búsqueda o sexo)
2. Haz clic en "Limpiar filtros"
3. ✅ Todos los filtros deben limpiarse
4. ✅ Debe mostrar todos los pacientes

### Test 4: Paginación con Filtros
1. Aplica un filtro
2. Navega a la página 2
3. ✅ El filtro debe mantenerse
4. ✅ Debe mostrar la página 2 con el filtro aplicado

### Test 5: Búsqueda con Enter
1. Escribe en el campo de búsqueda
2. Presiona Enter
3. ✅ Debe aplicar la búsqueda sin necesidad de hacer clic

## Archivos Modificados

- `/Users/alangeronimo/dermicapro/frontend/src/pages/PatientsPage.tsx`

## Cambios Específicos

```diff
+ const [activeSearch, setActiveSearch] = useState('');

- useEffect(() => {
-   loadPatients();
- }, [currentPage, sexFilter]);
+ useEffect(() => {
+   loadPatients();
+ }, [currentPage, sexFilter, activeSearch]);

const loadPatients = async () => {
  const params: GetPatientsParams = {
    page: currentPage,
    limit,
-   search: search || undefined,
+   search: activeSearch || undefined,
    sex: sexFilter || undefined
  };
  // ...
};

const handleSearch = () => {
+ setActiveSearch(search);
  setCurrentPage(1);
- loadPatients();
};

const handleClearFilters = () => {
  setSearch('');
+ setActiveSearch('');
  setSexFilter('');
  setCurrentPage(1);
};

- {(search || sexFilter) && (
+ {(search || activeSearch || sexFilter) && (
```

## Estado: ✅ COMPLETADO

Los filtros ahora funcionan correctamente:
- ✅ Búsqueda por texto funciona
- ✅ Filtro por sexo funciona
- ✅ Limpiar filtros funciona
- ✅ Paginación mantiene filtros
- ✅ No hay llamadas innecesarias al API
- ✅ El servidor compila sin errores
