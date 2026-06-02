import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoicesService } from '../services/invoices.service';
import { patientsService } from '../services/patients.service';
import { Order, Patient } from '../types';

const CreateInvoicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [uninvoicedOrders, setUninvoicedOrders] = useState<Order[]>([]);
  const [selectedServiceInstanceIds, setSelectedServiceInstanceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

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
        console.error('Error fetching data:', err);
        setError(err.response?.data?.error || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleToggleOrder = (serviceInstanceId: string) => {
    setSelectedServiceInstanceIds((prev) =>
      prev.includes(serviceInstanceId)
        ? prev.filter((id) => id !== serviceInstanceId)
        : [...prev, serviceInstanceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedServiceInstanceIds.length === uninvoicedOrders.length) {
      setSelectedServiceInstanceIds([]);
    } else {
      setSelectedServiceInstanceIds(uninvoicedOrders.map((order) => order.id));
    }
  };

  const calculateTotal = () => {
    return uninvoicedOrders
      .filter((order) => selectedServiceInstanceIds.includes(order.id))
      .reduce((sum, order) => sum + Number(order.finalPrice), 0);
  };

  const handleCreateInvoice = async () => {
    if (!id || selectedServiceInstanceIds.length === 0) return;

    try {
      setCreating(true);
      setError(null);

      await invoicesService.createInvoice({
        serviceInstanceIds: selectedServiceInstanceIds,
        patientId: id,
      });

      // Navegar de vuelta a la página de facturas del paciente
      navigate(`/patients/${id}/invoices`);
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      setError(err.response?.data?.error || 'Error al crear la factura');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '20px', textAlign: 'center' }}>
        <p>Cargando servicios sin facturar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '20px' }}>
        <div style={{ color: '#ef4444', marginBottom: '16px' }}>
          {error}
        </div>
        <button onClick={() => navigate(`/patients/${id}/invoices`)}>
          Volver a Facturas
        </button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container" style={{ padding: '20px' }}>
        <p>Paciente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate(`/patients/${id}/invoices`)}
          style={{
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '0',
            marginBottom: '12px',
          }}
        >
          ← Volver a Facturas
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          Generar Factura
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          {patient.firstName} {patient.lastName} • DNI: {patient.dni}
        </p>
      </div>

      {/* No hay órdenes sin facturar */}
      {uninvoicedOrders.length === 0 ? (
        <div
          style={{
            background: '#f3f4f6',
            padding: '24px',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            No hay servicios sin facturar para este paciente
          </p>
          <button onClick={() => navigate(`/patients/${id}/invoices`)}>
            Volver a Facturas
          </button>
        </div>
      ) : (
        <>
          {/* Selección de órdenes */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
                Servicios sin facturar ({uninvoicedOrders.length})
              </h2>
              <button
                onClick={handleSelectAll}
                style={{
                  background: 'none',
                  border: '1px solid #d1d5db',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {selectedServiceInstanceIds.length === uninvoicedOrders.length
                  ? 'Deseleccionar todas'
                  : 'Seleccionar todas'}
              </button>
            </div>

            {/* Lista de órdenes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {uninvoicedOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => handleToggleOrder(order.id)}
                  style={{
                    border: selectedServiceInstanceIds.includes(order.id)
                      ? '2px solid #3b82f6'
                      : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    background: selectedServiceInstanceIds.includes(order.id)
                      ? '#eff6ff'
                      : 'white',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServiceInstanceIds.includes(order.id)}
                      readOnly
                      style={{ cursor: 'pointer', pointerEvents: 'none' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          marginBottom: '4px',
                        }}
                      >
                        {order.service?.name || 'Servicio'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {order.totalSessions}{' '}
                        {order.totalSessions === 1 ? 'sesión' : 'sesiones'} •{' '}
                        {order.completedSessions} completadas
                        {order.notes && ` • ${order.notes}`}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1f2937',
                      }}
                    >
                      S/. {Number(order.finalPrice).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen y acción */}
          <div
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {selectedServiceInstanceIds.length}{' '}
                  {selectedServiceInstanceIds.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
                  Total: S/. {calculateTotal().toFixed(2)}
                </div>
              </div>
              <button
                onClick={handleCreateInvoice}
                disabled={selectedServiceInstanceIds.length === 0 || creating}
                style={{
                  background: selectedServiceInstanceIds.length === 0 || creating ? '#d1d5db' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: selectedServiceInstanceIds.length === 0 || creating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {creating ? 'Generando...' : 'Generar Factura'}
              </button>
            </div>

            {selectedServiceInstanceIds.length === 0 && (
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                Selecciona al menos un servicio para generar la factura
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CreateInvoicePage;
