# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DermicaPro is a full-stack clinic management system for a dermatology/aesthetics clinic in Trujillo, Peru. It handles patients, appointments, medical records, treatment sessions, invoicing, payments, and sales commissions.

**Tech Stack:**
- Backend: Node.js + TypeScript, Express, Prisma ORM, PostgreSQL
- Frontend: React 18 + TypeScript, React Router v6, Vite
- Deployment: Docker + Docker Compose (development & production configurations)
- Authentication: JWT (access + refresh tokens)

## Quick Start Commands

### Docker Development (Recommended)

The project runs fully containerized with Docker Compose. All commands use the Makefile:

```bash
# Initialize project (first time setup)
make init

# Start all services (dev mode)
make up

# View logs
make logs              # All services
make logs-backend      # Backend only
make logs-frontend     # Frontend only
make logs-db          # Database only

# Database operations
make migrate          # Run Prisma migrations
make migrate-create name=migration_name  # Create new migration
make seed            # Seed database with test data
make studio          # Open Prisma Studio (database GUI on port 5555)

# Service management
make restart         # Restart all services
make down           # Stop all services
make ps             # View service status

# Access service shells
make shell-backend   # Enter backend container shell
make shell-frontend  # Enter frontend container shell
make shell-db       # Enter PostgreSQL shell

# Rebuild
make build          # Build images
make build-no-cache # Build without cache

# Database backup/restore
make backup-db                    # Create backup
make restore-db file=backup.sql  # Restore from backup

# Cleanup (DANGEROUS)
make clean      # Remove containers and volumes
make clean-all  # Remove everything including images
```

**Service URLs (Development):**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Prisma Studio: http://localhost:5555 (after `make studio`)
- PostgreSQL: localhost:5432

### Production Deployment

```bash
# Build for production
make prod-build

# Start production services
make prod-up

# Stop production services
make prod-down
```

The production configuration (`docker-compose.prod.yml`) includes:
- Nginx with SSL/HTTPS support (Let's Encrypt certificates)
- Optimized builds (no hot-reload, minified assets)
- Production-grade healthchecks
- Persistent volumes for database and uploads

### Local Development (Without Docker)

If you need to run services locally without Docker:

```bash
# Backend
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev    # Runs on port 5000

# Frontend
cd frontend
npm install
npm run dev    # Runs on port 5173

# Tests
npm test
npm run test:coverage
```

## Architecture

### Backend Architecture

**Layered Architecture Pattern:**
```
routes → controllers → services → repositories → prisma
```

**Key Directories:**
- `src/routes/` - API route definitions with authorization middleware
- `src/controllers/` - Request handlers, validation, response formatting
- `src/services/` - Business logic layer (analytics, dashboard, invoicing, roles/permissions)
- `src/repositories/` - Data access layer (rarely used, mostly direct Prisma)
- `src/middlewares/` - Auth, authorization, file upload, error handling
- `src/validators/` - Request validation schemas
- `src/utils/` - JWT utilities, helpers
- `src/types/` - TypeScript type definitions
- `src/mappers/` - Data transformation utilities
- `prisma/` - Database schema and migrations

**Service Layer Pattern:**
The backend uses a service layer for complex business logic:
- `services/analytics/` - Sales analytics, customer analytics, financial analytics (5 specialized services)
- `services/dashboard/` - Dashboard metrics aggregation
- `services/invoicing.service.ts` - Invoice generation from orders
- `services/role.service.ts` - RBAC permission checking
- `services/permission.service.ts` - Permission management

### Frontend Architecture

**Component-Based Architecture:**
```
App.tsx (routing) → Pages → Components
         ↓
    Contexts (state management)
         ↓
    Services (API calls)
```

**Key Directories:**
- `src/pages/` - Page components (Patients, Appointments, Services, Analytics, etc.)
- `src/components/` - Reusable UI components (Calendar, forms, modals)
- `src/contexts/` - React Context API for state (AuthContext, ThemeContext)
- `src/services/` - API service functions (axios wrappers)
- `src/hooks/` - Custom React hooks
- `src/utils/` - Date formatting, currency formatting, timezone utilities
- `src/styles/` - CSS stylesheets including design tokens

**State Management:**
- Uses React Context API (not Redux)
- `AuthContext` - User authentication state, JWT token management
- `ThemeContext` - Dark/Light mode toggle

### Database Schema (Prisma)

**Core Models:**
- `User` - System users with roles (admin, nurse, sales)
- `SystemRole` - Roles with permissions (RBAC)
- `Permission` - Granular permissions for RBAC
- `Patient` - Customer records with DNI (Peruvian ID)
- `Service` - Treatment services (HIFU, laser, etc.)
- `Order` - Treatment packages (multi-session services)
- `Appointment` - Scheduled visits (can have multiple services)
- `AppointmentService` - Links appointments to orders/sessions
- `AppointmentNote` - Notes attached to appointments
- `PatientRecord` - Medical history, photos, measurements
- `Invoice` - Bills for multiple orders (1:N relationship)
- `Payment` - Payment records with various types
- `Commission` - Sales commissions (auto-generated)

**Key Relationships:**
- One Appointment can have multiple AppointmentServices (multi-service visits)
- One Invoice can have multiple Orders (N:1)
- Orders are auto-created when creating appointments without orderId
- Commissions auto-generate when orders are created (based on service commission settings)

**Important Enums:**
- `AppointmentStatus`: reserved, in_progress, attended, cancelled, no_show
- `InvoiceStatus`: pending, partial, paid, cancelled
- `PaymentType`: invoice_payment, reservation, service_payment, account_credit, penalty, other
- `CommissionStatus`: pending, approved, paid, cancelled, rejected
- `PaymentMethod`: cash, card, transfer, yape, plin

### Authentication & Authorization

**JWT Token System:**
- Access tokens (short-lived) stored in localStorage
- Refresh tokens (long-lived) for token renewal
- Backend middleware: `authenticate` (verify token), `authorize` (check roles - deprecated)
- New RBAC system: `requireRole` and `requirePermission` for granular permission checks

**Role Hierarchy:**
- `admin` - Full system access, manages users/roles/commissions
- `nurse` - Attends appointments, records medical data
- `sales` - Creates appointments, manages patients (filtered to own appointments)

**Critical Authorization Rules:**
- Sales users ONLY see appointments they created (`createdById` filter)
- Only admins can manage users, services, and view all appointments
- Only nurses/admins can mark appointments as attended and create medical records

### Business Logic Patterns

**Auto-Generation Rules (CRITICAL):**

1. **Order Auto-Creation:** When creating an appointment WITHOUT `orderId`, the system automatically creates an Order:
   ```typescript
   // In appointments.controller.ts
   if (!orderId) {
     const newOrder = await tx.order.create({
       data: {
         patientId,
         serviceId: service.serviceId,
         totalSessions: service.defaultSessions,
         completedSessions: 0,
         originalPrice: service.basePrice,
         discount: 0,
         finalPrice: service.basePrice,
         createdById: req.user!.id,
       },
     });
   }
   ```

2. **Commission Auto-Creation:** Commissions are created based on service commission settings:
   ```typescript
   // When an order is created
   if (service.commissionType && service.commissionRate) {
     await prisma.commission.create({
       data: {
         salesPersonId: req.user!.id,
         appointmentId: appointment.id,
         orderId: order.id,
         serviceId: service.id,
         commissionRate: service.commissionRate,
         baseAmount: order.finalPrice,
         commissionAmount: calculateCommission(order.finalPrice, service.commissionRate, service.commissionType),
         status: 'pending',
       },
     });
   }
   ```

3. **SessionNumber Auto-Calculation:** When adding a service to an appointment with an existing `orderId` but no `sessionNumber`, the system finds the next available session:
   ```typescript
   const existingServices = await tx.appointmentService.findMany({
     where: { orderId },
     select: { sessionNumber: true },
   });

   const occupiedNumbers = new Set(existingServices.map(s => s.sessionNumber));
   let sessionNumber = 1;
   while (occupiedNumbers.has(sessionNumber)) sessionNumber++;
   ```

**Soft Deletes:**
- Appointments: Changed to status `cancelled` (not deleted)
- Services: Set `deletedAt` timestamp (can be restored)
- AppointmentServices: Have soft delete fields (`deletedAt`, `deletedById`, `deleteReason`)

**Invoice Generation:**
Uses factory pattern in `services/invoice.factory.ts`:
- Creates invoices from multiple orders
- Calculates totals, applies discounts
- Manages invoice status based on payments

**Analytics System:**
Complex analytics architecture in `services/analytics/`:
- `sales.analytics.service.ts` - Revenue, conversion metrics
- `customer.analytics.service.ts` - CLV, retention, churn
- `financial.analytics.service.ts` - Payment trends, pending amounts
- `appointment.analytics.service.ts` - Appointment patterns
- `service.analytics.service.ts` - Service popularity metrics

## Common Workflows

### Creating an Appointment
1. POST `/api/appointments` with:
   - `patientId` (required)
   - `scheduledDate` (required)
   - `services[]` array with serviceId (required)
   - `orderId` (optional - auto-creates if missing)
   - `durationMinutes` (optional, default 60)
2. System auto-creates Order if needed
3. System creates AppointmentService links
4. System creates Commission based on service settings

### Attending an Appointment
1. POST `/api/appointments/:id/attend` with:
   - Medical data (weight, measurements, notes)
   - Photo URLs (before/after)
2. Updates appointment status to `attended`
3. Creates PatientRecord with medical data
4. Records attendedBy and attendedAt

### Creating an Invoice
Uses service layer:
```typescript
import { InvoiceFactory } from '../services/invoice.factory';

const invoice = await InvoiceFactory.createFromOrders(orderIds, {
  createdById: req.user.id,
  dueDate: new Date(),
});
```

### Managing Commissions
Commissions have a workflow: pending → approved → paid
- Only admins can approve/reject commissions
- Only admins can mark commissions as paid
- Sales users can view their own commissions

## Important Notes

### Docker-Specific Considerations

**Volume Management:**
- `postgres_data` - Database persistence (DO NOT DELETE in production)
- `backend_uploads` - User-uploaded files (receipts, photos)
- `backend_node_modules`, `frontend_node_modules` - Prevent local/container conflicts
- `backend_dist` - Compiled TypeScript output

**Networking:**
- All services communicate via `dermicapro-network` bridge network
- Frontend proxies API requests to backend via Vite proxy in dev
- In production, Nginx handles routing

**Environment Variables:**
Always configure via `.env` file. Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing
- `CORS_ORIGIN` - Allowed frontend origins
- `NODE_ENV` - development or production
- `VITE_API_URL` - Frontend API endpoint

### Date Handling
The system uses ISO 8601 strings for all date/time values. Key utilities in `frontend/src/utils/`:
- `formatDateForDisplay()` - Display dates in local format
- `formatDateTimeForInput()` - Format for datetime-local inputs
- `parseLocalDateTime()` - Parse local datetime strings
- **Always use these utilities** to avoid timezone issues

### File Uploads
- Handled by Multer middleware
- Stored in `backend/uploads/` directory (Docker volume: `backend_uploads`)
- Max 10 files per upload
- Formats: JPEG, PNG, WebP
- Routes: `/api/appointments/upload-photos`, `/api/appointments/:id/upload-receipt`

### Pagination
Default pagination for list endpoints:
- `page=1` (default)
- `limit=10` (default)
- Returns: `{ data, total, page, totalPages, limit }`

### Search & Filters
- Patients: search by firstName, lastName, dni, phone, email; filter by sex
- Appointments: filter by status, date, userId (admin only)
- Services: filter by isActive, includeDeleted
- Commissions: filter by salesPersonId, status, date range

### Testing
- Test user credentials (after running `make seed`):
  - Admin: `admin@dermicapro.com` / `admin123`
  - Nurse: `enfermera@dermicapro.com` / `nurse123`
  - Sales: `ventas@dermicapro.com` / `sales123`

### Database Migrations

Always use Prisma migrations via Docker:
```bash
# Create new migration
make migrate-create name=add_field_to_table

# Apply migrations
make migrate

# Reset database (WARNING: deletes all data)
make migrate-reset
```

**Important:** Migrations run automatically when starting services via `docker-compose up`.

## Known Issues & Incomplete Features

1. **Appointment Conflicts:** No validation to prevent double-booking the same time slot
2. **Session Validation:** No validation that sessionNumber <= Order.totalSessions
3. **Service Permissions:** Some service endpoints should be admin-only but currently allow all authenticated users
4. **Payment Workflow:** Payment creation is implemented but invoice status updates could be more automated

## Code Conventions

- Use TypeScript strict mode
- Follow Prisma naming conventions: camelCase in code, snake_case in database
- Use `@map()` for database column names that differ from code
- Error handling: Use custom `AppError` class with HTTP status codes
- API responses: Consistent format `{ data, message, error }`
- Always validate input in controllers before calling services
- Use transactions for multi-step operations (Prisma `.$transaction()`)
- Date/time: Always use ISO 8601 format, use utility functions for formatting

## Debugging in Docker

**View real-time logs:**
```bash
make logs-backend    # Watch backend logs
make logs-frontend   # Watch frontend logs
```

**Access container shell:**
```bash
make shell-backend   # Inspect backend container
make shell-frontend  # Inspect frontend container
```

**Database inspection:**
```bash
make studio          # Open Prisma Studio GUI
make shell-db        # Access PostgreSQL CLI
```

**Restart after code changes:**
In development mode, hot-reload is enabled for both frontend and backend. If changes aren't reflected:
```bash
make restart         # Restart all services
```

## External Documentation

For detailed business rules, see `REGLAS_DE_NEGOCIO.md` in the project root.
For Docker setup details, see `DOCKER-README.md`.
For analytics implementation, see `ANALYTICS_ARCHITECTURE.md`.
For commission system details, see `MODULO_COMISIONES.md`.
