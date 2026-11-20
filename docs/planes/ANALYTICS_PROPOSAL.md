# Propuesta de Analíticas Avanzadas para DermicaPro
## Sistema de Business Intelligence para Administradores

---

## 📊 **1. ANALÍTICAS FINANCIERAS**

### 1.1 Análisis de Ingresos
**Métricas Clave:**
- **Revenue por Período** (diario, semanal, mensual, anual)
  - Total de ingresos
  - Ingresos por método de pago (efectivo, tarjeta, transferencia, Yape, Plin)
  - Ticket promedio por paciente
  - Comparativa con períodos anteriores (YoY, MoM)

- **Embudo de Conversión Financiera**
  - Reservas realizadas vs pagadas
  - Facturas pendientes vs pagadas
  - Tasa de conversión de reserva a pago completo
  - Tiempo promedio de cobro

- **Cash Flow Analysis**
  - Ingresos por día (gráfico de línea)
  - Proyección de ingresos futuros (basado en citas programadas)
  - Deuda pendiente (facturas status: pending, partial)
  - Ratio de pagos parciales vs completos

**Queries Necesarias:**
```sql
-- Revenue por método de pago
SELECT payment_method, SUM(amount_paid), COUNT(*)
FROM payments
WHERE payment_date BETWEEN ? AND ?
GROUP BY payment_method

-- Ticket promedio
SELECT AVG(final_price) as avg_ticket
FROM orders
WHERE created_at BETWEEN ? AND ?
```

---

## 📅 **2. ANALÍTICAS DE CITAS Y OPERACIONES**

### 2.1 Eficiencia Operacional
**Métricas Clave:**
- **Tasa de Asistencia**
  - % de citas atendidas vs canceladas vs no-show
  - No-show rate por día de la semana
  - Tiempo promedio entre reserva y cita

- **Utilización de Horarios**
  - Horas pico (días y horarios con más citas)
  - Distribución de citas por día de la semana
  - Slots disponibles vs ocupados
  - Duración promedio de citas

- **Lead Time Analysis**
  - Tiempo desde creación de paciente hasta primera cita
  - Tiempo desde reserva hasta asistencia
  - Pacientes nuevos vs recurrentes por mes

**Queries Necesarias:**
```sql
-- No-show rate por día de semana
SELECT
  EXTRACT(DOW FROM scheduled_date) as day_of_week,
  COUNT(CASE WHEN status = 'no_show' THEN 1 END) * 100.0 / COUNT(*) as no_show_rate
FROM appointments
WHERE scheduled_date BETWEEN ? AND ?
GROUP BY day_of_week
```

---

## 💰 **3. ANALÍTICAS DE COMISIONES Y VENTAS**

### 3.1 Performance de Vendedores
**Métricas Clave:**
- **Ranking de Vendedores**
  - Total vendido por vendedor
  - Comisiones ganadas por vendedor
  - Número de pacientes captados
  - Tasa de conversión (pacientes creados → ventas)

- **Comisiones Overview**
  - Total pendiente de pago por vendedor
  - Tiempo promedio de aprobación de comisiones
  - Tiempo promedio de pago de comisiones
  - Comisiones rechazadas (motivos)

- **Análisis de Servicios por Vendedor**
  - Servicios más vendidos por cada vendedor
  - Especialización (% de ventas por tipo de servicio)

**Queries Necesarias:**
```sql
-- Ranking de vendedores
SELECT
  u.first_name, u.last_name,
  COUNT(DISTINCT o.patient_id) as patients_captured,
  SUM(o.final_price) as total_sales,
  SUM(c.commission_amount) as total_commissions
FROM users u
LEFT JOIN orders o ON u.id = o.created_by_id
LEFT JOIN commissions c ON u.id = c.sales_person_id
WHERE o.created_at BETWEEN ? AND ?
GROUP BY u.id
ORDER BY total_sales DESC
```

---

## 🏥 **4. ANALÍTICAS DE SERVICIOS Y PRODUCTOS**

### 4.1 Rendimiento de Servicios
**Métricas Clave:**
- **Top Servicios**
  - Servicios más vendidos (por volumen)
  - Servicios más rentables (por revenue)
  - Margen promedio por servicio
  - Tasa de completación de sesiones (completed vs total)

- **Análisis de Paquetes**
  - Paquetes con mayor número de sesiones
  - % de paquetes completados vs abandonados
  - Tiempo promedio para completar un paquete

- **Precio y Descuentos**
  - Descuentos otorgados por servicio
  - Precio promedio final vs precio base
  - Revenue perdido por descuentos

**Queries Necesarias:**
```sql
-- Top servicios por revenue
SELECT
  s.name,
  COUNT(o.id) as times_sold,
  SUM(o.final_price) as total_revenue,
  AVG(o.final_price) as avg_price,
  SUM(o.discount) as total_discounts
FROM services s
LEFT JOIN orders o ON s.id = o.service_id
WHERE o.created_at BETWEEN ? AND ?
GROUP BY s.id
ORDER BY total_revenue DESC
LIMIT 10
```

---

## 👥 **5. ANALÍTICAS DE PACIENTES**

### 5.1 Customer Analytics
**Métricas Clave:**
- **Demografía**
  - Distribución por sexo
  - Distribución por rango de edad (18-25, 26-35, 36-45, etc.)
  - Nuevos pacientes por mes

- **Customer Lifetime Value (CLV)**
  - Gasto total por paciente
  - Número promedio de citas por paciente
  - Frecuencia de visitas (días entre citas)
  - Pacientes VIP (top 10% por gasto)

- **Retención y Recurrencia**
  - Tasa de retención (pacientes que volvieron en X días)
  - Pacientes activos vs inactivos
  - Churn rate (pacientes que no volvieron en 3+ meses)
  - Primera cita vs citas recurrentes

**Queries Necesarias:**
```sql
-- Customer Lifetime Value
SELECT
  p.id,
  p.first_name,
  p.last_name,
  COUNT(DISTINCT a.id) as total_appointments,
  SUM(o.final_price) as total_spent,
  MIN(a.scheduled_date) as first_visit,
  MAX(a.scheduled_date) as last_visit,
  AVG(EXTRACT(EPOCH FROM (LEAD(a.scheduled_date) OVER (PARTITION BY p.id ORDER BY a.scheduled_date) - a.scheduled_date)) / 86400) as avg_days_between_visits
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
LEFT JOIN orders o ON aps.order_id = o.id
GROUP BY p.id
ORDER BY total_spent DESC
```

---

## 📈 **6. ANALÍTICAS PREDICTIVAS**

### 6.1 Forecasting
**Métricas Clave:**
- **Proyecciones de Revenue**
  - Predicción de ingresos próximos 30/60/90 días (basado en citas programadas)
  - Tendencias de crecimiento (regresión lineal)

- **Predicción de No-Shows**
  - Probabilidad de no-show basado en historial del paciente
  - Días de la semana con mayor riesgo

- **Capacidad Operacional**
  - Proyección de citas necesarias para alcanzar meta mensual
  - Utilización de capacidad (% de slots ocupados)

---

## ⚠️ **7. ANALÍTICAS DE RIESGOS**

### 7.1 Financial Health
**Métricas Clave:**
- **Cuentas por Cobrar**
  - Aging report (0-30 días, 31-60, 61-90, 90+)
  - Pacientes con deuda mayor a X soles
  - Facturas vencidas

- **Alertas Operacionales**
  - Servicios con baja tasa de completación
  - Comisiones pendientes de aprobación > 30 días
  - Pacientes sin visitas en 3+ meses

---

## 🎯 **8. DASHBOARDS PROPUESTOS**

### Dashboard 1: **Executive Summary** (Vista General)
- KPIs principales del mes
- Revenue trend (últimos 6 meses)
- Top 5 servicios
- Distribución de citas por estado
- Comisiones pendientes de pago

### Dashboard 2: **Sales Performance** (Ventas)
- Ranking de vendedores
- Embudo de ventas
- Conversión de leads
- Servicios más vendidos por vendedor

### Dashboard 3: **Operations** (Operaciones)
- Utilización de horarios (heatmap)
- No-show rate por día
- Tiempo promedio de atención
- Distribución de citas por enfermera

### Dashboard 4: **Financial Deep Dive** (Financiero)
- Cash flow mensual
- Aging report de cuentas por cobrar
- Métodos de pago más usados
- Descuentos otorgados

### Dashboard 5: **Customer Intelligence** (Clientes)
- Demografía de pacientes
- CLV distribution
- Retención y churn
- Pacientes VIP

### Dashboard 6: **Service Analytics** (Servicios)
- Performance de cada servicio
- Tasa de completación de paquetes
- Análisis de descuentos
- Rentabilidad por servicio

---

## 🔧 **IMPLEMENTACIÓN TÉCNICA**

### Stack Recomendado:
- **Backend**: Prisma + PostgreSQL con queries optimizadas
- **Caching**: Redis para cachear resultados de analíticas pesadas
- **Frontend**: Recharts para visualizaciones
- **Exportación**: Botones para exportar a Excel/PDF

### Estructura de Archivos:
```
backend/src/
├── services/
│   └── analytics/
│       ├── analytics.service.ts (orquestador)
│       ├── financial.analytics.ts
│       ├── operations.analytics.ts
│       ├── sales.analytics.ts
│       ├── customer.analytics.ts
│       └── service.analytics.ts
├── controllers/
│   └── analytics.controller.ts
└── routes/
    └── analytics.routes.ts

frontend/src/
├── pages/
│   ├── AnalyticsPage.tsx (selector de dashboard)
│   └── analytics/
│       ├── ExecutiveDashboard.tsx
│       ├── SalesAnalytics.tsx
│       ├── OperationsAnalytics.tsx
│       ├── FinancialAnalytics.tsx
│       ├── CustomerAnalytics.tsx
│       └── ServiceAnalytics.tsx
└── components/
    └── analytics/
        ├── KPICard.tsx
        ├── TrendChart.tsx
        ├── HeatMap.tsx
        ├── PieChart.tsx
        ├── BarChart.tsx
        ├── RankingTable.tsx
        └── AgeingReport.tsx
```

---

## 📊 **PRIORIZACIÓN**

### Fase 1 (Esencial - 2 semanas)
1. Executive Summary Dashboard
2. Financial Analytics básico
3. Sales Performance Dashboard

### Fase 2 (Importante - 2 semanas)
4. Operations Analytics
5. Customer Intelligence básico
6. Service Analytics

### Fase 3 (Avanzado - 3 semanas)
7. Analíticas predictivas
8. Exportación a Excel/PDF
9. Alertas automatizadas

---

## 💡 **BENEFICIOS ESPERADOS**

1. **Toma de Decisiones Data-Driven**: Decisiones basadas en datos reales
2. **Identificación de Oportunidades**: Detectar servicios rentables y vendedores top
3. **Optimización Operacional**: Mejorar horarios y reducir no-shows
4. **Mejor Gestión Financiera**: Control de cuentas por cobrar y cash flow
5. **Incremento de Revenue**: Identificar estrategias de venta efectivas
6. **Retención de Clientes**: Detectar y prevenir churn

---

## 🎨 **MOCKUP DE UI**

```
┌─────────────────────────────────────────────────────┐
│  Analytics Dashboard                          Admin │
├─────────────────────────────────────────────────────┤
│  [Executive] [Sales] [Operations] [Financial]      │
│  [Customers] [Services]                    [Export]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  KPIs del Mes                          Filtros:    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  [Mes ▼]    │
│  │S/25K │ │ 150  │ │ 85%  │ │S/12K │  [2024 ▼]   │
│  │Revenue│ │Citas │ │Show  │ │Comis.│             │
│  └──────┘ └──────┘ └──────┘ └──────┘             │
│                                                     │
│  Revenue Trend (últimos 6 meses)                   │
│  ┌─────────────────────────────────────────────┐   │
│  │    ╱╲     ╱╲                               │   │
│  │   ╱  ╲   ╱  ╲                              │   │
│  │  ╱    ╲ ╱    ╲╱                            │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Top 5 Servicios          Citas por Estado        │
│  ┌────────────────┐       ┌────────────────┐      │
│  │1. HIFU   S/15K │       │ Atendidas: 60% │      │
│  │2. Enzimas S/9K │       │ Reservadas:25% │      │
│  │3. Peel   S/7K  │       │ No-show:   10% │      │
│  └────────────────┘       └────────────────┘      │
└─────────────────────────────────────────────────────┘
```

---

**Este documento proporciona una hoja de ruta completa para implementar un sistema de analytics robusto que transformará DermicaPro en un negocio data-driven.**
