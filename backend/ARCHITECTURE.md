# Arquitectura del Sistema - DermicaPro Backend

## 🏗️ Patrón de Arquitectura

El backend sigue una **arquitectura en capas (Layered Architecture)** con separación clara de responsabilidades:

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│                    (Controllers/Routes)                  │
│  - Manejo de HTTP requests/responses                    │
│  - Validación de entrada básica                         │
│  - Orquestación de servicios                            │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                  │
│                        (Services)                        │
│  - Lógica de negocio                                    │
│  - Operaciones complejas                                │
│  - Coordinación entre repositorios                      │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                    VALIDATION LAYER                      │
│                       (Validators)                       │
│  - Validaciones de negocio                              │
│  - Reglas de dominio                                    │
│  - Verificaciones complejas                             │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                    DATA MAPPING LAYER                    │
│                       (Mappers/DTOs)                     │
│  - Transformación de entidades                          │
│  - DTOs para comunicación                               │
│  - Formateo de respuestas                               │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────────┐
│                    DATA ACCESS LAYER                     │
│                    (Prisma ORM)                          │
│  - Acceso a base de datos                               │
│  - Queries y mutaciones                                 │
└─────────────────────────────────────────────────────────┘
```

## 📁 Estructura de Directorios

```
backend/src/
├── config/              # Configuración de la aplicación
│   ├── database.ts      # Cliente de Prisma
│   └── env.ts           # Variables de entorno
│
├── controllers/         # CAPA DE PRESENTACIÓN
│   ├── roles.controller.ts
│   ├── users.controller.ts
│   └── ...
│
├── services/           # CAPA DE LÓGICA DE NEGOCIO
│   ├── role.service.ts
│   ├── permission.service.ts
│   └── ...
│
├── validators/         # CAPA DE VALIDACIÓN
│   ├── role.validator.ts
│   └── ...
│
├── mappers/            # CAPA DE MAPEO
│   ├── role.mapper.ts
│   └── ...
│
├── middlewares/        # Middlewares transversales
│   ├── auth.ts         # Autenticación JWT
│   ├── authorization.ts # Autorización RBAC
│   ├── errorHandler.ts # Manejo de errores
│   └── rateLimiter.ts  # Rate limiting
│
├── routes/             # Definición de rutas
│   ├── roles.routes.ts
│   ├── users.routes.ts
│   └── index.ts
│
├── types/              # Definiciones de tipos
│   └── express.d.ts
│
├── utils/              # Utilidades
│   ├── jwt.ts
│   └── password.ts
│
└── scripts/            # Scripts de mantenimiento
    └── migrate-users-to-roles.ts
```

## 🎯 Responsabilidades por Capa

### 1. Controllers (Capa de Presentación)

**Responsabilidad**: Manejo de HTTP y orquestación

```typescript
export class RolesController {
  async getAll(req: Request, res: Response): Promise<void> {
    // 1. Extraer parámetros del request
    const { includeInactive } = req.query;

    // 2. Delegar al servicio
    const roles = await roleService.findAll({ includeInactive });

    // 3. Mapear respuesta
    const rolesDTO = roleMapper.toDTOList(roles);

    // 4. Enviar respuesta HTTP
    res.json(rolesDTO);
  }
}
```

**NO debe**:
- ❌ Contener lógica de negocio
- ❌ Acceder directamente a la base de datos
- ❌ Realizar validaciones complejas

**SÍ debe**:
- ✅ Manejar requests/responses HTTP
- ✅ Orquestar servicios
- ✅ Manejar errores HTTP

### 2. Services (Capa de Lógica de Negocio)

**Responsabilidad**: Operaciones de negocio y coordinación

```typescript
export class RoleService {
  async create(data: CreateRoleDTO) {
    // Lógica compleja de creación
    const { permissionIds, ...roleData } = data;

    return prisma.systemRole.create({
      data: {
        ...roleData,
        permissions: permissionIds?.length
          ? {
              create: permissionIds.map((id) => ({
                permission: { connect: { id } },
              })),
            }
          : undefined,
      },
      include: this.roleInclude,
    });
  }
}
```

**NO debe**:
- ❌ Conocer detalles de HTTP
- ❌ Formatear respuestas HTTP
- ❌ Manejar requests/responses

**SÍ debe**:
- ✅ Encapsular lógica de negocio
- ✅ Coordinar operaciones
- ✅ Ser reutilizable

### 3. Validators (Capa de Validación)

**Responsabilidad**: Reglas de negocio y validaciones

```typescript
export class RoleValidator {
  validateCreateData(data: CreateRoleDTO): void {
    if (!data.name?.trim()) {
      throw new AppError('El nombre del rol es requerido', 400);
    }

    const namePattern = /^[a-z0-9_]+$/;
    if (!namePattern.test(data.name)) {
      throw new AppError('Formato de nombre inválido', 400);
    }
  }

  async validateRoleNotSystem(role: { isSystem: boolean }): Promise<void> {
    if (role.isSystem) {
      throw new AppError('No se puede modificar rol del sistema', 403);
    }
  }
}
```

**NO debe**:
- ❌ Acceder a base de datos (excepto para validaciones que lo requieran)
- ❌ Modificar datos
- ❌ Conocer HTTP

**SÍ debe**:
- ✅ Validar reglas de negocio
- ✅ Lanzar errores descriptivos
- ✅ Ser reutilizable

### 4. Mappers (Capa de Transformación)

**Responsabilidad**: Convertir entidades a DTOs

```typescript
export class RoleMapper {
  toDTO(role: RoleWithRelations): RoleDTO {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        // ...
      })),
    };
  }
}
```

**NO debe**:
- ❌ Contener lógica de negocio
- ❌ Acceder a base de datos
- ❌ Validar datos

**SÍ debe**:
- ✅ Transformar tipos
- ✅ Ocultar detalles internos
- ✅ Serializar datos para API

## 🔑 Principios de Diseño Aplicados

### SOLID

#### S - Single Responsibility Principle
- Cada clase tiene una única responsabilidad
- `RoleService` → lógica de roles
- `RoleValidator` → validaciones
- `RoleMapper` → transformación

#### O - Open/Closed Principle
- Servicios abiertos para extensión
- Cerrados para modificación
- Nuevos validadores sin modificar existentes

#### L - Liskov Substitution Principle
- Interfaces bien definidas
- Implementaciones intercambiables

#### I - Interface Segregation Principle
- DTOs específicos por operación
- `CreateRoleDTO` ≠ `UpdateRoleDTO`

#### D - Dependency Inversion Principle
- Controladores dependen de abstracciones (servicios)
- No de implementaciones concretas

### DRY (Don't Repeat Yourself)
- Lógica reutilizable en servicios
- Validaciones centralizadas
- Mappers eliminan código duplicado

### Separation of Concerns
- Cada capa con responsabilidad clara
- Cambios aislados por capa

## 🔄 Flujo de Datos

```
Request → Middleware → Controller → Service → Validator
                          ↓           ↓
                       Mapper ←── Database (Prisma)
                          ↓
                       Response
```

### Ejemplo: Crear Rol

1. **Request**: `POST /api/roles`
2. **Middleware**: `authenticate`, `requireRole('admin')`
3. **Controller**: `createRole()`
   - Extrae datos del body
   - Llama al servicio
4. **Validator**: `validateCreateData()`
   - Verifica campos requeridos
   - Valida formato
5. **Service**: `create()`
   - Verifica rol no existe
   - Crea rol en DB
6. **Mapper**: `toDTO()`
   - Convierte entidad a DTO
7. **Response**: JSON con rol creado

## 🛡️ Sistema de Autorización (RBAC)

### Middlewares

```typescript
// Por permiso específico
requirePermission('patients.create')

// Por uno de varios permisos
requireAnyPermission(['patients.view', 'patients.manage'])

// Por todos los permisos
requireAllPermissions(['patients.delete', 'records.delete'])

// Por rol
requireRole('admin')
requireRole(['admin', 'nurse'])
```

### Ejemplo de Uso

```typescript
router.post('/patients',
  authenticate,                        // 1. Verificar autenticación
  requirePermission('patients.create'), // 2. Verificar permiso
  createPatient                        // 3. Ejecutar acción
);
```

## 📊 Ventajas de esta Arquitectura

### Mantenibilidad
✅ Código organizado y predecible
✅ Fácil localizar funcionalidad
✅ Cambios aislados por capa

### Testabilidad
✅ Servicios testables independientemente
✅ Mocks fáciles de crear
✅ Validadores unit-testables

### Escalabilidad
✅ Agregar features sin tocar código existente
✅ Nuevos servicios siguiendo patrón
✅ Reutilización de componentes

### Legibilidad
✅ Código autodocumentado
✅ Nombres claros y descriptivos
✅ Responsabilidades obvias

## 🚀 Buenas Prácticas Implementadas

### 1. Dependency Injection
```typescript
// Servicios como singletons exportados
export const roleService = new RoleService();

// Controllers usan servicios inyectados
const controller = new RolesController();
```

### 2. DTOs Tipados
```typescript
interface CreateRoleDTO {
  name: string;
  displayName: string;
  description?: string;
  permissionIds?: string[];
}
```

### 3. Error Handling Consistente
```typescript
try {
  // operación
} catch (error) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
  } else {
    res.status(500).json({ message: 'Error interno' });
  }
}
```

### 4. Validaciones Centralizadas
```typescript
roleValidator.validateCreateData(data);
await roleValidator.validateRoleNotSystem(role);
```

### 5. Mapeo Consistente
```typescript
const roleDTO = roleMapper.toDTO(role);
const rolesDTO = roleMapper.toDTOList(roles);
```

## 📝 Convenciones de Código

### Nombrado
- **Services**: `nombreService` (camelCase)
- **Controllers**: `NombreController` (PascalCase)
- **DTOs**: `NombreDTO` (PascalCase + DTO)
- **Validators**: `nombreValidator` (camelCase)
- **Mappers**: `nombreMapper` (camelCase)

### Métodos de Servicio
- `findAll()` - Listar todos
- `findById(id)` - Buscar por ID
- `findByName(name)` - Buscar por nombre
- `create(data)` - Crear
- `update(id, data)` - Actualizar
- `delete(id)` - Eliminar

### Métodos de Controller
- `getAll()` - GET /resource
- `getById()` - GET /resource/:id
- `create()` - POST /resource
- `update()` - PUT /resource/:id
- `delete()` - DELETE /resource/:id

## 🔜 Próximas Mejoras

1. **Repository Pattern**: Abstraer acceso a Prisma
2. **Use Cases**: Encapsular flujos completos
3. **Event System**: Eventos de dominio
4. **Caching Layer**: Redis para permisos
5. **Testing**: Unit tests y Integration tests

---

**Autor**: Sistema DermicaPro
**Última actualización**: Diciembre 2025
