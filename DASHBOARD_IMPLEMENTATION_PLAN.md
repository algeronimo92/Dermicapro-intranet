# Plan de Implementación: Dashboards Específicos por Rol

## Resumen Ejecutivo

Implementar 3 dashboards distintos (Admin, Enfermera, Ventas) utilizando **Strategy Pattern** en el backend y **Custom Hooks + Component Composition** en el frontend. Esta arquitectura permite agregar nuevos roles sin modificar código existente (Open/Closed Principle) y mantiene el código DRY, escalable y mantenible.

## Patrones de Diseño a Utilizar

### Backend: **Strategy Pattern + Service Layer**

**Justificación:**
- ✅ Cada rol tiene su propia estrategia de agregación de datos
- ✅ Fácil agregar nuevos roles sin modificar código existente
- ✅ Lógica de negocio encapsulada y testeable
- ✅ Queries reutilizables y componibles
- ✅ Consistente con el patrón Controller-Service existente

**Rechazado:** Repository Pattern completo (sobre-ingeniería para este proyecto)

### Frontend: **Custom Hooks + Component Composition**

**Justificación:**
- ✅ Custom hook `useDashboard` centraliza lógica de fetching
- ✅ Componentes widgets reutilizables (StatCard, Charts)
- ✅ Dashboards específicos componibles desde widgets
- ✅ Consistente con patrones React existentes en el proyecto

---

## Estructura de Archivos

### Backend (Nuevos archivos)

```
backend/src/
├── types/
│   └── dashboard.types.ts                    # DTOs y tipos compartidos
├── services/
│   └── dashboard/
│       ├── dashboard.service.ts              # Service principal con Strategy Pattern
│       └── strategies/
│           ├── base.strategy.ts              # Interface + clase base abstracta
│           ├── admin.strategy.ts             # Estrategia Admin
│           ├── nurse.strategy.ts             # Estrategia Enfermera
│           └── sales.strategy.ts             # Estrategia Ventas
├── controllers/
│   └── dashboard.controller.ts               # Controller delegador
└── routes/
    └── dashboard.routes.ts                   # GET /api/dashboard
```

### Frontend (Nuevos archivos)

```
frontend/src/
├── types/
│   └── dashboard.types.ts                    # Tipos compartidos
├── services/
│   └── dashboard.service.ts                  # API service
├── hooks/
│   └── useDashboard.ts                       # Custom hook
├── components/
│   └── dashboard/
│       ├── AdminDashboard.tsx                # Dashboard Admin
│       ├── NurseDashboard.tsx                # Dashboard Enfermera
│       ├── SalesDashboard.tsx                # Dashboard Ventas
│       └── widgets/
│           ├── StatCard.tsx                  # Tarjeta de estadística
│           ├── RevenueChart.tsx              # Gráfico de ingresos (Recharts)
│           ├── AppointmentsList.tsx          # Lista de citas
│           ├── CommissionsCard.tsx           # Card de comisiones
│           └── GoalProgress.tsx              # Barra de progreso de meta
├── pages/
│   └── DashboardPage.tsx                     # Página principal (router por rol)
└── styles/
    └── dashboard-widgets.css                 # Estilos nuevos
```

### Archivos a Modificar

```
backend/src/routes/index.ts                   # Registrar dashboard routes
frontend/src/App.tsx                          # Ya existe ruta "/" que apunta a Dashboard
```

---

## Arquitectura Backend (Strategy Pattern)

### 1. Interface Strategy (`base.strategy.ts`)

```typescript
export interface DashboardStrategy {
  execute(userId: string, filters?: DashboardFilters): Promise<DashboardData>;
}

export abstract class BaseDashboardStrategy implements DashboardStrategy {
  constructor(protected prisma: PrismaClient) {}
  abstract execute(userId: string, filters?: DashboardFilters): Promise<DashboardData>;

  // Helpers compartidos (getDateRange, groupByMonth, etc.)
}
```

### 2. Estrategias Concretas

**AdminDashboardStrategy:**
- Ingresos (aggregate por status, groupBy por mes)
- Citas (count por status, today/week)
- Ventas (aggregate orders, top services)
- Comisiones (groupBy por status)

**NurseDashboardStrategy:**
- Citas del día (findMany con includes completos)
- Próximas citas (siguiente semana)
- Pacientes atendidos hoy (count)
- Servicios más realizados (groupBy)

**SalesDashboardStrategy:**
- Ventas personales (filtered by createdById)
- Comisiones personales (filtered by salesPersonId)
- Pacientes captados (count)
- Metas del mes (hardcoded meta vs ventas reales)

### 3. Dashboard Service (Registro de Estrategias)

```typescript
export class DashboardService {
  private strategies: Map<string, DashboardStrategy>;

  constructor(private prisma: PrismaClient) {
    this.strategies = new Map([
      ['admin', new AdminDashboardStrategy(prisma)],
      ['nurse', new NurseDashboardStrategy(prisma)],
      ['sales', new SalesDashboardStrategy(prisma)],
    ]);
  }

  async getDashboard(roleName: string, userId: string, filters?: any): Promise<DashboardData> {
    const strategy = this.strategies.get(roleName);
    if (!strategy) throw new AppError('Dashboard not available', 404);
    return strategy.execute(userId, filters);
  }
}
```

### 4. Controller

```typescript
export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  const roleName = req.user.roleName;
  const userId = req.user.id;
  const { period } = req.query;

  const data = await dashboardService.getDashboard(roleName, userId, { period });
  res.json({ data });
};
```

### 5. Routes

```
GET /api/dashboard?period=month
```

Protegido con `authenticate` middleware. El rol se detecta automáticamente del JWT.

---

## Arquitectura Frontend

### 1. Custom Hook (`useDashboard.ts`)

Centraliza la lógica de fetching con estados de loading/error:

```typescript
export function useDashboard(period: 'today' | 'week' | 'month' | 'year' = 'month') {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // loadDashboard async
  }, [user, period]);

  return { data, isLoading, error };
}
```

### 2. Componentes Widgets Reutilizables

**StatCard:** Tarjeta de estadística con título, valor, subtítulo, icono
**RevenueChart:** Gráfico de línea con Recharts
**AppointmentsList:** Lista de citas con estilos
**CommissionsCard:** Card específico para comisiones
**GoalProgress:** Barra de progreso con porcentaje

### 3. Dashboards Específicos

Cada dashboard importa widgets y los compone según sus necesidades:

- **AdminDashboard:** 4 secciones (Finanzas, Citas, Ventas, Comisiones)
- **NurseDashboard:** 3 secciones (Stats rápidas, Citas de hoy, Próximas citas)
- **SalesDashboard:** 4 secciones (Ventas, Comisiones, Metas, Pacientes)

### 4. DashboardPage (Router por Rol)

```typescript
export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const { data, isLoading, error } = useDashboard(period);

  const roleName = getRoleName(user);

  return (
    <div className="dashboard-page">
      {/* Selector de período */}
      {roleName === 'admin' && <AdminDashboard data={data} />}
      {roleName === 'nurse' && <NurseDashboard data={data} />}
      {roleName === 'sales' && <SalesDashboard data={data} />}
    </div>
  );
}
```

---

## Datos por Dashboard

### Admin Dashboard

**Financials:**
- Total revenue, pending, paid
- Monthly revenue chart (últimos 6 meses)

**Appointments:**
- Total count, today count, this week count
- By status breakdown

**Sales:**
- Total orders, total value
- Top 5 services (name, count, revenue)

**Commissions:**
- Pending, approved, paid counts
- Total amount

### Nurse Dashboard

**Appointments Today:**
- Full list con: patient, services, status, time
- Ordenado por scheduledDate

**Upcoming Appointments:**
- Próximas 10 citas de la semana

**Patients:**
- Attended today count
- Scheduled today count

**Services:**
- Top 5 servicios más realizados (último mes)

### Sales Dashboard

**Sales:**
- Total orders, total revenue
- Monthly revenue chart

**Commissions:**
- Pending, approved, paid counts
- Total earned
- Historial reciente (10 últimas)

**Patients:**
- Total pacientes captados
- Recent appointments (5 últimas)

**Goals:**
- Monthly goal (hardcoded 10000)
- Achieved amount
- Percentage

---

## Queries Prisma Clave

### Agregaciones con groupBy

```typescript
await prisma.commission.groupBy({
  by: ['status'],
  _sum: { commissionAmount: true },
  _count: true,
  where: { createdAt: dateRange }
});
```

### Aggregate para totales

```typescript
await prisma.order.aggregate({
  _count: true,
  _sum: { finalPrice: true },
  where: { createdById: userId }
});
```

### Includes anidados

```typescript
await prisma.appointment.findMany({
  include: {
    patient: { select: { firstName, lastName, dni } },
    appointmentServices: {
      include: {
        order: { include: { service: true } }
      }
    }
  }
});
```

### Promise.all para paralelización

```typescript
const [financials, appointments, sales] = await Promise.all([
  this.getFinancials(dateRange),
  this.getAppointments(dateRange),
  this.getSales(dateRange)
]);
```

---

## Optimizaciones de Performance

### Backend

1. **Promise.all:** Ejecutar queries en paralelo dentro de cada strategy
2. **Select específicos:** Solo traer campos necesarios
3. **Indexes:** Verificar que existan índices en:
   - `appointments.scheduledDate`
   - `orders.createdById`
   - `commissions.salesPersonId`
   - `invoices.createdAt`

### Frontend

1. **Memoización:** Usar `useMemo` para cálculos derivados
2. **Lazy loading:** Cargar Recharts solo cuando se necesita
3. **Debounce:** En el selector de período

### Opcional (Futuro)

- **Redis caching:** Cachear respuestas por 5 minutos
- **React Query:** Para auto-refetch y cache en frontend

---

## Plan de Implementación (5 Sprints)

### Sprint 1: Backend Foundation (1 día) ✅

**Archivos a crear:**
1. `backend/src/types/dashboard.types.ts`
2. `backend/src/services/dashboard/strategies/base.strategy.ts`
3. `backend/src/services/dashboard/strategies/admin.strategy.ts`
4. `backend/src/services/dashboard/dashboard.service.ts`
5. `backend/src/controllers/dashboard.controller.ts`
6. `backend/src/routes/dashboard.routes.ts`
7. `backend/src/routes/index.ts` (modificar)

### Sprint 2: Backend Strategies (1 día)

**Archivos a crear:**
8. `backend/src/services/dashboard/strategies/nurse.strategy.ts`
9. `backend/src/services/dashboard/strategies/sales.strategy.ts`

### Sprint 3: Frontend Foundation (1 día)

**Dependencias:**
- Instalar Recharts: `npm install recharts`

**Archivos a crear:**
10. `frontend/src/types/dashboard.types.ts`
11. `frontend/src/services/dashboard.service.ts`
12. `frontend/src/hooks/useDashboard.ts`
13. `frontend/src/components/dashboard/widgets/StatCard.tsx`
14. `frontend/src/components/dashboard/widgets/RevenueChart.tsx`

### Sprint 4: Frontend Dashboards (2 días)

**Archivos a crear:**
15. `frontend/src/components/dashboard/AdminDashboard.tsx`
16. `frontend/src/components/dashboard/NurseDashboard.tsx`
17. `frontend/src/components/dashboard/SalesDashboard.tsx`
18. `frontend/src/pages/DashboardPage.tsx`
19. `frontend/src/styles/dashboard-widgets.css`

**Archivos a modificar:**
20. `frontend/src/App.tsx`

### Sprint 5: Polish & Testing (0.5 días)

21. Estados vacíos
22. Error handling
23. Loading states
24. Documentación

---

## Extensibilidad Futura

Para agregar un nuevo rol (ej: "receptionist"):

### Backend:
1. Crear `ReceptionistDashboardStrategy.ts`
2. Agregar a `DashboardService.strategies.set('receptionist', new ReceptionistDashboardStrategy(prisma))`

### Frontend:
1. Crear `ReceptionistDashboard.tsx`
2. Agregar en `DashboardPage.tsx`: `{roleName === 'receptionist' && <ReceptionistDashboard data={data} />}`

**Total tiempo estimado:** ~5 días de desarrollo

---

## Archivos Críticos

**Backend:**
- `/Users/alangeronimo/dermicapro/backend/src/services/dashboard/dashboard.service.ts`
- `/Users/alangeronimo/dermicapro/backend/src/services/dashboard/strategies/admin.strategy.ts`
- `/Users/alangeronimo/dermicapro/backend/src/controllers/dashboard.controller.ts`

**Frontend:**
- `/Users/alangeronimo/dermicapro/frontend/src/hooks/useDashboard.ts`
- `/Users/alangeronimo/dermicapro/frontend/src/pages/DashboardPage.tsx`
- `/Users/alangeronimo/dermicapro/frontend/src/components/dashboard/AdminDashboard.tsx`

---

## Decisiones Técnicas

### ✅ Decisiones Aceptadas

1. **Strategy Pattern:** Permite agregar roles sin modificar código existente
2. **Single endpoint:** `/api/dashboard` detecta rol automáticamente del JWT
3. **Custom Hook:** Centraliza lógica de fetching, consistente con React patterns
4. **Component Composition:** Widgets reutilizables, DRY
5. **Recharts:** Librería simple para gráficos, bien documentada
6. **Promise.all:** Queries en paralelo para performance
7. **Design Tokens:** Usar CSS variables existentes para estilos

### ❌ Decisiones Rechazadas

1. **Repository Pattern completo:** Sobre-ingeniería para este proyecto
2. **Endpoints separados por rol:** Duplicación de código innecesaria
3. **Redux/Zustand:** El estado es local a la página, no global
4. **GraphQL:** Complejidad adicional innecesaria

---

## Riesgos y Mitigaciones

**Riesgo 1:** Queries lentas con muchos datos
- **Mitigación:** Promise.all, select específicos, índices en BD

**Riesgo 2:** Datos inconsistentes entre dashboards
- **Mitigación:** Reutilizar query builders, tests unitarios

**Riesgo 3:** Interfaces entre backend y frontend desincronizadas
- **Mitigación:** Compartir types (considerar monorepo o codegen futuro)

**Riesgo 4:** Recharts aumenta bundle size
- **Mitigación:** Lazy loading del componente chart

---

## Conclusión

Este plan implementa dashboards profesionales usando patrones probados (Strategy, Custom Hooks, Component Composition) que son escalables, mantenibles y consistentes con el código existente del proyecto. La arquitectura permite agregar nuevos roles con mínima fricción y mantiene el principio DRY.
