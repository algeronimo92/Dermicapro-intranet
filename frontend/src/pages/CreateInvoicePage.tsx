import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoicesService } from '../services/invoices.service';
import { patientsService } from '../services/patients.service';
import { Order, Patient } from '../types';
import { Loading } from '../components/Loading';
import { Button } from '../components/Button';
import '../styles/patient-invoices.css';

const CreateInvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [uninvoicedOrders, setUninvoicedOrders] = useState<Order[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const [patientData, ordersData] = await Promise.all([
          patientsService.getPatient(id),
          invoicesService.getUninvoicedOrders(id),
        ]);
        setPatient(patientData);
        setUninvoicedOrders(ordersData);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

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
    .reduce((sum, o) => sum + Number(o.finalPrice), 0);

  const handleCreate = async () => {
    if (!id || selectedIds.length === 0) return;
    try {
      setCreating(true);
      setError(null);
      await invoicesService.createInvoice({ serviceInstanceIds: selectedIds, patientId: id });
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

  if (!patient) {
    return (
      <div className="page-container">
        <p style={{ color: 'var(--color-text-tertiary)' }}>Paciente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>

      {/* ── Back ── */}
      <button className="invoices-back-button" onClick={goBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Volver a Facturas
      </button>

      {/* ── Header con avatar ── */}
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
                  background: 'transparent',
                  border: '1.5px solid var(--color-border-primary)',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.borderColor = 'var(--color-primary)';
                  (e.target as HTMLElement).style.color = 'var(--color-primary)';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.borderColor = 'var(--color-border-primary)';
                  (e.target as HTMLElement).style.color = 'var(--color-text-secondary)';
                }}
              >
                {selectedIds.length === uninvoicedOrders.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {uninvoicedOrders.map(order => {
                const isSelected = selectedIds.includes(order.id);
                return (
                  <div
                    key={order.id}
                    className={`cinv-order${isSelected ? ' cinv-order--selected' : ''}`}
                    onClick={() => toggleOrder(order.id)}
                  >
                    <input
                      type="checkbox"
                      className="cinv-order__checkbox"
                      checked={isSelected}
                      readOnly
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cinv-order__name">{order.service?.name || 'Servicio'}</div>
                      <div className="cinv-order__meta">
                        {order.totalSessions} {order.totalSessions === 1 ? 'sesión' : 'sesiones'} · {order.completedSessions} completadas
                      </div>
                    </div>
                    <div className="cinv-order__price">S/. {Number(order.finalPrice).toFixed(2)}</div>
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
