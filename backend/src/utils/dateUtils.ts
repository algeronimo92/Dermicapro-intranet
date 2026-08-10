/**
 * Date Utilities para Backend - Manejo profesional de fechas
 *
 * PRINCIPIOS:
 * 1. El backend SIEMPRE almacena en UTC
 * 2. Las fechas vienen del frontend en formato YYYY-MM-DD (local del usuario)
 * 3. NUNCA concatenar strings tipo "T00:00:00" sin zona horaria explícita
 * 4. SIEMPRE usar Date objects y métodos nativos
 *
 * @author DermicaPro Team
 * @version 2.0
 */

// ============================================
// PARSEO DE FECHAS DESDE QUERY PARAMS
// ============================================

/**
 * Convierte una fecha YYYY-MM-DD del frontend al inicio del día en UTC
 *
 * El frontend envía "2025-12-06" que representa el 6 de diciembre en hora local del usuario.
 * El backend debe interpretar esto como:
 * - 2025-12-06 00:00:00 en la zona horaria del usuario
 * - Convertido a UTC para almacenamiento/queries
 *
 * @param dateString - Fecha en formato YYYY-MM-DD (ej: "2025-12-06")
 * @returns Date - Inicio del día en UTC
 */
export function parseStartOfDay(dateString: string): Date {
  // Parsear componentes manualmente para evitar interpretación UTC
  const [year, month, day] = dateString.split('-').map(Number);

  // Crear fecha en UTC con los componentes especificados
  // Nota: mes es 0-indexed en Date.UTC
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Convierte una fecha YYYY-MM-DD del frontend al fin del día en UTC
 *
 * Similar a parseStartOfDay, pero establece la hora a 23:59:59.999
 *
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns Date - Fin del día en UTC
 */
export function parseEndOfDay(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);

  // Fin del día: 23:59:59.999
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

// ============================================
// RANGOS DE FECHAS PARA QUERIES
// ============================================

/**
 * Prepara un rango de fechas para queries de Prisma
 *
 * Uso típico:
 * ```typescript
 * const { gte, lte } = prepareDateRange(dateFrom, dateTo);
 * await prisma.appointment.findMany({
 *   where: { scheduledDate: { gte, lte } }
 * });
 * ```
 *
 * @param dateFrom - Fecha de inicio YYYY-MM-DD (opcional)
 * @param dateTo - Fecha de fin YYYY-MM-DD (opcional)
 * @returns Objeto con gte y lte para usar en Prisma where clauses
 */
export function prepareDateRange(
  dateFrom?: string,
  dateTo?: string
): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {};

  if (dateFrom) {
    range.gte = parseStartOfDay(dateFrom);
  }

  if (dateTo) {
    range.lte = parseEndOfDay(dateTo);
  }

  return range;
}

// ============================================
// VALIDACIÓN
// ============================================

/**
 * Valida si una cadena es una fecha válida en formato YYYY-MM-DD
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Valida si una fecha está en el pasado
 */
export function isInPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Valida si una fecha está en el futuro
 */
export function isInFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

// ============================================
// FORMATEO PARA LOGS/DEBUG
// ============================================

/**
 * Formatea una fecha para logs de depuración
 * Muestra tanto UTC como hora local de Perú
 */
export function formatDateForLog(date: Date): string {
  const utc = date.toISOString();
  const local = date.toLocaleString('es-PE', { timeZone: 'America/Lima' });
  return `${utc} (Perú: ${local})`;
}

// ============================================
// CÁLCULOS DE TIEMPO
// ============================================

/**
 * Agrega días a una fecha
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

/**
 * Calcula la diferencia en minutos entre dos fechas
 */
export function minutesBetween(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffMs / (1000 * 60));
}

// ============================================
// UTILIDADES DE RANGO
// ============================================

/**
 * Obtiene el inicio del día (00:00:00 UTC)
 */
export function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Obtiene el fin del día (23:59:59.999 UTC)
 */
export function getEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/**
 * Obtiene el primer día del mes
 */
export function getFirstDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Obtiene el último día del mes
 */
export function getLastDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

// ============================================
// COMPARACIÓN
// ============================================

/**
 * Compara si date1 es anterior a date2
 */
export function isBefore(date1: Date, date2: Date): boolean {
  return date1.getTime() < date2.getTime();
}

/**
 * Compara si date1 es posterior a date2
 */
export function isAfter(date1: Date, date2: Date): boolean {
  return date1.getTime() > date2.getTime();
}

/**
 * Compara si dos fechas son el mismo día (UTC)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

// ============================================
// HORA LOCAL DE LA CLÍNICA (America/Lima)
// ============================================

/**
 * Perú (America/Lima) es UTC-5 todo el año: no aplica horario de verano,
 * por lo que un offset fijo es exacto y evita depender de la TZ del contenedor.
 */
export const CLINIC_UTC_OFFSET_MINUTES = -300;
const CLINIC_OFFSET_MS = CLINIC_UTC_OFFSET_MINUTES * 60 * 1000;

/**
 * Devuelve un Date "desplazado" cuyos getters UTC representan la hora de pared
 * en la clínica. Solo para extraer día/mes/día-de-semana, nunca para almacenar.
 */
function toClinicWallClock(date: Date): Date {
  return new Date(date.getTime() + CLINIC_OFFSET_MS);
}

/**
 * Clave de día (YYYY-MM-DD) en hora de la clínica.
 *
 * Necesario para métricas diarias: una venta del lunes 20:00 en Trujillo se
 * almacena como martes 01:00 UTC y agruparla por UTC la contaría en el día
 * equivocado.
 */
export function clinicDateKey(date: Date): string {
  return toClinicWallClock(date).toISOString().slice(0, 10);
}

/**
 * Día de la semana en hora de la clínica: 1 = lunes ... 7 = domingo (ISO-8601)
 */
export function clinicWeekday(date: Date): number {
  const jsDay = toClinicWallClock(date).getUTCDay(); // 0 = domingo
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Día de la semana (1 = lunes ... 7 = domingo) de una clave YYYY-MM-DD.
 * La clave ya es una fecha de calendario, así que no interviene la zona horaria.
 */
export function weekdayOfDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Instante UTC en que empieza (00:00) un día de la clínica dado por su clave
 */
export function clinicDayStartUtc(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - CLINIC_OFFSET_MS);
}

/**
 * Clave del día actual en hora de la clínica
 */
export function clinicTodayKey(now: Date = new Date()): string {
  return clinicDateKey(now);
}

/**
 * Suma (o resta, con valores negativos) días a una clave YYYY-MM-DD
 */
export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/**
 * Clave del lunes de la semana a la que pertenece la clave dada
 */
export function weekStartKey(dateKey: string): string {
  return shiftDateKey(dateKey, -(weekdayOfDateKey(dateKey) - 1));
}

/**
 * Lista inclusiva de claves de día entre dos claves (fromKey <= toKey)
 */
export function enumerateDateKeys(fromKey: string, toKey: string): string[] {
  const keys: string[] = [];
  let cursor = fromKey;
  // Guarda de seguridad: máx. ~5 años, evita un bucle infinito ante datos corruptos
  for (let i = 0; cursor <= toKey && i < 2000; i++) {
    keys.push(cursor);
    cursor = shiftDateKey(cursor, 1);
  }
  return keys;
}

// ============================================
// HELPERS DE MIGRACIÓN
// ============================================

/**
 * @deprecated Reemplazar por prepareDateRange
 */
export function parseDateFromQuery(dateString: string): Date {
  console.warn('parseDateFromQuery is deprecated. Use prepareDateRange instead.');
  return parseStartOfDay(dateString);
}
