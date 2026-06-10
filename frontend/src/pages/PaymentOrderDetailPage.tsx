import React, { useState, useEffect } from 'react';
import { ImageViewer } from '../components/ImageViewer';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentOrdersService } from '../services/paymentOrders.service';
import { paymentsService } from '../services/payments.service';
import { creditsService } from '../services/credits.service';
import { PaymentOrder, PaymentOrderStatus } from '../types';
import { formatDate } from '../utils/dateUtils';
import { Loading } from '../components/Loading';
import { Button } from '../components/Button';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { CameraCapture } from '../components/CameraCapture';
import '../styles/patient-payment-orders.css';

const getReceiptUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // URL relativa (ej. /uploads/...) — el proxy de Vite la enruta al backend
  return url;
};

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', yape: 'Yape', plin: 'Plin',
};
const METHOD_ICON: Record<string, string> = {
  cash: '💵', card: '💳', transfer: '🏦', yape: '📲', plin: '📱',
};

const StatusBadge: React.FC<{ status: PaymentOrderStatus }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    paid:      { label: 'Pagada',       cls: 'payment-order-status-paid' },
    partial:   { label: 'Pago Parcial', cls: 'payment-order-status-partial' },
    pending:   { label: 'Pendiente',    cls: 'payment-order-status-pending' },
    cancelled: { label: 'Cancelada',    cls: 'payment-order-status-cancelled' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'payment-order-status-pending' };
  return <span className={`payment-order-status-badge ${cls}`}>{label}</span>;
};

export const PaymentOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [cameraPaymentId, setCameraPaymentId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [patientBalance, setPatientBalance] = useState(0);

  useEffect(() => { if (id) load(id); }, [id]);

  const load = async (paymentOrderId: string) => {
    try {
      setLoading(true);
      setError(null);
      const po = await paymentOrdersService.getPaymentOrderById(paymentOrderId);
      setPaymentOrder(po);
      if (po.patientId) {
        creditsService.getCreditHistory(po.patientId)
          .then(d => setPatientBalance(d.accountBalance))
          .catch(() => {});
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar la orden de pago');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadReceipt = async (paymentId: string, file: File) => {
    try {
      setUploadingId(paymentId);
      await paymentsService.uploadReceipt(paymentId, file);
      if (paymentOrder) await load(paymentOrder.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al subir el comprobante');
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) return <Loading text="Cargando orden de pago..." />;

  if (error || !paymentOrder) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error || 'Orden de pago no encontrada'}</div>
        <Button onClick={() => navigate(-1)} variant="secondary">Volver</Button>
      </div>
    );
  }

  const totalPaid = paymentOrder.payments?.reduce((s, p) => s + Number(p.amountPaid), 0) || 0;
  const balance   = Number(paymentOrder.totalAmount) - totalPaid;
  const pct       = Number(paymentOrder.totalAmount) > 0 ? Math.min((totalPaid / Number(paymentOrder.totalAmount)) * 100, 100) : 0;

  return (
    <div className="page-container" style={{ maxWidth: 760 }}>

      {/* ── Back ── */}
      <button className="pd-back" onClick={() => navigate(-1)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Volver a Órdenes de Pago
      </button>

      {/* ── Header ── */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', margin: 0 }}>
            Orden de Pago #{paymentOrder.id.slice(0, 8).toUpperCase()}
          </h1>
          <StatusBadge status={paymentOrder.status} />
        </div>
        {paymentOrder.patient && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            {paymentOrder.patient.firstName} {paymentOrder.patient.lastName}
            {paymentOrder.patient.dni && ` · DNI ${paymentOrder.patient.dni}`}
          </p>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}

      {/* ── Resumen de importes ── */}
      <div className="payment-orders-summary" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 'var(--spacing-xl)' }}>
        <div className="summary-card summary-card-total">
          <div className="summary-label">Total de Órdenes de Pago</div>
          <div className="summary-amount">S/. {Number(paymentOrder.totalAmount).toFixed(2)}</div>
          <div className="summary-subtitle">
            {paymentOrder.orders?.length || 0} {(paymentOrder.orders?.length || 0) === 1 ? 'orden' : 'órdenes'}
          </div>
        </div>
        <div className="summary-card summary-card-paid">
          <div className="summary-label">Total Pagado</div>
          <div className="summary-amount">S/. {totalPaid.toFixed(2)}</div>
          <div className="summary-subtitle">{pct.toFixed(0)}% completado</div>
        </div>
        <div className="summary-card summary-card-pending">
          <div className="summary-label">{balance > 0 ? 'Saldo Pendiente' : 'Sin Deuda'}</div>
          <div className="summary-amount">S/. {balance.toFixed(2)}</div>
          <div className="summary-subtitle">
            {paymentOrder.dueDate ? `Vence: ${formatDate(paymentOrder.dueDate)}` : 'Sin vencimiento'}
          </div>
        </div>
      </div>

      {/* Barra de progreso global */}
      <div className="payment-progress" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="payment-progress-header">
          <span>Progreso de pago</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
        <div className="payment-progress-bar">
          <div
            className={`payment-progress-fill ${paymentOrder.status === 'paid' ? 'payment-progress-fill-paid' : 'payment-progress-fill-partial'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Información de la orden de pago ── */}
      <div className="glass-card">
        <div className="card-header">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="card-icon">
            <path d="M4 4h12v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="2"/>
            <path d="M4 8h12M8 4v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h2>Información de la Orden de Pago</h2>
        </div>
        <div className="pd-info-list">
          <div className="pd-info-row">
            <span className="pd-info-label">Emisión</span>
            <span className="pd-info-value">{formatDate(paymentOrder.createdAt)}</span>
          </div>
          {paymentOrder.dueDate && (
            <div className="pd-info-row">
              <span className="pd-info-label">Vencimiento</span>
              <span className="pd-info-value">{formatDate(paymentOrder.dueDate)}</span>
            </div>
          )}
          <div className="pd-info-row">
            <span className="pd-info-label">Estado</span>
            <span className="pd-info-value"><StatusBadge status={paymentOrder.status} /></span>
          </div>
        </div>
      </div>

      {/* ── Órdenes incluidas ── */}
      <div className="glass-card">
        <div className="card-header">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="card-icon">
            <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <h2>Órdenes Incluidas ({paymentOrder.orders?.length || 0})</h2>
        </div>

        {paymentOrder.orders && paymentOrder.orders.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {paymentOrder.orders.map(order => (
              <div key={order.id} className="cinv-order" style={{ cursor: 'default' }}>
                <div style={{ flex: 1 }}>
                  <div className="cinv-order__name">{order.service?.name || 'Servicio'}</div>
                  <div className="cinv-order__meta">
                    {order.totalSessions} {order.totalSessions === 1 ? 'sesión' : 'sesiones'} · {order.completedSessions} completadas
                  </div>
                </div>
                <div className="cinv-order__price">S/. {Number(order.finalPrice).toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="pd-info-empty">No hay órdenes asociadas a esta orden de pago</p>
        )}
      </div>

      {/* ── Pagos registrados ── */}
      <div className="glass-card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="card-icon">
              <rect x="1" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M1 8h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h2>Pagos Registrados ({paymentOrder.payments?.length || 0})</h2>
          </div>
          {balance > 0 && paymentOrder.status !== 'cancelled' && (
            <Button variant="primary" size="small" onClick={() => setShowPaymentModal(true)}>
              + Registrar Pago
            </Button>
          )}
        </div>

        {paymentOrder.payments && paymentOrder.payments.length > 0 ? (
          <div className="adet-notes-list">
            {paymentOrder.payments.map(payment => (
              <div key={payment.id} className="adet-note-item" style={{ borderLeftColor: 'var(--color-success)' }}>
                <div className="adet-note-item__header">
                  <div>
                    <span className="adet-note-item__author">
                      {METHOD_ICON[payment.paymentMethod]} {METHOD_LABEL[payment.paymentMethod] || payment.paymentMethod}
                    </span>
                    {payment.createdBy && (
                      <span className="adet-note-item__role"> · {payment.createdBy.firstName} {payment.createdBy.lastName}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-success-dark)' }}>
                    +S/. {Number(payment.amountPaid).toFixed(2)}
                  </span>
                </div>

                <p className="adet-note-item__text" style={{ color: 'var(--color-text-tertiary)', marginBottom: payment.notes ? 'var(--spacing-xs)' : 0 }}>
                  {formatDate(payment.paymentDate)}
                </p>

                {payment.notes && (
                  <p className="adet-note-item__text" style={{ fontStyle: 'italic' }}>
                    {payment.notes}
                  </p>
                )}

                {/* Comprobante — ocultar solo si es account_credit sin foto */}
                {(payment.paymentMethod !== 'account_credit' || !!payment.receiptUrl) && (
                <div style={{ marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border-secondary)' }}>
                  {/* Input oculto para cambiar comprobante existente */}
                  <input type="file" id={`rcpt-${payment.id}`} accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadReceipt(payment.id, f); }} />

                  {payment.receiptUrl ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                        <div className="pd-info-label">Comprobante</div>
                        {payment.paymentMethod !== 'account_credit' && <div style={{ display: 'flex', gap: 6 }}>
                          {/* Cambiar comprobante */}
                          <label htmlFor={`rcpt-${payment.id}`}
                            title="Cambiar comprobante"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 8px', borderRadius: 'var(--radius-md)',
                              background: 'var(--color-bg-secondary)',
                              border: '1.5px solid var(--color-border-primary)',
                              color: 'var(--color-text-secondary)',
                              fontSize: 11, fontWeight: 600,
                              cursor: uploadingId === payment.id ? 'wait' : 'pointer',
                              opacity: uploadingId === payment.id ? 0.6 : 1,
                              fontFamily: 'inherit',
                            }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            {uploadingId === payment.id ? 'Subiendo…' : 'Cambiar'}
                          </label>
                          {/* Tomar foto nueva */}
                          <button type="button"
                            disabled={!!uploadingId}
                            onClick={() => setCameraPaymentId(payment.id)}
                            title="Tomar nueva foto"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 8px', borderRadius: 'var(--radius-md)',
                              background: 'var(--color-bg-secondary)',
                              border: '1.5px solid var(--color-border-primary)',
                              color: 'var(--color-text-secondary)',
                              fontSize: 11, fontWeight: 600,
                              cursor: uploadingId ? 'wait' : 'pointer',
                              opacity: uploadingId ? 0.6 : 1,
                              fontFamily: 'inherit',
                            }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                            Foto
                          </button>
                        </div>}
                      </div>
                      {/* Thumbnail clickeable → lightbox */}
                      <button type="button"
                        onClick={() => setLightboxUrl(getReceiptUrl(payment.receiptUrl))}
                        style={{
                          padding: 0, border: '2px solid var(--color-border-secondary)',
                          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                          maxWidth: 200, cursor: 'zoom-in', background: 'none',
                          display: 'block', transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border-secondary)')}>
                        <img src={getReceiptUrl(payment.receiptUrl) || ''} alt="Comprobante"
                          style={{ width: '100%', display: 'block', maxHeight: 120, objectFit: 'cover' }} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                      {/* Subir desde galería (usa el input oculto de arriba) */}
                      <label htmlFor={`rcpt-${payment.id}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px', borderRadius: 'var(--radius-md)',
                          background: 'var(--color-bg-secondary)',
                          border: '1.5px solid var(--color-border-primary)',
                          color: 'var(--color-text-secondary)',
                          fontSize: 'var(--font-size-xs)', fontWeight: 600,
                          cursor: uploadingId === payment.id ? 'wait' : 'pointer',
                          opacity: uploadingId === payment.id ? 0.6 : 1,
                          fontFamily: 'inherit',
                        }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M12.25 8.75v2.333A1.167 1.167 0 0111.083 12.25H2.917A1.167 1.167 0 011.75 11.083V8.75M9.917 4.667L7 1.75m0 0L4.083 4.667M7 1.75v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {uploadingId === payment.id ? 'Subiendo...' : 'Subir archivo'}
                      </label>

                      {/* Tomar foto con cámara */}
                      <button type="button"
                        disabled={!!uploadingId}
                        onClick={() => setCameraPaymentId(payment.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px', borderRadius: 'var(--radius-md)',
                          background: 'var(--color-bg-secondary)',
                          border: '1.5px solid var(--color-border-primary)',
                          color: 'var(--color-text-secondary)',
                          fontSize: 'var(--font-size-xs)', fontWeight: 600,
                          cursor: uploadingId ? 'wait' : 'pointer',
                          opacity: uploadingId ? 0.6 : 1,
                          fontFamily: 'inherit',
                        }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Tomar foto
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="adet-notes-empty">No hay pagos registrados para esta orden de pago</p>
        )}
      </div>

      {/* ── Modal de pago ── */}
      {paymentOrder.patient && (
        <RegisterPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          paymentOrder={paymentOrder}
          patientId={paymentOrder.patientId}
          patientBalance={patientBalance}
          onSuccess={() => {
            setShowPaymentModal(false);
            if (id) load(id);
            creditsService.getCreditHistory(paymentOrder.patientId)
              .then(d => setPatientBalance(d.accountBalance))
              .catch(() => {});
          }}
        />
      )}

      {/* ── Cámara para comprobante de pago existente ── */}
      {!!cameraPaymentId && (
        <CameraCapture
          onClose={() => setCameraPaymentId(null)}
          onCapture={async file => {
            if (cameraPaymentId) await handleUploadReceipt(cameraPaymentId, file);
            setCameraPaymentId(null);
          }}
        />
      )}

      {lightboxUrl && (
        <ImageViewer images={[lightboxUrl]} alt="Comprobante" onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
};

export default PaymentOrderDetailPage;
