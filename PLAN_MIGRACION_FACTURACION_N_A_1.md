# Plan de Migración: Sistema de Facturación N:1

## 📋 Resumen Ejecutivo

**Objetivo**: Migrar el sistema de facturación de una relación 1:1 (una factura por orden) a una relación N:1 (múltiples órdenes por factura), permitiendo facturación consolidada flexible y manteniendo compatibilidad con el flujo actual.

**Modelo de Negocio Seleccionado**: **Híbrido con generación manual**
- Órdenes se crean sin factura automática
- Usuario decide cuándo y cómo facturar
- Permite facturación individual o consolidada
- Máxima flexibilidad operativa

---

## 🎯 Objetivos Técnicos

### Funcionales
1. ✅ Permitir múltiples órdenes en una sola factura
2. ✅ Mantener compatibilidad con facturas existentes (1:1)
3. ✅ Agregar interfaz para gestión manual de facturación
4. ✅ Automatizar cálculo de totales en facturas consolidadas
5. ✅ Actualizar estado de factura según pagos recibidos

### No Funcionales
1. ✅ Zero downtime migration (migración sin pérdida de datos)
2. ✅ Backward compatibility (compatibilidad hacia atrás)
3. ✅ Mantener integridad referencial
4. ✅ Aplicar patrones de diseño enterprise

---

## 🏗️ Arquitectura y Patrones de Diseño

### Patrones Aplicados

#### 1. **Repository Pattern** (Actual - Mantener)
```typescript
// Ya implementado en el sistema
class OrderRepository {
  async findById(id: string): Promise<Order>
  async findByPatient(patientId: string): Promise<Order[]>
  async create(data: CreateOrderDto): Promise<Order>
}
```

#### 2. **Factory Pattern** (NUEVO - Para creación de facturas)
```typescript
// backend/src/factories/invoice.factory.ts
class InvoiceFactory {
  /**
   * Crea factura individual (1 orden)
   */
  static createSingleInvoice(order: Order, userId: string): CreateInvoiceDto {
    return {
      patientId: order.patientId,
      orderIds: [order.id],
      totalAmount: order.finalPrice,
      dueDate: this.calculateDueDate(),
      createdById: userId,
    };
  }

  /**
   * Crea factura consolidada (N órdenes)
   */
  static createConsolidatedInvoice(
    orders: Order[],
    patientId: string,
    userId: string,
    dueDate?: Date
  ): CreateInvoiceDto {
    const totalAmount = orders.reduce((sum, o) => sum + o.finalPrice, 0);

    return {
      patientId,
      orderIds: orders.map(o => o.id),
      totalAmount,
      dueDate: dueDate || this.calculateDueDate(),
      createdById: userId,
    };
  }

  private static calculateDueDate(): Date {
    // 30 días desde hoy
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }
}
```

#### 3. **Strategy Pattern** (NUEVO - Para lógica de facturación)
```typescript
// backend/src/strategies/invoicing.strategy.ts
interface InvoicingStrategy {
  canInvoice(orders: Order[]): boolean;
  calculateTotal(orders: Order[]): number;
}

class ImmediateInvoicingStrategy implements InvoicingStrategy {
  canInvoice(orders: Order[]): boolean {
    // Facturar inmediatamente al crear orden
    return orders.length === 1;
  }

  calculateTotal(orders: Order[]): number {
    return orders[0].finalPrice;
  }
}

class ConsolidatedInvoicingStrategy implements InvoicingStrategy {
  canInvoice(orders: Order[]): boolean {
    // Validar que todas las órdenes sean del mismo paciente
    const patientIds = new Set(orders.map(o => o.patientId));
    return patientIds.size === 1 && orders.length > 0;
  }

  calculateTotal(orders: Order[]): number {
    return orders.reduce((sum, o) => sum + o.finalPrice, 0);
  }
}
```

#### 4. **Service Layer Pattern** (NUEVO - Lógica de negocio)
```typescript
// backend/src/services/invoicing.service.ts
class InvoicingService {
  constructor(
    private invoiceFactory: InvoiceFactory,
    private strategy: InvoicingStrategy
  ) {}

  async createInvoice(
    orders: Order[],
    userId: string,
    options?: InvoiceOptions
  ): Promise<Invoice> {
    // Validar estrategia
    if (!this.strategy.canInvoice(orders)) {
      throw new AppError('Invalid orders for invoicing', 400);
    }

    // Verificar que las órdenes no tengan factura
    const ordersWithInvoice = orders.filter(o => o.invoiceId);
    if (ordersWithInvoice.length > 0) {
      throw new AppError('Some orders are already invoiced', 400);
    }

    // Crear factura usando Factory
    const invoiceData = orders.length === 1
      ? this.invoiceFactory.createSingleInvoice(orders[0], userId)
      : this.invoiceFactory.createConsolidatedInvoice(
          orders,
          orders[0].patientId,
          userId,
          options?.dueDate
        );

    // Usar transacción para garantizar atomicidad
    return await prisma.$transaction(async (tx) => {
      // Crear factura
      const invoice = await tx.invoice.create({
        data: invoiceData,
      });

      // Actualizar órdenes con invoiceId
      await tx.order.updateMany({
        where: { id: { in: orders.map(o => o.id) } },
        data: { invoiceId: invoice.id },
      });

      return invoice;
    });
  }

  async updateInvoiceStatus(invoiceId: string): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const totalPaid = invoice.payments.reduce(
      (sum, p) => sum + p.amountPaid,
      0
    );

    let status: InvoiceStatus;
    if (totalPaid === 0) {
      status = 'pending';
    } else if (totalPaid >= invoice.totalAmount) {
      status = 'paid';
    } else {
      status = 'partial';
    }

    return await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });
  }
}
```

#### 5. **Unit of Work Pattern** (Transacciones Prisma)
```typescript
// Ya implementado con Prisma transactions
await prisma.$transaction(async (tx) => {
  // Operaciones atómicas
});
```

---

## 📊 Cambios en el Schema de Base de Datos

### Fase 1: Modificación del Schema

**Archivo**: `backend/prisma/schema.prisma`

#### Cambios en el modelo Order
```prisma
model Order {
  id              String   @id @default(uuid())
  patientId       String   @map("patient_id")
  serviceId       String   @map("service_id")
  totalSessions   Int      @map("total_sessions")
  completedSessions Int    @default(0) @map("completed_sessions")
  originalPrice   Decimal  @map("original_price") @db.Decimal(10, 2)
  discount        Decimal  @default(0) @map("discount") @db.Decimal(10, 2)
  finalPrice      Decimal  @map("final_price") @db.Decimal(10, 2)
  notes           String?

  // ✅ NUEVO: FK opcional a Invoice
  invoiceId       String?  @map("invoice_id")

  createdById     String   @map("created_by_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  patient       Patient       @relation(fields: [patientId], references: [id])
  service       Service       @relation(fields: [serviceId], references: [id])
  createdBy     User          @relation("OrderCreatedBy", fields: [createdById], references: [id])
  appointmentServices AppointmentService[]

  // ✅ MODIFICADO: Relación opcional con Invoice
  invoice       Invoice?      @relation(fields: [invoiceId], references: [id])

  @@map("orders")
}
```

#### Cambios en el modelo Invoice
```prisma
model Invoice {
  id              String        @id @default(uuid())

  // ❌ ELIMINADO: orderId único
  // orderId         String        @unique @map("order_id")

  patientId       String        @map("patient_id")
  totalAmount     Decimal       @map("total_amount") @db.Decimal(10, 2)
  status          InvoiceStatus @default(pending)
  dueDate         DateTime?     @map("due_date")

  // ✅ NUEVO: Metadata y auditoría
  createdById     String        @map("created_by_id")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  // Relations
  // ❌ ELIMINADO: Relación 1:1 con Order
  // order    Order     @relation(fields: [orderId], references: [id])

  // ✅ NUEVO: Relación 1:N con Orders
  orders   Order[]

  patient  Patient   @relation(fields: [patientId], references: [id])
  payments Payment[]
  createdBy User     @relation("InvoiceCreatedBy", fields: [createdById], references: [id])

  @@map("invoices")
}
```

#### Agregar relación en User
```prisma
model User {
  // ... campos existentes ...

  // Relations existentes
  patientsCreated            Patient[]
  ordersCreated              Order[]
  appointmentsCreated        Appointment[]
  // ... otras relaciones ...

  // ✅ NUEVO: Facturas creadas por este usuario
  invoicesCreated            Invoice[]  @relation("InvoiceCreatedBy")

  @@map("users")
}
```

### Fase 2: Migración de Datos

**Archivo**: `backend/prisma/migrations/20251205_refactor_invoice_to_many_orders/migration.sql`

```sql
-- Paso 1: Agregar columna invoiceId a orders (nullable)
ALTER TABLE "orders" ADD COLUMN "invoice_id" TEXT;

-- Paso 2: Poblar invoiceId en orders desde invoices existentes
-- Esto mantiene la compatibilidad con el modelo anterior
UPDATE "orders" o
SET "invoice_id" = i.id
FROM "invoices" i
WHERE i.order_id = o.id;

-- Paso 3: Agregar createdById a invoices (nullable por ahora)
ALTER TABLE "invoices" ADD COLUMN "created_by_id" TEXT;

-- Paso 4: Poblar createdById desde orders.createdById
UPDATE "invoices" i
SET "created_by_id" = o.created_by_id
FROM "orders" o
WHERE i.order_id = o.id;

-- Paso 5: Hacer NOT NULL el createdById (después de poblar)
ALTER TABLE "invoices" ALTER COLUMN "created_by_id" SET NOT NULL;

-- Paso 6: Agregar FK constraint para invoiceId en orders
ALTER TABLE "orders"
ADD CONSTRAINT "orders_invoice_id_fkey"
FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
ON DELETE SET NULL;

-- Paso 7: Agregar FK constraint para createdById en invoices
ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE RESTRICT;

-- Paso 8: Eliminar la constraint UNIQUE de orderId en invoices
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_order_id_key";

-- Paso 9: Eliminar la FK constraint vieja de invoices.orderId
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_order_id_fkey";

-- Paso 10: Eliminar la columna orderId de invoices
-- NOTA: Solo hacerlo después de verificar que todo funciona
-- Se puede hacer en una migración posterior para seguridad
-- ALTER TABLE "invoices" DROP COLUMN "order_id";
```

### Fase 3: Migración Segura (Opcional - Rollback)

**Archivo**: `backend/prisma/migrations/20251205_remove_order_id_from_invoice/migration.sql`

```sql
-- Esta migración se ejecuta SOLO después de verificar que todo funciona
-- Permite rollback si es necesario

-- Eliminar columna orderId de invoices
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "order_id";
```

---

## 🔧 Implementación Backend

### Estructura de Archivos

```
backend/src/
├── controllers/
│   ├── invoices.controller.ts      # ✅ Ya existe
│   └── orders.controller.ts        # ✅ Modificar
├── services/
│   ├── invoicing.service.ts        # 🆕 NUEVO
│   └── order.service.ts            # 🆕 NUEVO
├── factories/
│   └── invoice.factory.ts          # 🆕 NUEVO
├── strategies/
│   └── invoicing.strategy.ts       # 🆕 NUEVO
├── dto/
│   ├── create-invoice.dto.ts       # ✅ Modificar
│   └── create-order.dto.ts         # ✅ Ya existe
└── types/
    └── invoice.types.ts            # 🆕 NUEVO
```

### 1. DTOs y Types

**Archivo**: `backend/src/types/invoice.types.ts`

```typescript
export interface InvoiceOptions {
  dueDate?: Date;
  notes?: string;
  autoCalculate?: boolean; // Calcular total automáticamente
}

export interface CreateInvoiceDto {
  patientId: string;
  orderIds: string[];  // ✅ Ahora es array
  totalAmount?: number; // Opcional si autoCalculate = true
  dueDate?: Date;
  createdById: string;
  notes?: string;
}

export interface UpdateInvoiceDto {
  dueDate?: Date;
  notes?: string;
  status?: InvoiceStatus;
}

export interface InvoiceWithOrders extends Invoice {
  orders: Order[];
  payments: Payment[];
  patient: Partial<Patient>;
  createdBy: Partial<User>;
}
```

### 2. Service Layer

**Archivo**: `backend/src/services/invoicing.service.ts`

```typescript
import { PrismaClient, Invoice, Order, InvoiceStatus } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { CreateInvoiceDto, InvoiceOptions } from '../types/invoice.types';

const prisma = new PrismaClient();

export class InvoicingService {
  /**
   * Crea una factura individual o consolidada
   */
  async createInvoice(
    orderIds: string[],
    userId: string,
    options: InvoiceOptions = {}
  ): Promise<Invoice> {
    // 1. Validar que hay órdenes
    if (!orderIds || orderIds.length === 0) {
      throw new AppError('At least one order is required', 400);
    }

    // 2. Obtener órdenes
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { service: true },
    });

    if (orders.length !== orderIds.length) {
      throw new AppError('Some orders not found', 404);
    }

    // 3. Validar que todas las órdenes son del mismo paciente
    const patientIds = new Set(orders.map(o => o.patientId));
    if (patientIds.size > 1) {
      throw new AppError('All orders must belong to the same patient', 400);
    }

    // 4. Validar que ninguna orden ya tiene factura
    const ordersWithInvoice = orders.filter(o => o.invoiceId);
    if (ordersWithInvoice.length > 0) {
      throw new AppError(
        `Orders already invoiced: ${ordersWithInvoice.map(o => o.id).join(', ')}`,
        400
      );
    }

    // 5. Calcular total
    const totalAmount = options.autoCalculate !== false
      ? orders.reduce((sum, o) => sum + Number(o.finalPrice), 0)
      : options.totalAmount || 0;

    // 6. Calcular fecha de vencimiento (30 días por defecto)
    const dueDate = options.dueDate || (() => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    })();

    // 7. Crear factura en transacción
    return await prisma.$transaction(async (tx) => {
      // Crear factura
      const invoice = await tx.invoice.create({
        data: {
          patientId: orders[0].patientId,
          totalAmount,
          dueDate,
          status: 'pending',
          createdById: userId,
        },
        include: {
          orders: {
            include: {
              service: true,
            },
          },
          payments: true,
          patient: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Asociar órdenes a la factura
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { invoiceId: invoice.id },
      });

      return invoice;
    });
  }

  /**
   * Actualiza el estado de una factura según sus pagos
   */
  async updateInvoiceStatus(invoiceId: string): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Calcular total pagado
    const totalPaid = invoice.payments
      .filter(p => p.invoiceId === invoiceId)
      .reduce((sum, p) => sum + Number(p.amountPaid), 0);

    // Determinar estado
    let status: InvoiceStatus;
    if (totalPaid === 0) {
      status = 'pending';
    } else if (totalPaid >= Number(invoice.totalAmount)) {
      status = 'paid';
    } else {
      status = 'partial';
    }

    // Actualizar estado
    return await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
      include: {
        orders: true,
        payments: true,
        patient: true,
      },
    });
  }

  /**
   * Obtiene órdenes sin facturar de un paciente
   */
  async getUninvoicedOrders(patientId: string): Promise<Order[]> {
    return await prisma.order.findMany({
      where: {
        patientId,
        invoiceId: null, // Órdenes sin factura
      },
      include: {
        service: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export const invoicingService = new InvoicingService();
```

### 3. Controller

**Archivo**: `backend/src/controllers/invoices.controller.ts`

```typescript
import { Request, Response } from 'express';
import { invoicingService } from '../services/invoicing.service';
import { AppError } from '../middlewares/errorHandler';

/**
 * Crear factura individual o consolidada
 * POST /api/invoices
 */
export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderIds, dueDate, notes } = req.body;
    const userId = req.user!.id;

    // Validar input
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new AppError('orderIds must be a non-empty array', 400);
    }

    // Crear factura
    const invoice = await invoicingService.createInvoice(
      orderIds,
      userId,
      { dueDate, notes }
    );

    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  }
};

/**
 * Obtener órdenes sin facturar de un paciente
 * GET /api/patients/:patientId/uninvoiced-orders
 */
export const getUninvoicedOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const orders = await invoicingService.getUninvoicedOrders(patientId);

    res.json(orders);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error fetching uninvoiced orders:', error);
      res.status(500).json({ error: 'Failed to fetch uninvoiced orders' });
    }
  }
};

/**
 * Recalcular estado de factura
 * POST /api/invoices/:id/recalculate-status
 */
export const recalculateInvoiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invoice = await invoicingService.updateInvoiceStatus(id);

    res.json(invoice);
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error recalculating invoice status:', error);
      res.status(500).json({ error: 'Failed to recalculate invoice status' });
    }
  }
};
```

### 4. Routes

**Archivo**: `backend/src/routes/invoices.routes.ts`

```typescript
import { Router } from 'express';
import {
  createInvoice,
  getUninvoicedOrders,
  recalculateInvoiceStatus,
} from '../controllers/invoices.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// Crear factura (individual o consolidada)
router.post('/', authorize('admin', 'sales'), createInvoice);

// Recalcular estado de factura
router.post('/:id/recalculate-status', authorize('admin'), recalculateInvoiceStatus);

export default router;
```

**Archivo**: `backend/src/routes/patients.routes.ts` (Agregar ruta)

```typescript
// Agregar al archivo existente
router.get(
  '/:patientId/uninvoiced-orders',
  authorize('admin', 'sales'),
  getUninvoicedOrders
);
```

### 5. Hooks de Actualización Automática

**Archivo**: `backend/src/controllers/payments.controller.ts` (Modificar)

```typescript
// Al crear un pago, actualizar estado de factura automáticamente
export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const payment = await prisma.payment.create({
      data: {
        ...paymentData,
        createdById: req.user!.id,
      },
    });

    // ✅ NUEVO: Actualizar estado de factura si existe
    if (payment.invoiceId) {
      await invoicingService.updateInvoiceStatus(payment.invoiceId);
    }

    res.status(201).json(payment);
  } catch (error) {
    // ... error handling
  }
};
```

---

## 💻 Implementación Frontend

### Estructura de Archivos

```
frontend/src/
├── pages/
│   ├── PatientInvoicesPage.tsx        # ✅ Modificar
│   ├── PatientOrdersPage.tsx          # 🆕 NUEVO
│   └── CreateInvoicePage.tsx          # 🆕 NUEVO
├── components/
│   ├── OrderSelectionModal.tsx        # 🆕 NUEVO
│   └── InvoiceDetailsModal.tsx        # 🆕 NUEVO
├── services/
│   ├── invoices.service.ts            # ✅ Modificar
│   └── orders.service.ts              # ✅ Modificar
└── types/
    └── index.ts                        # ✅ Modificar
```

### 1. Types

**Archivo**: `frontend/src/types/index.ts` (Modificar)

```typescript
export interface Order {
  id: string;
  patientId: string;
  serviceId: string;
  totalSessions: number;
  completedSessions: number;
  originalPrice: number;
  discount: number;
  finalPrice: number;
  notes?: string;

  // ✅ NUEVO: FK opcional a Invoice
  invoiceId?: string | null;

  createdAt: string;
  service?: Service;
  invoice?: Partial<Invoice>;  // ✅ NUEVO
  createdBy?: Partial<User>;
}

export interface Invoice {
  id: string;
  patientId: string;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;

  // ✅ NUEVO: Relación con múltiples órdenes
  orders?: Order[];

  patient?: Partial<Patient>;
  payments?: Payment[];
  createdBy?: Partial<User>;  // ✅ NUEVO
}

// ✅ NUEVO: DTO para crear factura
export interface CreateInvoiceDto {
  orderIds: string[];
  dueDate?: string;
  notes?: string;
}
```

### 2. Services

**Archivo**: `frontend/src/services/invoices.service.ts` (Modificar)

```typescript
import api from './api';
import { Invoice, CreateInvoiceDto } from '../types';

export const invoicesService = {
  /**
   * Crear factura individual o consolidada
   */
  async createInvoice(data: CreateInvoiceDto): Promise<Invoice> {
    const response = await api.post<Invoice>('/invoices', data);
    return response.data;
  },

  /**
   * Obtener factura por ID
   */
  async getInvoice(id: string): Promise<Invoice> {
    const response = await api.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  /**
   * Recalcular estado de factura
   */
  async recalculateStatus(id: string): Promise<Invoice> {
    const response = await api.post<Invoice>(`/invoices/${id}/recalculate-status`);
    return response.data;
  },
};
```

**Archivo**: `frontend/src/services/orders.service.ts` (NUEVO)

```typescript
import api from './api';
import { Order } from '../types';

export const ordersService = {
  /**
   * Obtener órdenes sin facturar de un paciente
   */
  async getUninvoicedOrders(patientId: string): Promise<Order[]> {
    const response = await api.get<Order[]>(`/patients/${patientId}/uninvoiced-orders`);
    return response.data;
  },

  /**
   * Obtener todas las órdenes de un paciente
   */
  async getPatientOrders(patientId: string): Promise<Order[]> {
    const response = await api.get<Order[]>(`/patients/${patientId}/orders`);
    return response.data;
  },
};
```

### 3. Página: Órdenes del Paciente

**Archivo**: `frontend/src/pages/PatientOrdersPage.tsx` (NUEVO)

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersService } from '../services/orders.service';
import { invoicesService } from '../services/invoices.service';
import { Order } from '../types';
import { Loading } from '../components/Loading';

export const PatientOrdersPage: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [uninvoicedOrders, setUninvoicedOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      loadOrders();
    }
  }, [patientId]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const [allOrders, uninvoiced] = await Promise.all([
        ordersService.getPatientOrders(patientId!),
        ordersService.getUninvoicedOrders(patientId!),
      ]);
      setOrders(allOrders);
      setUninvoicedOrders(uninvoiced);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar órdenes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleCreateInvoice = async () => {
    if (selectedOrderIds.length === 0) {
      alert('Selecciona al menos una orden');
      return;
    }

    try {
      setIsSaving(true);
      await invoicesService.createInvoice({
        orderIds: selectedOrderIds,
      });

      alert(
        selectedOrderIds.length === 1
          ? 'Factura creada exitosamente'
          : `Factura consolidada creada con ${selectedOrderIds.length} órdenes`
      );

      // Recargar y navegar
      await loadOrders();
      setSelectedOrderIds([]);
      navigate(`/patients/${patientId}/invoices`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear factura');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Loading />;

  const selectedTotal = uninvoicedOrders
    .filter(o => selectedOrderIds.includes(o.id))
    .reduce((sum, o) => sum + Number(o.finalPrice), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Órdenes del Paciente</h1>

      {error && <div className="error-banner">{error}</div>}

      {/* Resumen de selección */}
      {selectedOrderIds.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0' }}>
                {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'orden seleccionada' : 'órdenes seleccionadas'}
              </h3>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>
                Total: S/. {selectedTotal.toFixed(2)}
              </p>
            </div>
            <button
              onClick={handleCreateInvoice}
              disabled={isSaving}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? 'Creando...' : 'Generar Factura'}
            </button>
          </div>
        </div>
      )}

      {/* Órdenes sin facturar */}
      <div style={{ marginBottom: '40px' }}>
        <h2>Órdenes Pendientes de Facturar ({uninvoicedOrders.length})</h2>

        {uninvoicedOrders.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No hay órdenes pendientes de facturar</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {uninvoicedOrders.map(order => (
              <div
                key={order.id}
                onClick={() => handleSelectOrder(order.id)}
                style={{
                  border: selectedOrderIds.includes(order.id)
                    ? '2px solid #3b82f6'
                    : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  cursor: 'pointer',
                  background: selectedOrderIds.includes(order.id) ? '#f0f9ff' : 'white',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => {}}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px' }}>
                        {order.service?.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {order.totalSessions} sesiones • {order.completedSessions} completadas
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>
                    S/. {Number(order.finalPrice).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Órdenes facturadas */}
      <div>
        <h2>Órdenes Facturadas ({orders.length - uninvoicedOrders.length})</h2>

        {orders.filter(o => o.invoiceId).length === 0 ? (
          <p style={{ color: '#6b7280' }}>No hay órdenes facturadas</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders
              .filter(o => o.invoiceId)
              .map(order => (
                <div
                  key={order.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    background: '#f9fafb',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px' }}>
                        {order.service?.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        Factura #{order.invoiceId?.slice(0, 8).toUpperCase()}
                      </div>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>
                      S/. {Number(order.finalPrice).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 4. Modificar Página de Facturas

**Archivo**: `frontend/src/pages/PatientInvoicesPage.tsx` (Modificar)

```typescript
// Modificar el mapeo de facturas para mostrar múltiples órdenes

{invoices.map((invoice, index) => {
  // ✅ NUEVO: Obtener todas las órdenes de la factura
  const invoiceOrders = invoice.orders || [];
  const invoiceStatus = invoice.status;
  const amountPaid = invoice.payments?.reduce((sum, p) => sum + Number(p.amountPaid), 0) || 0;
  const totalInvoiceAmount = Number(invoice.totalAmount || 0);
  const pendingAmount = totalInvoiceAmount - amountPaid;
  const paymentCount = invoice.payments?.length || 0;

  return (
    <div key={invoice.id} style={{ /* ... */ }}>
      {/* Header */}
      <div>
        <h3>Factura #{invoice.id.slice(0, 8).toUpperCase()}</h3>
        <span>{getStatusLabel(invoiceStatus)}</span>
      </div>

      {/* ✅ NUEVO: Lista de órdenes en esta factura */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        background: '#f9fafb',
        borderRadius: '8px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
          Servicios Incluidos ({invoiceOrders.length})
        </div>
        {invoiceOrders.map(order => (
          <div key={order.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            padding: '6px 0',
            borderBottom: '1px solid #e5e7eb',
          }}>
            <span>
              {order.service?.name} • {order.totalSessions} {order.totalSessions === 1 ? 'sesión' : 'sesiones'}
            </span>
            <span style={{ fontWeight: '600' }}>
              S/. {Number(order.finalPrice).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* ... resto del código existente ... */}
    </div>
  );
})}
```

---

## 🧪 Testing

### 1. Tests Unitarios

**Archivo**: `backend/src/services/__tests__/invoicing.service.test.ts`

```typescript
import { InvoicingService } from '../invoicing.service';
import { prismaMock } from '../../test-utils/prisma-mock';

describe('InvoicingService', () => {
  let service: InvoicingService;

  beforeEach(() => {
    service = new InvoicingService();
  });

  describe('createInvoice', () => {
    it('should create single invoice for one order', async () => {
      const mockOrder = {
        id: 'order-1',
        patientId: 'patient-1',
        finalPrice: 1500,
        invoiceId: null,
      };

      prismaMock.order.findMany.mockResolvedValue([mockOrder]);
      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(prismaMock)
      );

      const result = await service.createInvoice(['order-1'], 'user-1');

      expect(result.totalAmount).toBe(1500);
      expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['order-1'] } },
        data: { invoiceId: expect.any(String) },
      });
    });

    it('should create consolidated invoice for multiple orders', async () => {
      const mockOrders = [
        { id: 'order-1', patientId: 'patient-1', finalPrice: 1500, invoiceId: null },
        { id: 'order-2', patientId: 'patient-1', finalPrice: 800, invoiceId: null },
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.createInvoice(['order-1', 'order-2'], 'user-1');

      expect(result.totalAmount).toBe(2300);
    });

    it('should throw error if orders belong to different patients', async () => {
      const mockOrders = [
        { id: 'order-1', patientId: 'patient-1', finalPrice: 1500 },
        { id: 'order-2', patientId: 'patient-2', finalPrice: 800 },
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders);

      await expect(
        service.createInvoice(['order-1', 'order-2'], 'user-1')
      ).rejects.toThrow('All orders must belong to the same patient');
    });

    it('should throw error if order already has invoice', async () => {
      const mockOrders = [
        { id: 'order-1', patientId: 'patient-1', finalPrice: 1500, invoiceId: 'invoice-1' },
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders);

      await expect(
        service.createInvoice(['order-1'], 'user-1')
      ).rejects.toThrow('Orders already invoiced');
    });
  });

  describe('updateInvoiceStatus', () => {
    it('should set status to pending when no payments', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        totalAmount: 1500,
        payments: [],
      };

      prismaMock.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.updateInvoiceStatus('invoice-1');

      expect(result.status).toBe('pending');
    });

    it('should set status to partial when partially paid', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        totalAmount: 1500,
        payments: [
          { invoiceId: 'invoice-1', amountPaid: 500 },
        ],
      };

      prismaMock.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.updateInvoiceStatus('invoice-1');

      expect(result.status).toBe('partial');
    });

    it('should set status to paid when fully paid', async () => {
      const mockInvoice = {
        id: 'invoice-1',
        totalAmount: 1500,
        payments: [
          { invoiceId: 'invoice-1', amountPaid: 1500 },
        ],
      };

      prismaMock.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.updateInvoiceStatus('invoice-1');

      expect(result.status).toBe('paid');
    });
  });
});
```

### 2. Tests de Integración

**Archivo**: `backend/src/__tests__/integration/invoicing.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

describe('Invoicing Integration Tests', () => {
  let authToken: string;
  let patientId: string;
  let orderIds: string[];

  beforeAll(async () => {
    // Setup test data
    authToken = await getAuthToken();
    patientId = await createTestPatient();
    orderIds = await createTestOrders(patientId, 3);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/invoices', () => {
    it('should create single invoice', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderIds: [orderIds[0]],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.orders).toHaveLength(1);
    });

    it('should create consolidated invoice', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderIds: orderIds.slice(1), // Últimas 2 órdenes
        })
        .expect(201);

      expect(response.body.orders).toHaveLength(2);
    });

    it('should reject invalid orderIds', async () => {
      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderIds: [],
        })
        .expect(400);
    });
  });
});
```

---

## 📈 Plan de Rollout

### Fase 1: Preparación (Día 1-2)
1. ✅ Crear rama `feature/invoice-n-to-1`
2. ✅ Revisar y aprobar este documento
3. ✅ Setup de ambiente de desarrollo
4. ✅ Backup de base de datos de producción

### Fase 2: Implementación Backend (Día 3-5)
1. ✅ Modificar schema de Prisma
2. ✅ Crear migración de datos
3. ✅ Implementar InvoicingService
4. ✅ Implementar controllers y routes
5. ✅ Escribir tests unitarios
6. ✅ Ejecutar tests de integración

### Fase 3: Implementación Frontend (Día 6-7)
1. ✅ Modificar types e interfaces
2. ✅ Implementar servicios
3. ✅ Crear PatientOrdersPage
4. ✅ Modificar PatientInvoicesPage
5. ✅ Testing manual

### Fase 4: Testing y QA (Día 8-9)
1. ✅ Tests E2E
2. ✅ Pruebas de regresión
3. ✅ Pruebas de rendimiento
4. ✅ Code review

### Fase 5: Despliegue (Día 10)
1. ✅ Desplegar en staging
2. ✅ Ejecutar migración en staging
3. ✅ Validar funcionalidad
4. ✅ Desplegar en producción
5. ✅ Monitor de errores

---

## 🔄 Estrategia de Migración de Datos

### Escenario 1: Datos Existentes (Backward Compatibility)

**Todas las facturas existentes seguirán funcionando:**

```sql
-- Las facturas existentes (1:1) seguirán funcionando
-- porque la columna invoiceId en orders será poblada
-- con el id de su factura correspondiente
```

**Ejemplo:**
```
ANTES:
Invoice #001 → Order #A (1:1 única relación)

DESPUÉS:
Invoice #001 ← Order #A (N:1 pero solo hay 1 orden)
```

### Escenario 2: Nuevos Datos (Facturas Consolidadas)

**Facturas nuevas pueden tener múltiples órdenes:**

```
Patient compra 3 servicios:
Order #B (Láser 10 sesiones) - S/. 1,500
Order #C (Peeling 5 sesiones) - S/. 800
Order #D (Limpieza 3 sesiones) - S/. 300

Se crea:
Invoice #002 ← Order #B, Order #C, Order #D
Total: S/. 2,600
```

---

## ⚠️ Consideraciones y Riesgos

### Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de datos en migración | Baja | Alto | Backup completo antes de migrar + rollback plan |
| Incompatibilidad con código legacy | Media | Medio | Mantener columna `orderId` temporalmente |
| Performance en queries complejas | Baja | Medio | Indexes en `invoiceId` en tabla `orders` |
| Errores en cálculo de totales | Media | Alto | Tests exhaustivos + validación en service layer |

### Checklist Pre-Despliegue

- [ ] Backup de base de datos creado
- [ ] Migración probada en staging
- [ ] Tests unitarios pasando (100% coverage en InvoicingService)
- [ ] Tests de integración pasando
- [ ] Code review aprobado
- [ ] Documentación actualizada
- [ ] Plan de rollback definido
- [ ] Monitoreo configurado

---

## 🎓 Patrones de Diseño Aplicados - Resumen

### 1. **Service Layer Pattern**
- Lógica de negocio centralizada en `InvoicingService`
- Controllers delgados, solo manejan HTTP

### 2. **Factory Pattern**
- `InvoiceFactory` para crear objetos Invoice complejos
- Encapsula lógica de creación

### 3. **Strategy Pattern**
- Diferentes estrategias de facturación (individual vs consolidada)
- Facilita agregar nuevas estrategias sin modificar código existente

### 4. **Repository Pattern**
- Acceso a datos a través de Prisma Client
- Abstracción de la capa de persistencia

### 5. **Unit of Work Pattern**
- Transacciones de Prisma garantizan atomicidad
- Rollback automático en caso de error

### 6. **DTO Pattern**
- Objetos de transferencia de datos tipados
- Validación en la capa de entrada

---

## 📚 Recursos y Referencias

### Documentación
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

### Herramientas
- Prisma Studio: `npx prisma studio` - Verificar datos post-migración
- Thunder Client / Postman - Testing de endpoints
- Jest - Testing framework

---

## ✅ Conclusión

Este plan de implementación proporciona:

1. **Arquitectura sólida** con patrones enterprise
2. **Migración segura** con backward compatibility
3. **Flexibilidad operativa** para diferentes modelos de negocio
4. **Testing comprehensivo** para garantizar calidad
5. **Documentación detallada** para mantenimiento futuro

**Tiempo estimado de implementación**: 10 días hábiles
**Riesgo**: Bajo (con las mitigaciones aplicadas)
**ROI**: Alto (permite consolidación de facturación y mejor UX)

---

**Autor**: Claude (Senior Full-Stack Developer)
**Fecha**: 5 de Diciembre, 2025
**Versión**: 1.0
