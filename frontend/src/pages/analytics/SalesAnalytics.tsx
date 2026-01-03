import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { AnalyticsFilters, SalesAnalyticsData } from '../../types/analytics.types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface SalesAnalyticsProps {
  filters?: AnalyticsFilters;
}

const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];

export const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<SalesAnalyticsData>(
    (f) => analyticsService.getSalesAnalytics(f),
    filters
  );

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando datos de ventas...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px', color: '#e74c3c' }}>Error: {error}</div>;
  }

  if (!data) {
    return <div style={{ padding: '40px' }}>No hay datos disponibles</div>;
  }

  const commissionsStatusData = [
    { name: 'Pendientes', value: data.commissions.pending, color: '#f39c12' },
    { name: 'Aprobadas', value: data.commissions.approved, color: '#2ecc71' },
    { name: 'Pagadas', value: data.commissions.paid, color: '#3498db' },
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #3498db' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Órdenes</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.overview.totalOrders}</div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #2ecc71' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Ingresos Totales</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
            ${data.overview.totalRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #9b59b6' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Valor Promedio Orden</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>
            ${data.overview.averageOrderValue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #e74c3c' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Tasa de Conversión</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.overview.conversionRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Top Services */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Top 10 Servicios por Ingresos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topServices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="serviceName" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#3498db" name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Commissions by Status */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Comisiones por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={commissionsStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {commissionsStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales People Ranking */}
      <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Ranking de Vendedores</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Ranking</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Vendedor</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Órdenes</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Ingresos</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Comisiones</th>
              </tr>
            </thead>
            <tbody>
              {data.salesPeopleRanking.map((person, idx) => (
                <tr key={person.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: idx === 0 ? '#f39c12' : idx === 1 ? '#95a5a6' : idx === 2 ? '#cd7f32' : '#ecf0f1',
                        color: idx < 3 ? 'white' : '#666',
                        textAlign: 'center',
                        lineHeight: '30px',
                        fontWeight: 'bold',
                      }}
                    >
                      {person.ranking}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{person.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{person.ordersCount}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2ecc71' }}>
                    ${person.revenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#3498db' }}>
                    ${person.commissionsEarned.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commissions Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #f39c12' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Comisiones Pendientes</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{data.commissions.pending}</div>
          <div style={{ fontSize: '18px', color: '#f39c12', marginTop: '4px' }}>
            ${data.commissions.totalPending.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #2ecc71' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Comisiones Aprobadas</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{data.commissions.approved}</div>
          <div style={{ fontSize: '18px', color: '#2ecc71', marginTop: '4px' }}>
            ${data.commissions.totalApproved.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #3498db' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Comisiones Pagadas</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{data.commissions.paid}</div>
          <div style={{ fontSize: '18px', color: '#3498db', marginTop: '4px' }}>
            ${data.commissions.totalPaid.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #9b59b6' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Comisiones</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            {data.commissions.pending + data.commissions.approved + data.commissions.paid}
          </div>
          <div style={{ fontSize: '18px', color: '#9b59b6', marginTop: '4px' }}>
            ${data.commissions.totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
};
