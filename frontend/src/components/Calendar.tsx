import React, { useState } from 'react';
import { Appointment, AppointmentStatus } from '../types';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentUpdate?: (appointmentId: string, newDate: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  appointments,
  currentDate,
  onDateChange,
  onAppointmentClick,
  onAppointmentUpdate
}) => {
  const [view, setView] = useState<CalendarView>('week');
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [dragOverTime, setDragOverTime] = useState<number | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<number | null>(null);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const statusColors: Record<AppointmentStatus, string> = {
    reserved: '#3498db',
    attended: '#27ae60',
    cancelled: '#e74c3c',
    no_show: '#f39c12'
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getTitle = (): string => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (view === 'month') {
      return `${monthNames[month]} ${year}`;
    } else if (view === 'week') {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${monthNames[weekStart.getMonth()]} ${year}`;
      } else {
        return `${monthNames[weekStart.getMonth()]} - ${monthNames[weekEnd.getMonth()]} ${year}`;
      }
    } else {
      return `${currentDate.getDate()} ${monthNames[month]} ${year}`;
    }
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Lunes como primer día
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const getAppointmentsForDay = (date: Date): Appointment[] => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      return isSameDay(aptDate, date);
    }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, apt: Appointment) => {
    setDraggedAppointment(apt);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedAppointment(null);
    setDragOverDate(null);
    setDragOverTime(null);
    setDragPreviewPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
    setDragOverTime(hour);

    // Calculate preview position with 15-minute precision
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const slotHeight = rect.height; // Should be 60px

    // Calculate minutes within this hour slot (0-60)
    const exactMinutes = (offsetY / slotHeight) * 60;

    // Round to nearest 15-minute interval
    const roundedMinutes = Math.round(exactMinutes / 15) * 15;

    // Handle overflow to next hour
    let finalHour = hour;
    let finalMinutes = roundedMinutes;

    if (roundedMinutes >= 60) {
      finalHour = hour + 1;
      finalMinutes = 0;
    }

    // Calculate exact pixel position for preview
    // Each hour = 60px, each minute = 1px
    const previewTop = finalHour * 60 + finalMinutes;

    setDragPreviewPosition(previewTop);
  };

  const handleDrop = (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();

    if (!draggedAppointment || !onAppointmentUpdate) return;

    // Calculate new date/time with 15-minute precision
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const slotHeight = rect.height; // Height of one hour slot (60px)

    // Calculate exact minutes in the hour (0-60)
    const exactMinutes = (offsetY / slotHeight) * 60;

    // Round to nearest 15-minute interval
    const minutes = Math.round(exactMinutes / 15) * 15;

    // Ensure minutes stay within 0-45 (if it rounds to 60, it should go to next hour)
    const finalMinutes = minutes >= 60 ? 0 : minutes;
    const finalHour = minutes >= 60 ? hour + 1 : hour;

    const newDate = new Date(date);
    newDate.setHours(finalHour, finalMinutes, 0, 0);

    // Update appointment
    onAppointmentUpdate(draggedAppointment.id, newDate);

    // Reset drag state
    setDraggedAppointment(null);
    setDragOverDate(null);
    setDragOverTime(null);
    setDragPreviewPosition(null);
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // Días vacíos al inicio
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return (
      <div className="calendar-month-view">
        <div className="calendar-weekdays">
          {dayNamesShort.map(name => (
            <div key={name} className="calendar-weekday">
              {name}
            </div>
          ))}
        </div>
        <div className="calendar-days-grid">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="calendar-day-cell empty" />;
            }

            const dayAppointments = getAppointmentsForDay(date);
            const isTodayDay = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={`calendar-day-cell ${isTodayDay ? 'today' : ''}`}
              >
                <div className="day-number">{date.getDate()}</div>
                <div className="day-appointments">
                  {dayAppointments.slice(0, 3).map(apt => {
                    const time = new Date(apt.scheduledDate).toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return (
                      <div
                        key={apt.id}
                        className="appointment-item"
                        style={{ borderLeftColor: statusColors[apt.status] }}
                        onClick={() => onAppointmentClick(apt)}
                      >
                        <span className="apt-time">{time}</span>
                        <span className="apt-patient">
                          {apt.patient?.firstName} {apt.patient?.lastName}
                        </span>
                      </div>
                    );
                  })}
                  {dayAppointments.length > 3 && (
                    <div className="more-appointments">
                      +{dayAppointments.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const weekDays: Date[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      weekDays.push(date);
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="calendar-week-view">
        <div className="week-header">
          <div className="time-gutter">GMT-5</div>
          {weekDays.map(date => (
            <div
              key={date.toISOString()}
              className={`week-day-header ${isToday(date) ? 'today' : ''}`}
            >
              <div className="day-name">{dayNames[date.getDay()]}</div>
              <div className="day-date">{date.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="week-grid">
          <div className="time-column">
            {hours.map(hour => (
              <div key={hour} className="time-slot">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          {weekDays.map(date => {
            const dayAppointments = getAppointmentsForDay(date);
            const showPreview = draggedAppointment && dragOverDate && isSameDay(dragOverDate, date) && dragPreviewPosition !== null;

            return (
              <div
                key={date.toISOString()}
                className={`day-column ${isToday(date) ? 'today' : ''}`}
              >
                {hours.map(hour => {
                  const isDragOver = dragOverDate && isSameDay(dragOverDate, date) && dragOverTime === hour;
                  return (
                    <div
                      key={hour}
                      className={`hour-slot ${isDragOver ? 'drag-over' : ''}`}
                      onDragOver={(e) => handleDragOver(e, date, hour)}
                      onDrop={(e) => handleDrop(e, date, hour)}
                    />
                  );
                })}

                {/* Drag preview indicator */}
                {showPreview && (
                  <div
                    className="drag-preview-indicator"
                    style={{
                      top: `${dragPreviewPosition}px`,
                      height: `${draggedAppointment.durationMinutes || 60}px`,
                    }}
                  >
                    <div className="preview-time-label">
                      {(() => {
                        const hours = Math.floor(dragPreviewPosition / 60);
                        const mins = dragPreviewPosition % 60;
                        const date = new Date();
                        date.setHours(hours, mins, 0, 0);
                        return date.toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      })()}
                    </div>
                  </div>
                )}

                {dayAppointments.map(apt => {
                  const aptDate = new Date(apt.scheduledDate);
                  const hour = aptDate.getHours();
                  const minute = aptDate.getMinutes();
                  const top = hour * 60 + minute; // Each hour = 60px, each minute = 1px
                  const height = apt.durationMinutes || 60; // Height in pixels (1px per minute)

                  return (
                    <div
                      key={apt.id}
                      className="appointment-block"
                      draggable={!!onAppointmentUpdate}
                      onDragStart={(e) => handleDragStart(e, apt)}
                      onDragEnd={handleDragEnd}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: statusColors[apt.status],
                        cursor: onAppointmentUpdate ? 'move' : 'pointer',
                      }}
                      onClick={() => onAppointmentClick(apt)}
                    >
                      <div className="apt-time">
                        {aptDate.toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="apt-title">
                        {apt.patient?.firstName} {apt.patient?.lastName}
                      </div>
                      <div className="apt-service">{apt.service?.name}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDay(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="calendar-day-view">
        <div className="day-header">
          <div className="time-gutter">GMT-5</div>
          <div className="day-header-info">
            <div className="day-name">{dayNames[currentDate.getDay()]}</div>
            <div className="day-date">{currentDate.getDate()}</div>
          </div>
        </div>
        <div className="day-grid">
          <div className="time-column">
            {hours.map(hour => (
              <div key={hour} className="time-slot">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          <div className="events-column">
            {hours.map(hour => (
              <div key={hour} className="hour-slot" />
            ))}
            {dayAppointments.map(apt => {
              const aptDate = new Date(apt.scheduledDate);
              const hour = aptDate.getHours();
              const minute = aptDate.getMinutes();
              const top = hour * 60 + minute; // Each hour = 60px, each minute = 1px
              const height = apt.durationMinutes || 60; // Height in pixels (1px per minute)

              return (
                <div
                  key={apt.id}
                  className="appointment-block"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    backgroundColor: statusColors[apt.status],
                  }}
                  onClick={() => onAppointmentClick(apt)}
                >
                  <div className="apt-time">
                    {aptDate.toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="apt-title">
                    {apt.patient?.firstName} {apt.patient?.lastName}
                  </div>
                  <div className="apt-service">{apt.service?.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-container-v2">
      <div className="calendar-toolbar">
        <div className="calendar-nav-controls">
          <button className="btn-today" onClick={handleToday}>
            Hoy
          </button>
          <div className="nav-buttons">
            <button className="btn-nav" onClick={handlePrev}>
              ←
            </button>
            <button className="btn-nav" onClick={handleNext}>
              →
            </button>
          </div>
          <h2 className="calendar-title-v2">{getTitle()}</h2>
        </div>

        <div className="view-switcher">
          <button
            className={`view-btn ${view === 'day' ? 'active' : ''}`}
            onClick={() => setView('day')}
          >
            Día
          </button>
          <button
            className={`view-btn ${view === 'week' ? 'active' : ''}`}
            onClick={() => setView('week')}
          >
            Semana
          </button>
          <button
            className={`view-btn ${view === 'month' ? 'active' : ''}`}
            onClick={() => setView('month')}
          >
            Mes
          </button>
        </div>
      </div>

      <div className="calendar-content">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>
    </div>
  );
};
