import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsService } from '../services/patients.service';
import { paymentOrdersService } from '../services/paymentOrders.service';
import { creditsService } from '../services/credits.service';
import { Patient, PaymentOrder, PaymentOrderStatus, Order, CreditTransaction, PaymentType, PaymentMethod } from '../types';
import { Loading } from '../components/Loading';
import { RegisterPaymentModal } from '../components/RegisterPaymentModal';
import { AddCreditModal } from '../components/AddCreditModal';
import { formatDate } from '../utils/dateUtils';
import '../styles/patient-payment-orders.css';

export const PatientPaymentOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [ordersWithoutPaymentOrder, setOrdersWithoutPaymentOrder] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<PaymentOrder | null>(null);
  const [patientBalance, setPatientBalance] = useState(0);
  const [creditHistory, setCreditHistory]   = useState<CreditTransaction[]>([]);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (patientId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar paciente, órdenes de pago y órdenes sin orden de pago en paralelo
      const [patientData, paymentOrdersData, ordersWithoutPaymentOrderData, creditData] = await Promise.all([
        patientsService.getPatient(patientId),
        paymentOrdersService.getPatientPaymentOrders(patientId),
        paymentOrdersService.getOrdersWithoutPaymentOrder(patientId),
        creditsService.getCreditHistory(patientId),
      ]);

      setPatient(patientData);
      setPaymentOrders(paymentOrdersData);
      setOrdersWithoutPaymentOrder(ordersWithoutPaymentOrderData);
      setPatientBalance(creditData.accountBalance);
      setCreditHistory(creditData.credits);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/patients/${id}`);
  };

  const handleCreatePaymentOrder = () => {
    navigate(`/patients/${id}/create-payment-order`);
  };

  const handleViewPaymentOrder = (paymentOrderId: string) => {
    navigate(`/payment-orders/${paymentOrderId}`);
  };

  const getStatusClass = (status: PaymentOrderStatus) => {
    switch (status) {
      case 'paid':
        return 'payment-order-status-paid';
      case 'partial':
        return 'payment-order-status-partial';
      case 'pending':
        return 'payment-order-status-pending';
      case 'cancelled':
        return 'payment-order-status-cancelled';
      default:
        return 'payment-order-status-pending';
    }
  };

  const getStatusLabel = (status: PaymentOrderStatus) => {
    switch (status) {
      case 'paid':
        return 'PAGADO';
      case 'partial':
        return 'PAGO PARCIAL';
      case 'pending':
        return 'PENDIENTE';
      case 'cancelled':
        return 'CANCELADO';
      default:
        return (status as string).toUpperCase();
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error || !patient) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error || 'Paciente no encontrado'}</div>
        <button onClick={handleBack} className="btn btn-secondary" style={{ marginTop: '20px' }}>
          Volver
        </button>
      </div>
    );
  }

  const totalPaymentOrders = paymentOrders.length;
  const totalAmount = paymentOrders.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const totalPaid = paymentOrders.reduce((sum, inv) => {
    const paid = inv.payments?.reduce((s, p) => s + Number(p.amountPaid), 0) || 0;
    return sum + paid;
  }, 0);

  // Calcular el total de órdenes sin orden de pago
  const ordersWithoutPaymentOrderTotal = ordersWithoutPaymentOrder.reduce((sum, order) => sum + Number(order.finalPrice || 0), 0);

  // Total pendiente = (órdenes de pago - pagos) + órdenes sin ODP
  const totalPending = (totalAmount - totalPaid) + ordersWithoutPaymentOrderTotal;

  const pendingPaymentOrders = paymentOrders.filter(inv => {
    return inv.status === 'pending' || inv.status === 'partial';
  });

  return (
    <div className="payment-orders-container">
      {/* Header */}
      <div className="payment-orders-header">
        <button onClick={handleBack} className="payment-orders-back-button">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver al Detalle del Paciente
        </button>

        <div className="payment-orders-header-content">
          <div className="payment-orders-patient-strip">
            <div className="payment-orders-patient-avatar">
              {patient.photoUrl
                ? <img src={patient.photoUrl} alt={`${patient.firstName} ${patient.lastName}`} />
                : `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase()}
            </div>
            <div>
              <h1 className="payment-orders-title">Órdenes de Pago</h1>
              <p className="payment-orders-patient-info">
                {patient.firstName} {patient.lastName} · DNI {patient.dni}
              </p>
            </div>
          </div>
          <button onClick={handleCreatePaymentOrder} className="btn btn-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Generar Orden de Pago
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="payment-orders-summary">
        <div className="summary-card summary-card-total">
          <div className="summary-label">
            TOTAL DE ÓRDENES DE PAGO
          </div>
          <div className="summary-amount">
            S/. {totalAmount.toFixed(2)}
          </div>
          <div className="summary-subtitle">
            {totalPaymentOrders} {totalPaymentOrders === 1 ? 'orden de pago' : 'órdenes de pago'}
          </div>
        </div>

        <div className="summary-card summary-card-paid">
          <div className="summary-label">
            TOTAL PAGADO
          </div>
          <div className="summary-amount">
            S/. {totalPaid.toFixed(2)}
          </div>
          <div className="summary-subtitle">
            {((totalAmount > 0 ? (totalPaid / totalAmount * 100) : 0)).toFixed(0)}% completado
          </div>
        </div>

        <div className="summary-card summary-card-pending">
          <div className="summary-label">
            TOTAL PENDIENTE
          </div>
          <div className="summary-amount">
            S/. {totalPending.toFixed(2)}
          </div>
          <div className="summary-subtitle">
            {pendingPaymentOrders.length} {pendingPaymentOrders.length === 1 ? 'orden de pago' : 'órdenes de pago'} pendiente(s)
          </div>
        </div>

        {/* ── Saldo a Favor ── */}
        <div className="summary-card" style={{
          background: patientBalance > 0 ? 'var(--color-primary-alpha-10)' : 'var(--color-bg-primary)',
          border: `1px solid ${patientBalance > 0 ? 'var(--color-primary)' : 'var(--color-border-secondary)'}`,
          position: 'relative',
        }}>
          <div className="summary-label" style={{ color: patientBalance > 0 ? 'var(--color-primary)' : undefined }}>
            SALDO A FAVOR
          </div>
          <div className="summary-amount" style={{ color: patientBalance > 0 ? 'var(--color-primary)' : 'var(--color-text-disabled)' }}>
            S/. {patientBalance.toFixed(2)}
          </div>
          <button
            onClick={() => setShowAddCreditModal(true)}
            style={{
              marginTop: 8,
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-alpha-10)',
              border: '1.5px solid var(--color-primary)',
              color: 'var(--color-primary)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {patientBalance > 0 ? 'Agregar más' : 'Agregar saldo'}
          </button>
        </div>
      </div>

      {/* Órdenes sin orden de pago */}
      {ordersWithoutPaymentOrder.length > 0 && (
        <div className="payment-orders-list-container" style={{ marginBottom: '30px' }}>
          <div className="payment-orders-list-header">
            <h2 className="payment-orders-list-title payment-orders-list-title--warning">
              Órdenes sin Orden de Pago ({ordersWithoutPaymentOrder.length})
            </h2>
          </div>
          <div>
            {ordersWithoutPaymentOrder.map((order) => (
              <div
                key={order.id}
                className="payment-order-item payment-order-item--without-payment-order"
              >
                <div className="payment-order-item-header">
                  <div className="payment-order-item-left">
                    <div className="payment-order-item-title-row">
                      <h3 className="payment-order-item-title">
                        Orden #{order.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <span className="payment-order-status-badge payment-order-status-pending">
                        SIN ORDEN DE PAGO
                      </span>
                    </div>
                    <div className="payment-order-orders">
                      <span>
                        {order.service?.name || 'Servicio'} • {order.totalSessions} {order.totalSessions === 1 ? 'sesión' : 'sesiones'}
                      </span>
                    </div>
                    <div className="payment-order-metadata">
                      Creada: {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <div className="payment-order-item-right">
                    <div className="payment-order-amount">
                      S/. {Number(order.finalPrice).toFixed(2)}
                    </div>
                    <div className="payment-order-pending">
                      Sin orden de pago
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Orders List */}
      <div className="payment-orders-list-container">
        <div className="payment-orders-list-header">
          <h2 className="payment-orders-list-title">
            Todas las Órdenes de Pago ({totalPaymentOrders})
          </h2>
        </div>

        {paymentOrders.length === 0 ? (
          <div className="payment-orders-empty">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="12" y="8" width="40" height="48" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
              <path d="M20 20h24M20 28h24M20 36h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="payment-orders-empty-title">
              No hay órdenes de pago registradas
            </p>
            <p className="payment-orders-empty-text">
              Crea una orden de pago consolidada con las órdenes del paciente
            </p>
            <button onClick={handleCreatePaymentOrder} className="btn btn-primary">
              Generar Primera Orden de Pago
            </button>
          </div>
        ) : (
          <div>
            {paymentOrders.map((po) => {
              const poOrders = po.orders || [];
              const poStatus = po.status;
              const amountPaid = po.payments?.reduce((sum, p) => sum + Number(p.amountPaid), 0) || 0;
              const totalPoAmount = Number(po.totalAmount || 0);
              const pendingAmount = totalPoAmount - amountPaid;
              const paymentCount = po.payments?.length || 0;

              return (
                <div
                  key={po.id}
                  className="payment-order-item"
                  onClick={() => handleViewPaymentOrder(po.id)}
                >
                  <div className="payment-order-item-header">
                    <div className="payment-order-item-left">
                      <div className="payment-order-item-title-row">
                        <h3 className="payment-order-item-title">
                          Orden de Pago #{po.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <span className={`payment-order-status-badge ${getStatusClass(poStatus)}`}>
                          {getStatusLabel(poStatus)}
                        </span>
                      </div>

                      {/* Mostrar todas las órdenes de la orden de pago */}
                      <div className="payment-order-orders">
                        {poOrders.length > 0 ? (
                          <div>
                            {poOrders.length === 1 ? (
                              <span>
                                {poOrders[0].service?.name || 'Servicio'} • {poOrders[0].totalSessions} {poOrders[0].totalSessions === 1 ? 'sesión' : 'sesiones'}
                              </span>
                            ) : (
                              <div>
                                <strong>{poOrders.length} órdenes incluidas:</strong>
                                <ul>
                                  {poOrders.map((order, idx) => (
                                    <li key={order.id || idx}>
                                      {order.service?.name || 'Servicio'} - {order.totalSessions} {order.totalSessions === 1 ? 'sesión' : 'sesiones'} (S/. {Number(order.finalPrice).toFixed(2)})
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--color-text-tertiary)' }}>
                            No hay órdenes asociadas
                          </div>
                        )}
                      </div>

                      <div className="payment-order-metadata">
                        Emisión: {formatDate(po.createdAt)} • {paymentCount} {paymentCount === 1 ? 'pago' : 'pagos'} registrado(s)
                      </div>
                    </div>

                    <div className="payment-order-item-right">
                      <div className="payment-order-amount">
                        S/. {totalPoAmount.toFixed(2)}
                      </div>
                      {poStatus !== 'paid' && (
                        <div className="payment-order-pending">
                          Pendiente: S/. {pendingAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Progress */}
                  {totalPoAmount > 0 && (
                    <div className="payment-progress">
                      <div className="payment-progress-header">
                        <span>Progreso de pago</span>
                        <span>{((amountPaid / totalPoAmount * 100)).toFixed(0)}%</span>
                      </div>
                      <div className="payment-progress-bar">
                        <div
                          className={`payment-progress-fill ${
                            poStatus === 'paid'
                              ? 'payment-progress-fill-paid'
                              : 'payment-progress-fill-partial'
                          }`}
                          style={{ width: `${(amountPaid / totalPoAmount * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment History */}
                  {po.payments && po.payments.length > 0 && (
                    <div className="payment-history">
                      <div className="payment-history-title">
                        Historial de Pagos
                      </div>
                      {po.payments.map((payment) => (
                        <div key={payment.id} className="payment-history-item">
                          <span>
                            {formatDate(payment.paymentDate)} • {payment.paymentMethod.toUpperCase()}
                          </span>
                          <span className="payment-history-amount">
                            +S/. {Number(payment.amountPaid).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Button */}
                  {poStatus !== 'paid' && poStatus !== 'cancelled' && (
                    <button
                      className="register-payment-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPaymentOrder(po);
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="2.5" y="3.333" width="15" height="13.333" rx="1.667" stroke="currentColor" strokeWidth="2"/>
                        <path d="M2.5 7.5h15" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Registrar Pago
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Historial de movimientos de saldo ── */}
      {creditHistory.length > 0 && (
        <div className="payment-orders-list-container" style={{ marginTop: 'var(--spacing-xl)' }}>
          <div className="payment-orders-list-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="payment-orders-list-title">Movimientos de Saldo a Favor</h3>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary)' }}>
              Balance actual: S/. {patientBalance.toFixed(2)}
            </span>
          </div>
          <div style={{ padding: 'var(--spacing-sm) 0' }}>
            {creditHistory.map(tx => {
              const isCredit   = tx.paymentType === PaymentType.account_credit;
              const isUsed     = tx.paymentMethod === PaymentMethod.account_credit;
              // isRefund: !isCredit && !isUsed
              const amount     = Number(tx.amountPaid);
              const sign       = isCredit ? '+' : '−';
              const color      = isCredit ? 'var(--color-success-dark)' : 'var(--color-error)';
              const label      = isCredit
                ? 'Abono de saldo'
                : isUsed
                  ? `Aplicado a orden de pago${tx.paymentOrderId ? ` #${tx.paymentOrderId.slice(0,6).toUpperCase()}` : ''}`
                  : 'Devolución';
              const methodLabels: Record<string, string> = {
                yape: 'Yape', plin: 'Plin', cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
              };
              const methodLabel = methodLabels[tx.paymentMethod] || tx.paymentMethod;

              return (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--spacing-sm) var(--spacing-xl)',
                  borderBottom: '1px solid var(--color-border-secondary)',
                  gap: 'var(--spacing-md)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1, minWidth: 0 }}>
                    {/* Ícono */}
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-lg)', background: isCredit ? 'var(--color-success-alpha-10)' : 'var(--color-error-alpha-10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 15 }}>{isCredit ? '💰' : '💳'}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                        {formatDate(tx.paymentDate)}
                        {isCredit && ` · via ${methodLabel}`}
                        {tx.notes && ` · ${tx.notes}`}
                        {tx.createdBy && ` · ${tx.createdBy.firstName} ${tx.createdBy.lastName}`}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color, flexShrink: 0 }}>
                    {sign}S/. {amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal de registro de pago ── */}
      {selectedPaymentOrder && patient && (
        <RegisterPaymentModal
          isOpen={!!selectedPaymentOrder}
          onClose={() => setSelectedPaymentOrder(null)}
          paymentOrder={selectedPaymentOrder}
          patientId={patient.id}
          patientBalance={patientBalance}
          onSuccess={(updated) => {
            setPaymentOrders(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
            setSelectedPaymentOrder(null);
            creditsService.getCreditHistory(patient.id)
              .then(d => { setPatientBalance(d.accountBalance); setCreditHistory(d.credits); })
              .catch(() => {});
          }}
        />
      )}

      {/* ── Modal agregar saldo a favor ── */}
      {patient && (
        <AddCreditModal
          isOpen={showAddCreditModal}
          onClose={() => setShowAddCreditModal(false)}
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`}
          currentBalance={patientBalance}
          onSuccess={(newBalance) => {
            setPatientBalance(newBalance);
            if (patient) creditsService.getCreditHistory(patient.id)
              .then(d => setCreditHistory(d.credits)).catch(() => {});
            setShowAddCreditModal(false);
          }}
        />
      )}
    </div>
  );
};
