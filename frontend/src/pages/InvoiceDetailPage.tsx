import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoicesService } from '../services/invoices.service';
import { paymentsService } from '../services/payments.service';
import { Invoice } from '../types';
import { getLocalDateString, formatDate } from '../utils/dateUtils';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'yape' | 'plin'>('cash');
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Upload de comprobante
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadInvoice(id);
    }
  }, [id]);

  const loadInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoicesService.getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err: any) {
      console.error('Error loading invoice:', err);
      setError(err.response?.data?.error || 'Error al cargar la factura');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = () => {
    const balance = totalPaid !== undefined ? Number(invoice!.totalAmount) - totalPaid : Number(invoice!.totalAmount);
    setPaymentAmount(balance.toFixed(2));
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentDate(getLocalDateString());
    setPaymentNotes('');
    setPaymentReceipt(null);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    const balance = totalPaid !== undefined ? Number(invoice.totalAmount) - totalPaid : Number(invoice.totalAmount);
    if (amount > balance) {
      alert(`El monto no puede ser mayor al saldo pendiente (S/. ${balance.toFixed(2)})`);
      return;
    }

    try {
      setSubmittingPayment(true);
      setError(null);

      // Crear el pago
      const createdPayment = await paymentsService.createPayment({
        patientId: invoice.patientId,
        invoiceId: invoice.id,
        amountPaid: amount,
        paymentMethod,
        paymentType: 'invoice_payment',
        paymentDate,
        notes: paymentNotes || undefined,
      });

      // Si hay comprobante, subirlo
      if (paymentReceipt) {
        await paymentsService.uploadReceipt(createdPayment.id, paymentReceipt);
      }

      // Recargar la factura para ver el pago registrado
      await loadInvoice(invoice.id);

      // Cerrar modal
      handleClosePaymentModal();
    } catch (err: any) {
      console.error('Error creating payment:', err);
      setError(err.response?.data?.error || 'Error al registrar el pago');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleUploadReceipt = async (paymentId: string, file: File) => {
    try {
      setUploadingReceipt(paymentId);
      setError(null);

      await paymentsService.uploadReceipt(paymentId, file);

      // Recargar la factura para ver el comprobante
      if (invoice) {
        await loadInvoice(invoice.id);
      }
    } catch (err: any) {
      console.error('Error uploading receipt:', err);
      setError(err.response?.data?.error || 'Error al subir el comprobante');
    } finally {
      setUploadingReceipt(null);
    }
  };

  const getReceiptUrl = (receiptUrl: string | null | undefined): string | null => {
    if (!receiptUrl) return null;
    if (receiptUrl.startsWith('http://') || receiptUrl.startsWith('https://')) {
      return receiptUrl;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const serverUrl = baseUrl.replace('/api', '');
    return `${serverUrl}${receiptUrl}`;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Cargando factura...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="page-container">
        <div className="error-banner">{error || 'Factura no encontrada'}</div>
        <button onClick={() => navigate(-1)} style={{ marginTop: '20px' }}>
          Volver
        </button>
      </div>
    );
  }

  const totalPaid = invoice.payments?.reduce((sum, p) => sum + Number(p.amountPaid), 0) || 0;
  const balance = Number(invoice.totalAmount) - totalPaid;

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '0',
            marginBottom: '16px',
          }}
        >
          ← Volver
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Factura #{invoice.id.slice(0, 8).toUpperCase()}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Paciente: {invoice.patient?.firstName} {invoice.patient?.lastName}
        </p>
      </div>

      {/* Invoice Details */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Información de la Factura
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Estado</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {invoice.status === 'paid' && '✅ Pagada'}
              {invoice.status === 'pending' && '⏳ Pendiente'}
              {invoice.status === 'partial' && '📊 Parcial'}
              {invoice.status === 'cancelled' && '❌ Cancelada'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Monto Total</div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>S/. {Number(invoice.totalAmount).toFixed(2)}</div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Pagado</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>S/. {totalPaid.toFixed(2)}</div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Saldo Pendiente</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: balance > 0 ? '#ef4444' : '#10b981' }}>
              S/. {balance.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Fecha de Emisión</div>
            <div style={{ fontSize: '14px' }}>{formatDate(invoice.createdAt)}</div>
          </div>

          {invoice.dueDate && (
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Fecha de Vencimiento</div>
              <div style={{ fontSize: '14px' }}>{formatDate(invoice.dueDate)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Orders */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Órdenes Incluidas ({invoice.orders?.length || 0})
        </h2>

        {invoice.orders && invoice.orders.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invoice.orders.map((order, idx) => (
              <div
                key={order.id}
                style={{
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                      {order.service?.name || 'Servicio'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {order.totalSessions} {order.totalSessions === 1 ? 'sesión' : 'sesiones'} •{' '}
                      {order.completedSessions} completadas
                    </div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>S/. {Number(order.finalPrice).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280' }}>No hay órdenes asociadas a esta factura</p>
        )}
      </div>

      {/* Payments */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            Pagos Registrados ({invoice.payments?.length || 0})
          </h2>

          {balance > 0 && invoice.status !== 'cancelled' && (
            <button
              onClick={handleOpenPaymentModal}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Registrar Pago
            </button>
          )}
        </div>

        {invoice.payments && invoice.payments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invoice.payments.map((payment, idx) => (
              <div
                key={payment.id}
                style={{
                  padding: '16px',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1px solid #d1fae5',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                        {payment.paymentMethod === 'cash' && 'Efectivo'}
                        {payment.paymentMethod === 'card' && 'Tarjeta'}
                        {payment.paymentMethod === 'transfer' && 'Transferencia'}
                        {payment.paymentMethod === 'yape' && 'Yape'}
                        {payment.paymentMethod === 'plin' && 'Plin'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {formatDate(payment.paymentDate)}
                        {payment.createdBy && ` • Por ${payment.createdBy.firstName} ${payment.createdBy.lastName}`}
                      </div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                      S/. {Number(payment.amountPaid).toFixed(2)}
                    </div>
                  </div>
                  {payment.notes && (
                    <div style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic', marginTop: '8px' }}>
                      Nota: {payment.notes}
                    </div>
                  )}

                  {/* Comprobante */}
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #d1fae5' }}>
                    {payment.receiptUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                          Comprobante de pago:
                        </div>
                        <a
                          href={getReceiptUrl(payment.receiptUrl) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            maxWidth: '200px',
                            transition: 'border-color 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                          <img
                            src={getReceiptUrl(payment.receiptUrl) || ''}
                            alt="Comprobante de pago"
                            style={{
                              width: '100%',
                              height: 'auto',
                              display: 'block',
                            }}
                          />
                        </a>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Click para ver en tamaño completo
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          id={`receipt-${payment.id}`}
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadReceipt(payment.id, file);
                            }
                          }}
                        />
                        <label
                          htmlFor={`receipt-${payment.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: '#3b82f6',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '13px',
                            cursor: uploadingReceipt === payment.id ? 'wait' : 'pointer',
                            opacity: uploadingReceipt === payment.id ? 0.6 : 1,
                          }}
                        >
                          {uploadingReceipt === payment.id ? '⏳ Subiendo...' : '📎 Subir comprobante'}
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280' }}>No hay pagos registrados para esta factura</p>
        )}
      </div>

      {/* Modal de Registro de Pago */}
      {showPaymentModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleClosePaymentModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
              Registrar Pago
            </h2>

            <form onSubmit={handleSubmitPayment}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Monto a Pagar
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Saldo pendiente: S/. {balance.toFixed(2)}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Fecha de Pago
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Notas (opcional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                  Comprobante de Pago (opcional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPaymentReceipt(file);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                {paymentReceipt && (
                  <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                    ✓ Archivo seleccionado: {paymentReceipt.name}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  disabled={submittingPayment}
                  style={{
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: submittingPayment ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  style={{
                    background: submittingPayment ? '#d1d5db' : '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: submittingPayment ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {submittingPayment ? 'Registrando...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetailPage;
