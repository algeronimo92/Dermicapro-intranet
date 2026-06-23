# Multiple Receipt Images (up to 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow up to 3 images per payment receipt instead of 1, across all receipt upload components.

**Architecture:** Add a new `receiptUrls String[]` column to the Payment model (keeping `receiptUrl` for backward compat during migration). Backend endpoints change from `multer.single()` to `multer.array('receipts', 3)`. Frontend components change from `File | null` to `File[]` with max 3 items. Services send files as `FormData` with multiple `receipts` entries.

**Tech Stack:** Prisma (PostgreSQL), Express + Multer, React 18, TypeScript

## Global Constraints

- No emojis in code, UI, commits, or responses -- use SVG icons only
- Use existing design token CSS variables (no hardcoded colors)
- Follow existing patterns: layered architecture (routes -> controllers -> services -> prisma)
- Prisma naming: camelCase in code, snake_case in DB via `@map()`
- Max file size: 5MB per file (existing `config.upload.maxFileSize`)
- Allowed receipt types: JPEG, PNG, WebP, PDF (existing `receiptFilter`)

---

### Task 1: Database Migration -- Add `receiptUrls` Column

**Files:**
- Create: `backend/prisma/migrations/YYYYMMDDHHMMSS_add_receipt_urls_to_payments/migration.sql`
- Modify: `backend/prisma/schema.prisma:353-378`

**Interfaces:**
- Consumes: nothing
- Produces: `Payment.receiptUrls: String[]` column in DB, existing `receiptUrl` data migrated into array

- [ ] **Step 1: Update Prisma schema**

In `backend/prisma/schema.prisma`, add `receiptUrls` to the Payment model and mark `receiptUrl` as optional (keep for backward compat):

```prisma
model Payment {
  id            String        @id @default(uuid())
  patientId     String        @map("patient_id")
  paymentOrderId String?      @map("payment_order_id")
  appointmentId String?       @map("appointment_id")
  amountPaid    Decimal       @map("amount_paid") @db.Decimal(10, 2)
  paymentMethod PaymentMethod @map("payment_method")
  paymentType   PaymentType   @map("payment_type")
  paymentDate   DateTime      @default(now()) @map("payment_date")
  receiptUrl    String?       @map("receipt_url")
  receiptUrls   String[]      @default([]) @map("receipt_urls")
  notes         String?
  createdById   String        @map("created_by_id")
  createdAt     DateTime      @default(now()) @map("created_at")
  voidedAt      DateTime?     @map("voided_at")
  voidedById    String?       @map("voided_by_id")
  voidReason    String?       @map("void_reason")

  // Relations
  patient      Patient       @relation(fields: [patientId], references: [id])
  paymentOrder PaymentOrder? @relation(fields: [paymentOrderId], references: [id])
  appointment  Appointment?  @relation(fields: [appointmentId], references: [id])
  createdBy    User          @relation("PaymentCreatedBy", fields: [createdById], references: [id])
  voidedBy     User?         @relation("PaymentVoidedBy", fields: [voidedById], references: [id])

  @@map("payments")
}
```

- [ ] **Step 2: Create migration**

```bash
make migrate-create name=add_receipt_urls_to_payments
```

- [ ] **Step 3: Edit the generated migration SQL to copy existing data**

Open the generated migration SQL file and replace its contents with:

```sql
-- Add receipt_urls column as text array with empty default
ALTER TABLE "payments" ADD COLUMN "receipt_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Migrate existing receipt_url data into receipt_urls array
UPDATE "payments"
SET "receipt_urls" = ARRAY["receipt_url"]
WHERE "receipt_url" IS NOT NULL;
```

- [ ] **Step 4: Apply migration**

```bash
make migrate
```

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add receipt_urls column to payments for multiple receipt images"
```

---

### Task 2: Backend -- Update Upload Endpoints for Multiple Files

**Files:**
- Modify: `backend/src/routes/payments.routes.ts:21`
- Modify: `backend/src/routes/appointments.routes.ts:34`
- Modify: `backend/src/controllers/payments.controller.ts:423-464`
- Modify: `backend/src/controllers/appointments.controller.ts:815-891`

**Interfaces:**
- Consumes: `Payment.receiptUrls: String[]` from Task 1
- Produces:
  - `POST /payments/:id/upload-receipt` accepts `receipts` field with up to 3 files, returns `Payment` with `receiptUrls: string[]`
  - `POST /appointments/:id/upload-receipt` accepts `receipts` field with up to 3 files, returns `{ urls: string[], appointment }`
  - Both endpoints append new URLs to existing `receiptUrls` array, capping at 3 total

- [ ] **Step 1: Update routes to use `multer.array`**

In `backend/src/routes/payments.routes.ts` line 21, change:
```typescript
// OLD:
router.post('/:id/upload-receipt', uploadLimiter, receiptUpload.single('receipt'), processUpload, uploadReceipt);
// NEW:
router.post('/:id/upload-receipt', uploadLimiter, receiptUpload.array('receipts', 3), processUpload, uploadReceipt);
```

In `backend/src/routes/appointments.routes.ts` line 34, change:
```typescript
// OLD:
router.post('/:id/upload-receipt', uploadLimiter, receiptUpload.single('receipt'), processUpload, uploadReceipt);
// NEW:
router.post('/:id/upload-receipt', uploadLimiter, receiptUpload.array('receipts', 3), processUpload, uploadReceipt);
```

- [ ] **Step 2: Update `payments.controller.ts` `uploadReceipt`**

Replace the `uploadReceipt` function (lines 423-464):

```typescript
export const uploadReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new AppError('No se subieron archivos', 400);
    }

    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { receiptUrls: true },
    });
    if (!existing) throw new AppError('Pago no encontrado', 404);

    const currentUrls = existing.receiptUrls || [];
    if (currentUrls.length + files.length > 3) {
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
      throw new AppError(`Solo se permiten 3 comprobantes. Ya tiene ${currentUrls.length}.`, 400);
    }

    const newUrls = files.map(f => `/uploads/${f.filename}`);

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        receiptUrls: { push: newUrls },
        receiptUrl: currentUrls.length === 0 ? newUrls[0] : undefined,
      },
      include: {
        patient: true,
        paymentOrder: true,
        appointment: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json(payment);
  } catch (error) {
    const files = req.files as Express.Multer.File[] | undefined;
    if (files) files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Error uploading receipt:', error);
      res.status(500).json({ error: 'Error al subir comprobante' });
    }
  }
};
```

- [ ] **Step 3: Update `appointments.controller.ts` `uploadReceipt`**

Replace the `uploadReceipt` function (lines 815-891):

```typescript
export const uploadReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const amount = req.body.amount ? parseFloat(req.body.amount) : 0;
    const paymentMethod = req.body.paymentMethod ?? 'cash';
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new AppError('No se subieron archivos', 400);
    }

    const receiptUrls = files.map(f => `/uploads/${f.filename}`);

    const appointment = await prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.findUnique({
        where: { id },
        select: { id: true, patientId: true },
      });
      if (!apt) throw new AppError('Cita no encontrada', 404);

      if (amount > 0) {
        const existing = await tx.payment.findFirst({
          where: { appointmentId: id, paymentType: 'reservation', voidedAt: null },
        });

        if (!existing) {
          await tx.payment.create({
            data: {
              patientId: apt.patientId,
              appointmentId: id,
              amountPaid: amount,
              paymentMethod,
              paymentType: 'reservation',
              receiptUrl: receiptUrls[0],
              receiptUrls,
              createdById: req.user!.id,
            },
          });

          await tx.patient.update({
            where: { id: apt.patientId },
            data: { accountBalance: { increment: amount } },
          });
        } else {
          const currentUrls = existing.receiptUrls || [];
          const mergedUrls = [...currentUrls, ...receiptUrls].slice(0, 3);
          await tx.payment.update({
            where: { id: existing.id },
            data: {
              receiptUrl: mergedUrls[0],
              receiptUrls: mergedUrls,
            },
          });
        }
      }

      return apt;
    });

    const fresh = await prisma.appointment.findUnique({
      where: { id },
      include: {
        payments: {
          where: { paymentType: 'reservation', voidedAt: null },
          select: { id: true, receiptUrl: true, receiptUrls: true, amountPaid: true, paymentMethod: true },
          take: 1,
        },
      },
    });

    res.json({ urls: receiptUrls, appointment: withReservationPayment(fresh ?? appointment) });
  } catch (error) {
    const files = req.files as Express.Multer.File[] | undefined;
    if (files) files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al subir comprobante' });
    }
  }
};
```

- [ ] **Step 4: Update `withReservationPayment` select to include `receiptUrls`**

In `backend/src/controllers/appointments.controller.ts`, find every `select` block that queries reservation payments (lines ~92, ~162, ~611, ~874) and add `receiptUrls: true` alongside `receiptUrl: true`:

```typescript
select: { id: true, receiptUrl: true, receiptUrls: true, amountPaid: true, paymentMethod: true },
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/payments.routes.ts backend/src/routes/appointments.routes.ts backend/src/controllers/payments.controller.ts backend/src/controllers/appointments.controller.ts
git commit -m "feat(api): accept up to 3 receipt files per payment upload"
```

---

### Task 3: Frontend Types and Services

**Files:**
- Modify: `frontend/src/types/index.ts:99`, `frontend/src/types/index.ts:173`, `frontend/src/types/index.ts:268`
- Modify: `frontend/src/services/payments.service.ts:48,60-70`
- Modify: `frontend/src/services/paymentOrders.service.ts:106-112`
- Modify: `frontend/src/services/appointments.service.ts:87-98`

**Interfaces:**
- Consumes: Updated backend endpoints from Task 2
- Produces:
  - `Payment.receiptUrls: string[]` type field
  - `ReservationPayment.receiptUrls: string[]` type field
  - `paymentsService.uploadReceipt(id, files: File[]): Promise<Payment>`
  - `paymentOrdersService.uploadReceipt(paymentId, files: File[]): Promise<void>`
  - `appointmentsService.uploadReceipt(id, files: File[], amount, paymentMethod): Promise<{ urls: string[], appointment }>`

- [ ] **Step 1: Update TypeScript types**

In `frontend/src/types/index.ts`:

At line 99, add `receiptUrls` below `receiptUrl`:
```typescript
  receiptUrl?: string;
  receiptUrls?: string[];
```

At line 173 (ReservationPayment), add `receiptUrls`:
```typescript
export interface ReservationPayment {
  id: string;
  receiptUrl: string | null;
  receiptUrls: string[];
  amountPaid: number;
  paymentMethod: string;
}
```

At line 268 (PaymentOrderPayment or similar), add `receiptUrls`:
```typescript
  receiptUrl?: string;
  receiptUrls?: string[];
```

- [ ] **Step 2: Update `paymentsService.uploadReceipt`**

In `frontend/src/services/payments.service.ts`, change `uploadReceipt` (line 60):

```typescript
  async uploadReceipt(paymentId: string, files: File[]): Promise<Payment> {
    const formData = new FormData();
    files.forEach(file => formData.append('receipts', file));

    const response = await api.post<Payment>(`/payments/${paymentId}/upload-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
```

Also update `updatePayment` signature at line 48 to accept `receiptUrls`:
```typescript
  async updatePayment(id: string, data: { notes?: string; receiptUrl?: string; receiptUrls?: string[] }): Promise<Payment> {
```

- [ ] **Step 3: Update `paymentOrdersService.uploadReceipt`**

In `frontend/src/services/paymentOrders.service.ts`, change `uploadReceipt` (line 106):

```typescript
  async uploadReceipt(paymentId: string, files: File[]): Promise<void> {
    const form = new FormData();
    files.forEach(file => form.append('receipts', file));
    await api.post(`/payments/${paymentId}/upload-receipt`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
```

- [ ] **Step 4: Update `appointmentsService.uploadReceipt`**

In `frontend/src/services/appointments.service.ts`, change `uploadReceipt` (line 87):

```typescript
  async uploadReceipt(id: string, files: File[], amount: number, paymentMethod: string = 'cash'): Promise<{ urls: string[]; appointment: Appointment }> {
    const formData = new FormData();
    files.forEach(file => formData.append('receipts', file));
    formData.append('amount', amount.toString());
    formData.append('paymentMethod', paymentMethod);
    const response = await api.post<{ urls: string[]; appointment: Appointment }>(`/appointments/${id}/upload-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/payments.service.ts frontend/src/services/paymentOrders.service.ts frontend/src/services/appointments.service.ts
git commit -m "feat(frontend): update types and services for multiple receipt files"
```

---

### Task 4: Update UploadReservationModal for Multiple Files

**Files:**
- Modify: `frontend/src/components/UploadReservationModal.tsx`

**Interfaces:**
- Consumes: nothing directly (props-based)
- Produces: `onSubmit(amount: number, files: File[], paymentMethod: string)` -- changed `file: File` to `files: File[]`

- [ ] **Step 1: Update state and props**

Change the `onSubmit` prop type and internal state from single file to array:

```typescript
interface UploadReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, files: File[], paymentMethod: string) => Promise<void>;
  maxAmount?: number;
  fixedAmount?: number;
}
```

Replace state:
```typescript
// OLD:
const [file, setFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
// NEW:
const [files, setFiles] = useState<File[]>([]);
const [previewUrls, setPreviewUrls] = useState<string[]>([]);
```

- [ ] **Step 2: Update file handling functions**

Replace `handleFileSelect` and `handleCameraCapture`:

```typescript
const MAX_FILES = 3;

const addFiles = (newFiles: File[]) => {
  const remaining = MAX_FILES - files.length;
  if (remaining <= 0) {
    setError(`Solo se permiten ${MAX_FILES} comprobantes`);
    return;
  }

  const toAdd = newFiles.slice(0, remaining);
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  for (const f of toAdd) {
    if (!validTypes.includes(f.type)) {
      setError('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Cada archivo no debe superar los 5MB');
      return;
    }
  }

  setError(null);
  setFiles(prev => [...prev, ...toAdd]);

  toAdd.forEach(f => {
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(f);
    } else {
      setPreviewUrls(prev => [...prev, '']);
    }
  });
};

const removeFile = (index: number) => {
  setFiles(prev => prev.filter((_, i) => i !== index));
  setPreviewUrls(prev => prev.filter((_, i) => i !== index));
};

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const selected = e.target.files;
  if (!selected || selected.length === 0) return;
  addFiles(Array.from(selected));
  if (fileInputRef.current) fileInputRef.current.value = '';
};

const handleCameraCapture = (capturedFile: File) => {
  setShowCamera(false);
  addFiles([capturedFile]);
};
```

- [ ] **Step 3: Update submit and close handlers**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const effectiveAmount = fixedAmount ?? parseFloat(amount);
  if (!fixedAmount && (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
    setError('Por favor ingrese un monto valido');
    return;
  }
  if (!paymentMethod) {
    setError('Por favor seleccione un metodo de pago');
    return;
  }
  if (files.length === 0) {
    setError('Por favor seleccione al menos un archivo');
    return;
  }
  if (!fixedAmount && maxAmount && parseFloat(amount) > maxAmount) {
    setError(`El monto no puede ser mayor a S/. ${maxAmount.toFixed(2)}`);
    return;
  }
  try {
    setIsSubmitting(true);
    setError(null);
    await onSubmit(effectiveAmount, files, paymentMethod);
    handleClose();
  } catch (err: any) {
    setError(err.response?.data?.error || err.response?.data?.message || 'Error al subir recibo');
  } finally {
    setIsSubmitting(false);
  }
};

const handleClose = () => {
  setAmount('');
  setPaymentMethod('');
  setFiles([]);
  setPreviewUrls([]);
  setError(null);
  setIsSubmitting(false);
  if (fileInputRef.current) fileInputRef.current.value = '';
  onClose();
};
```

- [ ] **Step 4: Update the JSX render**

Change the `<input>` to allow `multiple` and update the file area to show a grid of thumbnails with individual remove buttons, plus an "add more" button when under 3:

```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/jpg,image/png,application/pdf"
  onChange={handleFileSelect}
  className="file-input-hidden"
  disabled={isSubmitting}
  multiple
/>

{files.length === 0 ? (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', width: '100%' }}>
    <button type="button" onClick={() => fileInputRef.current?.click()}
      className="file-upload-button" disabled={isSubmitting}
      style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 6v14M16 6l-6 6M16 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 24h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <span className="upload-text">Subir archivos</span>
      <span className="upload-hint">JPG, PNG o PDF (max 3)</span>
    </button>
    <button type="button" onClick={() => setShowCamera(true)}
      className="file-upload-button" disabled={isSubmitting}
      style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
      </svg>
      <span className="upload-text">Tomar foto</span>
      <span className="upload-hint">Usar camara</span>
    </button>
  </div>
) : (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(files.length, 3)}, 1fr)`, gap: 'var(--spacing-sm)' }}>
      {files.map((f, idx) => (
        <div key={idx} className="file-preview" style={{ position: 'relative' }}>
          {previewUrls[idx] ? (
            <img src={previewUrls[idx]} alt={`Preview ${idx + 1}`} className="preview-image" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
          ) : (
            <div className="pdf-preview" style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
                <path d="M40 8H16a4 4 0 00-4 4v40a4 4 0 004 4h32a4 4 0 004-4V20L40 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M40 8v12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{ fontSize: 11, marginTop: 4 }}>{f.name}</p>
            </div>
          )}
          <button type="button" onClick={() => removeFile(idx)} disabled={isSubmitting}
            style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 'var(--radius-full)', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
    {files.length < MAX_FILES && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="file-upload-button" disabled={isSubmitting}
          style={{ padding: 'var(--spacing-sm)' }}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <path d="M16 6v14M16 6l-6 6M16 6l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 24h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span className="upload-text" style={{ fontSize: 12 }}>Agregar archivo</span>
        </button>
        <button type="button" onClick={() => setShowCamera(true)}
          className="file-upload-button" disabled={isSubmitting}
          style={{ padding: 'var(--spacing-sm)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span className="upload-text" style={{ fontSize: 12 }}>Tomar foto</span>
        </button>
      </div>
    )}
    <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 'var(--spacing-xs)', textAlign: 'center' }}>
      {files.length} de {MAX_FILES} comprobantes
    </p>
  </div>
)}
```

Update the submit button disabled condition:
```tsx
disabled={isSubmitting || files.length === 0 || (!fixedAmount && !amount)}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/UploadReservationModal.tsx
git commit -m "feat(frontend): UploadReservationModal supports up to 3 receipt files"
```

---

### Task 5: Update Callers of UploadReservationModal

**Files:**
- Modify: `frontend/src/pages/AppointmentFormPage.tsx:57-58,765,790-808`
- Modify: `frontend/src/pages/AppointmentDetailPage.tsx:182-201`
- Modify: `frontend/src/hooks/useAppointmentFormActions.ts:197-210`

**Interfaces:**
- Consumes: `UploadReservationModal.onSubmit(amount, files: File[], paymentMethod)` from Task 4
- Produces: Updated callers that pass `File[]` to service methods

- [ ] **Step 1: Update AppointmentDetailPage**

In `frontend/src/pages/AppointmentDetailPage.tsx`, change `handleUploadSubmit` (line 186):

```typescript
// OLD:
const handleUploadSubmit = async (amount: number, file: File, paymentMethod: string) => {
    if (!id) return;
    try {
      setError(null);
      setUploadSuccess(false);
      await appointmentsService.uploadReceipt(id, file, amount, paymentMethod);
// NEW:
const handleUploadSubmit = async (amount: number, files: File[], paymentMethod: string) => {
    if (!id) return;
    try {
      setError(null);
      setUploadSuccess(false);
      await appointmentsService.uploadReceipt(id, files, amount, paymentMethod);
```

Also update the receipt display section (around line 1043) to show multiple images from `receiptUrls`:

```typescript
// Where it shows reservation receipt, change to iterate receiptUrls
// Check appointment.reservationPayment?.receiptUrls?.length > 0 instead of receiptUrl
```

The receipt display block (lines ~1043-1079) should show all images in `receiptUrls` as a row of thumbnails instead of a single image. Open the image viewer with all URLs when clicked.

- [ ] **Step 2: Update AppointmentFormPage**

In `frontend/src/pages/AppointmentFormPage.tsx`:

Line 765 - change upload after create:
```typescript
// OLD:
await appointmentsService.uploadReceipt(createdAppointment.id, pendingReceiptFile, formData.reservationAmount || 0, formData.reservationPaymentMethod || 'cash');
// NEW:
await appointmentsService.uploadReceipt(createdAppointment.id, [pendingReceiptFile], formData.reservationAmount || 0, formData.reservationPaymentMethod || 'cash');
```

Line 790 - change handleUploadReceipt:
```typescript
// OLD:
const handleUploadReceipt = async (amount: number, file: File, paymentMethod: string) => {
    ...
    const result = await appointmentsService.uploadReceipt(id, file, amount, paymentMethod);
// NEW:
const handleUploadReceipt = async (amount: number, files: File[], paymentMethod: string) => {
    ...
    const result = await appointmentsService.uploadReceipt(id, files, amount, paymentMethod);
```

- [ ] **Step 3: Update useAppointmentFormActions hook**

In `frontend/src/hooks/useAppointmentFormActions.ts`, line 197:

```typescript
// OLD:
const handleUploadReceipt = async (amount: number, file: File) => {
    ...
    const result = await appointmentsService.uploadReceipt(id, file, amount);
// NEW:
const handleUploadReceipt = async (amount: number, files: File[]) => {
    ...
    const result = await appointmentsService.uploadReceipt(id, files, amount);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AppointmentDetailPage.tsx frontend/src/pages/AppointmentFormPage.tsx frontend/src/hooks/useAppointmentFormActions.ts
git commit -m "feat(frontend): update UploadReservationModal callers for multi-file"
```

---

### Task 6: Update RegisterPaymentModal and AddCreditModal

**Files:**
- Modify: `frontend/src/components/RegisterPaymentModal.tsx`
- Modify: `frontend/src/components/AddCreditModal.tsx`

**Interfaces:**
- Consumes: `paymentOrdersService.uploadReceipt(paymentId, files: File[])` from Task 3
- Produces: Modals that allow selecting up to 3 receipt files with preview grid

- [ ] **Step 1: Update RegisterPaymentModal state**

Change from single-file to array state in `frontend/src/components/RegisterPaymentModal.tsx`:

```typescript
// OLD (lines 43-44):
const [receiptFile, setReceiptFile] = useState<File | null>(null);
const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
// NEW:
const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
const [receiptPreviews, setReceiptPreviews] = useState<string[]>([]);
```

Update reset in `useEffect` (lines 64-65):
```typescript
setReceiptFiles([]);
setReceiptPreviews([]);
```

- [ ] **Step 2: Update RegisterPaymentModal file handling**

Replace `handleFileChange` (line 91):

```typescript
const MAX_RECEIPTS = 3;

const handleFileChange = (file: File | null) => {
  setFileError('');
  if (!file) return;
  if (receiptFiles.length >= MAX_RECEIPTS) {
    setFileError(`Solo se permiten ${MAX_RECEIPTS} comprobantes`);
    return;
  }
  const allowed = file.type.startsWith('image/') || file.type === 'application/pdf';
  if (!allowed) { setFileError('Solo se permiten imagenes (JPG, PNG, WebP) o PDF'); return; }
  if (file.size > MAX_FILE_SIZE) { setFileError('El archivo no debe superar los 5 MB'); return; }

  setReceiptFiles(prev => [...prev, file]);
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => setReceiptPreviews(prev => [...prev, e.target?.result as string]);
    reader.readAsDataURL(file);
  } else {
    setReceiptPreviews(prev => [...prev, '']);
  }
};

const removeReceiptFile = (index: number) => {
  setReceiptFiles(prev => prev.filter((_, i) => i !== index));
  setReceiptPreviews(prev => prev.filter((_, i) => i !== index));
};
```

- [ ] **Step 3: Update RegisterPaymentModal submit**

In `handleSubmit` (line 160-163):
```typescript
// OLD:
if (receiptFile && lastPaymentId) {
  setUploadStep('uploading');
  await paymentOrdersService.uploadReceipt(lastPaymentId, receiptFile);
}
// NEW:
if (receiptFiles.length > 0 && lastPaymentId) {
  setUploadStep('uploading');
  await paymentOrdersService.uploadReceipt(lastPaymentId, receiptFiles);
}
```

- [ ] **Step 4: Update RegisterPaymentModal JSX**

Replace the single-file preview/upload area (lines ~407-477) with a multi-file grid similar to Task 4's pattern. Show thumbnails with individual remove buttons, "add more" buttons when under 3 files. Update the `<input>` to not have `multiple` (since files are added one-at-a-time via the existing UX of gallery/camera).

Update lightbox to use all previews:
```typescript
// OLD:
{lightbox && receiptPreview && (
  <ImageViewer images={[receiptPreview]} alt="Comprobante" onClose={() => setLightbox(false)} />
)}
// NEW:
{lightbox !== false && receiptPreviews.length > 0 && (
  <ImageViewer images={receiptPreviews.filter(p => !!p)} alt="Comprobante" onClose={() => setLightbox(false)} />
)}
```

- [ ] **Step 5: Apply same pattern to AddCreditModal**

In `frontend/src/components/AddCreditModal.tsx`, apply the same changes:
- `receiptFile: File | null` -> `receiptFiles: File[]`
- `receiptPreview: string | null` -> `receiptPreviews: string[]`
- Update `handleFileChange` with `MAX_RECEIPTS = 3` and `addFile`/`removeFile` logic
- Update submit: `paymentOrdersService.uploadReceipt(paymentId, receiptFiles)`
- Update JSX to show grid of thumbnails with remove buttons

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/RegisterPaymentModal.tsx frontend/src/components/AddCreditModal.tsx
git commit -m "feat(frontend): RegisterPaymentModal and AddCreditModal support up to 3 receipts"
```

---

### Task 7: Update PaymentOrderDetailPage Receipt Display

**Files:**
- Modify: `frontend/src/pages/PaymentOrderDetailPage.tsx`

**Interfaces:**
- Consumes: `Payment.receiptUrls: string[]` from Task 3, `paymentsService.uploadReceipt(id, files: File[])` from Task 3
- Produces: Updated display showing multiple receipt thumbnails per payment, upload of additional receipts up to 3

- [ ] **Step 1: Update `handleUploadReceipt`**

Change from single file to array (line 73):

```typescript
const handleUploadReceipt = async (paymentId: string, file: File) => {
  try {
    setUploadingId(paymentId);
    await paymentsService.uploadReceipt(paymentId, [file]);
    if (paymentOrder) await load(paymentOrder.id);
  } catch (err: any) {
    setError(err.response?.data?.error || 'Error al subir el comprobante');
  } finally {
    setUploadingId(null);
  }
};
```

- [ ] **Step 2: Update receipt display per payment**

Replace the receipt display block (lines ~268-384) to use `receiptUrls` instead of `receiptUrl`:

- Check `payment.receiptUrls?.length > 0` instead of `payment.receiptUrl`
- Show thumbnails in a row (flex, gap) for each URL in `receiptUrls`
- Update lightbox to pass all receipt URLs: `setLightboxUrl(null)` -> change to `setLightboxUrls(payment.receiptUrls.map(getReceiptUrl).filter(Boolean))`
- Show "add more" button only if `(payment.receiptUrls?.length || 0) < 3`
- Keep the upload input for adding additional receipts

For the lightbox, update state:
```typescript
// OLD:
const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
// NEW:
const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
```

And the ImageViewer at the bottom:
```typescript
// OLD:
{lightboxUrl && (
  <ImageViewer images={[lightboxUrl]} alt="Comprobante" onClose={() => setLightboxUrl(null)} />
)}
// NEW:
{lightboxUrls.length > 0 && (
  <ImageViewer images={lightboxUrls} alt="Comprobante" onClose={() => setLightboxUrls([])} />
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PaymentOrderDetailPage.tsx
git commit -m "feat(frontend): PaymentOrderDetailPage displays and uploads multiple receipts"
```

---

### Task 8: Update AppointmentDetailPage Receipt Display

**Files:**
- Modify: `frontend/src/pages/AppointmentDetailPage.tsx:1040-1101`

**Interfaces:**
- Consumes: `ReservationPayment.receiptUrls: string[]` from Task 3
- Produces: Reservation receipt section showing up to 3 thumbnail images

- [ ] **Step 1: Update reservation receipt display**

In `frontend/src/pages/AppointmentDetailPage.tsx`, the receipt display block around lines 1043-1079 currently shows a single `appointment.reservationPayment?.receiptUrl`. Change to use `receiptUrls`:

```typescript
// OLD check (line 1043):
{appointment.reservationPayment?.receiptUrl && (() => {
  const receiptUrl = getReceiptUrl(appointment.reservationPayment!.receiptUrl) || '';
// NEW check:
{(appointment.reservationPayment?.receiptUrls?.length ?? 0) > 0 && (() => {
  const urls = appointment.reservationPayment!.receiptUrls
    .map(u => getReceiptUrl(u))
    .filter((u): u is string => !!u);
```

Show thumbnails in a flex row, click opens `ImageViewer` with all URLs.

Also update the "no receipt" upload button check (line 1081):
```typescript
// OLD:
{appointment.status === 'reserved' && !appointment.reservationPayment?.receiptUrl && (
// NEW:
{appointment.status === 'reserved' && !(appointment.reservationPayment?.receiptUrls?.length) && (
```

- [ ] **Step 2: Update the payment urgency check**

Line 478:
```typescript
// OLD:
!!appointment.reservationPayment?.receiptUrl,
// NEW:
(appointment.reservationPayment?.receiptUrls?.length ?? 0) > 0,
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AppointmentDetailPage.tsx
git commit -m "feat(frontend): AppointmentDetailPage shows multiple reservation receipts"
```
