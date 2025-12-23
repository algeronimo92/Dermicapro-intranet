import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { appointmentsService, GetAppointmentsParams } from '../services/appointments.service';
import { Appointment, AppointmentStatus } from '../types';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { Input } from '../components/Input';
import { Calendar } from '../components/Calendar';
import { getLocalDateString, addDays } from '../utils/dateUtils';
import '../styles/appointments-page.css';

type ViewMode = 'list' | 'calendar';

export const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializar estados desde URL
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'calendar');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>(
    (searchParams.get('status') as AppointmentStatus) || ''
  );
  // ✅ Usar dateUtils para obtener fechas locales correctamente
  const today = getLocalDateString();
  const oneWeekLater = getLocalDateString(addDays(new Date(), 7));
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || today);
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || oneWeekLater);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [showCancelled, setShowCancelled] = useState(searchParams.get('showCancelled') === 'true');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>(
    (searchParams.get('calendarView') as 'month' | 'week' | 'day') || 'week'
  );

  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Estado del calendario
  const [calendarDate, setCalendarDate] = useState(new Date());

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
        showCancelled: showCancelled,
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

      // ✅ Obtener citas del mes actual usando dateUtils
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const params: GetAppointmentsParams = {
        limit: 1000,
        dateFrom: getLocalDateString(firstDay),
        dateTo: getLocalDateString(lastDay),
        status: statusFilter || undefined,
        showCancelled: showCancelled,
      };

      const response = await appointmentsService.getAppointments(params);
      setAllAppointments(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar citas del calendario');
    } finally {
      setIsLoading(false);
    }
  };

  // Sincronizar filtros con URL
  useEffect(() => {
    const params: Record<string, string> = {};

    if (viewMode !== 'calendar') params.view = viewMode;
    if (statusFilter) params.status = statusFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (currentPage > 1) params.page = currentPage.toString();
    if (showCancelled) params.showCancelled = 'true';
    if (viewMode === 'calendar' && calendarView !== 'week') params.calendarView = calendarView;

    setSearchParams(params, { replace: true });
  }, [viewMode, statusFilter, dateFrom, dateTo, currentPage, showCancelled, calendarView]);

  useEffect(() => {
    if (viewMode === 'list') {
      loadAppointments();
    } else {
      loadCalendarAppointments(calendarDate);
    }
  }, [currentPage, statusFilter, dateFrom, dateTo, viewMode, calendarDate, showCancelled]);

  const handleClearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const handleCreateAppointment = () => {
    navigate('/appointments/new');
  };

  const handleCardClick = (appointment: Appointment) => {
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
      loadCalendarAppointments(calendarDate);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar cita');
    }
  };

  const handleTimeSlotClick = (date: Date, hour: number, minute: number, durationMinutes: number) => {
    const selectedDateTime = new Date(date);
    selectedDateTime.setHours(hour, minute, 0, 0);
    const dateParam = selectedDateTime.toISOString();
    navigate(`/appointments/new?scheduledDate=${encodeURIComponent(dateParam)}&durationMinutes=${durationMinutes}`);
  };

  const statusConfig: Record<AppointmentStatus, { label: string; color: string; icon: string; gradient: string }> = {
    reserved: {
      label: 'Reservada',
      color: 'status-reserved',
      icon: '📅',
      gradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
    },
    in_progress: {
      label: 'En Atención',
      color: 'status-in-progress',
      icon: '⏳',
      gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
    },
    attended: {
      label: 'Atendida',
      color: 'status-attended',
      icon: '✅',
      gradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
    },
    cancelled: {
      label: 'Cancelada',
      color: 'status-cancelled',
      icon: '❌',
      gradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
    },
    no_show: {
      label: 'No asistió',
      color: 'status-no-show',
      icon: '⚠️',
      gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const activeFiltersCount = [statusFilter, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="appointments-page">
      {/* Header Moderno */}
      <div className="appointments-header">
        <div className="header-content">
          <div className="header-left">
            <div className="icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div>
              <h1>Gestión de Citas</h1>
              <p className="subtitle">Administra todas las citas de tus pacientes</p>
            </div>
          </div>
          <Button variant="primary" onClick={handleCreateAppointment} className="btn-create">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Nueva Cita
          </Button>
        </div>

        {/* View Toggle Moderno */}
        <div className="view-toggle-modern">
          <button
            className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="3" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="2"/>
              <line x1="6" y1="1" x2="6" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="14" y1="1" x2="14" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Calendario
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="11" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="2"/>
              <line x1="11" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="11" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="11" y1="13" x2="17" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="11" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Lista
          </button>
        </div>
      </div>

      {/* Filtros Modernos */}
      {viewMode === 'list' && (
        <div className="filters-modern">
          <div className="filters-header">
            <div className="filters-title">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 6h14M6 10h8M8 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="filter-badge">{activeFiltersCount}</span>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <button className="btn-clear-filters" onClick={handleClearFilters}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="filters-grid">
            <label className="checkbox-modern">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-label">Mostrar citas canceladas</span>
            </label>

            <div className="filter-item">
              <label className="filter-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 4v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Estado
              </label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'reserved', label: '📅 Reservada' },
                  { value: 'in_progress', label: '⏳ En Atención' },
                  { value: 'attended', label: '✅ Atendida' },
                  { value: 'cancelled', label: '❌ Cancelada' },
                  { value: 'no_show', label: '⚠️ No asistió' }
                ]}
                className="filter-select-modern"
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 6h12M5 2v2M11 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <rect x="2" y="4" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Desde
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="date-input-modern"
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 6h12M5 2v2M11 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <rect x="2" y="4" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Hasta
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="date-input-modern"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filtros Simplificados para Calendario */}
      {viewMode === 'calendar' && (
        <div className="filters-modern filters-minimal">
          <label className="checkbox-modern">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />
            <span className="checkbox-custom"></span>
            <span className="checkbox-label">Mostrar citas canceladas</span>
          </label>
        </div>
      )}

      {error && (
        <div className="error-alert">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2"/>
            <line x1="10" y1="6" x2="10" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="10" cy="13" r="0.5" fill="currentColor"/>
          </svg>
          {error}
        </div>
      )}

      {viewMode === 'list' && (
        <>
          <div className="results-info-modern">
            <div className="results-count">
              <span className="count-number">{total}</span>
              <span className="count-label">citas encontradas</span>
            </div>
          </div>

          {isLoading ? (
            <div className="loading-container">
              <Loading text="Cargando citas..." />
            </div>
          ) : (
            <>
              <div className="appointments-grid">
                {appointments.map((appointment) => {
                  const config = statusConfig[appointment.status];
                  const scheduledDate = new Date(appointment.scheduledDate);
                  const patient = appointment.patient;
                  const services = appointment.appointmentServices?.map(as => as.order.service?.name).filter(Boolean) || [];
                  const reservationPaid = appointment.reservationAmount ? Number(appointment.reservationAmount) : 0;
                  const totalAmount = appointment.appointmentServices?.reduce((sum, svc) =>
                    sum + Number(svc.order.service?.basePrice || 0), 0) || 0;
                  const pendingAmount = totalAmount - reservationPaid;

                  return (
                    <div
                      key={appointment.id}
                      className="appointment-card"
                      onClick={() => handleCardClick(appointment)}
                    >
                      {/* Header del Card */}
                      <div className="card-header-row">
                        {patient && (
                          <div className="patient-avatar">
                            {getInitials(patient.firstName, patient.lastName)}
                          </div>
                        )}
                        <div className="card-status-badge" style={{ background: config.gradient }}>
                          <span className="status-icon">{config.icon}</span>
                          <span className="status-text">{config.label}</span>
                        </div>
                      </div>

                      {/* Información Principal */}
                      <div className="card-main-info">
                        <h3 className="patient-name">
                          {patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente no asignado'}
                        </h3>

                        <div className="card-meta">
                          <div className="meta-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                              <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <span>
                              {scheduledDate.toLocaleDateString('es-PE', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          </div>
                          <div className="meta-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M8 4v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            <span>
                              {scheduledDate.toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="meta-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M8 2v12M12 6v6M4 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            <span>{appointment.durationMinutes} min</span>
                          </div>
                        </div>
                      </div>

                      {/* Servicios */}
                      {services.length > 0 && (
                        <div className="card-services">
                          <div className="services-label">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <rect x="1" y="3" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M4 6h6M4 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            Servicios:
                          </div>
                          <div className="services-tags">
                            {services.slice(0, 2).map((service, idx) => (
                              <span key={idx} className="service-tag">{service}</span>
                            ))}
                            {services.length > 2 && (
                              <span className="service-tag more">+{services.length - 2}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Footer con Pago y Creador */}
                      <div className="card-footer">
                        <div className="payment-status-mini">
                          {pendingAmount > 0 ? (
                            <div className="payment-pending-mini">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M7 3v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                              <span>Pendiente: S/. {pendingAmount.toFixed(2)}</span>
                            </div>
                          ) : totalAmount > 0 ? (
                            <div className="payment-complete-mini">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                              <span>Pagado: S/. {reservationPaid.toFixed(2)}</span>
                            </div>
                          ) : (
                            <div className="payment-none-mini">
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
                              </svg>
                              <span>Sin reserva</span>
                            </div>
                          )}
                        </div>

                        {appointment.createdBy && (
                          <div className="created-by-mini">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M2 12c0-2 2-3 5-3s5 1 5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            <span>{appointment.createdBy.firstName} {appointment.createdBy.lastName}</span>
                          </div>
                        )}
                      </div>

                      {/* Indicador Visual de Hover */}
                      <div className="card-hover-indicator">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M7 10l3 3 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-90 10 10)"/>
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>

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
            <div className="loading-container">
              <Loading text="Cargando calendario..." />
            </div>
          ) : (
            <Calendar
              appointments={allAppointments}
              currentDate={calendarDate}
              onDateChange={handleCalendarDateChange}
              onAppointmentClick={handleAppointmentClick}
              onAppointmentUpdate={handleAppointmentUpdate}
              onTimeSlotClick={handleTimeSlotClick}
              showCancelled={showCancelled}
              view={calendarView}
              onViewChange={setCalendarView}
            />
          )}
        </>
      )}
    </div>
  );
};
