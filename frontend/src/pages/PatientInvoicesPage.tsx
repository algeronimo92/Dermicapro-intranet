import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsService } from '../services/patients.service';
import { invoicesService } from '../services/invoices.service';
import { Patient, Invoice, InvoiceStatus } from '../types';
import { Loading } from '../components/Loading';
import { formatDate } from '../utils/dateUtils';
import '../styles/patient-invoices.css';

export const PatientInvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (patientId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar paciente e invoices en paralelo
      const [patientData, invoicesData] = await Promise.all([
        patientsService.getPatient(patientId),
        invoicesService.getPatientInvoices(patientId)
      ]);

      setPatient(patientData);
      setInvoices(invoicesData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/patients/${id}`);
  };

  const handleCreateInvoice = () => {
    navigate(`/patients/${id}/create-invoice`);
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}`);
  };

  const getStatusClass = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return 'invoice-status-paid';
      case 'partial':
        return 'invoice-status-partial';
      case 'pending':
        return 'invoice-status-pending';
      case 'cancelled':
        return 'invoice-status-cancelled';
      default:
        return 'invoice-status-pending';
    }
  };

  const getStatusLabel = (status: InvoiceStatus) => {
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
        return status.toUpperCase();
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

  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => {
    const paid = inv.payments?.reduce((s, p) => s + Number(p.amountPaid), 0) || 0;
    return sum + paid;
  }, 0);
  const totalPending = totalAmount - totalPaid;

  const pendingInvoices = invoices.filter(inv => {
    return inv.status === 'pending' || inv.status === 'partial';
  });

  return (
    <div className="invoices-container">
      {/* Header */}
      <div className="invoices-header">
        <button onClick={handleBack} className="invoices-back-button">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver al Detalle del Paciente
        </button>

        <div className="invoices-header-content">
          <div>
            <h1 className="invoices-title">
              Facturas y Pagos
            </h1>
            <p className="invoices-patient-info">
              {patient.firstName} {patient.lastName} - DNI: {patient.dni}
            </p>
          </div>
          <button onClick={handleCreateInvoice} className="btn btn-primary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Generar Factura
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="invoices-summary">
        <div className="summary-card summary-card-total">
          <div className="summary-label">
            TOTAL FACTURADO
          </div>
          <div className="summary-amount">
            S/. {totalAmount.toFixed(2)}
          </div>
          <div className="summary-subtitle">
            {totalInvoices} {totalInvoices === 1 ? 'factura' : 'facturas'}
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
            {pendingInvoices.length} {pendingInvoices.length === 1 ? 'factura' : 'facturas'} pendiente(s)
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="invoices-list-container">
        <div className="invoices-list-header">
          <h2 className="invoices-list-title">
            Todas las Facturas ({totalInvoices})
          </h2>
        </div>

        {invoices.length === 0 ? (
          <div className="invoices-empty">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="12" y="8" width="40" height="48" rx="4" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
              <path d="M20 20h24M20 28h24M20 36h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="invoices-empty-title">
              No hay facturas registradas
            </p>
            <p className="invoices-empty-text">
              Crea una factura consolidada con las órdenes del paciente
            </p>
            <button onClick={handleCreateInvoice} className="btn btn-primary">
              Generar Primera Factura
            </button>
          </div>
        ) : (
          <div>
            {invoices.map((invoice, index) => {
              const invoiceOrders = invoice.orders || [];
              const invoiceStatus = invoice.status;
              const amountPaid = invoice.payments?.reduce((sum, p) => sum + Number(p.amountPaid), 0) || 0;
              const totalInvoiceAmount = Number(invoice.totalAmount || 0);
              const pendingAmount = totalInvoiceAmount - amountPaid;
              const paymentCount = invoice.payments?.length || 0;

              return (
                <div
                  key={invoice.id}
                  className="invoice-item"
                  onClick={() => handleViewInvoice(invoice.id)}
                >
                  <div className="invoice-item-header">
                    <div className="invoice-item-left">
                      <div className="invoice-item-title-row">
                        <h3 className="invoice-item-title">
                          Factura #{invoice.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <span className={`invoice-status-badge ${getStatusClass(invoiceStatus)}`}>
                          {getStatusLabel(invoiceStatus)}
                        </span>
                      </div>

                      {/* Mostrar todas las órdenes de la factura */}
                      <div className="invoice-orders">
                        {invoiceOrders.length > 0 ? (
                          <div>
                            {invoiceOrders.length === 1 ? (
                              <span>
                                {invoiceOrders[0].service?.name || 'Servicio'} • {invoiceOrders[0].totalSessions} {invoiceOrders[0].totalSessions === 1 ? 'sesión' : 'sesiones'}
                              </span>
                            ) : (
                              <div>
                                <strong>{invoiceOrders.length} órdenes incluidas:</strong>
                                <ul>
                                  {invoiceOrders.map((order, idx) => (
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

                      <div className="invoice-metadata">
                        Emisión: {formatDate(invoice.createdAt)} • {paymentCount} {paymentCount === 1 ? 'pago' : 'pagos'} registrado(s)
                      </div>
                    </div>

                    <div className="invoice-item-right">
                      <div className="invoice-amount">
                        S/. {totalInvoiceAmount.toFixed(2)}
                      </div>
                      {invoiceStatus !== 'paid' && (
                        <div className="invoice-pending">
                          Pendiente: S/. {pendingAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Progress */}
                  {totalInvoiceAmount > 0 && (
                    <div className="payment-progress">
                      <div className="payment-progress-header">
                        <span>Progreso de pago</span>
                        <span>{((amountPaid / totalInvoiceAmount * 100)).toFixed(0)}%</span>
                      </div>
                      <div className="payment-progress-bar">
                        <div
                          className={`payment-progress-fill ${
                            invoiceStatus === 'paid'
                              ? 'payment-progress-fill-paid'
                              : 'payment-progress-fill-partial'
                          }`}
                          style={{ width: `${(amountPaid / totalInvoiceAmount * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment History */}
                  {invoice.payments && invoice.payments.length > 0 && (
                    <div className="payment-history">
                      <div className="payment-history-title">
                        Historial de Pagos
                      </div>
                      {invoice.payments.map((payment) => (
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
                  {invoiceStatus !== 'paid' && invoiceStatus !== 'cancelled' && (
                    <button
                      className="register-payment-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('Modal de registro de pago - Por implementar');
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
    </div>
  );
};
