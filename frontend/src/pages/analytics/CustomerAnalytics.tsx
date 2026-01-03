import React from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { analyticsService } from '../../services/analytics.service';
import { AnalyticsFilters, CustomerAnalyticsData } from '../../types/analytics.types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CustomerAnalyticsProps {
  filters?: AnalyticsFilters;
}

const COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

export const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({ filters }) => {
  const { data, isLoading, error } = useAnalytics<CustomerAnalyticsData>(
    (f) => analyticsService.getCustomerAnalytics(f),
    filters
  );

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando datos de clientes...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px', color: '#e74c3c' }}>Error: {error}</div>;
  }

  if (!data) {
    return <div style={{ padding: '40px' }}>No hay datos disponibles</div>;
  }

  const genderData = data.demographics.byGender.map((item) => ({
    name: item.gender === 'male' ? 'Masculino' : item.gender === 'female' ? 'Femenino' : 'Otro',
    value: item.count,
  }));

  return (
    <div style={{ padding: '20px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #3498db' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Pacientes</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.overview.totalPatients}</div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #2ecc71' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Nuevos Pacientes</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.overview.newPatients}</div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #9b59b6' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Pacientes Recurrentes</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.overview.returningPatients}</div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #e74c3c' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Tasa de Abandono</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{data.overview.churnRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Demographics by Gender */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Pacientes por Género</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Demographics by Age Range */}
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Pacientes por Rango de Edad</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.demographics.byAgeRange}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ageRange" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3498db" name="Pacientes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lifetime Value Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Valor de Vida Promedio (CLV)</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#2ecc71', textAlign: 'center', padding: '40px 0' }}>
            ${data.lifetime.averageCLV.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Métricas de Retención</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
              <span style={{ fontWeight: '500', color: '#666' }}>Tasa de Retención:</span>
              <span style={{ fontWeight: 'bold', color: '#2ecc71', fontSize: '18px' }}>
                {data.retention.retentionRate.toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
              <span style={{ fontWeight: '500', color: '#666' }}>Promedio de Visitas:</span>
              <span style={{ fontWeight: 'bold', color: '#3498db', fontSize: '18px' }}>
                {data.retention.averageVisits.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
              <span style={{ fontWeight: '500', color: '#666' }}>Días Promedio Entre Visitas:</span>
              <span style={{ fontWeight: 'bold', color: '#9b59b6', fontSize: '18px' }}>
                {data.retention.averageDaysBetweenVisits.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Customers by CLV */}
      <div style={{ padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Top 10 Clientes por Valor de Vida</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Ranking</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Paciente</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>DNI</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Visitas</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#666' }}>Total Gastado</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#666' }}>Última Visita</th>
              </tr>
            </thead>
            <tbody>
              {data.lifetime.topCustomers.map((customer, idx) => (
                <tr key={customer.patientId} style={{ borderBottom: '1px solid #f0f0f0' }}>
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
                      {idx + 1}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{customer.patientName}</td>
                  <td style={{ padding: '12px', color: '#666' }}>{customer.dni}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{customer.totalVisits}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2ecc71' }}>
                    ${customer.totalSpent.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '12px', color: '#666' }}>
                    {new Date(customer.lastVisit).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
