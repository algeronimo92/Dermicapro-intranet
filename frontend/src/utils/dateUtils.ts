/**
 * Date Utilities - Manejo profesional de fechas y zonas horarias
 *
 * PRINCIPIOS:
 * 1. El backend SIEMPRE trabaja en UTC
 * 2. El frontend SIEMPRE muestra en hora local del usuario
 * 3. NUNCA usar .toISOString().split('T')[0] para obtener fecha local
 * 4. NUNCA mezclar comparaciones UTC con local
 *
 * @author DermicaPro Team
 * @version 2.0
 */

// ============================================
// CONSTANTES
// ============================================

const PERU_TIMEZONE = 'America/Lima'; // GMT-5
const LOCALE_ES_PE = 'es-PE';

// ============================================
// OBTENER FECHA/HORA LOCAL (SIN UTC)
// ============================================

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (LOCAL, no UTC)
 *
 * ❌ INCORRECTO: new Date().toISOString().split('T')[0]
 * ✅ CORRECTO: getLocalDateString()
 *
 * @returns string - Fecha local en formato YYYY-MM-DD
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la fecha y hora actual en formato YYYY-MM-DDTHH:mm (LOCAL)
 * Útil para inputs datetime-local
 *
 * @returns string - Fecha y hora local en formato ISO sin timezone
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Agrega días a una fecha (en hora local)
 *
 * ❌ INCORRECTO: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
 * ✅ CORRECTO: addDays(new Date(), 7)
 *
 * @param date - Fecha base
 * @param days - Número de días a agregar (puede ser negativo)
 * @returns Date - Nueva fecha
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Agrega horas a una fecha
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Agrega minutos a una fecha
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

// ============================================
// CONVERSIÓN: LOCAL ↔ UTC
// ============================================

/**
 * Convierte una fecha/hora local a UTC (para enviar al backend)
 *
 * Uso: Cuando el usuario selecciona "2025-12-06T14:30" en un input,
 * esto es HORA LOCAL. Para enviarlo al backend, debemos convertir a UTC.
 *
 * @param localDateTimeString - Fecha en formato YYYY-MM-DDTHH:mm (LOCAL)
 * @returns string - Fecha en formato ISO 8601 con Z (UTC)
 */
export function localToUTC(localDateTimeString: string): string {
  // Crear fecha en hora LOCAL (sin timezone)
  const date = new Date(localDateTimeString);

  // Convertir a UTC (ISO string)
  return date.toISOString();
}

/**
 * Convierte una fecha UTC a formato local YYYY-MM-DDTHH:mm
 *
 * Uso: Cuando el backend retorna "2025-12-06T19:30:00Z" (UTC),
 * esto debe mostrarse como "2025-12-06T14:30" (hora local en Perú GMT-5)
 *
 * @param utcString - Fecha en formato ISO 8601 con Z (UTC)
 * @returns string - Fecha local en formato YYYY-MM-DDTHH:mm
 */
export function utcToLocal(utcString: string): string {
  if (!utcString) return '';

  const date = new Date(utcString);

  if (isNaN(date.getTime())) {
    console.warn('Invalid UTC string:', utcString);
    return '';
  }

  return getLocalDateTimeString(date);
}

/**
 * Convierte una fecha UTC a solo la fecha local YYYY-MM-DD
 */
export function utcToLocalDate(utcString: string): string {
  if (!utcString) return '';

  const date = new Date(utcString);

  if (isNaN(date.getTime())) {
    console.warn('Invalid UTC string:', utcString);
    return '';
  }

  return getLocalDateString(date);
}

// ============================================
// PARSEO SEGURO DE FECHAS
// ============================================

/**
 * Parsea una fecha YYYY-MM-DD de forma segura (siempre local)
 *
 * ❌ INCORRECTO: new Date("2025-12-06") → interpreta como UTC midnight
 * ✅ CORRECTO: parseLocalDate("2025-12-06") → crea fecha local
 *
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns Date - Fecha en hora local a las 00:00:00
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Parsea una fecha y hora YYYY-MM-DDTHH:mm de forma segura
 *
 * @param dateTimeString - Fecha en formato YYYY-MM-DDTHH:mm
 * @returns Date - Fecha en hora local
 */
export function parseLocalDateTime(dateTimeString: string): Date {
  const [dateStr, timeStr] = dateTimeString.split('T');
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

// ============================================
// COMPARACIÓN DE FECHAS
// ============================================

/**
 * Compara si date1 es anterior a date2 (ignorando horas)
 *
 * @param date1 - Primera fecha
 * @param date2 - Segunda fecha
 * @returns boolean - true si date1 < date2
 */
export function isDateBefore(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return d1.getTime() < d2.getTime();
}

/**
 * Compara si date1 es posterior a date2 (ignorando horas)
 */
export function isDateAfter(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return d1.getTime() > d2.getTime();
}

/**
 * Compara si dos fechas son el mismo día (ignorando horas)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Compara si dateTime1 es anterior a dateTime2 (incluyendo horas)
 */
export function isDateTimeBefore(dateTime1: Date, dateTime2: Date): boolean {
  return dateTime1.getTime() < dateTime2.getTime();
}

/**
 * Compara si dateTime1 es posterior a dateTime2 (incluyendo horas)
 */
export function isDateTimeAfter(dateTime1: Date, dateTime2: Date): boolean {
  return dateTime1.getTime() > dateTime2.getTime();
}

// ============================================
// FORMATEO PARA DISPLAY
// ============================================

/**
 * Formatea una fecha para mostrar en español
 *
 * @param date - Fecha a formatear
 * @param options - Opciones de Intl.DateTimeFormat
 * @returns string - Fecha formateada
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }

  return dateObj.toLocaleDateString(LOCALE_ES_PE, options);
}

/**
 * Formatea una fecha y hora para mostrar en español
 */
export function formatDateTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }

  return dateObj.toLocaleDateString(LOCALE_ES_PE, options);
}

/**
 * Formatea solo la hora
 */
export function formatTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Hora inválida';
  }

  return dateObj.toLocaleTimeString(LOCALE_ES_PE, options);
}

// ============================================
// VALIDACIÓN
// ============================================

/**
 * Valida si un string es una fecha válida
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Valida si una fecha está en el pasado (comparando solo fechas, no horas)
 */
export function isInPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseLocalDateTime(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compareDate = new Date(dateObj);
  compareDate.setHours(0, 0, 0, 0);

  return compareDate < today;
}

/**
 * Valida si una fecha/hora está en el pasado (incluyendo horas)
 */
export function isDateTimeInPast(dateTime: Date | string): boolean {
  const dateObj = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  return dateObj.getTime() < Date.now();
}

/**
 * Valida si una fecha está dentro de un rango
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const time = date.getTime();
  return time >= startDate.getTime() && time <= endDate.getTime();
}

// ============================================
// UTILIDADES DE RANGO
// ============================================

/**
 * Obtiene el primer día del mes (local)
 */
export function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Obtiene el último día del mes (local)
 */
export function getLastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Obtiene el inicio de la semana (lunes)
 */
export function getStartOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Si es domingo (0), retrocede 6 días
  return addDays(date, diff);
}

/**
 * Obtiene el fin de la semana (domingo)
 */
export function getEndOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  return addDays(date, diff);
}

/**
 * Obtiene el inicio del día (00:00:00)
 */
export function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Obtiene el fin del día (23:59:59)
 */
export function getEndOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

// ============================================
// CÁLCULOS
// ============================================

/**
 * Calcula la diferencia en días entre dos fechas
 */
export function daysBetween(date1: Date, date2: Date): number {
  const d1 = getStartOfDay(date1);
  const d2 = getStartOfDay(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calcula la diferencia en horas entre dos fechas
 */
export function hoursBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60));
}

/**
 * Calcula la diferencia en minutos entre dos fechas
 */
export function minutesBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60));
}

/**
 * Calcula la edad a partir de una fecha de nacimiento
 *
 * @param birthDateString - Fecha de nacimiento en formato ISO o Date
 * @returns number - Edad en años
 */
export function calculateAge(birthDateString: string | Date): number {
  const birthDate = typeof birthDateString === 'string' ? new Date(birthDateString) : birthDateString;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Compara dos fechas (útil para Array.sort)
 *
 * Retorna:
 * - Negativo si date1 < date2
 * - Positivo si date1 > date2
 * - 0 si son iguales
 *
 * @param date1 - Primera fecha (string ISO o Date)
 * @param date2 - Segunda fecha (string ISO o Date)
 * @returns number - Diferencia en milisegundos
 */
export function compareDates(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return d1.getTime() - d2.getTime();
}

// ============================================
// HELPERS PARA BACKEND
// ============================================

/**
 * Prepara un rango de fechas para enviar al backend
 * El backend espera fechas UTC con inicio/fin del día
 *
 * @param startDate - Fecha de inicio (YYYY-MM-DD local)
 * @param endDate - Fecha de fin (YYYY-MM-DD local)
 * @returns objeto con dateFrom y dateTo en formato UTC
 */
export function prepareDateRangeForAPI(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  // Inicio del día en local → UTC
  const dateFrom = getStartOfDay(start).toISOString();

  // Fin del día en local → UTC
  const dateTo = getEndOfDay(end).toISOString();

  return { dateFrom, dateTo };
}

/**
 * Prepara una fecha/hora para enviar al backend
 *
 * @param localDateTime - Fecha en formato YYYY-MM-DDTHH:mm (local)
 * @returns string - Fecha en formato ISO 8601 UTC
 */
export function prepareDateTimeForAPI(localDateTime: string): string {
  return localToUTC(localDateTime);
}

// ============================================
// MIGRACIÓN HELPERS (para refactorizar código existente)
// ============================================

/**
 * Reemplazo para: new Date().toISOString().split('T')[0]
 *
 * @deprecated Usar getLocalDateString() en su lugar
 */
export function getTodayString(): string {
  return getLocalDateString();
}

/**
 * Reemplazo para datetime-local value
 *
 * @deprecated Usar getLocalDateTimeString() en su lugar
 */
export function getDateTimeInputValue(date: Date = new Date()): string {
  return getLocalDateTimeString(date);
}
