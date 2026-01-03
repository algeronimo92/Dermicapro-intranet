import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { AnalyticsFilters, ServiceAnalyticsData } from '../../types/analytics.types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ServiceAnalyticsProps {
  filters?: AnalyticsFilters;
}

export const ServiceAnalytics: React.FC<ServiceAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<ServiceAnalyticsData>(
    (f) => analyticsService.getServiceAnalytics(f),
    filters
  );

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando datos de servicios...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px', color: '#e74c3c' }}>Error: {error}</div>;
  }

  if (!data) {
    return <div style={{ padding: '40px' }}>No hay datos disponibles</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #3498db' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Servicios</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.overview.totalServices}</div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #2ecc71' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Servicios Activos</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.overview.activeServices}</div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #9b59b6' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Ingresos Totales</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
            ${data.overview.totalRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #f39c12' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Precio Promedio</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
            ${data.pricing.averageServicePrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Service Performance Table */}
      <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Rendimiento por Servicio</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Servicio</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Veces Ordenado</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Ingresos</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Precio Promedio</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Tasa de Completado</th>
              </tr>
            </thead>
            <tbody>
              {data.performance.map((service) => (
                <tr key={service.serviceId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{service.serviceName}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{service.timesOrdered}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2ecc71' }}>
                    ${service.revenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    ${service.averagePrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: service.completionRate >= 80 ? '#d4edda' : service.completionRate >= 60 ? '#fff3cd' : '#f8d7da',
                        color: service.completionRate >= 80 ? '#155724' : service.completionRate >= 60 ? '#856404' : '#721c24',
                      }}
                    >
                      {service.completionRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Revenue by Service */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Top 10 Servicios por Ingresos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.performance.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="serviceName" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#2ecc71" name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Times Ordered by Service */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Top 10 Servicios por Popularidad</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.performance.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="serviceName" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="timesOrdered" fill="#3498db" name="Veces Ordenado" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pricing Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>Precio Mínimo</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3498db' }}>
            ${data.pricing.priceRange.min.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>Precio Promedio</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2ecc71' }}>
            ${data.pricing.averageServicePrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>Precio Máximo</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e74c3c' }}>
            ${data.pricing.priceRange.max.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Packages */}
      {data.packages.length > 0 && (
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Paquetes de Servicios</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Paquete</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Servicios</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Precio</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Popularidad</th>
                </tr>
              </thead>
              <tbody>
                {data.packages.map((pkg) => (
                  <tr key={pkg.packageId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{pkg.packageName}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{pkg.serviceCount}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2ecc71' }}>
                      ${pkg.totalPrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: '#e3f2fd',
                          color: '#1976d2',
                        }}
                      >
                        {pkg.popularity} órdenes
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
