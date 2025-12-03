import { Appointment } from '../types';

/**
 * Genera un enlace para agregar un evento a Google Calendar
 * @param appointment - La cita a agregar
 * @returns URL de Google Calendar con el evento
 */
export const generateGoogleCalendarLink = (appointment: Appointment): string => {
  const baseUrl = 'https://calendar.google.com/calendar/render';

  // Formato de fecha para Google Calendar: YYYYMMDDTHHmmssZ
  const formatDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const startDate = new Date(appointment.scheduledDate);
  // Asumimos 1 hora de duración por defecto
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Paciente';

  const serviceName = appointment.service?.name || 'Servicio';

  const title = `${serviceName} - ${patientName}`;

  const details = [
    `Paciente: ${patientName}`,
    `Servicio: ${serviceName}`,
    appointment.service?.basePrice ? `Precio: S/. ${appointment.service.basePrice}` : '',
    appointment.reservationAmount ? `Reserva: S/. ${appointment.reservationAmount}` : '',
    appointment.notes ? `Notas: ${appointment.notes}` : ''
  ].filter(Boolean).join('\\n');

  const location = 'DermicaPro - Clínica';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: details,
    location: location,
    trp: 'false' // No mostrar la pantalla de confirmación
  });

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Abre Google Calendar en una nueva ventana para agregar el evento
 * @param appointment - La cita a agregar
 */
export const addToGoogleCalendar = (appointment: Appointment): void => {
  const url = generateGoogleCalendarLink(appointment);
  window.open(url, '_blank', 'width=600,height=600');
};

/**
 * Genera un archivo .ics para descargar y agregar a cualquier calendario
 * @param appointment - La cita a agregar
 */
export const downloadICSFile = (appointment: Appointment): void => {
  const formatICSDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const startDate = new Date(appointment.scheduledDate);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Paciente';

  const serviceName = appointment.service?.name || 'Servicio';
  const title = `${serviceName} - ${patientName}`;

  const description = [
    `Paciente: ${patientName}`,
    `Servicio: ${serviceName}`,
    appointment.service?.basePrice ? `Precio: S/. ${appointment.service.basePrice}` : '',
    appointment.reservationAmount ? `Reserva: S/. ${appointment.reservationAmount}` : '',
    appointment.notes ? `Notas: ${appointment.notes}` : ''
  ].filter(Boolean).join('\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DermicaPro//Appointment//ES',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@dermicapro.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'LOCATION:DermicaPro - Clínica',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cita-${appointment.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
