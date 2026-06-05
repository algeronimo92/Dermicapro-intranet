import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoicesService } from '../services/invoices.service';
import { patientsService } from '../services/patients.service';
import { Order, Patient } from '../types';
import { Loading } from '../components/Loading';
import { Button } from '../components/Button';
import '../styles/patient-invoices.css';

const CreateInvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();

  const [patient, setPatient]             = useState<Patient | null>(null);
  const [uninvoicedOrders, setOrders]     = useState<Order[]>([]);
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);
  const [editedPrices, setEditedPrices]   = useState<Record<string, string>>({});
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [creating, setCreating]           = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [patientData, ordersData] = await Promise.all([
          patientsService.getPatient(id),
          invoicesService.getUninvoicedOrders(id),
        ]);
        setPatient(patientData);
        setOrders(ordersData);
        setSelectedIds(ordersData.map(o => o.id)); // seleccionar todo por defecto
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  const getPrice = (order: Order) =>
    editedPrices[order.id] !== undefined
      ? parseFloat(editedPrices[order.id]) || 0
      : Number(order.finalPrice);

  const toggleOrder = (orderId: string) =>
    setSelectedIds(prev =>
      prev.includes(orderId) ? prev.filter(x => x !== orderId) : [...prev, orderId]
    );

  const toggleAll = () =>
    setSelectedIds(
      selectedIds.length === uninvoicedOrders.length ? [] : uninvoicedOrders.map(o => o.id)
    );

  const total = uninvoicedOrders
    .filter(o => selectedIds.includes(o.id))
    .reduce((sum, o) => sum + getPrice(o), 0);

  const handlePriceEdit = (orderId: string, val: string) =>
    setEditedPrices(prev => ({ ...prev, [orderId]: val }));

  const commitPrice = (order: Order) => {
    const raw = editedPrices[order.id];
    if (raw === undefined) return;
    const num = parseFloat(raw);
    if (isNaN(num) || num < 0) {
      // Revertir al precio original
      setEditedPrices(prev => { const next = { ...prev }; delete next[order.id]; return next; });
    } else {
      setEditedPrices(prev => ({ ...prev, [order.id]: num.toFixed(2) }));
    }
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!id || selectedIds.length === 0) return;
    try {
      setCreating(true);
      setError(null);

      // Solo enviar overrides donde el precio cambió
      const priceOverrides = selectedIds
        .filter(oid => {
          const order = uninvoicedOrders.find(o => o.id === oid);
          if (!order) return false;
          const edited = editedPrices[oid];
          if (edited === undefined) return false;
          return parseFloat(edited) !== Number(order.finalPrice);
        })
        .map(oid => ({ id: oid, finalPrice: parseFloat(editedPrices[oid]) }));

      await invoicesService.createInvoice({
        serviceInstanceIds: selectedIds,
        patientId: id,
        priceOverrides: priceOverrides.length > 0 ? priceOverrides : undefined,
      });
      navigate(`/patients/${id}/invoices`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear la factura');
    } finally {
      setCreating(false);
    }
  };

  const goBack = () => navigate(`/patients/${id}/invoices`);

  if (loading) return <Loading text="Cargando servicios sin facturar..." />;

  if (error && !patient) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
        <Button onClick={goBack} variant="secondary">Volver a Facturas</Button>
      </div>
    );
  }

  if (!patient) return <div className="page-container"><p>Paciente no encontrado</p></div>;

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>

      <button className="invoices-back-button" onClick={goBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Volver a Facturas
      </button>

      <div className="invoices-patient-strip" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="invoices-patient-avatar">
          {patient.photoUrl
            ? <img src={patient.photoUrl} alt={`${patient.firstName} ${patient.lastName}`} />
            : `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
            Generar Factura
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            {patient.firstName} {patient.lastName} · DNI: {patient.dni}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-lg)' }}>{error}</div>}

      {uninvoicedOrders.length === 0 ? (
        <div className="pd-empty" style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-2xl)' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="6" width="32" height="36" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
            <path d="M14 16h20M14 22h20M14 28h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p>No hay servicios sin facturar para este paciente</p>
          <Button onClick={goBack} variant="secondary">Volver a Facturas</Button>
        </div>
      ) : (
        <>
          {/* ── Selección de órdenes ── */}
          <div className="glass-card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="card-icon">
                  <rect x="2" y="3" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M2 8h16M6 1v4M14 1v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <h2>Servicios sin facturar ({uninvoicedOrders.length})</h2>
              </div>
              <button
                onClick={toggleAll}
                style={{
                  background: 'transparent', border: '1.5px solid var(--color-border-primary)',
                  padding: '5px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-secondary)', fontFamily: 'inherit',
                }}
              >
                {selectedIds.length === uninvoicedOrders.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
            </div>

            {/* Hint de edición */}
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', margin: '0 0 var(--spacing-md)', padding: '0 var(--spacing-lg)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ display: 'inline', marginRight: 4 }}>
                <path d="M11 2.5a1.77 1.77 0 112.5 2.5L4 14.5l-3 .5.5-3L11 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Haz clic en el precio para ajustarlo antes de generar la factura
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {uninvoicedOrders.map(order => {
                const isSelected  = selectedIds.includes(order.id);
                const isEditing   = editingId === order.id;
                const currentPx   = getPrice(order);
                const originalPx  = Number(order.finalPrice);
                const hasDiscount = editedPrices[order.id] !== undefined && currentPx !== originalPx;
                const discountPct = originalPx > 0 ? Math.round((1 - currentPx / originalPx) * 100) : 0;

                return (
                  <div
                    key={order.id}
                    className={`cinv-order${isSelected ? ' cinv-order--selected' : ''}`}
                    onClick={e => {
                      // No togglear si hicieron clic en el precio (input area)
                      const target = e.target as HTMLElement;
                      if (target.closest('.cinv-price-edit')) return;
                      toggleOrder(order.id);
                    }}
                  >
                    <input type="checkbox" className="cinv-order__checkbox" checked={isSelected} readOnly />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cinv-order__name">{order.service?.name || 'Servicio'}</div>
                      <div className="cinv-order__meta">
                        {order.totalSessions} {order.totalSessions === 1 ? 'sesión' : 'sesiones'} · {order.completedSessions} completadas
                      </div>
                    </div>

                    {/* ── Precio editable ── */}
                    <div className="cinv-price-edit" onClick={e => e.stopPropagation()}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>S/.</span>
                          <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            min="0"
                            value={editedPrices[order.id] ?? originalPx.toFixed(2)}
                            onChange={e => handlePriceEdit(order.id, e.target.value)}
                            onBlur={() => commitPrice(order)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitPrice(order);
                              if (e.key === 'Escape') { setEditedPrices(prev => { const n = { ...prev }; delete n[order.id]; return n; }); setEditingId(null); }
                            }}
                            style={{
                              width: 90, padding: '4px 8px', textAlign: 'right',
                              border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-md)',
                              background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                              fontSize: 'var(--font-size-sm)', fontWeight: 700, fontFamily: 'inherit',
                              outline: 'none',
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingId(order.id)}
                          title="Editar precio"
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                            borderRadius: 'var(--radius-md)',
                            transition: 'background var(--transition-fast)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-alpha-10)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: hasDiscount ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                            S/. {currentPx.toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textDecoration: 'line-through' }}>
                              S/. {originalPx.toFixed(2)}
                            </span>
                          )}
                          {hasDiscount && discountPct > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success-dark)', background: 'var(--color-success-alpha-10)', padding: '1px 5px', borderRadius: 'var(--radius-full)' }}>
                              −{discountPct}%
                            </span>
                          )}
                        </button>
                      )}
                      {/* Icono lápiz */}
                      {!isEditing && (
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                          <path d="M11 2.5a1.77 1.77 0 112.5 2.5L4 14.5l-3 .5.5-3L11 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Resumen y acción ── */}
          <div className="glass-card">
            <div className="cinv-summary">
              <div>
                <div className="cinv-summary__count">
                  {selectedIds.length} {selectedIds.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}
                </div>
                <div className="cinv-summary__total">
                  Total: S/. {total.toFixed(2)}
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={selectedIds.length === 0 || creating}
                variant="primary"
                size="large"
                isLoading={creating}
              >
                Generar Factura
              </Button>
            </div>
            {selectedIds.length === 0 && (
              <p className="cinv-summary__hint">Selecciona al menos un servicio para generar la factura</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CreateInvoicePage;
