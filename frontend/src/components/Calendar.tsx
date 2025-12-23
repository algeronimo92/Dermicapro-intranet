import React, { useState, useEffect } from 'react';
import { Appointment, AppointmentStatus } from '../types';
import { compareDates } from '../utils/dateUtils';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarProps {
  appointments: Appointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentUpdate?: (appointmentId: string, newDate: Date, durationMinutes?: number) => void;
  onTimeSlotClick?: (date: Date, hour: number, minute: number, durationMinutes: number) => void;
  showCancelled?: boolean;
  view?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  appointments,
  currentDate,
  onDateChange,
  onAppointmentClick,
  onAppointmentUpdate,
  onTimeSlotClick,
  showCancelled = false,
  view: controlledView,
  onViewChange
}) => {
  // Filter out cancelled appointments from the calendar unless showCancelled is true
  const activeAppointments = showCancelled
    ? appointments
    : appointments.filter(apt => apt.status !== 'cancelled');

  // Use controlled view if provided, otherwise use local state
  const [internalView, setInternalView] = useState<CalendarView>('week');
  const view = controlledView !== undefined ? controlledView : internalView;
  const setView = (newView: CalendarView) => {
    if (onViewChange) {
      onViewChange(newView);
    } else {
      setInternalView(newView);
    }
  };
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);

  // Hover states for creating new appointments
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  // Resize states
  const [resizingAppointment, setResizingAppointment] = useState<Appointment | null>(null);
  const [resizeEdge, setResizeEdge] = useState<'top' | 'bottom' | null>(null);
  const [resizePreviewTop, setResizePreviewTop] = useState<number | null>(null);
  const [resizePreviewHeight, setResizePreviewHeight] = useState<number | null>(null);

  // Current time indicator state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const statusColors: Record<AppointmentStatus, string> = {
    reserved: '#3498db',
    in_progress: '#f39c12',
    attended: '#27ae60',
    cancelled: '#e74c3c',
    no_show: '#95a5a6'
  };

  // Helper function to get all services for an appointment
  const getAppointmentServices = (apt: Appointment): string => {
    const services: string[] = [];
    if (apt.appointmentServices && apt.appointmentServices.length > 0) {
      apt.appointmentServices.forEach(appSvc => {
        services.push(appSvc.order.service?.name || 'Servicio');
      });
    }
    return services.join(', ') || 'Sin servicio';
  };

  // Helper function to get total sessions count
  const getTotalSessionsCount = (apt: Appointment): number => {
    return apt.appointmentServices?.length || 0;
  };

  // Calculate current time indicator position in pixels
  const getCurrentTimePosition = (): number => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return hours * 60 + minutes; // 1 pixel = 1 minute
  };

  // Check if current time indicator should be shown for a date
  const shouldShowTimeIndicator = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  /**
   * Calculate the height of the blocked past time overlay
   * Returns the minimum allowed time position in pixels (current time + 1 hour rounded)
   */
  const getBlockedPastHeight = (): number => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Add 1 hour
    let minHours = currentHours + 1;
    let minMinutes = currentMinutes;

    // Round up to next 30-minute interval
    if (minMinutes > 0 && minMinutes <= 30) {
      minMinutes = 30;
    } else if (minMinutes > 30) {
      minMinutes = 0;
      minHours += 1;
    }

    // Handle overflow
    if (minHours >= 24) {
      return 0; // Don't show overlay if we're past 11:00 PM
    }

    return minHours * 60 + minMinutes; // Convert to pixels (1px = 1 minute)
  };

  /**
   * Check if a date is in the past (before today)
   */
  const isPastDay = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  /**
   * Check if a time position (in minutes) is in the past for today
   * Returns true if the time is before current time + 1 hour (rounded to 30 min)
   */
  const isPastTimeToday = (date: Date, totalMinutes: number): boolean => {
    // Only check if it's today
    if (!shouldShowTimeIndicator(date)) return false;

    const minAllowedMinutes = getBlockedPastHeight();
    return totalMinutes < minAllowedMinutes;
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
    return activeAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      return isSameDay(aptDate, date);
    }).sort((a, b) => compareDates(a.scheduledDate, b.scheduledDate));
  };

  // Helper function to calculate overlapping appointments layout
  const calculateAppointmentLayout = (appointments: Appointment[]): Map<string, { left: string; width: string; zIndex: number }> => {
    const layout = new Map<string, { left: string; width: string; zIndex: number }>();

    // Group overlapping appointments
    const groups: Appointment[][] = [];

    appointments.forEach(apt => {
      const aptStart = new Date(apt.scheduledDate).getTime();
      const aptEnd = aptStart + (apt.durationMinutes || 60) * 60 * 1000;

      // Find ALL groups this appointment overlaps with
      const overlappingGroups: number[] = [];
      groups.forEach((group, index) => {
        const overlaps = group.some(existing => {
          const existingStart = new Date(existing.scheduledDate).getTime();
          const existingEnd = existingStart + (existing.durationMinutes || 60) * 60 * 1000;
          return (aptStart < existingEnd && aptEnd > existingStart);
        });

        if (overlaps) {
          overlappingGroups.push(index);
        }
      });

      if (overlappingGroups.length === 0) {
        // No overlaps, create new group
        groups.push([apt]);
      } else if (overlappingGroups.length === 1) {
        // Overlaps with one group, add to it
        groups[overlappingGroups[0]].push(apt);
      } else {
        // Overlaps with multiple groups, merge them all
        const mergedGroup: Appointment[] = [apt];
        // Merge all overlapping groups (in reverse order to maintain indices)
        overlappingGroups.reverse().forEach(groupIndex => {
          mergedGroup.push(...groups[groupIndex]);
          groups.splice(groupIndex, 1);
        });
        groups.push(mergedGroup);
      }
    });

    // Calculate position for each group
    groups.forEach(group => {
      const columns = group.length;
      group.forEach((apt, index) => {
        const widthPercent = 100 / columns;
        const leftPercent = (index * widthPercent);
        layout.set(apt.id, {
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          zIndex: 5 + index
        });
      });
    });

    return layout;
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, apt: Appointment) => {
    const appointmentDate = new Date(apt.scheduledDate);

    // No permitir arrastrar eventos de días pasados
    if (isPastDay(appointmentDate)) {
      e.preventDefault();
      return;
    }

    // No permitir arrastrar eventos de horas pasadas del día actual
    const aptHours = appointmentDate.getHours();
    const aptMinutes = appointmentDate.getMinutes();
    const aptTotalMinutes = aptHours * 60 + aptMinutes;

    if (isPastTimeToday(appointmentDate, aptTotalMinutes)) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', apt.id);

    // Capturar el offset desde donde el usuario hace clic en la caja
    if (e.currentTarget instanceof HTMLElement) {
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      setDragOffsetY(offsetY);
    }

    setDraggedAppointment(apt);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedAppointment(null);
    setIsDragging(false);
    setDragOverDate(null);
    setDragPreviewPosition(null);
    setDragOffsetY(0);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedAppointment) return;

    // No permitir arrastrar a días pasados
    if (isPastDay(date)) {
      setDragOverDate(null);
      setDragPreviewPosition(null);
      return;
    }

    const column = e.currentTarget;
    const rect = column.getBoundingClientRect();
    // Restar el offset para que la caja se posicione desde su parte superior, no desde el cursor
    const mouseY = e.clientY - rect.top - dragOffsetY;

    // Convert pixel position to minutes, round to 15-minute intervals
    const totalMinutes = Math.max(0, Math.round(mouseY / 15) * 15);

    // No permitir arrastrar a horas pasadas del día actual
    if (isPastTimeToday(date, totalMinutes)) {
      setDragOverDate(null);
      setDragPreviewPosition(null);
      return;
    }

    setDragOverDate(date);
    setDragPreviewPosition(totalMinutes);
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedAppointment || !onAppointmentUpdate) return;

    // No permitir soltar en días pasados
    if (isPastDay(date)) {
      setDraggedAppointment(null);
      setDragOverDate(null);
      setDragPreviewPosition(null);
      setIsDragging(false);
      setDragOffsetY(0);
      return;
    }

    const column = e.currentTarget;
    const rect = column.getBoundingClientRect();
    // Restar el offset para que la caja se posicione desde su parte superior, no desde el cursor
    const mouseY = e.clientY - rect.top - dragOffsetY;

    // Convert pixel position to minutes and round to 15-minute intervals
    const totalMinutes = Math.max(0, Math.round(mouseY / 15) * 15);

    // No permitir soltar en horas pasadas del día actual
    if (isPastTimeToday(date, totalMinutes)) {
      setDraggedAppointment(null);
      setDragOverDate(null);
      setDragPreviewPosition(null);
      setIsDragging(false);
      setDragOffsetY(0);
      return;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);

    onAppointmentUpdate(draggedAppointment.id, newDate);

    setDraggedAppointment(null);
    setIsDragging(false);
    setDragOverDate(null);
    setDragPreviewPosition(null);
    setDragOffsetY(0);
  };

  // Hover handlers for creating new appointments
  const handleColumnMouseMove = (e: React.MouseEvent, date: Date) => {
    // No mostrar el helper si estamos arrastrando o redimensionando
    if (isDragging || resizingAppointment) return;

    // No mostrar helper en días pasados
    if (isPastDay(date)) {
      setHoverDate(null);
      setHoverPosition(null);
      return;
    }

    // Verificar si el mouse está sobre un evento existente
    const target = e.target as HTMLElement;
    if (target.closest('.appointment-block')) {
      // Está sobre un evento, ocultar el helper
      setHoverDate(null);
      setHoverPosition(null);
      return;
    }

    const column = e.currentTarget;
    const rect = column.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;

    // Convert pixel position to minutes, redondear hacia abajo a intervalos de 15 minutos
    const totalMinutes = Math.max(0, Math.floor(mouseY / 15) * 15);

    // Validar hora mínima si es el día actual
    const today = new Date();
    const isToday = (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );

    if (isToday) {
      // Calcular hora mínima: hora actual + 1 hora, redondeada a siguiente intervalo de 30 min
      const currentHours = today.getHours();
      const currentMinutes = today.getMinutes();

      let minHours = currentHours + 1;
      let minMinutes = currentMinutes;

      // Redondear al siguiente intervalo de 30 minutos
      if (minMinutes > 0 && minMinutes <= 30) {
        minMinutes = 30;
      } else if (minMinutes > 30) {
        minMinutes = 0;
        minHours += 1;
      }

      // Manejar overflow de 24 horas
      if (minHours >= 24) {
        minHours = 23;
        minMinutes = 30;
      }

      const minTotalMinutes = minHours * 60 + minMinutes;

      // No mostrar helper si la hora es menor a la mínima permitida
      if (totalMinutes < minTotalMinutes) {
        setHoverDate(null);
        setHoverPosition(null);
        return;
      }
    }

    setHoverDate(date);
    setHoverPosition(totalMinutes);
  };

  const handleColumnMouseLeave = () => {
    setHoverDate(null);
    setHoverPosition(null);
  };

  const handleTimeSlotClick = (date: Date, minutes: number) => {
    if (!onTimeSlotClick) return;

    // No permitir clics en días pasados
    if (isPastDay(date)) {
      return;
    }

    let finalMinutes = minutes;
    let hours = Math.floor(finalMinutes / 60);
    let mins = finalMinutes % 60;
    const durationMinutes = 60; // Duración del helper (1 hora)

    // Validar hora mínima si es el día actual
    const today = new Date();
    const isToday = (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );

    if (isToday) {
      // Calcular hora mínima: hora actual + 1 hora, redondeada a siguiente intervalo de 30 min
      const currentHours = today.getHours();
      const currentMinutes = today.getMinutes();

      let minHours = currentHours + 1;
      let minMinutes = currentMinutes;

      // Redondear al siguiente intervalo de 30 minutos
      if (minMinutes > 0 && minMinutes <= 30) {
        minMinutes = 30;
      } else if (minMinutes > 30) {
        minMinutes = 0;
        minHours += 1;
      }

      // Manejar overflow de 24 horas
      if (minHours >= 24) {
        minHours = 23;
        minMinutes = 30;
      }

      const minTotalMinutes = minHours * 60 + minMinutes;

      // Si la hora seleccionada es menor a la mínima, usar la mínima
      if (finalMinutes < minTotalMinutes) {
        finalMinutes = minTotalMinutes;
        hours = Math.floor(finalMinutes / 60);
        mins = finalMinutes % 60;
      }
    }

    onTimeSlotClick(date, hours, mins, durationMinutes);
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, apt: Appointment, edge: 'top' | 'bottom') => {
    e.stopPropagation();
    e.preventDefault();
    setResizingAppointment(apt);
    setResizeEdge(edge);

    const aptDate = new Date(apt.scheduledDate);
    const startMinutes = aptDate.getHours() * 60 + aptDate.getMinutes();
    const duration = apt.durationMinutes || 60;

    setResizePreviewTop(startMinutes);
    setResizePreviewHeight(duration);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingAppointment || !resizeEdge) return;

    // Find the day column element
    const dayColumn = document.elementFromPoint(e.clientX, e.clientY)?.closest('.day-column');
    if (!dayColumn) return;

    const rect = dayColumn.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;

    // Convert mouse position to minutes from start of day
    const mouseMinutes = Math.round(mouseY);

    const aptDate = new Date(resizingAppointment.scheduledDate);
    const startMinutes = aptDate.getHours() * 60 + aptDate.getMinutes();
    const duration = resizingAppointment.durationMinutes || 60;
    const endMinutes = startMinutes + duration;

    const MIN_DURATION = 30; // Minimum duration in minutes

    let newTop = startMinutes;
    let newHeight = duration;

    if (resizeEdge === 'top') {
      // Resizing from top - adjust start time, keep end time fixed
      const roundedMinutes = Math.round(mouseMinutes / 15) * 15;
      newTop = Math.max(0, Math.min(roundedMinutes, endMinutes - MIN_DURATION));
      newHeight = endMinutes - newTop;
    } else {
      // Resizing from bottom - adjust end time, keep start time fixed
      const roundedMinutes = Math.round(mouseMinutes / 15) * 15;
      const newEnd = Math.max(startMinutes + MIN_DURATION, roundedMinutes);
      newHeight = newEnd - startMinutes;
    }

    setResizePreviewTop(newTop);
    setResizePreviewHeight(newHeight);
  };

  const handleResizeEnd = (e: MouseEvent) => {
    if (!resizingAppointment || !onAppointmentUpdate || !resizeEdge) {
      setResizingAppointment(null);
      setResizeEdge(null);
      setResizePreviewTop(null);
      setResizePreviewHeight(null);
      return;
    }

    const aptDate = new Date(resizingAppointment.scheduledDate);
    const newStartMinutes = resizePreviewTop!;
    const newDuration = resizePreviewHeight!;

    const newStartHour = Math.floor(newStartMinutes / 60);
    const newStartMinute = newStartMinutes % 60;

    const newDate = new Date(aptDate);
    newDate.setHours(newStartHour, newStartMinute, 0, 0);

    // Update appointment with new time and duration
    onAppointmentUpdate(resizingAppointment.id, newDate, newDuration);

    setResizingAppointment(null);
    setResizeEdge(null);
    setResizePreviewTop(null);
    setResizePreviewHeight(null);
  };

  // Add global event listeners for resize
  React.useEffect(() => {
    if (resizingAppointment) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingAppointment, resizeEdge, resizePreviewTop, resizePreviewHeight]);

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
            const showHover = !isDragging && hoverDate && isSameDay(hoverDate, date) && hoverPosition !== null;

            return (
              <div
                key={date.toISOString()}
                className={`day-column ${isToday(date) ? 'today' : ''} ${isPastDay(date) ? 'past-day' : ''}`}
                onDragOver={(e) => handleDragOver(e, date)}
                onDrop={(e) => handleDrop(e, date)}
                onMouseMove={(e) => handleColumnMouseMove(e, date)}
                onMouseLeave={handleColumnMouseLeave}
              >
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="hour-slot"
                  />
                ))}

                {/* Full day blocked overlay for past days */}
                {isPastDay(date) && (
                  <div className="blocked-past-day-overlay" />
                )}

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

                {/* Hover helper for creating new appointments */}
                {showHover && (
                  <div
                    className="hover-helper-indicator"
                    style={{
                      top: `${hoverPosition}px`,
                      height: '60px',
                      cursor: onTimeSlotClick ? 'pointer' : 'default',
                    }}
                    onClick={() => onTimeSlotClick && handleTimeSlotClick(date, hoverPosition)}
                  >
                    <div className="helper-time-label">
                      {(() => {
                        const hours = Math.floor(hoverPosition / 60);
                        const mins = hoverPosition % 60;
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

                {/* Resize preview indicator */}
                {resizingAppointment && isSameDay(new Date(resizingAppointment.scheduledDate), date) && resizePreviewTop !== null && resizePreviewHeight !== null && (
                  <div
                    className="resize-preview-indicator"
                    style={{
                      top: `${resizePreviewTop}px`,
                      height: `${resizePreviewHeight}px`,
                      backgroundColor: statusColors[resizingAppointment.status],
                    }}
                  >
                    <div className="preview-time-label">
                      {(() => {
                        const startHours = Math.floor(resizePreviewTop / 60);
                        const startMins = resizePreviewTop % 60;
                        const endMinutes = resizePreviewTop + resizePreviewHeight;
                        const endHours = Math.floor(endMinutes / 60);
                        const endMins = endMinutes % 60;
                        return `${startHours.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')} - ${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                      })()}
                    </div>
                  </div>
                )}

                {(() => {
                  const appointmentLayout = calculateAppointmentLayout(dayAppointments);

                  return dayAppointments.map(apt => {
                    const aptDate = new Date(apt.scheduledDate);
                    const hour = aptDate.getHours();
                    const minute = aptDate.getMinutes();
                    const top = hour * 60 + minute; // Each hour = 60px, each minute = 1px
                    const height = apt.durationMinutes || 60; // Height in pixels (1px per minute)
                    const isResizing = resizingAppointment?.id === apt.id;
                    const isDraggingThis = draggedAppointment?.id === apt.id;
                    const layout = appointmentLayout.get(apt.id) || { left: '4px', width: 'calc(100% - 8px)', zIndex: 5 };

                    // Check if appointment is in blocked time zone
                    const aptTotalMinutes = hour * 60 + minute;
                    const isInPastDay = isPastDay(aptDate);
                    const isInPastTime = isPastTimeToday(aptDate, aptTotalMinutes);
                    const isBlocked = isInPastDay || isInPastTime;

                    return (
                      <div
                        key={apt.id}
                        className={`appointment-block ${isResizing ? 'resizing' : ''} ${isDraggingThis ? 'dragging-block' : ''} ${isBlocked ? 'blocked-appointment' : ''}`}
                        draggable={!!onAppointmentUpdate && !isResizing && !isBlocked}
                        onDragStart={(e) => handleDragStart(e, apt)}
                        onDragEnd={handleDragEnd}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: layout.left,
                          width: layout.width,
                          right: 'auto',
                          backgroundColor: statusColors[apt.status],
                          cursor: isBlocked ? 'pointer' : (onAppointmentUpdate && !isResizing ? 'move' : 'pointer'),
                          opacity: isResizing ? 0.3 : undefined,
                          zIndex: layout.zIndex,
                        }}
                      onClick={() => !isResizing && onAppointmentClick(apt)}
                    >
                      {/* Resize handle - top */}
                      {onAppointmentUpdate && !isResizing && (
                        <div
                          className="resize-handle resize-handle-top"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleResizeStart(e, apt, 'top');
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      <div className="apt-time">
                        {aptDate.toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="apt-title">
                        {apt.patient?.firstName} {apt.patient?.lastName}
                      </div>
                      <div className="apt-service">
                        {getTotalSessionsCount(apt) > 1 && (
                          <span style={{ fontWeight: 'bold', marginRight: '4px' }}>
                            ({getTotalSessionsCount(apt)} sesiones)
                          </span>
                        )}
                        {getAppointmentServices(apt)}
                      </div>

                      {/* Resize handle - bottom */}
                      {onAppointmentUpdate && !isResizing && (
                        <div
                          className="resize-handle resize-handle-bottom"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleResizeStart(e, apt, 'bottom');
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  );
                  });
                })()}

                {/* Blocked past time overlay */}
                {shouldShowTimeIndicator(date) && getBlockedPastHeight() > 0 && (
                  <div
                    className="blocked-past-overlay"
                    style={{
                      height: `${getBlockedPastHeight()}px`,
                    }}
                  />
                )}

                {/* Current time indicator */}
                {shouldShowTimeIndicator(date) && (
                  <div
                    className="current-time-indicator"
                    style={{
                      top: `${getCurrentTimePosition()}px`,
                    }}
                  >
                    <div className="time-indicator-dot"></div>
                    <div className="time-indicator-line"></div>
                    <div className="time-indicator-label">
                      {currentTime.toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}
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
    const showPreview = draggedAppointment && dragPreviewPosition !== null;
    const showHover = !isDragging && hoverPosition !== null;

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
          <div
            className={`events-column ${isToday(currentDate) ? 'today' : ''} ${isPastDay(currentDate) ? 'past-day' : ''}`}
            onDragOver={(e) => handleDragOver(e, currentDate)}
            onDrop={(e) => handleDrop(e, currentDate)}
            onMouseMove={(e) => handleColumnMouseMove(e, currentDate)}
            onMouseLeave={handleColumnMouseLeave}
          >
            {hours.map(hour => (
              <div key={hour} className="hour-slot" />
            ))}

            {/* Full day blocked overlay for past days */}
            {isPastDay(currentDate) && (
              <div className="blocked-past-day-overlay" />
            )}

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

            {/* Hover helper for creating new appointments */}
            {showHover && (
              <div
                className="hover-helper-indicator"
                style={{
                  top: `${hoverPosition}px`,
                  height: '60px',
                  cursor: onTimeSlotClick ? 'pointer' : 'default',
                }}
                onClick={() => onTimeSlotClick && handleTimeSlotClick(currentDate, hoverPosition)}
              >
                <div className="helper-time-label">
                  {(() => {
                    const hours = Math.floor(hoverPosition / 60);
                    const mins = hoverPosition % 60;
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

            {/* Resize preview indicator */}
            {resizingAppointment && isSameDay(new Date(resizingAppointment.scheduledDate), currentDate) && resizePreviewTop !== null && resizePreviewHeight !== null && (
              <div
                className="resize-preview-indicator"
                style={{
                  top: `${resizePreviewTop}px`,
                  height: `${resizePreviewHeight}px`,
                  backgroundColor: statusColors[resizingAppointment.status],
                }}
              >
                <div className="preview-time-label">
                  {(() => {
                    const startHours = Math.floor(resizePreviewTop / 60);
                    const startMins = resizePreviewTop % 60;
                    const endMinutes = resizePreviewTop + resizePreviewHeight;
                    const endHours = Math.floor(endMinutes / 60);
                    const endMins = endMinutes % 60;
                    return `${startHours.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')} - ${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                  })()}
                </div>
              </div>
            )}

            {(() => {
              const appointmentLayout = calculateAppointmentLayout(dayAppointments);

              return dayAppointments.map(apt => {
                const aptDate = new Date(apt.scheduledDate);
                const hour = aptDate.getHours();
                const minute = aptDate.getMinutes();
                const top = hour * 60 + minute; // Each hour = 60px, each minute = 1px
                const height = apt.durationMinutes || 60; // Height in pixels (1px per minute)
                const isResizing = resizingAppointment?.id === apt.id;
                const isDraggingThis = draggedAppointment?.id === apt.id;
                const layout = appointmentLayout.get(apt.id) || { left: '4px', width: 'calc(100% - 8px)', zIndex: 5 };

                // Check if appointment is in blocked time zone
                const aptTotalMinutes = hour * 60 + minute;
                const isInPastDay = isPastDay(aptDate);
                const isInPastTime = isPastTimeToday(aptDate, aptTotalMinutes);
                const isBlocked = isInPastDay || isInPastTime;

                return (
                  <div
                    key={apt.id}
                    className={`appointment-block ${isResizing ? 'resizing' : ''} ${isDraggingThis ? 'dragging-block' : ''} ${isBlocked ? 'blocked-appointment' : ''}`}
                    draggable={!!onAppointmentUpdate && !isResizing && !isBlocked}
                    onDragStart={(e) => handleDragStart(e, apt)}
                    onDragEnd={handleDragEnd}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: layout.left,
                      width: layout.width,
                      right: 'auto',
                      backgroundColor: statusColors[apt.status],
                      cursor: isBlocked ? 'pointer' : (onAppointmentUpdate && !isResizing ? 'move' : 'pointer'),
                      opacity: isResizing ? 0.3 : undefined,
                      zIndex: layout.zIndex,
                    }}
                    onClick={() => !isResizing && onAppointmentClick(apt)}
                  >
                    {/* Resize handle - top */}
                    {onAppointmentUpdate && !isResizing && (
                      <div
                        className="resize-handle resize-handle-top"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(e, apt, 'top');
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}

                    <div className="apt-time">
                      {aptDate.toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="apt-title">
                      {apt.patient?.firstName} {apt.patient?.lastName}
                    </div>
                    <div className="apt-service">
                      {getTotalSessionsCount(apt) > 1 && (
                        <span style={{ fontWeight: 'bold', marginRight: '4px' }}>
                          ({getTotalSessionsCount(apt)} sesiones)
                        </span>
                      )}
                      {getAppointmentServices(apt)}
                    </div>

                    {/* Resize handle - bottom */}
                    {onAppointmentUpdate && !isResizing && (
                      <div
                        className="resize-handle resize-handle-bottom"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(e, apt, 'bottom');
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                );
              });
            })()}

            {/* Blocked past time overlay */}
            {shouldShowTimeIndicator(currentDate) && getBlockedPastHeight() > 0 && (
              <div
                className="blocked-past-overlay"
                style={{
                  height: `${getBlockedPastHeight()}px`,
                }}
              />
            )}

            {/* Current time indicator */}
            {shouldShowTimeIndicator(currentDate) && (
              <div
                className="current-time-indicator"
                style={{
                  top: `${getCurrentTimePosition()}px`,
                }}
              >
                <div className="time-indicator-dot"></div>
                <div className="time-indicator-line"></div>
                <div className="time-indicator-label">
                  {currentTime.toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`calendar-container-v2 ${isDragging ? 'dragging' : ''}`}>
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
