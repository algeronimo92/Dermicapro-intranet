/**
 * Date Handling Strategy Pattern
 *
 * Solves timezone conversion issues by providing a unified interface
 * for date parsing, formatting, and comparison operations.
 *
 * @pattern Strategy - Different strategies for handling dates
 * @pattern Singleton - Single instance per strategy type
 */

// ============================================
// STRATEGY INTERFACE
// ============================================

export interface DateStrategy {
  /**
   * Parse an ISO string to local date/time components
   */
  parseDateTime(isoString: string): { date: string; time: string };

  /**
   * Format a date string for display
   */
  formatDate(dateStr: string, monthNames: string[]): string;

  /**
   * Check if a day is selected
   */
  isDateSelected(day: number, dateStr: string, currentMonth: number, currentYear: number): boolean;

  /**
   * Create a Date object from components without timezone shift
   */
  createLocalDate(year: number, month: number, day: number): Date;

  /**
   * Parse date components from YYYY-MM-DD string
   */
  parseDateComponents(dateStr: string): { year: number; month: number; day: number };
}

// ============================================
// CONCRETE STRATEGY: Local Timezone Handler
// ============================================

/**
 * Handles dates in local timezone, avoiding UTC conversion pitfalls
 *
 * Key Insight: When you pass "2025-12-06" to new Date(), it interprets
 * it as UTC midnight, which then converts to local time causing off-by-one errors.
 *
 * Solution: Always parse date strings manually or use explicit time components.
 */
export class LocalDateStrategy implements DateStrategy {
  parseDateTime(isoString: string): { date: string; time: string } {
    if (!isoString) return { date: '', time: '' };

    // Si la fecha viene en formato ISO con Z (UTC), convertir a hora local
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      // Si no es una fecha válida, intentar parseo simple
      const [dateStr, timeStr] = isoString.split('T');
      return { date: dateStr || '', time: timeStr || '' };
    }

    // Convertir a formato local YYYY-MM-DD y HH:MM
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };
  }

  formatDate(dateStr: string, monthNames: string[]): string {
    if (!dateStr) return 'Seleccionar fecha';

    // Parse date string manually to avoid UTC timezone conversion
    const [year, month, day] = dateStr.split('-').map(Number);
    const monthName = monthNames[month - 1];
    return `${day} de ${monthName}, ${year}`;
  }

  isDateSelected(day: number, dateStr: string, currentMonth: number, currentYear: number): boolean {
    if (!day || !dateStr) return false;

    // Parse date string manually to avoid UTC timezone conversion
    const [year, month, dayNum] = dateStr.split('-').map(Number);
    return (
      day === dayNum &&
      currentMonth === month - 1 &&
      currentYear === year
    );
  }

  createLocalDate(year: number, month: number, day: number): Date {
    // Use Date constructor with explicit components to create date in local timezone
    // Note: month is 0-indexed in Date constructor
    return new Date(year, month, day);
  }

  parseDateComponents(dateStr: string): { year: number; month: number; day: number } {
    const [year, month, day] = dateStr.split('-').map(Number);
    return { year, month, day };
  }
}

// ============================================
// FACTORY: Strategy Factory
// ============================================

export class DateStrategyFactory {
  private static localStrategy: LocalDateStrategy | null = null;

  static getLocalStrategy(): DateStrategy {
    if (!this.localStrategy) {
      this.localStrategy = new LocalDateStrategy();
    }
    return this.localStrategy;
  }
}

// ============================================
// CONVENIENCE EXPORT
// ============================================

/**
 * Default export: Local timezone strategy instance
 * Use this for all date operations to avoid timezone issues
 */
export const dateStrategy = DateStrategyFactory.getLocalStrategy();
