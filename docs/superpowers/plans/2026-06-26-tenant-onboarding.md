# Tenant Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public self-service registration flow where a clinic can sign up, get their tenant provisioned automatically, and receive admin credentials shown on screen (plus sent by email if SMTP is configured).

**Architecture:** A new public endpoint `POST /platform/onboarding/register` generates a 16-char hex temp password, calls the existing `provisionTenant()`, fires a welcome email (non-blocking, silent if SMTP not configured), and returns credentials in the response. The frontend has a `/register` page with a form + one-time success screen that displays the temp password with a copy button.

**Tech Stack:** Node.js + TypeScript, nodemailer (new dep), express-rate-limit (existing), React 18, axios.

## Global Constraints

- No `Co-Authored-By: Claude` in any git commit.
- New npm dependencies allowed: `nodemailer`, `@types/nodemailer` (backend only).
- All backend tests in `backend/src/__tests__/`. Test command: `cd backend && npm test -- --testPathPatterns <file>`.
- Error handling pattern: `try { ... } catch (err) { if (err instanceof AppError) res.status(err.statusCode).json({ error: err.message }); else res.status(500).json({ error: 'Error al ...' }); }`.
- `AppError` is at `backend/src/middlewares/errorHandler.ts`.
- Valid slug regex (same as `provision.ts`): `/^[a-z0-9_]{1,63}$/`.
- `config.platform.domain` from `backend/src/config/env.ts` is the base domain for login URL construction.
- Temp password: `crypto.randomBytes(8).toString('hex')` — 16 hex chars, no extra dep.
- Welcome email is fire-and-forget: `sendWelcomeEmail(...).catch((err) => console.error(...))` — registration always succeeds even when email fails.
- Frontend has no automated tests — verify by running `make up` and testing the form in the browser at `http://localhost:5173/register`.
- Rate limit the onboarding endpoint: 5 registrations per IP per hour (defined inline in the platform routes file).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/src/platform/email.ts` | `sendWelcomeEmail()` via nodemailer, skips gracefully when SMTP not configured |
| Create | `backend/src/controllers/platform/onboarding.controller.ts` | `registerTenantHandler`: validate input, generate temp password, provision, send email, return credentials |
| Modify | `backend/src/routes/platform/index.ts` | Add `POST /onboarding/register` (public, rate-limited, no `authenticatePlatformAdmin`) |
| Modify | `backend/.env.example` | Add SMTP env vars block |
| Create | `frontend/src/services/platformApi.ts` | Axios instance pointing to `/platform` (no auth header) |
| Create | `frontend/src/services/onboarding.service.ts` | `onboardingService.registerTenant()` API call |
| Create | `frontend/src/pages/RegisterPage.tsx` | Form state + success state with temp password display |
| Modify | `frontend/src/App.tsx` | Add public `/register` route |

---

### Task 1: Email service

**Files:**
- Install (backend): `nodemailer`, `@types/nodemailer`
- Create: `backend/src/platform/email.ts`
- Modify: `backend/.env.example`
- Test: `backend/src/__tests__/platform/email.test.ts`

**Interfaces:**
- Consumes: nothing from this project
- Produces:
  - `interface WelcomeEmailOptions { to: string; clinicName: string; adminFirstName: string; slug: string; tempPassword: string; loginUrl: string; }`
  - `sendWelcomeEmail(opts: WelcomeEmailOptions): Promise<void>`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/__tests__/platform/email.test.ts
import { sendWelcomeEmail } from '../../platform/email';

const mockSendMail = jest.fn().mockResolvedValue({});
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.mock('nodemailer', () => ({ createTransport: (...args: any[]) => mockCreateTransport(...args) }));

const opts = {
  to: 'admin@clinic.com',
  clinicName: 'Clínica Test',
  adminFirstName: 'Ana',
  slug: 'clinica_test',
  tempPassword: 'abc123xyz456def7',
  loginUrl: 'http://clinica_test.localhost:5173/login',
};

describe('sendWelcomeEmail', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
    jest.clearAllMocks();
  });

  it('sends email when SMTP is configured', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASS = 'pass';
    await sendWelcomeEmail(opts);
    expect(mockCreateTransport).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@clinic.com',
        subject: expect.stringContaining('DermicaPro'),
      }),
    );
  });

  it('includes temp password in email html', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASS = 'pass';
    await sendWelcomeEmail(opts);
    const [mailOpts] = mockSendMail.mock.calls[0];
    expect(mailOpts.html).toContain(opts.tempPassword);
    expect(mailOpts.html).toContain(opts.loginUrl);
  });

  it('skips sending when SMTP is not configured', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    await sendWelcomeEmail(opts);
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/platform/email.test.ts
```

Expected: FAIL — `Cannot find module 'nodemailer'` or module not found

- [ ] **Step 3: Install nodemailer**

```bash
cd backend && npm install nodemailer && npm install --save-dev @types/nodemailer
```

- [ ] **Step 4: Create `backend/src/platform/email.ts`**

```typescript
import nodemailer from 'nodemailer';

export interface WelcomeEmailOptions {
  to: string;
  clinicName: string;
  adminFirstName: string;
  slug: string;
  tempPassword: string;
  loginUrl: string;
}

function createSmtpTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendWelcomeEmail(opts: WelcomeEmailOptions): Promise<void> {
  const transport = createSmtpTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping welcome email for', opts.to);
    return;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({
    from,
    to: opts.to,
    subject: `Bienvenido a DermicaPro — ${opts.clinicName}`,
    html: `
      <h2>¡Hola, ${opts.adminFirstName}!</h2>
      <p>Tu clínica <strong>${opts.clinicName}</strong> ya está lista en DermicaPro.</p>
      <hr>
      <p><strong>URL de acceso:</strong> <a href="${opts.loginUrl}">${opts.loginUrl}</a></p>
      <p><strong>Email:</strong> ${opts.to}</p>
      <p><strong>Contraseña temporal:</strong> <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px">${opts.tempPassword}</code></p>
      <hr>
      <p style="color:#666;font-size:13px">Por seguridad, cambia tu contraseña en el primer inicio de sesión.</p>
    `,
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/platform/email.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 6: Add SMTP vars to `backend/.env.example`**

Append after the `PLATFORM_DOMAIN` block:

```
# ================================
# Email (SMTP) — optional
# ================================
# When not configured, welcome emails are skipped silently
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=DermicaPro <noreply@yourdomain.com>
```

- [ ] **Step 7: Run full test suite for regressions**

```bash
cd backend && npm test
```

Expected: All tests pass (165+)

- [ ] **Step 8: Commit**

```bash
git add backend/src/platform/email.ts backend/src/__tests__/platform/email.test.ts backend/.env.example backend/package.json backend/package-lock.json
git commit -m "feat(onboarding): nodemailer email service for welcome emails"
```

---

### Task 2: Onboarding endpoint

**Files:**
- Create: `backend/src/controllers/platform/onboarding.controller.ts`
- Modify: `backend/src/routes/platform/index.ts`
- Test: `backend/src/__tests__/controllers/platform/onboarding.controller.test.ts`

**Interfaces:**
- Consumes:
  - `sendWelcomeEmail(opts: WelcomeEmailOptions): Promise<void>` from `backend/src/platform/email.ts`
  - `provisionTenant(dto: CreateTenantDto): Promise<ProvisionResult>` from `backend/src/platform/provision.ts`
  - `AppError` from `backend/src/middlewares/errorHandler.ts`
  - `config` from `backend/src/config/env.ts` — uses `config.platform.domain`
- Produces:
  - `registerTenantHandler` exported from `onboarding.controller.ts`
  - `POST /platform/onboarding/register` → `{ data: { tenant, loginUrl, adminEmail, tempPassword, migrationsApplied } }`
  - HTTP 201 on success, 400 on missing fields or invalid slug, 409 on duplicate slug, 500 on provisioning failure

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/__tests__/controllers/platform/onboarding.controller.test.ts
import { Request, Response } from 'express';
import { registerTenantHandler } from '../../../controllers/platform/onboarding.controller';
import * as provisionModule from '../../../platform/provision';
import * as emailModule from '../../../platform/email';

jest.mock('../../../platform/provision');
jest.mock('../../../platform/email');

const mockTenant = {
  id: 't1', name: 'Clínica Test', slug: 'clinica_test', isActive: true,
  contactEmail: 'admin@test.com', contactPhone: null, logoUrl: null,
  createdAt: new Date(), updatedAt: new Date(),
};
const mockProvisionResult = { tenant: mockTenant, migrationsApplied: 55, adminCreated: true };

function makeRes() {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response;
}
function makeReq(body = {}): Request {
  return { body } as unknown as Request;
}

const validBody = {
  name: 'Clínica Test',
  slug: 'clinica_test',
  adminEmail: 'admin@test.com',
  adminFirstName: 'Ana',
  adminLastName: 'López',
};

describe('registerTenantHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when required fields are missing', async () => {
    const res = makeRes();
    await registerTenantHandler(makeReq({ name: 'Test' }), res);
    expect(res.status as jest.Mock).toHaveBeenCalledWith(400);
  });

  it('provisions tenant and returns 201 with credentials', async () => {
    (provisionModule.provisionTenant as jest.Mock).mockResolvedValue(mockProvisionResult);
    (emailModule.sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);

    const res = makeRes();
    await registerTenantHandler(makeReq(validBody), res);

    expect(provisionModule.provisionTenant).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Clínica Test', slug: 'clinica_test', adminEmail: 'admin@test.com' }),
    );
    expect(res.status as jest.Mock).toHaveBeenCalledWith(201);
    const jsonCall = (res.status as jest.Mock).mock.results[0].value.json.mock.calls[0][0];
    expect(jsonCall.data).toMatchObject({
      tenant: mockTenant,
      adminEmail: 'admin@test.com',
      tempPassword: expect.stringMatching(/^[0-9a-f]{16}$/),
      loginUrl: expect.stringContaining('clinica_test'),
      migrationsApplied: 55,
    });
  });

  it('fires welcome email as fire-and-forget', async () => {
    (provisionModule.provisionTenant as jest.Mock).mockResolvedValue(mockProvisionResult);
    (emailModule.sendWelcomeEmail as jest.Mock).mockResolvedValue(undefined);

    const res = makeRes();
    await registerTenantHandler(makeReq(validBody), res);

    expect(emailModule.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin@test.com', clinicName: 'Clínica Test' }),
    );
  });

  it('returns 409 when slug already exists', async () => {
    (provisionModule.provisionTenant as jest.Mock).mockRejectedValue(
      new Error('Ya existe un tenant con el slug "clinica_test"'),
    );
    const res = makeRes();
    await registerTenantHandler(makeReq(validBody), res);
    expect(res.status as jest.Mock).toHaveBeenCalledWith(409);
  });

  it('returns 400 when slug is invalid', async () => {
    (provisionModule.provisionTenant as jest.Mock).mockRejectedValue(
      new Error('Slug inválido: mi-slug'),
    );
    const res = makeRes();
    await registerTenantHandler(makeReq({ ...validBody, slug: 'mi-slug' }), res);
    expect(res.status as jest.Mock).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected provisioning error', async () => {
    (provisionModule.provisionTenant as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
    const res = makeRes();
    await registerTenantHandler(makeReq(validBody), res);
    expect(res.status as jest.Mock).toHaveBeenCalledWith(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/controllers/platform/onboarding.controller.test.ts
```

Expected: FAIL — `Cannot find module '../../../controllers/platform/onboarding.controller'`

- [ ] **Step 3: Create `backend/src/controllers/platform/onboarding.controller.ts`**

```typescript
import { Request, Response } from 'express';
import crypto from 'crypto';
import { provisionTenant } from '../../platform/provision';
import { sendWelcomeEmail } from '../../platform/email';
import { AppError } from '../../middlewares/errorHandler';
import { config } from '../../config/env';

function generateTempPassword(): string {
  return crypto.randomBytes(8).toString('hex');
}

function buildLoginUrl(slug: string): string {
  const domain = config.platform.domain;
  const protocol = config.env === 'production' ? 'https' : 'http';
  const port = config.env === 'production' ? '' : ':5173';
  return `${protocol}://${slug}.${domain}${port}/login`;
}

export const registerTenantHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, contactEmail, contactPhone, adminFirstName, adminLastName, adminEmail } = req.body;
    if (!name || !slug || !adminEmail || !adminFirstName || !adminLastName) {
      throw new AppError('name, slug, adminEmail, adminFirstName y adminLastName son requeridos', 400);
    }

    const tempPassword = generateTempPassword();
    const result = await provisionTenant({
      name,
      slug,
      contactEmail: contactEmail ?? adminEmail,
      contactPhone,
      adminEmail,
      adminPassword: tempPassword,
      adminFirstName,
      adminLastName,
    });

    const loginUrl = buildLoginUrl(slug);

    sendWelcomeEmail({
      to: adminEmail,
      clinicName: name,
      adminFirstName,
      slug,
      tempPassword,
      loginUrl,
    }).catch((err) => console.error('[onboarding] Failed to send welcome email:', err));

    res.status(201).json({
      data: {
        tenant: result.tenant,
        loginUrl,
        adminEmail,
        tempPassword,
        migrationsApplied: result.migrationsApplied,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
    } else if (err instanceof Error && err.message.startsWith('Ya existe')) {
      res.status(409).json({ error: err.message });
    } else if (err instanceof Error && err.message.startsWith('Slug inválido')) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Error al registrar la clínica' });
    }
  }
};
```

- [ ] **Step 4: Add the public route to `backend/src/routes/platform/index.ts`**

Read the file first, then replace its contents with:

```typescript
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { platformLogin, getPlatformAdminMe } from '../../controllers/platform/auth.controller';
import {
  listTenants,
  getTenant,
  createTenantHandler,
  updateTenantHandler,
  activateTenant,
  deactivateTenant,
  getTenantMigrations,
  getTenantMetricsHandler,
  refreshTenantMetricsHandler,
} from '../../controllers/platform/tenants.controller';
import { registerTenantHandler } from '../../controllers/platform/onboarding.controller';
import { authenticatePlatformAdmin } from '../../middlewares/platformAuth';

const router = Router();

const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.' });
  },
});

// Public onboarding — no auth required
router.post('/onboarding/register', onboardingLimiter, registerTenantHandler);

// Platform admin authentication
router.post('/auth/login', platformLogin);
router.get('/auth/me', authenticatePlatformAdmin, getPlatformAdminMe);

// Tenant management (all require platform admin auth)
router.get('/tenants', authenticatePlatformAdmin, listTenants);
router.post('/tenants', authenticatePlatformAdmin, createTenantHandler);
router.get('/tenants/:slug', authenticatePlatformAdmin, getTenant);
router.put('/tenants/:slug', authenticatePlatformAdmin, updateTenantHandler);
router.post('/tenants/:slug/activate', authenticatePlatformAdmin, activateTenant);
router.post('/tenants/:slug/deactivate', authenticatePlatformAdmin, deactivateTenant);
router.get('/tenants/:slug/migrations', authenticatePlatformAdmin, getTenantMigrations);
router.get('/tenants/:slug/metrics', authenticatePlatformAdmin, getTenantMetricsHandler);
router.post('/tenants/:slug/metrics/refresh', authenticatePlatformAdmin, refreshTenantMetricsHandler);

export default router;
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && npm test -- --testPathPatterns src/__tests__/controllers/platform/onboarding.controller.test.ts
```

Expected: PASS — 6 tests

- [ ] **Step 6: Run full test suite for regressions**

```bash
cd backend && npm test
```

Expected: All tests pass (168+)

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/platform/onboarding.controller.ts backend/src/routes/platform/index.ts backend/src/__tests__/controllers/platform/onboarding.controller.test.ts
git commit -m "feat(onboarding): public POST /platform/onboarding/register endpoint"
```

---

### Task 3: Frontend registration page

**Files:**
- Create: `frontend/src/services/platformApi.ts`
- Create: `frontend/src/services/onboarding.service.ts`
- Create: `frontend/src/pages/RegisterPage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `POST /platform/onboarding/register` from Task 2
- Produces: `/register` public route — a registration form + success screen

No automated tests. Verify by visiting `http://localhost:5173/register` after `make up`.

- [ ] **Step 1: Create `frontend/src/services/platformApi.ts`**

```typescript
import axios from 'axios';

const platformApi = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/platform',
  headers: { 'Content-Type': 'application/json' },
});

export default platformApi;
```

- [ ] **Step 2: Create `frontend/src/services/onboarding.service.ts`**

```typescript
import platformApi from './platformApi';

export interface RegisterTenantInput {
  name: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
}

export interface RegisterTenantResult {
  tenant: { id: string; name: string; slug: string };
  loginUrl: string;
  adminEmail: string;
  tempPassword: string;
  migrationsApplied: number;
}

export const onboardingService = {
  async registerTenant(input: RegisterTenantInput): Promise<RegisterTenantResult> {
    const response = await platformApi.post<{ data: RegisterTenantResult }>(
      '/onboarding/register',
      input,
    );
    return response.data.data;
  },
};
```

- [ ] **Step 3: Create `frontend/src/pages/RegisterPage.tsx`**

```tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Copy, Check, Building2, User, Eye, EyeOff } from 'lucide-react';
import { onboardingService, RegisterTenantResult } from '../services/onboarding.service';

const VALID_SLUG = /^[a-z0-9_]{1,63}$/;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 63);
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-lg)',
  border: '1.5px solid var(--color-border-primary)',
  background: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-base)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)' as any,
  color: 'var(--color-text-secondary)',
  marginBottom: 6,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-semibold)' as any,
  color: 'var(--color-text-secondary)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-xs)',
  paddingBottom: 'var(--spacing-xs)',
  borderBottom: '1px solid var(--color-border-secondary)',
};

export function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RegisterTenantResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: slugEdited ? f.slug : generateSlug(name) }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugEdited(true);
    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setForm((f) => ({ ...f, slug }));
    setSlugError(slug && !VALID_SLUG.test(slug) ? 'Solo letras minúsculas, números y guión bajo (_), máximo 63 caracteres' : '');
  };

  const handleField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!VALID_SLUG.test(form.slug)) {
      setSlugError('Slug inválido');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await onboardingService.registerTenant({
        name: form.name,
        slug: form.slug,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        adminFirstName: form.adminFirstName,
        adminLastName: form.adminLastName,
        adminEmail: form.adminEmail,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar la clínica. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', padding: 'var(--spacing-xl)' }}>
        <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-2xl)', padding: 'var(--spacing-3xl)', maxWidth: 480, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
            <CheckCircle size={48} color="var(--color-success)" style={{ marginBottom: 'var(--spacing-md)' }} />
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-text-primary)', margin: 0 }}>
              ¡Clínica registrada!
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)', marginBottom: 0 }}>
              <strong>{result.tenant.name}</strong> ya está lista en DermicaPro.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>URL de acceso</div>
              <a href={result.loginUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' as any, wordBreak: 'break-all', fontSize: 'var(--font-size-sm)' }}>
                {result.loginUrl}
              </a>
            </div>

            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Email del administrador</div>
              <span style={{ fontWeight: 'var(--font-weight-medium)' as any }}>{result.adminEmail}</span>
            </div>

            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Contraseña temporal</div>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'var(--font-weight-semibold)' as any, letterSpacing: 2 }}>
                    {showPassword ? result.tempPassword : '••••••••••••••••'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, borderRadius: 'var(--radius-sm)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={handleCopy}
                    title="Copiar contraseña"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)', padding: 4, borderRadius: 'var(--radius-sm)' }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: '#92400e' }}>
              ⚠️ Guarda estas credenciales ahora. La contraseña no se mostrará de nuevo. Cámbiala en el primer inicio de sesión.
            </div>
          </div>

          <Link
            to="/login"
            style={{ display: 'block', marginTop: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' as any, textDecoration: 'none' }}
          >
            Ir al inicio de sesión →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', padding: 'var(--spacing-xl)' }}>
      <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-2xl)', padding: 'var(--spacing-3xl)', maxWidth: 520, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-text-primary)', margin: 0 }}>
            Registra tu clínica
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)', marginBottom: 0 }}>
            Comienza a usar DermicaPro en minutos
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {/* Clinic section */}
          <div style={sectionLabelStyle}>
            <Building2 size={14} /> Datos de la clínica
          </div>

          <div>
            <label style={labelStyle}>Nombre de la clínica *</label>
            <input type="text" required value={form.name} onChange={handleNameChange} placeholder="Clínica Dermicapro Trujillo" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>
              Identificador (slug) *
              <span style={{ fontWeight: 'normal', marginLeft: 8, color: 'var(--color-text-tertiary)' }}>letras minúsculas, números y _</span>
            </label>
            <input type="text" required value={form.slug} onChange={handleSlugChange} placeholder="mi_clinica" style={{ ...inputStyle, borderColor: slugError ? 'var(--color-error)' : undefined }} />
            {slugError && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', marginTop: 4 }}>{slugError}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={labelStyle}>Email de contacto</label>
              <input type="email" value={form.contactEmail} onChange={handleField('contactEmail')} placeholder="info@clinica.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input type="tel" value={form.contactPhone} onChange={handleField('contactPhone')} placeholder="+51 999 000 000" style={inputStyle} />
            </div>
          </div>

          {/* Admin section */}
          <div style={{ ...sectionLabelStyle, marginTop: 'var(--spacing-xs)' }}>
            <User size={14} /> Administrador de la clínica
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input type="text" required value={form.adminFirstName} onChange={handleField('adminFirstName')} placeholder="Ana" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Apellido *</label>
              <input type="text" required value={form.adminLastName} onChange={handleField('adminLastName')} placeholder="López" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Email del administrador *
              <span style={{ fontWeight: 'normal', marginLeft: 8, color: 'var(--color-text-tertiary)' }}>para acceder al sistema</span>
            </label>
            <input type="email" required value={form.adminEmail} onChange={handleField('adminEmail')} placeholder="admin@clinica.com" style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: '#fff5f5', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !!slugError}
            style={{ marginTop: 'var(--spacing-xs)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', border: 'none', background: isLoading || slugError ? 'var(--color-bg-tertiary)' : 'var(--color-primary)', color: isLoading || slugError ? 'var(--color-text-tertiary)' : '#fff', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' as any, cursor: isLoading || slugError ? 'not-allowed' : 'pointer' }}
          >
            {isLoading ? 'Registrando clínica...' : 'Registrar clínica'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' as any }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the `/register` route to `frontend/src/App.tsx`**

Read the file. Add the import at the top alongside the other page imports:

```tsx
import { RegisterPage } from './pages/RegisterPage';
```

Add the route inside `<Routes>` in the `App` component, **before** the `/login` route:

```tsx
<Route path="/register" element={<RegisterPage />} />
<Route path="/login" element={<LoginPage />} />
```

The resulting routes block (showing only the changed area):

```tsx
<Routes>
  {/* Rutas del Portal de Pacientes */}
  <Route path="/patient/login" element={<PatientLoginPage />} />
  <Route
    path="/patient/*"
    element={
      <ProtectedPatientRoute>
        <PatientPortalRoutes />
      </ProtectedPatientRoute>
    }
  />

  {/* Rutas del Sistema de Staff */}
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route
    path="/*"
    element={
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    }
  />
</Routes>
```

- [ ] **Step 5: Verify TypeScript compiles (frontend)**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No new errors.

- [ ] **Step 6: Start dev server and test the form visually**

```bash
make up
```

Open `http://localhost:5173/register`. Verify:
1. Form renders with all fields
2. Slug auto-fills from clinic name (accents removed, spaces → `_`)
3. Slug field rejects characters that aren't `[a-z0-9_]`
4. Submit with a valid test slug (e.g. `test_clinica_001`) — provisioning runs (~10s)
5. Success screen shows login URL, admin email, temp password with show/hide and copy button
6. The warning "Guarda estas credenciales" is visible

- [ ] **Step 7: Commit**

```bash
git add frontend/src/services/platformApi.ts frontend/src/services/onboarding.service.ts frontend/src/pages/RegisterPage.tsx frontend/src/App.tsx
git commit -m "feat(onboarding): public /register page with form and success screen"
```
