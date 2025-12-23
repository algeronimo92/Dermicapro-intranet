# Arquitectura del Formulario de Citas - Patrones de Diseño

## 📋 Resumen

El formulario de citas ha sido refactorizado siguiendo **principios SOLID** y patrones de diseño profesionales para lograr:

- ✅ **Separación de responsabilidades**
- ✅ **Código reutilizable y mantenible**
- ✅ **Fácil testing unitario**
- ✅ **Escalabilidad**

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│         AppointmentFormPage (Componente UI)             │
│  - Solo renderizado                                     │
│  - No contiene lógica de negocio                        │
└──────────────────┬──────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
┌──────▼────────┐   ┌─────────▼────────────┐
│ useAppointment│   │ useAppointmentForm   │
│ FormActions   │   │ Actions              │
│ (UI Actions)  │   │ (Business Logic)     │
└──────┬────────┘   └─────────┬────────────┘
       │                       │
       └───────────┬───────────┘
                   │
       ┌───────────┴────────────┐
       │                        │
┌──────▼─────────┐   ┌─────────▼──────────┐
│ SessionManager │   │  FormValidator     │
│   Service      │   │    Service         │
│ (Lógica de    │   │  (Validaciones)    │
│  sesiones)     │   │                    │
└────────────────┘   └────────────────────┘
```

---

## 🎯 Patrones Implementados

### 1. **Custom Hook Pattern**

#### `useAppointmentForm.ts`
**Responsabilidad**: Manejo de estado y efectos del formulario

```typescript
const {
  isEditMode,
  formData,
  allSessions,
  services,
  // ... más estado
} = useAppointmentForm();
```

**Beneficios**:
- ✅ Separa lógica de estado del componente UI
- ✅ Reutilizable en otros componentes
- ✅ Fácil de testear independientemente

---

### 2. **Strategy Pattern**

#### `SessionManagerService`
**Responsabilidad**: Diferentes estrategias para manejar sesiones

```typescript
class SessionManagerService {
  // Strategy 1: Agregar sesión a paquete existente
  // Strategy 2: Agregar sesión a paquete simulado
  // Strategy 3: Crear nuevo paquete

  addSession(...)
  removeSession(...)
  applySessionCompensation(...)
}
```

**Beneficios**:
- ✅ Encapsula algoritmos complejos
- ✅ Fácil agregar nuevas estrategias
- ✅ Código más limpio y organizado

---

### 3. **Chain of Responsibility Pattern**

#### `FormValidatorService`
**Responsabilidad**: Cadena de validadores independientes

```typescript
class FormValidatorService {
  private validators: IValidator[] = [
    new PatientValidator(),
    new SessionsValidator(),
    new DateTimeValidator(),
    new DurationValidator(),
    new ReservationAmountValidator()
  ];

  validate(formData, sessions) {
    // Ejecuta cada validador en secuencia
  }
}
```

**Beneficios**:
- ✅ Cada validador tiene una sola responsabilidad
- ✅ Fácil agregar/quitar validadores
- ✅ Testing unitario por validador

---

### 4. **Service Layer Pattern**

#### Servicios especializados
- **SessionManager**: Operaciones de sesiones
- **FormValidator**: Validaciones
- **appointmentsService**: Comunicación con API

**Beneficios**:
- ✅ Lógica de negocio separada de UI
- ✅ Reutilizable en múltiples componentes
- ✅ Fácil de mockear en tests

---

### 5. **Singleton Pattern**

```typescript
// Instancia única compartida
export const sessionManager = new SessionManagerService();
export const formValidator = new FormValidatorService();
```

**Beneficios**:
- ✅ Una sola instancia en toda la app
- ✅ Reduce consumo de memoria
- ✅ Estado consistente

---

## 📁 Estructura de Archivos

```
frontend/src/
├── hooks/
│   ├── useAppointmentForm.ts          # Estado y efectos
│   └── useAppointmentFormActions.ts   # Acciones y handlers
├── services/
│   ├── sessionManager.service.ts      # Lógica de sesiones
│   ├── formValidator.service.ts       # Validaciones
│   └── appointments.service.ts        # API calls
└── pages/
    └── AppointmentFormPage.tsx        # UI Component (refactorizado)
```

---

## 🔄 Flujo de Datos

### Creación de Cita

```
1. Usuario selecciona paciente
   └─> handlePatientChange()
       └─> loadPatientOrders()
           └─> Update state

2. Usuario agrega servicio/sesión
   └─> handleAddSession()
       └─> sessionManager.addSession()
           └─> Calcula sessionNumber automáticamente
           └─> Update allSessions state

3. Usuario hace submit
   └─> handleSubmit()
       └─> formValidator.validate()
       │   └─> PatientValidator
       │   └─> SessionsValidator
       │   └─> DateTimeValidator
       │   └─> DurationValidator
       │   └─> ReservationAmountValidator
       └─> appointmentsService.createAppointment()
           └─> Navigate to /appointments
```

---

## 🧪 Ventajas para Testing

### Testing Unitario Simplificado

```typescript
// Test SessionManager
describe('SessionManagerService', () => {
  it('should add session to existing package', () => {
    const result = sessionManager.addSession(...);
    expect(result.sessions).toHaveLength(1);
  });
});

// Test FormValidator
describe('FormValidatorService', () => {
  it('should validate patient is required', () => {
    const errors = formValidator.validate({ patientId: '' }, []);
    expect(errors.patientId).toBe('Debe seleccionar un paciente');
  });
});

// Test Custom Hook
describe('useAppointmentForm', () => {
  it('should load initial data', async () => {
    const { result } = renderHook(() => useAppointmentForm());
    await waitFor(() => {
      expect(result.current.services).toHaveLength > 0);
    });
  });
});
```

---

## 📊 Principios SOLID Aplicados

### ✅ **S**ingle Responsibility
Cada clase/función tiene una sola razón para cambiar:
- `SessionManagerService` → Solo operaciones de sesiones
- `FormValidatorService` → Solo validaciones
- `useAppointmentForm` → Solo manejo de estado

### ✅ **O**pen/Closed
Abierto para extensión, cerrado para modificación:
- Agregar nuevo validador sin modificar FormValidatorService
- Agregar nueva estrategia de sesión sin modificar SessionManagerService

### ✅ **L**iskov Substitution
Todos los validadores implementan `IValidator`:
```typescript
interface IValidator {
  validate(formData, sessions): FormErrors;
}
```

### ✅ **I**nterface Segregation
Interfaces pequeñas y específicas en lugar de interfaces grandes

### ✅ **D**ependency Inversion
Dependemos de abstracciones (interfaces) no de implementaciones concretas

---

## 🚀 Próximos Pasos (Opcional)

### 1. **State Management con Redux/Zustand**
Para estado global más complejo

### 2. **Observer Pattern**
Para notificaciones en tiempo real

### 3. **Factory Pattern**
Para crear diferentes tipos de sesiones

### 4. **Command Pattern**
Para operaciones undo/redo

---

## 📝 Uso en el Componente (Simplificado)

```typescript
export const AppointmentFormPage: React.FC = () => {
  // Hook principal de estado
  const formState = useAppointmentForm();

  // Hook de acciones
  const actions = useAppointmentFormActions({
    ...formState,
    // ... props necesarias
  });

  return (
    <form onSubmit={actions.handleSubmit}>
      {/* UI simplificada, toda la lógica en los hooks */}
    </form>
  );
};
```

---

## 🎓 Referencias

- **Clean Architecture** - Robert C. Martin
- **Design Patterns** - Gang of Four
- **React Hooks Best Practices** - React Team
- **SOLID Principles** - Uncle Bob

---

## 👨‍💻 Mantenibilidad

Este código es:
- ✅ **Fácil de leer**: Cada archivo tiene una responsabilidad clara
- ✅ **Fácil de extender**: Agregar funcionalidad sin romper existente
- ✅ **Fácil de testear**: Cada servicio/hook es independiente
- ✅ **Fácil de debuggear**: Flujo de datos claro y predecible
- ✅ **Profesional**: Sigue estándares de la industria

---

**Desarrollado con 💙 siguiendo las mejores prácticas de la industria**
