import { useState, useEffect, useCallback } from 'react';
import {
  Banknote, Search, Filter, X, AlertTriangle,
  ChevronLeft, ChevronRight, Receipt, RefreshCw,
  CreditCard, Ban, Eye, EyeOff,
} from 'lucide-react';
import { paymentsService, PaymentsFilters } from '../services/payments.service';
import { Payment } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  yape: 'Yape',
  plin: 'Plin',
  account_credit: 'Saldo a favor',
};

const TYPE_LABELS: Record<string, string> = {
  payment_order_payment: 'Orden de pago',
  reservation: 'Reserva',
  service_payment: 'Servicio',
  account_credit: 'Saldo a favor',
  penalty: 'Penalidad',
  other: 'Otro',
};

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  cash:           { bg: 'var(--color-success-alpha-10)',  text: 'var(--color-success-dark)' },
  card:           { bg: 'var(--color-info-alpha-10)',     text: 'var(--color-info-dark)' },
  transfer:       { bg: 'var(--color-primary-alpha-10)', text: 'var(--color-primary-dark)' },
  yape:           { bg: 'rgba(99,67,195,0.1)',            text: '#6343C3' },
  plin:           { bg: 'rgba(0,179,103,0.1)',            text: '#00B367' },
  account_credit: { bg: 'var(--color-warning-alpha-10)', text: 'var(--color-warning-dark)' },
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  payment_order_payment: { bg: 'var(--color-primary-alpha-10)', text: 'var(--color-primary-dark)' },
  reservation:           { bg: 'var(--color-accent-alpha-10)',  text: 'var(--color-accent-dark)' },
  service_payment:       { bg: 'var(--color-info-alpha-10)',    text: 'var(--color-info-dark)' },
  account_credit:        { bg: 'var(--color-warning-alpha-10)', text: 'var(--color-warning-dark)' },
  penalty:               { bg: 'var(--color-error-alpha-10)',   text: 'var(--color-error-dark)' },
  other:                 { bg: 'var(--color-bg-tertiary)',      text: 'var(--color-text-secondary)' },
};

function formatCurrency(amount: number) {
  return `S/. ${Number(amount).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function Badge({ label, style }: { label: string; style: { bg: string; text: string } }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 'var(--radius-full)',
      fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
      background: style.bg, color: style.text,
    }}>
      {label}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PaymentsAdminPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showVoided, setShowVoided] = useState(false);

  // Void modal
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: PaymentsFilters = {
        page,
        limit: LIMIT,
        includeVoided: showVoided || undefined,
        paymentType: typeFilter || undefined,
      };

      const res = await paymentsService.getPayments(filters);
      let data = res.data ?? [];

      if (methodFilter) data = data.filter(p => p.paymentMethod === methodFilter);

      if (appliedSearch) {
        const q = appliedSearch.toLowerCase();
        data = data.filter(p => {
          const name = `${p.patient?.firstName ?? ''} ${p.patient?.lastName ?? ''}`.toLowerCase();
          const dni = p.patient?.dni?.toLowerCase() ?? '';
          return name.includes(q) || dni.includes(q);
        });
      }

      setPayments(data);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotal(res.pagination?.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, methodFilter, appliedSearch, showVoided]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => { setPage(1); setAppliedSearch(search); };
  const handleClearFilters = () => {
    setSearch(''); setAppliedSearch('');
    setMethodFilter(''); setTypeFilter('');
    setShowVoided(false); setPage(1);
  };

  const hasFilters = !!appliedSearch || !!methodFilter || !!typeFilter || showVoided;

  const openVoid = (p: Payment) => {
    setVoidTarget(p);
    setVoidReason('');
    setVoidError(null);
  };
  const closeVoid = () => { if (voidLoading) return; setVoidTarget(null); };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    setVoidLoading(true);
    setVoidError(null);
    try {
      await paymentsService.voidPayment(voidTarget.id, voidReason || undefined);
      setVoidTarget(null);
      load();
    } catch (e: any) {
      setVoidError(e?.response?.data?.error ?? 'Error al anular el pago');
    } finally {
      setVoidLoading(false);
    }
  };

  const activePayments = payments.filter(p => !p.voidedAt);
  const totalAmount    = activePayments.reduce((s, p) => s + Number(p.amountPaid), 0);
  const voidedCount    = payments.filter(p => !!p.voidedAt).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-xl)',
            background: 'var(--color-error-alpha-10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Banknote size={24} strokeWidth={1.75} color="var(--color-error)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              Anulación de Pagos
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Gestiona y anula pagos registrados · Solo administradores
            </p>
          </div>
        </div>
        <button
          onClick={load}
          style={btnOutline}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-primary)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
        >
          <RefreshCw size={15} strokeWidth={2} />
          Actualizar
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
        <SummaryCard icon={<Receipt size={20} strokeWidth={1.75} color="var(--color-primary)" />} iconBg="var(--color-primary-alpha-10)" label="Total en página" value={String(payments.length)} sub={`de ${total} registros`} />
        <SummaryCard icon={<Banknote size={20} strokeWidth={1.75} color="var(--color-success)" />} iconBg="var(--color-success-alpha-10)" label="Monto activo" value={formatCurrency(totalAmount)} sub="excluye anulados" />
        <SummaryCard icon={<CreditCard size={20} strokeWidth={1.75} color="var(--color-info)" />} iconBg="var(--color-info-alpha-10)" label="Métodos distintos" value={String(new Set(activePayments.map(p => p.paymentMethod)).size)} sub="en esta página" />
        <SummaryCard icon={<Ban size={20} strokeWidth={1.75} color="var(--color-error)" />} iconBg="var(--color-error-alpha-10)" label="Anulados en página" value={String(voidedCount)} sub={showVoided ? 'visibles' : 'ocultos'} valueColor={voidedCount > 0 ? 'var(--color-error)' : undefined} />
      </div>

      {/* ── Filters ── */}
      <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-lg)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={15} strokeWidth={2} color="var(--color-text-tertiary)" />
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>Filtros</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            {/* Toggle anulados */}
            <button
              onClick={() => { setShowVoided(v => !v); setPage(1); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                border: '1.5px solid',
                borderColor: showVoided ? 'var(--color-error)' : 'var(--color-border-primary)',
                background: showVoided ? 'var(--color-error-alpha-10)' : 'transparent',
                color: showVoided ? 'var(--color-error)' : 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
                cursor: 'pointer', transition: 'all var(--transition-fast)',
              }}
            >
              {showVoided ? <Eye size={12} strokeWidth={2.5} /> : <EyeOff size={12} strokeWidth={2.5} />}
              {showVoided ? 'Ocultando anulados' : 'Ver anulados'}
            </button>
            {hasFilters && (
              <button onClick={handleClearFilters} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--color-error-alpha-10)', border: 'none', color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', cursor: 'pointer' }}>
                <X size={12} strokeWidth={2.5} />
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 'var(--spacing-sm)', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Paciente</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} strokeWidth={2} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', pointerEvents: 'none' }} />
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Nombre o DNI..."
                style={{ ...inputStyle, paddingLeft: 36 }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border-primary)'}
              />
            </div>
          </div>
          <FilterSelect label="Método" value={methodFilter} onChange={v => { setMethodFilter(v); setPage(1); }} options={[
            { value: '', label: 'Todos' }, { value: 'cash', label: 'Efectivo' },
            { value: 'card', label: 'Tarjeta' }, { value: 'transfer', label: 'Transferencia' },
            { value: 'yape', label: 'Yape' }, { value: 'plin', label: 'Plin' },
            { value: 'account_credit', label: 'Saldo a favor' },
          ]} />
          <FilterSelect label="Tipo" value={typeFilter} onChange={v => { setTypeFilter(v); setPage(1); }} options={[
            { value: '', label: 'Todos' }, { value: 'payment_order_payment', label: 'Orden de pago' },
            { value: 'reservation', label: 'Reserva' }, { value: 'service_payment', label: 'Servicio' },
            { value: 'account_credit', label: 'Saldo a favor' }, { value: 'penalty', label: 'Penalidad' },
            { value: 'other', label: 'Otro' },
          ]} />
          <button
            onClick={handleSearch}
            style={{ height: 'var(--control-height)', paddingInline: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background var(--transition-fast)', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-dark)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
          >
            <Search size={14} strokeWidth={2.5} />
            Buscar
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderBottom: '1px solid var(--color-border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-secondary)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)' }}>
            {loading ? 'Cargando…' : `${total} pago${total !== 1 ? 's' : ''}`}
          </span>
          {showVoided && voidedCount > 0 && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)', fontWeight: 'var(--font-weight-semibold)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Ban size={12} strokeWidth={2.5} />
              {voidedCount} anulado{voidedCount !== 1 ? 's' : ''} incluido{voidedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {error && (
          <div style={{ margin: 'var(--spacing-lg)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', background: 'var(--color-error-alpha-10)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} strokeWidth={2} />{error}
          </div>
        )}

        {loading && (
          <div style={{ padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 52, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        )}

        {!loading && !error && payments.length === 0 && (
          <div style={{ padding: 'var(--spacing-3xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)', color: 'var(--color-text-tertiary)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-full)', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={24} strokeWidth={1.5} />
            </div>
            <p style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)' }}>No se encontraron pagos</p>
            {hasFilters && <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>Intenta con otros filtros</p>}
          </div>
        )}

        {!loading && payments.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '2px solid var(--color-border-secondary)' }}>
                  {['Fecha', 'Paciente', 'Monto', 'Método', 'Tipo', 'Orden de pago', 'Registrado por', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px var(--spacing-md)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <PaymentRow key={p.id} payment={p} striped={idx % 2 === 0} onVoid={() => openVoid(p)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderTop: '1px solid var(--color-border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-secondary)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Página {page} de {totalPages}</span>
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
              <PaginationBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} strokeWidth={2.5} /></PaginationBtn>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const n = totalPages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
                if (n > totalPages) return null;
                return <PaginationBtn key={n} active={n === page} onClick={() => setPage(n)}>{n}</PaginationBtn>;
              })}
              <PaginationBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} strokeWidth={2.5} /></PaginationBtn>
            </div>
          </div>
        )}
      </div>

      {/* ── Void Modal ── */}
      {voidTarget && (
        <div onClick={closeVoid} style={{ position: 'fixed', inset: 0, background: 'var(--color-bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 'var(--z-modal-backdrop)' as any, padding: 'var(--spacing-md)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-2xl)', border: '1px solid var(--color-border-secondary)', width: '100%', maxWidth: 460, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: 'var(--spacing-xl) var(--spacing-xl) var(--spacing-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-full)', background: 'var(--color-error-alpha-10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ban size={26} strokeWidth={1.75} color="var(--color-error)" />
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: 6 }}>
                  ¿Anular este pago?
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)' }}>
                  El pago quedará como <strong>anulado</strong> en el historial. El estado de la orden de pago asociada se recalculará excluyendo este monto.
                </div>
              </div>
            </div>

            {/* Payment details */}
            <div style={{ margin: '0 var(--spacing-xl)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <DetailRow label="Paciente" value={`${voidTarget.patient?.firstName ?? ''} ${voidTarget.patient?.lastName ?? ''}`.trim() || '—'} />
              <DetailRow label="Monto" value={formatCurrency(Number(voidTarget.amountPaid))} valueColor="var(--color-success-dark)" bold />
              <DetailRow label="Método" value={METHOD_LABELS[voidTarget.paymentMethod] ?? voidTarget.paymentMethod} />
              <DetailRow label="Tipo" value={TYPE_LABELS[voidTarget.paymentType] ?? voidTarget.paymentType} />
              <DetailRow label="Fecha" value={formatDate(voidTarget.paymentDate)} />
              {voidTarget.paymentOrderId && (
                <DetailRow label="Orden de pago" value={`#${voidTarget.paymentOrderId.slice(-8).toUpperCase()}`} valueColor="var(--color-primary)" />
              )}
              {voidTarget.notes && <DetailRow label="Notas" value={voidTarget.notes} />}
            </div>

            {/* Reason input */}
            <div style={{ margin: 'var(--spacing-md) var(--spacing-xl) 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Motivo de anulación <span style={{ color: 'var(--color-text-disabled)', fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
              <textarea
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Ej: Error en el monto, pago duplicado, etc."
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border-primary)',
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-sm)', resize: 'vertical', outline: 'none',
                  fontFamily: 'var(--font-family-base)',
                  transition: 'border-color var(--transition-fast)',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border-primary)'}
              />
            </div>

            {voidError && (
              <div style={{ margin: 'var(--spacing-sm) var(--spacing-xl) 0', padding: '10px var(--spacing-md)', borderRadius: 'var(--radius-md)', background: 'var(--color-error-alpha-10)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} strokeWidth={2} />{voidError}
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: 'var(--spacing-md) var(--spacing-xl) var(--spacing-xl)', display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button onClick={closeVoid} disabled={voidLoading} style={{ flex: 1, padding: '10px var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border-primary)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', cursor: 'pointer', opacity: voidLoading ? 0.6 : 1 }}
                onMouseEnter={e => { if (!voidLoading) e.currentTarget.style.background = 'var(--color-bg-tertiary)'; }}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
              >
                Cancelar
              </button>
              <button onClick={confirmVoid} disabled={voidLoading} style={{ flex: 1, padding: '10px var(--spacing-md)', borderRadius: 'var(--radius-md)', border: 'none', background: voidLoading ? 'var(--color-error-light)' : 'var(--color-error)', color: '#fff', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', cursor: voidLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onMouseEnter={e => { if (!voidLoading) e.currentTarget.style.background = 'var(--color-error-dark)'; }}
                onMouseLeave={e => { if (!voidLoading) e.currentTarget.style.background = 'var(--color-error)'; }}
              >
                {voidLoading
                  ? <><RefreshCw size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />Anulando…</>
                  : <><Ban size={14} strokeWidth={2} />Confirmar anulación</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const btnOutline: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px var(--spacing-md)', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border-primary)',
  background: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
  cursor: 'pointer', transition: 'all var(--transition-fast)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
  letterSpacing: '0.05em', whiteSpace: 'nowrap',
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  paddingInline: 12, height: 'var(--control-height)',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border-primary)',
  background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-sm)', outline: 'none',
  transition: 'border-color var(--transition-fast)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ icon, iconBg, label, value, sub, valueColor }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string; sub: string; valueColor?: string;
}) {
  return (
    <div
      style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-lg)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', transition: 'box-shadow var(--transition-base)' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
    >
      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ margin: '4px 0 2px', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: valueColor ?? 'var(--color-text-primary)', lineHeight: 1 }}>{value}</p>
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{sub}</p>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ height: 'var(--control-height)', paddingInline: 12, borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border-primary)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', outline: 'none', cursor: 'pointer' }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border-primary)'}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function PaymentRow({ payment: p, striped, onVoid }: { payment: Payment; striped: boolean; onVoid: () => void }) {
  const isVoided    = !!p.voidedAt;
  const patientName = `${p.patient?.firstName ?? ''} ${p.patient?.lastName ?? ''}`.trim() || '—';
  const createdBy   = `${p.createdBy?.firstName ?? ''} ${p.createdBy?.lastName ?? ''}`.trim() || '—';

  const rowBg = isVoided
    ? 'var(--color-bg-secondary)'
    : striped ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)';

  const textStyle: React.CSSProperties = isVoided
    ? { textDecoration: 'line-through', opacity: 0.5 }
    : {};

  return (
    <tr
      style={{ background: rowBg, borderBottom: '1px solid var(--color-border-secondary)', transition: 'background var(--transition-fast)' }}
      onMouseEnter={e => { if (!isVoided) e.currentTarget.style.background = 'var(--color-bg-tertiary)'; }}
      onMouseLeave={e => e.currentTarget.style.background = rowBg}
    >
      <td style={{ padding: '12px var(--spacing-md)', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family-mono)', ...textStyle }}>
        {formatDate(p.paymentDate)}
      </td>
      <td style={{ padding: '12px var(--spacing-md)', minWidth: 160 }}>
        <div style={{ fontWeight: 'var(--font-weight-semibold)', color: isVoided ? 'var(--color-text-disabled)' : 'var(--color-text-primary)', lineHeight: 1.3, textDecoration: isVoided ? 'line-through' : undefined }}>
          {patientName}
        </div>
        {p.patient?.dni && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>DNI {p.patient.dni}</div>}
      </td>
      <td style={{ padding: '12px var(--spacing-md)', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: isVoided ? 'var(--color-text-disabled)' : 'var(--color-success-dark)', fontFamily: 'var(--font-family-mono)', textDecoration: isVoided ? 'line-through' : undefined }}>
          {formatCurrency(Number(p.amountPaid))}
        </span>
      </td>
      <td style={{ padding: '12px var(--spacing-md)', ...textStyle }}>
        <Badge label={METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod} style={isVoided ? { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-disabled)' } : (METHOD_COLORS[p.paymentMethod] ?? { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-secondary)' })} />
      </td>
      <td style={{ padding: '12px var(--spacing-md)' }}>
        <Badge label={TYPE_LABELS[p.paymentType] ?? p.paymentType} style={isVoided ? { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-disabled)' } : (TYPE_COLORS[p.paymentType] ?? { bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-secondary)' })} />
      </td>
      <td style={{ padding: '12px var(--spacing-md)', fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-tertiary)', ...textStyle }}>
        {p.paymentOrderId ? `#${p.paymentOrderId.slice(-8).toUpperCase()}` : '—'}
      </td>
      <td style={{ padding: '12px var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', ...textStyle }}>
        {createdBy}
      </td>
      <td style={{ padding: '12px var(--spacing-md)' }}>
        {isVoided ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Badge label="Anulado" style={{ bg: 'var(--color-error-alpha-10)', text: 'var(--color-error)' }} />
            {p.voidReason && (
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={p.voidReason}>
                {p.voidReason}
              </span>
            )}
          </div>
        ) : (
          <Badge label="Activo" style={{ bg: 'var(--color-success-alpha-10)', text: 'var(--color-success-dark)' }} />
        )}
      </td>
      <td style={{ padding: '12px var(--spacing-md)' }}>
        {isVoided ? (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)' }}>—</span>
        ) : (
          <button
            onClick={onVoid}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-error)', background: 'var(--color-error-alpha-10)', color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all var(--transition-fast)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-error)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-error-alpha-10)'; e.currentTarget.style.color = 'var(--color-error)'; }}
          >
            <Ban size={12} strokeWidth={2.5} />
            Anular
          </button>
        )}
      </td>
    </tr>
  );
}

function DetailRow({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 'var(--font-size-sm)', color: valueColor ?? 'var(--color-text-primary)', fontWeight: bold ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function PaginationBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: active ? 'none' : '1.5px solid var(--color-border-primary)', background: active ? 'var(--color-primary)' : 'var(--color-bg-primary)', color: active ? '#fff' : disabled ? 'var(--color-text-disabled)' : 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  );
}
