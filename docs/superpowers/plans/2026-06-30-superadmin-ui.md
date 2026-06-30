# Superadmin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el panel de superadmin en `/superadmin/*` dentro del proyecto React existente, con login, dashboard de métricas, gestión de tenants (crear/activar/desactivar) y vista de migraciones por tenant.

**Architecture:** Rutas lazy-loaded en `App.tsx` protegidas por `RequirePlatformAuth`. `PlatformAuthContext` independiente de `AuthContext` (token separado en localStorage). Todas las llamadas API van a través de `platformAdminApi.ts` que inyecta el Bearer token automáticamente.

**Tech Stack:** React 18, TypeScript, React Router v6, axios, Lucide React (iconos ya instalados), CSS custom properties ya definidas en el proyecto, Jest + React Testing Library.

## Global Constraints

- No emojis en ningún archivo (ni código, ni UI, ni comentarios)
- Mismo design system: CSS custom properties `var(--color-*)`, `var(--spacing-*)`, `var(--radius-*)` definidas en `frontend/src/index.css`
- Iconos: solo Lucide React (ya instalado)
- Token en `localStorage` bajo key `platform_admin_token` (distinta a `accessToken`)
- Base URL de `/platform` ya configurada en `frontend/src/services/platformApi.ts`
- Todos los tests corren con: `cd frontend && npx jest --no-coverage --testPathPatterns=<pattern>`
- TypeCheck: `cd frontend && npx tsc --noEmit`

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `frontend/src/services/platformAdminApi.ts` | Crear | Axios instance con interceptor de token; todas las funciones de API del superadmin |
| `frontend/src/contexts/PlatformAuthContext.tsx` | Crear | Estado de auth del platform_admin, login/logout, token en localStorage |
| `frontend/src/components/superadmin/RequirePlatformAuth.tsx` | Crear | Guard de rutas: redirige a `/superadmin/login` si no autenticado |
| `frontend/src/components/superadmin/SuperAdminLayout.tsx` | Crear | Sidebar + header con nombre del admin y logout |
| `frontend/src/pages/superadmin/SuperAdminLoginPage.tsx` | Crear | Formulario email + password para platform_admin |
| `frontend/src/pages/superadmin/SuperAdminDashboardPage.tsx` | Crear | Tarjetas de métricas globales + tabla resumen de tenants |
| `frontend/src/pages/superadmin/SuperAdminTenantsPage.tsx` | Crear | Tabla de tenants con acciones + modal de creación |
| `frontend/src/pages/superadmin/SuperAdminTenantDetailPage.tsx` | Crear | Detalle del tenant con tabs: Información y Migraciones |
| `frontend/src/App.tsx` | Modificar | Agregar `PlatformAuthProvider` y rutas lazy `/superadmin/*` |
| `frontend/src/services/platformApi.ts` | No tocar | Ya existe, `platformAdminApi.ts` lo importa |

---

## Task 1: platformAdminApi.ts — funciones de API con auth

**Files:**
- Create: `frontend/src/services/platformAdminApi.ts`
- Test: `frontend/src/__tests__/services/platformAdminApi.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  // Tipos exportados
  export interface PlatformAdminUser { id: string; email: string; firstName: string; lastName: string; }
  export interface Tenant { id: string; name: string; slug: string; isActive: boolean; contactEmail: string | null; contactPhone: string | null; logoUrl: string | null; createdAt: string; updatedAt: string; }
  export interface TenantMetrics { id: string; tenantId: string; totalPatients: number; totalAppointmentsMonth: number; activeUsers: number; lastAccess: string | null; updatedAt: string; }
  export interface TenantMigration { id: string; tenantId: string; migrationName: string; appliedAt: string; status: 'success' | 'failed'; error: string | null; }
  export interface CreateTenantDto { name: string; slug: string; contactEmail?: string; adminEmail: string; adminPassword: string; }

  // Funciones exportadas
  export const platformAdminApi: {
    login(email: string, password: string): Promise<{ token: string; admin: PlatformAdminUser }>;
    listTenants(): Promise<Tenant[]>;
    getTenant(slug: string): Promise<Tenant>;
    createTenant(dto: CreateTenantDto): Promise<{ tenant: Tenant; migrationsApplied: number; adminCreated: boolean }>;
    activateTenant(slug: string): Promise<Tenant>;
    deactivateTenant(slug: string): Promise<Tenant>;
    getTenantMigrations(slug: string): Promise<TenantMigration[]>;
    getTenantMetrics(slug: string): Promise<TenantMetrics | null>;
    refreshTenantMetrics(slug: string): Promise<TenantMetrics>;
  }
  ```

- [ ] **Step 1: Crear el test**

```typescript
// frontend/src/__tests__/services/platformAdminApi.test.ts
import axios from 'axios';

jest.mock('axios', () => {
  const instance = { get: jest.fn(), post: jest.fn(), interceptors: { request: { use: jest.fn() } } };
  return { create: jest.fn(() => instance), __instance: instance };
});

const mockedAxios = axios as any;

describe('platformAdminApi', () => {
  let api: typeof import('../../src/services/platformAdminApi').platformAdminApi;
  let instance: any;

  beforeEach(() => {
    jest.resetModules();
    instance = mockedAxios.__instance;
    instance.get.mockReset();
    instance.post.mockReset();
  });

  it('login posts to /auth/login and returns token + admin', async () => {
    instance.post.mockResolvedValue({ data: { token: 'tok', admin: { id: '1', email: 'a@b.com', firstName: 'Super', lastName: 'Admin' } } });
    const { platformAdminApi } = await import('../../src/services/platformAdminApi');
    const result = await platformAdminApi.login('a@b.com', 'pass');
    expect(instance.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pass' });
    expect(result.token).toBe('tok');
  });

  it('listTenants calls GET /tenants', async () => {
    instance.get.mockResolvedValue({ data: [{ id: '1', slug: 'acme' }] });
    const { platformAdminApi } = await import('../../src/services/platformAdminApi');
    const result = await platformAdminApi.listTenants();
    expect(instance.get).toHaveBeenCalledWith('/tenants');
    expect(result[0].slug).toBe('acme');
  });

  it('createTenant posts to /tenants', async () => {
    const dto = { name: 'Acme', slug: 'acme', adminEmail: 'adm@acme.com', adminPassword: 'pass' };
    instance.post.mockResolvedValue({ data: { tenant: { slug: 'acme' }, migrationsApplied: 54, adminCreated: true } });
    const { platformAdminApi } = await import('../../src/services/platformAdminApi');
    const result = await platformAdminApi.createTenant(dto);
    expect(instance.post).toHaveBeenCalledWith('/tenants', dto);
    expect(result.migrationsApplied).toBe(54);
  });
});
```

- [ ] **Step 2: Correr test — debe fallar**

```bash
cd frontend && npx jest --no-coverage --testPathPatterns="platformAdminApi"
```
Esperado: FAIL — módulo no existe.

- [ ] **Step 3: Crear `platformAdminApi.ts`**

```typescript
// frontend/src/services/platformAdminApi.ts
import axios from 'axios';

export interface PlatformAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMetrics {
  id: string;
  tenantId: string;
  totalPatients: number;
  totalAppointmentsMonth: number;
  activeUsers: number;
  lastAccess: string | null;
  updatedAt: string;
}

export interface TenantMigration {
  id: string;
  tenantId: string;
  migrationName: string;
  appliedAt: string;
  status: 'success' | 'failed';
  error: string | null;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  contactEmail?: string;
  adminEmail: string;
  adminPassword: string;
}

const PLATFORM_ADMIN_TOKEN_KEY = 'platform_admin_token';

const client = axios.create({
  baseURL: '/platform',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(PLATFORM_ADMIN_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const platformAdminApi = {
  async login(email: string, password: string) {
    const res = await client.post<{ token: string; admin: PlatformAdminUser }>('/auth/login', { email, password });
    return res.data;
  },
  async listTenants() {
    const res = await client.get<Tenant[]>('/tenants');
    return res.data;
  },
  async getTenant(slug: string) {
    const res = await client.get<Tenant>(`/tenants/${slug}`);
    return res.data;
  },
  async createTenant(dto: CreateTenantDto) {
    const res = await client.post<{ tenant: Tenant; migrationsApplied: number; adminCreated: boolean }>('/tenants', dto);
    return res.data;
  },
  async activateTenant(slug: string) {
    const res = await client.post<Tenant>(`/tenants/${slug}/activate`);
    return res.data;
  },
  async deactivateTenant(slug: string) {
    const res = await client.post<Tenant>(`/tenants/${slug}/deactivate`);
    return res.data;
  },
  async getTenantMigrations(slug: string) {
    const res = await client.get<TenantMigration[]>(`/tenants/${slug}/migrations`);
    return res.data;
  },
  async getTenantMetrics(slug: string) {
    const res = await client.get<TenantMetrics>(`/tenants/${slug}/metrics`);
    return res.data;
  },
  async refreshTenantMetrics(slug: string) {
    const res = await client.post<TenantMetrics>(`/tenants/${slug}/metrics/refresh`);
    return res.data;
  },
};

export { PLATFORM_ADMIN_TOKEN_KEY };
```

- [ ] **Step 4: Correr test — debe pasar**

```bash
cd frontend && npx jest --no-coverage --testPathPatterns="platformAdminApi"
```
Esperado: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/platformAdminApi.ts frontend/src/__tests__/services/platformAdminApi.test.ts
git commit -m "feat(superadmin): platformAdminApi service with typed endpoints"
```

---

## Task 2: PlatformAuthContext — estado de autenticación del platform_admin

**Files:**
- Create: `frontend/src/contexts/PlatformAuthContext.tsx`
- Test: `frontend/src/__tests__/contexts/PlatformAuthContext.test.tsx`

**Interfaces:**
- Consumes: `platformAdminApi.login`, `PlatformAdminUser`, `PLATFORM_ADMIN_TOKEN_KEY` de Task 1
- Produces:
  ```typescript
  export interface PlatformAuthContextType {
    platformAdmin: PlatformAdminUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
  }
  export function PlatformAuthProvider({ children }: { children: React.ReactNode }): JSX.Element
  export function usePlatformAuth(): PlatformAuthContextType
  ```

- [ ] **Step 1: Crear el test**

```typescript
// frontend/src/__tests__/contexts/PlatformAuthContext.test.tsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';

const mockLogin = jest.fn();
jest.mock('../../src/services/platformAdminApi', () => ({
  platformAdminApi: { login: (...args: any[]) => mockLogin(...args) },
  PLATFORM_ADMIN_TOKEN_KEY: 'platform_admin_token',
}));

import { PlatformAuthProvider, usePlatformAuth } from '../../src/contexts/PlatformAuthContext';

function Consumer() {
  const { isAuthenticated, platformAdmin, login, logout } = usePlatformAuth();
  return (
    <div>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="name">{platformAdmin?.firstName ?? 'none'}</span>
      <button onClick={() => login('a@b.com', 'pass')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PlatformAuthProvider>{children}</PlatformAuthProvider>;
}

describe('PlatformAuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLogin.mockReset();
  });

  it('starts unauthenticated when no token in localStorage', () => {
    render(<Consumer />, { wrapper: Wrapper });
    expect(screen.getByTestId('auth').textContent).toBe('false');
    expect(screen.getByTestId('name').textContent).toBe('none');
  });

  it('login stores token and sets platformAdmin', async () => {
    mockLogin.mockResolvedValue({ token: 'tok123', admin: { id: '1', email: 'a@b.com', firstName: 'Super', lastName: 'Admin' } });
    render(<Consumer />, { wrapper: Wrapper });
    await act(async () => { screen.getByText('login').click(); });
    expect(localStorage.getItem('platform_admin_token')).toBe('tok123');
    expect(screen.getByTestId('auth').textContent).toBe('true');
    expect(screen.getByTestId('name').textContent).toBe('Super');
  });

  it('logout clears token and platformAdmin', async () => {
    mockLogin.mockResolvedValue({ token: 'tok123', admin: { id: '1', email: 'a@b.com', firstName: 'Super', lastName: 'Admin' } });
    render(<Consumer />, { wrapper: Wrapper });
    await act(async () => { screen.getByText('login').click(); });
    act(() => { screen.getByText('logout').click(); });
    expect(localStorage.getItem('platform_admin_token')).toBeNull();
    expect(screen.getByTestId('auth').textContent).toBe('false');
  });
});
```

- [ ] **Step 2: Correr test — debe fallar**

```bash
cd frontend && npx jest --no-coverage --testPathPatterns="PlatformAuthContext"
```
Esperado: FAIL — módulo no existe.

- [ ] **Step 3: Crear `PlatformAuthContext.tsx`**

```typescript
// frontend/src/contexts/PlatformAuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { platformAdminApi, PlatformAdminUser, PLATFORM_ADMIN_TOKEN_KEY } from '../services/platformAdminApi';

interface PlatformAuthContextType {
  platformAdmin: PlatformAdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | null>(null);

export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const [platformAdmin, setPlatformAdmin] = useState<PlatformAdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(PLATFORM_ADMIN_TOKEN_KEY);
    if (stored) {
      // Token exists — mark as authenticated; full admin data loaded on next navigation
      // For now we restore a minimal stub; /auth/me could be called here if needed
      setToken(stored);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await platformAdminApi.login(email, password);
    localStorage.setItem(PLATFORM_ADMIN_TOKEN_KEY, data.token);
    setToken(data.token);
    setPlatformAdmin(data.admin);
  };

  const logout = () => {
    localStorage.removeItem(PLATFORM_ADMIN_TOKEN_KEY);
    setToken(null);
    setPlatformAdmin(null);
  };

  return (
    <PlatformAuthContext.Provider value={{ platformAdmin, token, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth(): PlatformAuthContextType {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error('usePlatformAuth must be used inside PlatformAuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Correr test — debe pasar**

```bash
cd frontend && npx jest --no-coverage --testPathPatterns="PlatformAuthContext"
```
Esperado: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/contexts/PlatformAuthContext.tsx frontend/src/__tests__/contexts/PlatformAuthContext.test.tsx
git commit -m "feat(superadmin): PlatformAuthContext with login/logout and localStorage persistence"
```

---

## Task 3: Layout, guard de rutas y wiring en App.tsx

**Files:**
- Create: `frontend/src/components/superadmin/RequirePlatformAuth.tsx`
- Create: `frontend/src/components/superadmin/SuperAdminLayout.tsx`
- Create: `frontend/src/styles/superadmin.css`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `usePlatformAuth` de Task 2
- Produces:
  ```typescript
  // RequirePlatformAuth: si !isAuthenticated → <Navigate to="/superadmin/login" />
  export function RequirePlatformAuth({ children }: { children: React.ReactNode }): JSX.Element

  // SuperAdminLayout: sidebar con links a /superadmin/dashboard y /superadmin/tenants
  export function SuperAdminLayout(): JSX.Element
  ```

- [ ] **Step 1: Crear `superadmin.css`**

```css
/* frontend/src/styles/superadmin.css */
.sa-shell {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-secondary);
}

.sa-sidebar {
  width: 220px;
  background: var(--color-bg-primary);
  border-right: 1px solid var(--color-border-secondary);
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md) 0;
  flex-shrink: 0;
}

.sa-sidebar__brand {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--color-border-secondary);
  margin-bottom: var(--spacing-sm);
}

.sa-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 var(--spacing-sm);
  flex: 1;
}

.sa-sidebar__link {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.sa-sidebar__link:hover,
.sa-sidebar__link--active {
  background: var(--color-primary-alpha-20);
  color: var(--color-primary);
}

.sa-sidebar__footer {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--color-border-secondary);
}

.sa-sidebar__admin-name {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sa-logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.sa-logout-btn:hover {
  background: var(--color-bg-secondary);
}

.sa-main {
  flex: 1;
  overflow: auto;
  padding: var(--spacing-xl);
}

.sa-page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xl);
}

.sa-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.sa-metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.sa-metric-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.sa-metric-card__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--spacing-xs);
}

.sa-metric-card__value {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.sa-table-wrap {
  overflow-x: auto;
}

.sa-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.sa-table th {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 2px solid var(--color-border-secondary);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.sa-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-secondary);
  color: var(--color-text-primary);
}

.sa-table tr:last-child td {
  border-bottom: none;
}

.sa-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.sa-badge--active {
  background: var(--color-success-alpha-20, #d1fae5);
  color: var(--color-success, #059669);
}

.sa-badge--inactive {
  background: var(--color-error-alpha-20, #fee2e2);
  color: var(--color-error, #dc2626);
}

.sa-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border: none;
  transition: opacity var(--transition-fast);
}

.sa-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sa-btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.sa-btn--primary:hover:not(:disabled) {
  opacity: 0.85;
}

.sa-btn--ghost {
  background: transparent;
  border: 1px solid var(--color-border-secondary);
  color: var(--color-text-primary);
}

.sa-btn--ghost:hover:not(:disabled) {
  background: var(--color-bg-secondary);
}

.sa-btn--danger {
  background: transparent;
  border: 1px solid var(--color-error, #dc2626);
  color: var(--color-error, #dc2626);
}

.sa-btn--danger:hover:not(:disabled) {
  background: var(--color-error-alpha-20, #fee2e2);
}

.sa-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.sa-modal {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-xl);
}

.sa-modal__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}

.sa-form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.sa-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.sa-input {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.sa-input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.sa-error {
  color: var(--color-error, #dc2626);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
}

.sa-tabs {
  display: flex;
  gap: var(--spacing-xs);
  border-bottom: 1px solid var(--color-border-secondary);
  margin-bottom: var(--spacing-lg);
}

.sa-tab {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.sa-tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.sa-migration-status--success { color: var(--color-success, #059669); }
.sa-migration-status--failed  { color: var(--color-error, #dc2626); }
```

- [ ] **Step 2: Crear `RequirePlatformAuth.tsx`**

```typescript
// frontend/src/components/superadmin/RequirePlatformAuth.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';

export function RequirePlatformAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = usePlatformAuth();

  if (isLoading) return <div className="login-loading">Cargando...</div>;
  if (!isAuthenticated) return <Navigate to="/superadmin/login" replace />;

  return <>{children}</>;
}
```

- [ ] **Step 3: Crear `SuperAdminLayout.tsx`**

```typescript
// frontend/src/components/superadmin/SuperAdminLayout.tsx
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, LogOut } from 'lucide-react';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';
import '../../styles/superadmin.css';

export function SuperAdminLayout() {
  const { platformAdmin, logout } = usePlatformAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/superadmin/login', { replace: true });
  };

  return (
    <div className="sa-shell">
      <aside className="sa-sidebar">
        <div className="sa-sidebar__brand">Plataforma Admin</div>
        <nav className="sa-sidebar__nav">
          <NavLink
            to="/superadmin/dashboard"
            className={({ isActive }) => `sa-sidebar__link${isActive ? ' sa-sidebar__link--active' : ''}`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink
            to="/superadmin/tenants"
            className={({ isActive }) => `sa-sidebar__link${isActive ? ' sa-sidebar__link--active' : ''}`}
          >
            <Building2 size={16} />
            Clinicas
          </NavLink>
        </nav>
        <div className="sa-sidebar__footer">
          <div className="sa-sidebar__admin-name">{platformAdmin?.email ?? 'Admin'}</div>
          <button className="sa-logout-btn" onClick={handleLogout}>
            <LogOut size={14} />
            Cerrar sesion
          </button>
        </div>
      </aside>
      <main className="sa-main">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Modificar `App.tsx` — agregar `PlatformAuthProvider` y rutas `/superadmin/*`**

Agrega el import del provider y las rutas lazy. Localiza la sección de imports al inicio del archivo y añade:

```typescript
// Añadir al bloque de imports existente en App.tsx:
import { PlatformAuthProvider } from './contexts/PlatformAuthContext';
const SuperAdminLoginPage = React.lazy(() => import('./pages/superadmin/SuperAdminLoginPage').then(m => ({ default: m.SuperAdminLoginPage })));
const SuperAdminRoutes = React.lazy(() => import('./pages/superadmin/SuperAdminRoutes').then(m => ({ default: m.SuperAdminRoutes })));
```

Envuelve el `<ThemeProvider>` con `<PlatformAuthProvider>` (o agrega dentro), y añade las rutas ANTES de las rutas del sistema de staff:

```typescript
// Dentro del bloque <Routes>, añadir ANTES de la ruta /login:
<Route path="/superadmin/login" element={
  <React.Suspense fallback={<div className="login-loading">Cargando...</div>}>
    <SuperAdminLoginPage />
  </React.Suspense>
} />
<Route path="/superadmin/*" element={
  <React.Suspense fallback={<div className="login-loading">Cargando...</div>}>
    <SuperAdminRoutes />
  </React.Suspense>
} />
```

Envuelve el provider alrededor de `<ThemeProvider>` (nivel más externo):
```typescript
// App() function:
return (
  <PlatformAuthProvider>
    <ThemeProvider>
      ...resto igual...
    </ThemeProvider>
  </PlatformAuthProvider>
);
```

- [ ] **Step 5: Crear `SuperAdminRoutes.tsx`** (punto de entrada de rutas protegidas)

```typescript
// frontend/src/pages/superadmin/SuperAdminRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RequirePlatformAuth } from '../../components/superadmin/RequirePlatformAuth';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import { SuperAdminDashboardPage } from './SuperAdminDashboardPage';
import { SuperAdminTenantsPage } from './SuperAdminTenantsPage';
import { SuperAdminTenantDetailPage } from './SuperAdminTenantDetailPage';

export function SuperAdminRoutes() {
  return (
    <RequirePlatformAuth>
      <Routes>
        <Route element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboardPage />} />
          <Route path="tenants" element={<SuperAdminTenantsPage />} />
          <Route path="tenants/:slug" element={<SuperAdminTenantDetailPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </RequirePlatformAuth>
  );
}
```

- [ ] **Step 6: Crear stubs de páginas para que TypeScript resuelva los imports**

```typescript
// frontend/src/pages/superadmin/SuperAdminDashboardPage.tsx
import React from 'react';
export function SuperAdminDashboardPage() { return <div>Dashboard</div>; }
```
```typescript
// frontend/src/pages/superadmin/SuperAdminTenantsPage.tsx
import React from 'react';
export function SuperAdminTenantsPage() { return <div>Tenants</div>; }
```
```typescript
// frontend/src/pages/superadmin/SuperAdminTenantDetailPage.tsx
import React from 'react';
export function SuperAdminTenantDetailPage() { return <div>Detail</div>; }
```
```typescript
// frontend/src/pages/superadmin/SuperAdminLoginPage.tsx
import React from 'react';
export function SuperAdminLoginPage() { return <div>Login</div>; }
```
Estos stubs se reemplazan completamente en Tasks 4-7.

- [ ] **Step 7: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```
Esperado: 0 errores.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/styles/superadmin.css frontend/src/components/superadmin/ frontend/src/pages/superadmin/ frontend/src/App.tsx
git commit -m "feat(superadmin): layout, route guard, lazy routing and page stubs wired in App.tsx"
```

---

## Task 4: SuperAdminLoginPage

**Files:**
- Create: `frontend/src/pages/superadmin/SuperAdminLoginPage.tsx`

**Interfaces:**
- Consumes: `usePlatformAuth().login`, `usePlatformAuth().isAuthenticated`
- Produces: página en `/superadmin/login`

- [ ] **Step 1: Crear `SuperAdminLoginPage.tsx`**

```typescript
// frontend/src/pages/superadmin/SuperAdminLoginPage.tsx
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';
import '../../styles/superadmin.css';

export function SuperAdminLoginPage() {
  const { login, isAuthenticated } = usePlatformAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/superadmin/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/superadmin/dashboard', { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      if (!err.response || status === 0) {
        setError('No se pudo conectar con el servidor.');
      } else if (status === 401) {
        setError('Credenciales incorrectas.');
      } else {
        setError('Error al iniciar sesion. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)' }}>
      <div className="sa-card" style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)' }}>
            Panel de Plataforma
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Acceso exclusivo para administradores</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="sa-form-group">
            <label className="sa-label" htmlFor="sa-email">
              <Mail size={14} style={{ display: 'inline', marginRight: 4 }} />
              Correo electronico
            </label>
            <input
              id="sa-email"
              type="email"
              className="sa-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@plataforma.com"
            />
          </div>
          <div className="sa-form-group">
            <label className="sa-label" htmlFor="sa-password">
              <Lock size={14} style={{ display: 'inline', marginRight: 4 }} />
              Contrasena
            </label>
            <input
              id="sa-password"
              type="password"
              className="sa-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <div className="sa-error">{error}</div>}
          <button type="submit" className="sa-btn sa-btn--primary" disabled={isLoading} style={{ width: '100%', justifyContent: 'center' }}>
            {isLoading ? 'Iniciando sesion...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```
Esperado: 0 errores.

- [ ] **Step 3: Verificar en el navegador**

Abrir `http://localhost:5173/superadmin/login`.
- Debe mostrar el formulario.
- Con credenciales correctas (`superadmin@plataforma.com` / `SuperAdmin123!`): redirige a `/superadmin/dashboard`.
- Con credenciales incorrectas: muestra "Credenciales incorrectas."

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/superadmin/SuperAdminLoginPage.tsx
git commit -m "feat(superadmin): login page with error handling"
```

---

## Task 5: SuperAdminDashboardPage — métricas globales

**Files:**
- Create: `frontend/src/pages/superadmin/SuperAdminDashboardPage.tsx`

**Interfaces:**
- Consumes: `platformAdminApi.listTenants()` → `Tenant[]`, `platformAdminApi.getTenantMetrics(slug)` → `TenantMetrics | null`

- [ ] **Step 1: Crear `SuperAdminDashboardPage.tsx`**

```typescript
// frontend/src/pages/superadmin/SuperAdminDashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Calendar, Clock } from 'lucide-react';
import { platformAdminApi, Tenant, TenantMetrics } from '../../services/platformAdminApi';
import '../../styles/superadmin.css';

interface TenantRow { tenant: Tenant; metrics: TenantMetrics | null; }

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const tenants = await platformAdminApi.listTenants();
        const withMetrics = await Promise.all(
          tenants.map(async (t) => {
            const metrics = await platformAdminApi.getTenantMetrics(t.slug).catch(() => null);
            return { tenant: t, metrics };
          })
        );
        setRows(withMetrics);
      } catch {
        setError('Error al cargar datos de la plataforma.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const activeTenants = rows.filter(r => r.tenant.isActive).length;
  const totalPatients = rows.reduce((s, r) => s + (r.metrics?.totalPatients ?? 0), 0);
  const totalApptsMonth = rows.reduce((s, r) => s + (r.metrics?.totalAppointmentsMonth ?? 0), 0);
  const lastAccess = rows
    .map(r => r.metrics?.lastAccess)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div className="sa-error">{error}</div>;

  return (
    <>
      <h1 className="sa-page-title">Dashboard</h1>

      <div className="sa-metric-grid">
        <div className="sa-metric-card">
          <div className="sa-metric-card__label"><Building2 size={12} style={{ display:'inline', marginRight:4 }} />Clinicas activas</div>
          <div className="sa-metric-card__value">{activeTenants}</div>
        </div>
        <div className="sa-metric-card">
          <div className="sa-metric-card__label"><Users size={12} style={{ display:'inline', marginRight:4 }} />Total pacientes</div>
          <div className="sa-metric-card__value">{totalPatients.toLocaleString('es-PE')}</div>
        </div>
        <div className="sa-metric-card">
          <div className="sa-metric-card__label"><Calendar size={12} style={{ display:'inline', marginRight:4 }} />Citas este mes</div>
          <div className="sa-metric-card__value">{totalApptsMonth.toLocaleString('es-PE')}</div>
        </div>
        <div className="sa-metric-card">
          <div className="sa-metric-card__label"><Clock size={12} style={{ display:'inline', marginRight:4 }} />Ultimo acceso</div>
          <div className="sa-metric-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatDate(lastAccess)}</div>
        </div>
      </div>

      <div className="sa-card">
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Clinica</th>
                <th>Slug</th>
                <th>Estado</th>
                <th>Pacientes</th>
                <th>Citas/mes</th>
                <th>Ultimo acceso</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ tenant, metrics }) => (
                <tr key={tenant.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/superadmin/tenants/${tenant.slug}`)}>
                  <td>{tenant.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{tenant.slug}</td>
                  <td>
                    <span className={`sa-badge ${tenant.isActive ? 'sa-badge--active' : 'sa-badge--inactive'}`}>
                      {tenant.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>{metrics?.totalPatients ?? '—'}</td>
                  <td>{metrics?.totalAppointmentsMonth ?? '—'}</td>
                  <td>{formatDate(metrics?.lastAccess ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Verificar en el navegador**

Abrir `http://localhost:5173/superadmin/dashboard` (logueado).
- Deben aparecer las 4 tarjetas de métricas.
- La tabla muestra la clínica `dermicapro` con sus métricas.
- Click en una fila navega a `/superadmin/tenants/dermicapro`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/superadmin/SuperAdminDashboardPage.tsx
git commit -m "feat(superadmin): dashboard page with platform metrics and tenant summary table"
```

---

## Task 6: SuperAdminTenantsPage — lista + modal de creación

**Files:**
- Create: `frontend/src/pages/superadmin/SuperAdminTenantsPage.tsx`

**Interfaces:**
- Consumes: `platformAdminApi.listTenants`, `platformAdminApi.activateTenant`, `platformAdminApi.deactivateTenant`, `platformAdminApi.createTenant`, tipos `Tenant`, `CreateTenantDto`

- [ ] **Step 1: Crear `SuperAdminTenantsPage.tsx`**

```typescript
// frontend/src/pages/superadmin/SuperAdminTenantsPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { platformAdminApi, Tenant, CreateTenantDto } from '../../services/platformAdminApi';
import '../../styles/superadmin.css';

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 63);
}

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Tenant) => void }) {
  const [form, setForm] = useState<CreateTenantDto>({ name: '', slug: '', contactEmail: '', adminEmail: '', adminPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof CreateTenantDto, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'name') next.slug = slugify(value);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await platformAdminApi.createTenant(form);
      onCreated(result.tenant);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al crear la clinica. Revisa los datos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sa-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sa-modal">
        <h2 className="sa-modal__title">Nueva clinica</h2>
        <form onSubmit={handleSubmit}>
          {[
            { id: 'name', label: 'Nombre de la clinica', type: 'text', required: true },
            { id: 'slug', label: 'Slug (subdominio)', type: 'text', required: true },
            { id: 'contactEmail', label: 'Email de contacto (opcional)', type: 'email', required: false },
            { id: 'adminEmail', label: 'Email del admin inicial', type: 'email', required: true },
            { id: 'adminPassword', label: 'Contrasena temporal del admin', type: 'password', required: true },
          ].map(({ id, label, type, required }) => (
            <div className="sa-form-group" key={id}>
              <label className="sa-label" htmlFor={`sa-create-${id}`}>{label}</label>
              <input
                id={`sa-create-${id}`}
                type={type}
                className="sa-input"
                value={(form as any)[id]}
                onChange={e => set(id as keyof CreateTenantDto, e.target.value)}
                required={required}
              />
            </div>
          ))}
          {isLoading && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>Aplicando migraciones, esto puede tardar unos segundos...</p>}
          {error && <div className="sa-error">{error}</div>}
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
            <button type="button" className="sa-btn sa-btn--ghost" onClick={onClose} disabled={isLoading}>Cancelar</button>
            <button type="submit" className="sa-btn sa-btn--primary" disabled={isLoading}>
              {isLoading ? 'Creando...' : 'Crear clinica'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SuperAdminTenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    platformAdminApi.listTenants()
      .then(setTenants)
      .catch(() => setError('Error al cargar clinicas.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggle = async (tenant: Tenant) => {
    setToggling(tenant.slug);
    try {
      const updated = tenant.isActive
        ? await platformAdminApi.deactivateTenant(tenant.slug)
        : await platformAdminApi.activateTenant(tenant.slug);
      setTenants(prev => prev.map(t => t.slug === tenant.slug ? updated : t));
    } catch {
      setError('Error al cambiar estado de la clinica.');
    } finally {
      setToggling(null);
    }
  };

  if (isLoading) return <div>Cargando...</div>;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-xl)' }}>
        <h1 className="sa-page-title" style={{ margin: 0 }}>Clinicas</h1>
        <button className="sa-btn sa-btn--primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nueva clinica
        </button>
      </div>

      {error && <div className="sa-error">{error}</div>}

      <div className="sa-card">
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Slug</th>
                <th>Estado</th>
                <th>Email contacto</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{t.slug}</td>
                  <td>
                    <span className={`sa-badge ${t.isActive ? 'sa-badge--active' : 'sa-badge--inactive'}`}>
                      {t.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>{t.contactEmail ?? '—'}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString('es-PE')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                      <button className="sa-btn sa-btn--ghost" onClick={() => navigate(`/superadmin/tenants/${t.slug}`)} title="Ver detalle">
                        <Eye size={14} />
                      </button>
                      <button
                        className={`sa-btn ${t.isActive ? 'sa-btn--danger' : 'sa-btn--ghost'}`}
                        onClick={() => handleToggle(t)}
                        disabled={toggling === t.slug}
                        title={t.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {t.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {t.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={(newTenant) => {
            setTenants(prev => [newTenant, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Verificar en el navegador**

Abrir `http://localhost:5173/superadmin/tenants`.
- Tabla muestra `dermicapro` como activa.
- Click "Desactivar" la desactiva; el badge cambia a "Inactiva".
- Click "Nueva clinica" abre el modal. Al escribir el nombre, el slug se auto-completa.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/superadmin/SuperAdminTenantsPage.tsx
git commit -m "feat(superadmin): tenants list page with activate/deactivate and create modal"
```

---

## Task 7: SuperAdminTenantDetailPage — detalle + migraciones

**Files:**
- Create: `frontend/src/pages/superadmin/SuperAdminTenantDetailPage.tsx`

**Interfaces:**
- Consumes: `platformAdminApi.getTenant`, `platformAdminApi.getTenantMetrics`, `platformAdminApi.getTenantMigrations`, `platformAdminApi.refreshTenantMetrics`, `platformAdminApi.activateTenant`, `platformAdminApi.deactivateTenant`
- Route param: `slug` vía `useParams()`

- [ ] **Step 1: Crear `SuperAdminTenantDetailPage.tsx`**

```typescript
// frontend/src/pages/superadmin/SuperAdminTenantDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { platformAdminApi, Tenant, TenantMetrics, TenantMigration } from '../../services/platformAdminApi';
import '../../styles/superadmin.css';

type Tab = 'info' | 'migrations';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SuperAdminTenantDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('info');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [migrations, setMigrations] = useState<TenantMigration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      platformAdminApi.getTenant(slug),
      platformAdminApi.getTenantMetrics(slug).catch(() => null),
      platformAdminApi.getTenantMigrations(slug),
    ])
      .then(([t, m, migs]) => { setTenant(t); setMetrics(m); setMigrations(migs); })
      .catch(() => setError('Error al cargar datos de la clinica.'))
      .finally(() => setIsLoading(false));
  }, [slug]);

  const handleRefreshMetrics = async () => {
    if (!slug) return;
    setIsRefreshing(true);
    try {
      const updated = await platformAdminApi.refreshTenantMetrics(slug);
      setMetrics(updated);
    } catch {
      setError('Error al refrescar metricas.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggle = async () => {
    if (!tenant || !slug) return;
    setIsToggling(true);
    try {
      const updated = tenant.isActive
        ? await platformAdminApi.deactivateTenant(slug)
        : await platformAdminApi.activateTenant(slug);
      setTenant(updated);
    } catch {
      setError('Error al cambiar estado.');
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) return <div>Cargando...</div>;
  if (!tenant) return <div className="sa-error">Clinica no encontrada.</div>;

  const failedMigrations = migrations.filter(m => m.status === 'failed');

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
        <button className="sa-btn sa-btn--ghost" onClick={() => navigate('/superadmin/tenants')}>
          <ArrowLeft size={16} /> Volver
        </button>
        <h1 className="sa-page-title" style={{ margin: 0 }}>{tenant.name}</h1>
        <span className={`sa-badge ${tenant.isActive ? 'sa-badge--active' : 'sa-badge--inactive'}`}>
          {tenant.isActive ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      {error && <div className="sa-error">{error}</div>}

      <div className="sa-tabs">
        <button className={`sa-tab ${tab === 'info' ? 'sa-tab--active' : ''}`} onClick={() => setTab('info')}>Informacion</button>
        <button className={`sa-tab ${tab === 'migrations' ? 'sa-tab--active' : ''}`} onClick={() => setTab('migrations')}>
          Migraciones {failedMigrations.length > 0 && <span style={{ color: 'var(--color-error, #dc2626)', marginLeft: 4 }}>({failedMigrations.length} fallidas)</span>}
        </button>
      </div>

      {tab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
          <div className="sa-card">
            <h3 style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-md)' }}>Datos de la clinica</h3>
            {[
              ['Nombre', tenant.name],
              ['Slug', tenant.slug],
              ['Email contacto', tenant.contactEmail ?? '—'],
              ['Telefono', tenant.contactPhone ?? '—'],
              ['Creada', formatDate(tenant.createdAt)],
              ['Actualizada', formatDate(tenant.updatedAt)],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-xs) 0', borderBottom: '1px solid var(--color-border-secondary)', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                <span style={{ fontFamily: label === 'Slug' ? 'monospace' : undefined }}>{value}</span>
              </div>
            ))}
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              <button
                className={`sa-btn ${tenant.isActive ? 'sa-btn--danger' : 'sa-btn--ghost'}`}
                onClick={handleToggle}
                disabled={isToggling}
              >
                {isToggling ? 'Cambiando...' : tenant.isActive ? 'Desactivar clinica' : 'Activar clinica'}
              </button>
            </div>
          </div>

          <div className="sa-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
              <h3 style={{ fontWeight: 'var(--font-weight-semibold)' }}>Metricas</h3>
              <button className="sa-btn sa-btn--ghost" onClick={handleRefreshMetrics} disabled={isRefreshing} title="Refrescar metricas">
                <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : undefined }} />
                {isRefreshing ? 'Actualizando...' : 'Refrescar'}
              </button>
            </div>
            {metrics ? (
              [
                ['Total pacientes', metrics.totalPatients],
                ['Citas este mes', metrics.totalAppointmentsMonth],
                ['Usuarios activos', metrics.activeUsers],
                ['Ultimo acceso', formatDate(metrics.lastAccess)],
                ['Actualizado', formatDate(metrics.updatedAt)],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-xs) 0', borderBottom: '1px solid var(--color-border-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                  <span>{String(value)}</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>Sin metricas calculadas. Usa "Refrescar" para calcularlas.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'migrations' && (
        <div className="sa-card">
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Migracion</th>
                  <th>Estado</th>
                  <th>Aplicada</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {migrations.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Sin registros de migracion.</td></tr>
                )}
                {migrations.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{m.migrationName}</td>
                    <td>
                      <span className={`sa-migration-status--${m.status}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                        {m.status === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {m.status === 'success' ? 'Exitosa' : 'Fallida'}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(m.appliedAt)}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error, #dc2626)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.error ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: TypeCheck**

```bash
cd frontend && npx tsc --noEmit
```
Esperado: 0 errores.

- [ ] **Step 3: Verificar en el navegador**

Abrir `http://localhost:5173/superadmin/tenants/dermicapro`.
- Tab "Informacion": muestra nombre, slug, métricas.
- Tab "Migraciones": tabla de 54 migraciones todas con estado "Exitosa".
- Botón "Refrescar" llama al backend y actualiza las métricas.
- Botón "Desactivar clinica" cambia el estado y el badge.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/superadmin/SuperAdminTenantDetailPage.tsx
git commit -m "feat(superadmin): tenant detail page with info, metrics and migrations tabs"
```

---

## Task 8: TypeCheck final y verificación completa

- [ ] **Step 1: TypeCheck limpio**

```bash
cd frontend && npx tsc --noEmit
```
Esperado: 0 errores.

- [ ] **Step 2: Tests de contexto y API**

```bash
cd frontend && npx jest --no-coverage --testPathPatterns="platformAdminApi|PlatformAuthContext"
```
Esperado: PASS — todos los tests.

- [ ] **Step 3: Verificar flujo completo en el navegador**

1. Abrir `http://localhost:5173/superadmin` → redirige a `/superadmin/login` (no autenticado).
2. Login con `superadmin@plataforma.com` / `SuperAdmin123!` → redirige a `/superadmin/dashboard`.
3. Dashboard muestra métricas y tabla de tenants.
4. Navegar a `/superadmin/tenants` → lista de clínicas con acciones.
5. Click "Ver detalle" de `dermicapro` → página de detalle con tabs.
6. Tab Migraciones muestra todas como exitosas.
7. Logout → redirige a `/superadmin/login`.
8. Intentar acceder a `/superadmin/dashboard` directamente → redirige a login.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat(superadmin): complete platform admin UI — login, dashboard, tenants, detail"
```
