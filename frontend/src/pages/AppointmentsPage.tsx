import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentsService, GetAppointmentsParams } from '../services/appointments.service';
import { Appointment, AppointmentStatus } from '../types';
import { Table, Column } from '../components/Table';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { Input } from '../components/Input';
import { Calendar } from '../components/Calendar';

type ViewMode = 'list' | 'calendar';

export const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  // Filtros y paginación
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Estado del calendario
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showCancelled, setShowCancelled] = useState(false);

  const limit = 10;

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: GetAppointmentsParams = {
        page: currentPage,
        limit,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const response = await appointmentsService.getAppointments(params);
      setAppointments(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar citas');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCalendarAppointments = async (date: Date) => {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener citas del mes actual
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const params: GetAppointmentsParams = {
        limit: 1000, // Obtener todas las citas del mes
        dateFrom: firstDay.toISOString().split('T')[0],
        dateTo: lastDay.toISOString().split('T')[0],
        status: statusFilter || undefined,
      };

      const response = await appointmentsService.getAppointments(params);
      setAllAppointments(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar citas del calendario');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') {
      loadAppointments();
    } else {
      loadCalendarAppointments(calendarDate);
    }
  }, [currentPage, statusFilter, dateFrom, dateTo, viewMode, calendarDate]);

  const handleClearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const handleCreateAppointment = () => {
    navigate('/appointments/new');
  };

  const handleRowClick = (appointment: Appointment) => {
    navigate(`/appointments/${appointment.id}`);
  };

  const handleCalendarDateChange = (date: Date) => {
    setCalendarDate(date);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    navigate(`/appointments/${appointment.id}`);
  };

  const handleAppointmentUpdate = async (appointmentId: string, newDate: Date, durationMinutes?: number) => {
    try {
      const updateData: any = {
        scheduledDate: newDate.toISOString()
      };

      if (durationMinutes !== undefined) {
        updateData.durationMinutes = durationMinutes;
      }

      await appointmentsService.updateAppointment(appointmentId, updateData);

      // Reload calendar appointments
      loadCalendarAppointments(calendarDate);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar cita');
    }
  };

  const statusLabels: Record<AppointmentStatus, string> = {
    reserved: 'Reservada',
    attended: 'Atendida',
    cancelled: 'Cancelada',
    no_show: 'No asistió'
  };

  const statusColors: Record<AppointmentStatus, string> = {
    reserved: 'status-reserved',
    attended: 'status-attended',
    cancelled: 'status-cancelled',
    no_show: 'status-no-show'
  };

  const columns: Column<Appointment>[] = [
    {
      key: 'scheduledDate',
      header: 'Fecha',
      render: (appointment) => {
        const date = new Date(appointment.scheduledDate);
        return (
          <div>
            <div>{date.toLocaleDateString('es-PE')}</div>
            <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
              {date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      }
    },
    {
      key: 'patient',
      header: 'Paciente',
      render: (appointment) => appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : '-'
    },
    {
      key: 'service',
      header: 'Servicio',
      render: (appointment) => appointment.service?.name || '-'
    },
    {
      key: 'status',
      header: 'Estado',
      render: (appointment) => (
        <span className={`status-badge ${statusColors[appointment.status]}`}>
          {statusLabels[appointment.status]}
        </span>
      )
    },
    {
      key: 'reservationAmount',
      header: 'Monto Reserva',
      render: (appointment) => appointment.reservationAmount
        ? `S/. ${Number(appointment.reservationAmount).toFixed(2)}`
        : '-'
    },
    {
      key: 'createdBy',
      header: 'Creado por',
      render: (appointment) => appointment.createdBy
        ? `${appointment.createdBy.firstName} ${appointment.createdBy.lastName}`
        : '-'
    },
    {
      key: 'createdAt',
      header: 'Registrado',
      render: (appointment) => new Date(appointment.createdAt).toLocaleDateString('es-PE')
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Gestión de Citas</h1>
          <div className="view-toggle" style={{ marginTop: '10px' }}>
            <button
              className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 Calendario
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 Lista
            </button>
          </div>
        </div>
        <Button variant="primary" onClick={handleCreateAppointment}>
          + Nueva Cita
        </Button>
      </div>

      {viewMode === 'list' && (
        <div className="filters-container">
          <div className="filters-row">
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginBottom: '8px'
            }}>
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Mostrar citas eliminadas</span>
            </label>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}
              options={[
                { value: 'reserved', label: 'Reservada' },
                { value: 'attended', label: 'Atendida' },
                { value: 'cancelled', label: 'Cancelada' },
                { value: 'no_show', label: 'No asistió' }
              ]}
              className="filter-select"
              label="Estado"
            />

            <Input
              type="date"
              label="Desde"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="filter-input"
            />

            <Input
              type="date"
              label="Hasta"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="filter-input"
            />

            {(statusFilter || dateFrom || dateTo) && (
              <Button
                variant="secondary"
                onClick={handleClearFilters}
                style={{ alignSelf: 'flex-end' }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="filters-container">
          <div className="filters-row">
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Mostrar citas eliminadas</span>
            </label>

            {statusFilter && (
              <>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}
                  options={[
                    { value: 'reserved', label: 'Reservada' },
                    { value: 'attended', label: 'Atendida' },
                    { value: 'cancelled', label: 'Cancelada' },
                    { value: 'no_show', label: 'No asistió' }
                  ]}
                  className="filter-select"
                  label="Filtrar por Estado"
                />
                <Button
                  variant="secondary"
                  onClick={() => setStatusFilter('')}
                  style={{ alignSelf: 'flex-end' }}
                >
                  Limpiar filtro
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {viewMode === 'list' && (
        <>
          <div className="results-info">
            <p>Total de citas: {total}</p>
          </div>

          {isLoading ? (
            <Loading text="Cargando citas..." />
          ) : (
            <>
              <Table
                columns={columns}
                data={showCancelled ? appointments : appointments.filter(apt => apt.status !== 'cancelled')}
                onRowClick={handleRowClick}
                emptyMessage="No se encontraron citas"
              />

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </>
      )}

      {viewMode === 'calendar' && (
        <>
          {isLoading ? (
            <Loading text="Cargando calendario..." />
          ) : (
            <Calendar
              appointments={allAppointments}
              currentDate={calendarDate}
              onDateChange={handleCalendarDateChange}
              onAppointmentClick={handleAppointmentClick}
              onAppointmentUpdate={handleAppointmentUpdate}
              showCancelled={showCancelled}
            />
          )}
        </>
      )}
    </div>
  );
};
