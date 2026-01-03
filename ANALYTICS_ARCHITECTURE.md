# Arquitectura de Analytics - DermicaPro
## Guía para Desarrollador Senior

---

## 🏗️ **PATRONES DE DISEÑO Y ARQUITECTURA**

### **Patrón Principal: Strategy + Repository + Service Layer**

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                     │
├─────────────────────────────────────────────────────────┤
│  AnalyticsPage (Container)                              │
│      │                                                   │
│      ├─> ExecutiveDashboard                            │
│      ├─> FinancialAnalytics                            │
│      └─> ...otros dashboards                           │
│                                                          │
│  Custom Hook: useAnalytics<T>                          │
│      │                                                   │
│      └─> AnalyticsService (API calls)                  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/REST
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Express)                      │
├─────────────────────────────────────────────────────────┤
│  Controller Layer (Thin)                                │
│      AnalyticsController                                │
│           │                                              │
│           ▼                                              │
│  Service Layer (Orchestration)                          │
│      AnalyticsService                                   │
│           │                                              │
│           ├─> FinancialAnalytics (Strategy)             │
│           ├─> OperationsAnalytics (Strategy)            │
│           ├─> SalesAnalytics (Strategy)                 │
│           ├─> CustomerAnalytics (Strategy)              │
│           └─> ServiceAnalytics (Strategy)               │
│                    │                                     │
│                    ▼                                     │
│  Repository Layer (Data Access)                         │
│      AnalyticsRepository                                │
│           │                                              │
│           ▼                                              │
│      Prisma Client                                      │
│           │                                              │
│           ▼                                              │
│      PostgreSQL                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📐 **1. STRATEGY PATTERN (Backend Analytics)**

### **Problema que Resuelve**:
Diferentes tipos de analíticas requieren diferentes cálculos y queries, pero comparten comportamiento común.

### **Implementación**:

#### **1.1 Interface Strategy**
```typescript
// src/services/analytics/strategies/IAnalyticsStrategy.ts
export interface IAnalyticsStrategy<T> {
  execute(filters?: AnalyticsFilters): Promise<T>;
  validateFilters(filters?: AnalyticsFilters): void;
}
```

#### **1.2 Abstract Base Class (Template Method Pattern)**
```typescript
// src/services/analytics/strategies/BaseAnalyticsStrategy.ts
import { PrismaClient } from '@prisma/client';
import { AnalyticsFilters } from '../../../types/analytics.types';
import { IAnalyticsStrategy } from './IAnalyticsStrategy';

export abstract class BaseAnalyticsStrategy<T> implements IAnalyticsStrategy<T> {
  constructor(protected prisma: PrismaClient) {}

  // Template Method: define el esqueleto del algoritmo
  async execute(filters?: AnalyticsFilters): Promise<T> {
    // 1. Validar filtros
    this.validateFilters(filters);

    // 2. Obtener rango de fechas
    const dateRange = this.getDateRange(filters);

    // 3. Ejecutar queries específicas (método abstracto)
    const data = await this.fetchData(dateRange, filters);

    // 4. Transformar datos
    return this.transformData(data);
  }

  // Hook method: debe ser implementado por clases concretas
  protected abstract fetchData(
    dateRange: { gte: Date; lte: Date },
    filters?: AnalyticsFilters
  ): Promise<any>;

  // Hook method: puede ser sobreescrito
  protected transformData(data: any): T {
    return data as T;
  }

  // Métodos auxiliares compartidos
  validateFilters(filters?: AnalyticsFilters): void {
    if (filters?.period === 'custom') {
      if (!filters.startDate || !filters.endDate) {
        throw new Error('Custom period requires startDate and endDate');
      }
    }
  }

  protected getDateRange(filters?: AnalyticsFilters): { gte: Date; lte: Date } {
    const now = new Date();
    let gte: Date;
    let lte: Date = now;

    switch (filters?.period) {
      case 'today':
        gte = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        gte = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        gte = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        gte = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'custom':
        gte = filters.startDate!;
        lte = filters.endDate!;
        break;
      default:
        gte = new Date(now.setMonth(now.getMonth() - 1));
    }

    return { gte, lte };
  }

  protected decimalToNumber(value: any): number {
    if (!value) return 0;
    return parseFloat(value.toString());
  }

  protected formatPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100 * 100) / 100; // 2 decimales
  }

  protected groupByMonth<T extends { _sum: any }>(
    data: T[]
  ): { month: string; value: number }[] {
    // Implementación de agrupación por mes
    const grouped = new Map<string, number>();

    data.forEach(item => {
      // Lógica de agrupación
    });

    return Array.from(grouped.entries()).map(([month, value]) => ({
      month,
      value
    }));
  }
}
```

#### **1.3 Concrete Strategies**
```typescript
// src/services/analytics/strategies/FinancialAnalyticsStrategy.ts
import { BaseAnalyticsStrategy } from './BaseAnalyticsStrategy';
import { FinancialAnalyticsData } from '../../../types/analytics.types';

export class FinancialAnalyticsStrategy extends BaseAnalyticsStrategy<FinancialAnalyticsData> {
  protected async fetchData(
    dateRange: { gte: Date; lte: Date },
    filters?: AnalyticsFilters
  ): Promise<any> {
    // Ejecutar todas las queries en paralelo (Promise.all pattern)
    const [revenue, cashFlow, accountsReceivable] = await Promise.all([
      this.getRevenueData(dateRange),
      this.getCashFlowData(dateRange),
      this.getAccountsReceivableData(dateRange)
    ]);

    return { revenue, cashFlow, accountsReceivable };
  }

  protected transformData(data: any): FinancialAnalyticsData {
    return {
      revenue: {
        total: this.decimalToNumber(data.revenue.total),
        byPaymentMethod: data.revenue.byPaymentMethod.map((pm: any) => ({
          method: pm.paymentMethod,
          amount: this.decimalToNumber(pm._sum.amountPaid),
          count: pm._count,
          percentage: this.formatPercentage(
            this.decimalToNumber(pm._sum.amountPaid),
            this.decimalToNumber(data.revenue.total)
          )
        })),
        trend: this.groupByMonth(data.revenue.monthly),
        averageTicket: this.decimalToNumber(data.revenue.avgTicket)
      },
      cashFlow: this.transformCashFlow(data.cashFlow),
      accountsReceivable: this.transformAccountsReceivable(data.accountsReceivable)
    };
  }

  private async getRevenueData(dateRange: { gte: Date; lte: Date }) {
    // Query 1: Total revenue
    const total = await this.prisma.payment.aggregate({
      _sum: { amountPaid: true },
      where: {
        paymentDate: dateRange
      }
    });

    // Query 2: Revenue by payment method
    const byPaymentMethod = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amountPaid: true },
      _count: true,
      where: {
        paymentDate: dateRange
      }
    });

    // Query 3: Monthly revenue
    const monthly = await this.prisma.payment.groupBy({
      by: ['paymentDate'],
      _sum: { amountPaid: true },
      where: {
        paymentDate: dateRange
      },
      orderBy: {
        paymentDate: 'asc'
      }
    });

    // Query 4: Average ticket
    const avgTicket = await this.prisma.order.aggregate({
      _avg: { finalPrice: true },
      where: {
        createdAt: dateRange
      }
    });

    return { total: total._sum.amountPaid, byPaymentMethod, monthly, avgTicket: avgTicket._avg.finalPrice };
  }

  private async getCashFlowData(dateRange: { gte: Date; lte: Date }) {
    // Implementación...
  }

  private async getAccountsReceivableData(dateRange: { gte: Date; lte: Date }) {
    // Implementación...
  }

  private transformCashFlow(data: any) {
    // Implementación...
  }

  private transformAccountsReceivable(data: any) {
    // Implementación...
  }
}
```

```typescript
// Otras estrategias concretas
// src/services/analytics/strategies/OperationsAnalyticsStrategy.ts
export class OperationsAnalyticsStrategy extends BaseAnalyticsStrategy<OperationsAnalyticsData> {
  // Implementación específica para operaciones
}

// src/services/analytics/strategies/SalesAnalyticsStrategy.ts
export class SalesAnalyticsStrategy extends BaseAnalyticsStrategy<SalesAnalyticsData> {
  // Implementación específica para ventas
}

// Y así sucesivamente...
```

---

## 📦 **2. REPOSITORY PATTERN (Data Access Layer)**

### **Problema que Resuelve**:
Separar la lógica de acceso a datos de la lógica de negocio. Facilita testing y cambio de ORM.

### **Implementación**:

```typescript
// src/repositories/AnalyticsRepository.ts
import { PrismaClient, Prisma } from '@prisma/client';

export class AnalyticsRepository {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // PAYMENTS
  // ============================================
  async getTotalRevenue(dateRange: { gte: Date; lte: Date }): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      _sum: { amountPaid: true },
      where: {
        paymentDate: dateRange
      }
    });
    return Number(result._sum.amountPaid) || 0;
  }

  async getRevenueByPaymentMethod(dateRange: { gte: Date; lte: Date }) {
    return this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amountPaid: true },
      _count: true,
      where: {
        paymentDate: dateRange
      }
    });
  }

  async getMonthlyRevenue(dateRange: { gte: Date; lte: Date }) {
    return this.prisma.payment.groupBy({
      by: ['paymentDate'],
      _sum: { amountPaid: true },
      where: {
        paymentDate: dateRange
      },
      orderBy: {
        paymentDate: 'asc'
      }
    });
  }

  // ============================================
  // APPOINTMENTS
  // ============================================
  async getAppointmentsByStatus(dateRange: { gte: Date; lte: Date }) {
    return this.prisma.appointment.groupBy({
      by: ['status'],
      _count: true,
      where: {
        scheduledDate: dateRange
      }
    });
  }

  async getNoShowRateByDayOfWeek(dateRange: { gte: Date; lte: Date }) {
    // Query complejo usando raw SQL si es necesario
    return this.prisma.$queryRaw<any[]>`
      SELECT
        EXTRACT(DOW FROM scheduled_date) as day_of_week,
        COUNT(*) FILTER (WHERE status = 'no_show') * 100.0 / COUNT(*) as no_show_rate,
        COUNT(*) as total_appointments
      FROM appointments
      WHERE scheduled_date BETWEEN ${dateRange.gte} AND ${dateRange.lte}
      GROUP BY EXTRACT(DOW FROM scheduled_date)
      ORDER BY day_of_week
    `;
  }

  async getScheduleHeatmap(dateRange: { gte: Date; lte: Date }) {
    return this.prisma.$queryRaw<any[]>`
      SELECT
        EXTRACT(DOW FROM scheduled_date) as day_of_week,
        EXTRACT(HOUR FROM scheduled_date) as hour,
        COUNT(*) as appointment_count
      FROM appointments
      WHERE scheduled_date BETWEEN ${dateRange.gte} AND ${dateRange.lte}
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `;
  }

  // ============================================
  // CUSTOMERS
  // ============================================
  async getCustomerLifetimeValue() {
    return this.prisma.$queryRaw<any[]>`
      SELECT
        p.id,
        p.first_name,
        p.last_name,
        COUNT(DISTINCT a.id) as total_appointments,
        COALESCE(SUM(o.final_price), 0) as total_spent,
        MIN(a.scheduled_date) as first_visit,
        MAX(a.scheduled_date) as last_visit
      FROM patients p
      LEFT JOIN appointments a ON p.id = a.patient_id
      LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
      LEFT JOIN orders o ON aps.order_id = o.id
      GROUP BY p.id, p.first_name, p.last_name
      ORDER BY total_spent DESC
    `;
  }

  // ============================================
  // SALES
  // ============================================
  async getSalesPersonPerformance(dateRange: { gte: Date; lte: Date }) {
    return this.prisma.user.findMany({
      where: {
        role: { name: 'sales' }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        ordersCreated: {
          where: { createdAt: dateRange },
          select: {
            finalPrice: true,
            patientId: true
          }
        },
        commissions: {
          where: { createdAt: dateRange },
          select: {
            commissionAmount: true,
            status: true
          }
        }
      }
    });
  }

  // ============================================
  // SERVICES
  // ============================================
  async getServicePerformance(dateRange: { gte: Date; lte: Date }) {
    return this.prisma.service.findMany({
      where: { deletedAt: null },
      include: {
        orders: {
          where: { createdAt: dateRange },
          select: {
            finalPrice: true,
            discount: true,
            totalSessions: true,
            completedSessions: true
          }
        }
      }
    });
  }
}
```

---

## 🎯 **3. SERVICE LAYER (Orchestration)**

### **Problema que Resuelve**:
Coordinar múltiples estrategias y repositorios. Lógica de negocio compleja.

### **Implementación**:

```typescript
// src/services/analytics/AnalyticsService.ts
import { PrismaClient } from '@prisma/client';
import { AnalyticsRepository } from '../../repositories/AnalyticsRepository';
import { FinancialAnalyticsStrategy } from './strategies/FinancialAnalyticsStrategy';
import { OperationsAnalyticsStrategy } from './strategies/OperationsAnalyticsStrategy';
import { SalesAnalyticsStrategy } from './strategies/SalesAnalyticsStrategy';
import { CustomerAnalyticsStrategy } from './strategies/CustomerAnalyticsStrategy';
import { ServiceAnalyticsStrategy } from './strategies/ServiceAnalyticsStrategy';
import {
  AnalyticsFilters,
  FinancialAnalyticsData,
  OperationsAnalyticsData,
  SalesAnalyticsData,
  CustomerAnalyticsData,
  ServiceAnalyticsData,
  ExecutiveSummaryData
} from '../../types/analytics.types';

export class AnalyticsService {
  private repository: AnalyticsRepository;
  private strategies: {
    financial: FinancialAnalyticsStrategy;
    operations: OperationsAnalyticsStrategy;
    sales: SalesAnalyticsStrategy;
    customer: CustomerAnalyticsStrategy;
    service: ServiceAnalyticsStrategy;
  };

  constructor(private prisma: PrismaClient) {
    this.repository = new AnalyticsRepository(prisma);

    // Inicializar estrategias
    this.strategies = {
      financial: new FinancialAnalyticsStrategy(prisma),
      operations: new OperationsAnalyticsStrategy(prisma),
      sales: new SalesAnalyticsStrategy(prisma),
      customer: new CustomerAnalyticsStrategy(prisma),
      service: new ServiceAnalyticsStrategy(prisma)
    };
  }

  // Delegar a estrategias
  async getFinancialAnalytics(filters?: AnalyticsFilters): Promise<FinancialAnalyticsData> {
    return this.strategies.financial.execute(filters);
  }

  async getOperationsAnalytics(filters?: AnalyticsFilters): Promise<OperationsAnalyticsData> {
    return this.strategies.operations.execute(filters);
  }

  async getSalesAnalytics(filters?: AnalyticsFilters): Promise<SalesAnalyticsData> {
    return this.strategies.sales.execute(filters);
  }

  async getCustomerAnalytics(filters?: AnalyticsFilters): Promise<CustomerAnalyticsData> {
    return this.strategies.customer.execute(filters);
  }

  async getServiceAnalytics(filters?: AnalyticsFilters): Promise<ServiceAnalyticsData> {
    return this.strategies.service.execute(filters);
  }

  // Executive Summary: combina múltiples estrategias
  async getExecutiveSummary(filters?: AnalyticsFilters): Promise<ExecutiveSummaryData> {
    // Facade Pattern: simplifica la interfaz compleja
    const [financial, operations, sales] = await Promise.all([
      this.strategies.financial.execute(filters),
      this.strategies.operations.execute(filters),
      this.strategies.sales.execute(filters)
    ]);

    return {
      kpis: {
        totalRevenue: financial.revenue.total,
        totalAppointments: operations.appointments.total,
        attendanceRate: operations.appointments.attendanceRate,
        pendingCommissions: sales.commissions.pending.amount
      },
      revenueTrend: financial.revenue.trend,
      topServices: sales.topServices.slice(0, 5),
      appointmentsByStatus: operations.appointments.byStatus
    };
  }
}

// Singleton instance
let analyticsServiceInstance: AnalyticsService | null = null;

export const getAnalyticsService = (prisma: PrismaClient): AnalyticsService => {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService(prisma);
  }
  return analyticsServiceInstance;
};
```

---

## 🎮 **4. CONTROLLER LAYER (Thin Controllers)**

### **Implementación**:

```typescript
// src/controllers/analytics.controller.ts
import { Request, Response } from 'express';
import prisma from '../config/database';
import { getAnalyticsService } from '../services/analytics/AnalyticsService';
import { AppError } from '../middlewares/errorHandler';

const analyticsService = getAnalyticsService(prisma);

export const getFinancialAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = extractFilters(req.query);
    const data = await analyticsService.getFinancialAnalytics(filters);
    res.json(data);
  } catch (error) {
    handleError(error, res);
  }
};

export const getOperationsAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = extractFilters(req.query);
    const data = await analyticsService.getOperationsAnalytics(filters);
    res.json(data);
  } catch (error) {
    handleError(error, res);
  }
};

export const getSalesAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = extractFilters(req.query);
    const data = await analyticsService.getSalesAnalytics(filters);
    res.json(data);
  } catch (error) {
    handleError(error, res);
  }
};

export const getCustomerAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = extractFilters(req.query);
    const data = await analyticsService.getCustomerAnalytics(filters);
    res.json(data);
  } catch (error) {
    handleError(error, res);
  }
};

export const getServiceAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = extractFilters(req.query);
    const data = await analyticsService.getServiceAnalytics(filters);
    res.json(data);
  } catch (error) {
    handleError(error, res);
  }
};

export const getExecutiveSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = extractFilters(req.query);
    const data = await analyticsService.getExecutiveSummary(filters);
    res.json(data);
  } catch (error) {
    handleError(error, res);
  }
};

// Helper: extraer filtros de query params
function extractFilters(query: any) {
  return {
    period: query.period as 'today' | 'week' | 'month' | 'year' | 'custom',
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
    serviceId: query.serviceId,
    salesPersonId: query.salesPersonId
  };
}

// Helper: manejo de errores centralizado
function handleError(error: any, res: Response) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
  } else {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## ⚡ **5. CACHING LAYER (Decorator Pattern)**

### **Implementación**:

```typescript
// src/services/analytics/decorators/CachedAnalyticsService.ts
import { AnalyticsService } from '../AnalyticsService';
import { AnalyticsFilters } from '../../../types/analytics.types';
import { createClient, RedisClientType } from 'redis';

export class CachedAnalyticsService extends AnalyticsService {
  private redis: RedisClientType;
  private defaultTTL = 300; // 5 minutos

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.redis = createClient();
    this.redis.connect();
  }

  // Decorator: envuelve el método original con caching
  async getFinancialAnalytics(filters?: AnalyticsFilters) {
    const cacheKey = this.generateCacheKey('financial', filters);

    // Intentar obtener de cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      console.log('Cache HIT:', cacheKey);
      return JSON.parse(cached);
    }

    // Cache MISS: ejecutar query original
    console.log('Cache MISS:', cacheKey);
    const data = await super.getFinancialAnalytics(filters);

    // Guardar en cache
    await this.redis.setEx(cacheKey, this.defaultTTL, JSON.stringify(data));

    return data;
  }

  // Aplicar el mismo patrón a otros métodos...

  private generateCacheKey(type: string, filters?: AnalyticsFilters): string {
    const filterStr = JSON.stringify(filters || {});
    return `analytics:${type}:${filterStr}`;
  }

  // Método para invalidar cache
  async invalidateCache(type?: string) {
    if (type) {
      const pattern = `analytics:${type}:*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } else {
      // Invalidar todo el cache de analytics
      const keys = await this.redis.keys('analytics:*');
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    }
  }
}
```

---

## 🎨 **6. FRONTEND: CONTAINER/PRESENTATIONAL PATTERN**

### **Implementación**:

#### **Container Component (Smart)**
```typescript
// src/pages/analytics/FinancialAnalytics.tsx
import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { FinancialAnalyticsView } from '../../components/analytics/FinancialAnalyticsView';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';

interface Props {
  period: 'today' | 'week' | 'month' | 'year';
}

export const FinancialAnalytics: React.FC<Props> = ({ period }) => {
  // Container: maneja lógica de datos
  const { data, isLoading, error, refresh } = useAnalytics(
    (filters) => analyticsService.getFinancialAnalytics(filters),
    { period }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refresh} />;
  if (!data) return null;

  // Delegar rendering a componente presentacional
  return <FinancialAnalyticsView data={data} onRefresh={refresh} />;
};
```

#### **Presentational Component (Dumb)**
```typescript
// src/components/analytics/FinancialAnalyticsView.tsx
import React from 'react';
import { FinancialAnalyticsData } from '../../types/analytics.types';
import { KPICard } from './KPICard';
import { TrendChart } from './TrendChart';
import { PieChart } from './PieChart';

interface Props {
  data: FinancialAnalyticsData;
  onRefresh: () => void;
}

export const FinancialAnalyticsView: React.FC<Props> = ({ data, onRefresh }) => {
  // Presentational: solo renderiza datos
  return (
    <div className="financial-analytics">
      <div className="kpis-grid">
        <KPICard
          title="Revenue Total"
          value={`S/ ${data.revenue.total.toLocaleString()}`}
          trend={data.revenue.trend}
          color="success"
        />
        <KPICard
          title="Ticket Promedio"
          value={`S/ ${data.revenue.averageTicket.toLocaleString()}`}
          color="info"
        />
        {/* Más KPIs... */}
      </div>

      <div className="charts-grid">
        <TrendChart
          title="Tendencia de Ingresos"
          data={data.revenue.trend}
          color="#3498db"
        />
        <PieChart
          title="Ingresos por Método de Pago"
          data={data.revenue.byPaymentMethod.map(pm => ({
            name: pm.method,
            value: pm.amount
          }))}
        />
      </div>

      <button onClick={onRefresh} className="refresh-btn">
        Actualizar
      </button>
    </div>
  );
};
```

---

## 🧪 **7. TESTING STRATEGY**

### **Unit Tests**:
```typescript
// src/services/analytics/strategies/__tests__/FinancialAnalyticsStrategy.test.ts
import { FinancialAnalyticsStrategy } from '../FinancialAnalyticsStrategy';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');

describe('FinancialAnalyticsStrategy', () => {
  let strategy: FinancialAnalyticsStrategy;
  let prismaMock: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prismaMock = new PrismaClient() as jest.Mocked<PrismaClient>;
    strategy = new FinancialAnalyticsStrategy(prismaMock);
  });

  describe('execute', () => {
    it('should return financial analytics data', async () => {
      // Arrange
      const mockData = {
        _sum: { amountPaid: 10000 }
      };
      prismaMock.payment.aggregate.mockResolvedValue(mockData as any);

      // Act
      const result = await strategy.execute({ period: 'month' });

      // Assert
      expect(result).toBeDefined();
      expect(result.revenue).toBeDefined();
      expect(prismaMock.payment.aggregate).toHaveBeenCalledTimes(1);
    });

    it('should validate filters correctly', () => {
      // Arrange & Act & Assert
      expect(() => {
        strategy.validateFilters({ period: 'custom' });
      }).toThrow('Custom period requires startDate and endDate');
    });
  });
});
```

### **Integration Tests**:
```typescript
// src/controllers/__tests__/analytics.controller.integration.test.ts
import request from 'supertest';
import app from '../../app';
import prisma from '../../config/database';

describe('Analytics Controller Integration', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup: crear usuario admin y obtener token
    authToken = await getAdminToken();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/analytics/financial', () => {
    it('should return financial analytics for admin user', async () => {
      const response = await request(app)
        .get('/api/analytics/financial')
        .query({ period: 'month' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('revenue');
      expect(response.body.revenue).toHaveProperty('total');
    });

    it('should return 403 for non-admin user', async () => {
      const salesToken = await getSalesToken();

      await request(app)
        .get('/api/analytics/financial')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(403);
    });
  });
});
```

---

## 🚀 **PASOS DE IMPLEMENTACIÓN CLAROS**

### **Sprint 1: Fundación (Días 1-3)**
```bash
# Día 1: Backend Structure
cd backend/src
mkdir -p services/analytics/strategies
mkdir -p repositories
mkdir -p types

# Crear archivos base
touch types/analytics.types.ts
touch services/analytics/strategies/IAnalyticsStrategy.ts
touch services/analytics/strategies/BaseAnalyticsStrategy.ts
touch repositories/AnalyticsRepository.ts
touch services/analytics/AnalyticsService.ts
touch controllers/analytics.controller.ts
touch routes/analytics.routes.ts

# Día 2: Frontend Structure
cd frontend/src
mkdir -p pages/analytics
mkdir -p components/analytics
mkdir -p hooks

# Crear archivos base
touch pages/analytics/AnalyticsPage.tsx
touch services/analytics.service.ts
touch hooks/useAnalytics.ts
touch types/analytics.types.ts

# Día 3: Componentes Base
cd components/analytics
touch KPICard.tsx
touch TrendChart.tsx
touch PieChart.tsx
touch BarChart.tsx
touch RankingTable.tsx
```

### **Sprint 2-6: Implementar cada módulo**
Seguir el mismo patrón para cada uno:
1. Crear Strategy concreta
2. Agregar queries al Repository
3. Agregar método al Service
4. Crear endpoint en Controller
5. Crear componentes de UI
6. Testing

---

**Este documento define la arquitectura completa usando patrones de diseño profesionales y probados en producción.**
