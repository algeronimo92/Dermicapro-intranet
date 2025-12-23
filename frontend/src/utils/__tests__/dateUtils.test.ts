/**
 * Unit Tests for Date Utilities (Frontend)
 *
 * Testing strategy:
 * - AAA Pattern (Arrange, Act, Assert)
 * - Mock system time for deterministic tests
 * - Test positive cases, edge cases, and negative cases
 * - Target: >90% code coverage
 */

import {
  getLocalDateString,
  getLocalDateTimeString,
  localToUTC,
  utcToLocal,
  utcToLocalDate,
  parseLocalDate,
  parseLocalDateTime,
  isDateBefore,
  isDateAfter,
  isSameDay,
  isDateTimeBefore,
  isDateTimeAfter,
  formatDate,
  formatDateTime,
  formatTime,
  isValidDate,
  isInPast,
  isDateTimeInPast,
  isDateInRange,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfDay,
  getEndOfDay,
  daysBetween,
  hoursBetween,
  minutesBetween,
  calculateAge,
  compareDates,
  addDays,
  addHours,
  addMinutes,
  prepareDateRangeForAPI,
  prepareDateTimeForAPI,
} from '../dateUtils';

describe('DateUtils - Frontend', () => {
  // ============================================
  // GET LOCAL DATE/TIME STRING
  // ============================================

  describe('getLocalDateString', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 11, 6, 10, 0, 0)); // Dec 6, 2025 10:00 AM
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return current date in YYYY-MM-DD format', () => {
      const result = getLocalDateString();

      expect(result).toBe('2025-12-06');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should format single-digit months correctly', () => {
      const date = new Date(2025, 0, 5); // January 5th

      const result = getLocalDateString(date);

      expect(result).toBe('2025-01-05');
    });

    it('should format single-digit days correctly', () => {
      const date = new Date(2025, 11, 1); // December 1st

      const result = getLocalDateString(date);

      expect(result).toBe('2025-12-01');
    });

    it('should handle end of year correctly', () => {
      const date = new Date(2025, 11, 31); // Dec 31, 2025

      const result = getLocalDateString(date);

      expect(result).toBe('2025-12-31');
    });

    it('should handle start of year correctly', () => {
      const date = new Date(2025, 0, 1); // Jan 1, 2025

      const result = getLocalDateString(date);

      expect(result).toBe('2025-01-01');
    });

    it('should handle leap year dates', () => {
      const date = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)

      const result = getLocalDateString(date);

      expect(result).toBe('2024-02-29');
    });

    it('should return today when called without parameters', () => {
      const result = getLocalDateString();

      expect(result).toBe('2025-12-06');
    });
  });

  describe('getLocalDateTimeString', () => {
    it('should return datetime in YYYY-MM-DDTHH:mm format', () => {
      const date = new Date(2025, 11, 6, 14, 30, 0);

      const result = getLocalDateTimeString(date);

      expect(result).toBe('2025-12-06T14:30');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('should format single-digit hours and minutes correctly', () => {
      const date = new Date(2025, 11, 6, 9, 5, 0);

      const result = getLocalDateTimeString(date);

      expect(result).toBe('2025-12-06T09:05');
    });

    it('should handle midnight correctly', () => {
      const date = new Date(2025, 11, 6, 0, 0, 0);

      const result = getLocalDateTimeString(date);

      expect(result).toBe('2025-12-06T00:00');
    });

    it('should handle 23:59 correctly', () => {
      const date = new Date(2025, 11, 6, 23, 59, 0);

      const result = getLocalDateTimeString(date);

      expect(result).toBe('2025-12-06T23:59');
    });
  });

  // ============================================
  // LOCAL ↔ UTC CONVERSION
  // ============================================

  describe('localToUTC', () => {
    it('should convert local datetime to UTC ISO string', () => {
      const localDateTime = '2025-12-06T14:30';

      const result = localToUTC(localDateTime);

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      const parsed = new Date(result);
      expect(parsed.getUTCHours()).toBe(19); // 14:30 local = 19:30 UTC (GMT-5)
    });

    it('should handle local midnight correctly', () => {
      const localDateTime = '2025-12-06T00:00';

      const result = localToUTC(localDateTime);

      const parsed = new Date(result);
      expect(parsed.getUTCHours()).toBe(5); // 00:00 local = 05:00 UTC
    });

    it('should handle day boundary crossing', () => {
      const localDateTime = '2025-12-06T23:00';

      const result = localToUTC(localDateTime);

      const parsed = new Date(result);
      expect(parsed.getUTCDate()).toBe(7); // Crosses to next day in UTC
    });
  });

  describe('utcToLocal', () => {
    it('should convert UTC to local datetime format', () => {
      const utcString = '2025-12-06T19:30:00.000Z';

      const result = utcToLocal(utcString);

      expect(result).toBe('2025-12-06T14:30'); // 19:30 UTC = 14:30 local (GMT-5)
    });

    it('should return empty string for empty input', () => {
      const utcString = '';

      const result = utcToLocal(utcString);

      expect(result).toBe('');
    });

    it('should return empty string for invalid date', () => {
      const utcString = 'invalid-date';
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = utcToLocal(utcString);

      expect(result).toBe('');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid UTC string:', utcString);

      consoleWarnSpy.mockRestore();
    });

    it('should handle day boundary crossing backwards', () => {
      const utcString = '2025-12-07T04:00:00.000Z';

      const result = utcToLocal(utcString);

      expect(result).toBe('2025-12-06T23:00'); // Crosses back to previous day
    });
  });

  describe('utcToLocalDate', () => {
    it('should convert UTC to local date only', () => {
      const utcString = '2025-12-06T19:30:00.000Z';

      const result = utcToLocalDate(utcString);

      expect(result).toBe('2025-12-06');
    });

    it('should return empty string for empty input', () => {
      const result = utcToLocalDate('');

      expect(result).toBe('');
    });

    it('should return empty string for invalid date', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = utcToLocalDate('invalid-date');

      expect(result).toBe('');
      consoleWarnSpy.mockRestore();
    });
  });

  // ============================================
  // DATE PARSING
  // ============================================

  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD to local date at midnight', () => {
      const result = parseLocalDate('2025-12-06');

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11); // December (0-indexed)
      expect(result.getDate()).toBe(6);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('parseLocalDateTime', () => {
    it('should parse YYYY-MM-DDTHH:mm correctly', () => {
      const result = parseLocalDateTime('2025-12-06T14:30');

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(6);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });

    it('should handle time-only input', () => {
      const result = parseLocalDateTime('2025-12-06');

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });
  });

  // ============================================
  // DATE COMPARISON
  // ============================================

  describe('isDateBefore', () => {
    it('should return true when date1 is before date2', () => {
      const date1 = new Date(2025, 11, 5);
      const date2 = new Date(2025, 11, 6);

      const result = isDateBefore(date1, date2);

      expect(result).toBe(true);
    });

    it('should return false when date1 is after date2', () => {
      const date1 = new Date(2025, 11, 7);
      const date2 = new Date(2025, 11, 6);

      const result = isDateBefore(date1, date2);

      expect(result).toBe(false);
    });

    it('should ignore time component', () => {
      const date1 = new Date(2025, 11, 6, 23, 59);
      const date2 = new Date(2025, 11, 6, 0, 0);

      const result = isDateBefore(date1, date2);

      expect(result).toBe(false); // Same day
    });
  });

  describe('isDateAfter', () => {
    it('should return true when date1 is after date2', () => {
      const date1 = new Date(2025, 11, 7);
      const date2 = new Date(2025, 11, 6);

      const result = isDateAfter(date1, date2);

      expect(result).toBe(true);
    });

    it('should return false when date1 is before date2', () => {
      const date1 = new Date(2025, 11, 5);
      const date2 = new Date(2025, 11, 6);

      const result = isDateAfter(date1, date2);

      expect(result).toBe(false);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date(2025, 11, 6, 10, 0);
      const date2 = new Date(2025, 11, 6, 15, 30);

      const result = isSameDay(date1, date2);

      expect(result).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2025, 11, 6);
      const date2 = new Date(2025, 11, 7);

      const result = isSameDay(date1, date2);

      expect(result).toBe(false);
    });
  });

  describe('isDateTimeBefore', () => {
    it('should return true when datetime1 is before datetime2', () => {
      const dt1 = new Date(2025, 11, 6, 14, 0);
      const dt2 = new Date(2025, 11, 6, 15, 0);

      const result = isDateTimeBefore(dt1, dt2);

      expect(result).toBe(true);
    });

    it('should include time in comparison', () => {
      const dt1 = new Date(2025, 11, 6, 14, 30);
      const dt2 = new Date(2025, 11, 6, 14, 29);

      const result = isDateTimeBefore(dt1, dt2);

      expect(result).toBe(false);
    });
  });

  describe('isDateTimeAfter', () => {
    it('should return true when datetime1 is after datetime2', () => {
      const dt1 = new Date(2025, 11, 6, 15, 0);
      const dt2 = new Date(2025, 11, 6, 14, 0);

      const result = isDateTimeAfter(dt1, dt2);

      expect(result).toBe(true);
    });
  });

  // ============================================
  // FORMATTING
  // ============================================

  describe('formatDate', () => {
    it('should format date with default options in Spanish', () => {
      const date = new Date(2025, 11, 6);

      const result = formatDate(date);

      expect(result).toContain('diciembre');
      expect(result).toContain('2025');
      expect(result).toContain('6');
    });

    it('should accept custom format options', () => {
      const date = new Date(2025, 11, 6);
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      };

      const result = formatDate(date, options);

      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should accept ISO string input', () => {
      const isoString = '2025-12-06T00:00:00Z';

      const result = formatDate(isoString);

      expect(result).toContain('diciembre');
      expect(result).toContain('2025');
    });

    it('should return "Fecha inválida" for invalid input', () => {
      const invalidDate = 'not-a-date';

      const result = formatDate(invalidDate);

      expect(result).toBe('Fecha inválida');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime with default options', () => {
      const date = new Date(2025, 11, 6, 14, 30);

      const result = formatDateTime(date);

      expect(result).toContain('diciembre');
      expect(result).toContain('2025');
      expect(result).toContain('14');
      expect(result).toContain('30');
    });

    it('should return "Fecha inválida" for invalid input', () => {
      const result = formatDateTime('invalid');

      expect(result).toBe('Fecha inválida');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const date = new Date(2025, 11, 6, 14, 30);

      const result = formatTime(date);

      expect(result).toContain('14');
      expect(result).toContain('30');
    });

    it('should return "Hora inválida" for invalid input', () => {
      const result = formatTime('invalid');

      expect(result).toBe('Hora inválida');
    });
  });

  // ============================================
  // VALIDATION
  // ============================================

  describe('isValidDate', () => {
    it('should return true for valid date string', () => {
      const result = isValidDate('2025-12-06T14:30:00Z');

      expect(result).toBe(true);
    });

    it('should return false for invalid date string', () => {
      const result = isValidDate('invalid-date');

      expect(result).toBe(false);
    });
  });

  describe('isInPast', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 11, 6, 14, 30)); // Dec 6, 2025 14:30
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true for past date (ignoring time)', () => {
      const pastDate = new Date(2025, 11, 5, 23, 59);

      const result = isInPast(pastDate);

      expect(result).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date(2025, 11, 7, 0, 0);

      const result = isInPast(futureDate);

      expect(result).toBe(false);
    });

    it('should return false for today (same date)', () => {
      const today = new Date(2025, 11, 6, 23, 59);

      const result = isInPast(today);

      expect(result).toBe(false);
    });
  });

  describe('isDateTimeInPast', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 11, 6, 14, 30, 0)); // Dec 6, 2025 14:30
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true for past datetime', () => {
      const pastDate = new Date(2025, 11, 6, 13, 0, 0); // 1.5 hours ago

      const result = isDateTimeInPast(pastDate);

      expect(result).toBe(true);
    });

    it('should return false for future datetime', () => {
      const futureDate = new Date(2025, 11, 6, 15, 0, 0); // 30 min in future

      const result = isDateTimeInPast(futureDate);

      expect(result).toBe(false);
    });

    it('should return false for current datetime', () => {
      const now = new Date(2025, 11, 6, 14, 30, 0);

      const result = isDateTimeInPast(now);

      expect(result).toBe(false);
    });

    it('should accept ISO string input', () => {
      const pastDateString = '2020-01-01T00:00:00Z';

      const result = isDateTimeInPast(pastDateString);

      expect(result).toBe(true);
    });
  });

  describe('isDateInRange', () => {
    it('should return true when date is in range', () => {
      const date = new Date(2025, 11, 6);
      const start = new Date(2025, 11, 1);
      const end = new Date(2025, 11, 31);

      const result = isDateInRange(date, start, end);

      expect(result).toBe(true);
    });

    it('should return false when date is before range', () => {
      const date = new Date(2025, 10, 30);
      const start = new Date(2025, 11, 1);
      const end = new Date(2025, 11, 31);

      const result = isDateInRange(date, start, end);

      expect(result).toBe(false);
    });

    it('should return false when date is after range', () => {
      const date = new Date(2026, 0, 1);
      const start = new Date(2025, 11, 1);
      const end = new Date(2025, 11, 31);

      const result = isDateInRange(date, start, end);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // RANGE UTILITIES
  // ============================================

  describe('getFirstDayOfMonth', () => {
    it('should return first day of month', () => {
      const date = new Date(2025, 11, 15);

      const result = getFirstDayOfMonth(date);

      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(11);
    });
  });

  describe('getLastDayOfMonth', () => {
    it('should return last day of month', () => {
      const date = new Date(2025, 11, 15); // December has 31 days

      const result = getLastDayOfMonth(date);

      expect(result.getDate()).toBe(31);
      expect(result.getMonth()).toBe(11);
    });

    it('should handle February correctly', () => {
      const date = new Date(2025, 1, 15); // February 2025 (non-leap)

      const result = getLastDayOfMonth(date);

      expect(result.getDate()).toBe(28);
    });

    it('should handle leap year February', () => {
      const date = new Date(2024, 1, 15); // February 2024 (leap year)

      const result = getLastDayOfMonth(date);

      expect(result.getDate()).toBe(29);
    });
  });

  describe('getStartOfWeek', () => {
    it('should return Monday for mid-week date', () => {
      const date = new Date(2025, 11, 6); // Saturday

      const result = getStartOfWeek(date);

      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(1); // Dec 1 is Monday
    });

    it('should handle Sunday correctly', () => {
      const date = new Date(2025, 11, 7); // Sunday

      const result = getStartOfWeek(date);

      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(1);
    });
  });

  describe('getEndOfWeek', () => {
    it('should return Sunday for mid-week date', () => {
      const date = new Date(2025, 11, 6); // Saturday

      const result = getEndOfWeek(date);

      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getDate()).toBe(7);
    });
  });

  describe('getStartOfDay', () => {
    it('should return midnight of given date', () => {
      const date = new Date(2025, 11, 6, 14, 30, 45, 123);

      const result = getStartOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should return 23:59:59.999 of given date', () => {
      const date = new Date(2025, 11, 6, 14, 30);

      const result = getEndOfDay(date);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  // ============================================
  // CALCULATIONS
  // ============================================

  describe('daysBetween', () => {
    it('should calculate days between two dates', () => {
      const date1 = new Date(2025, 11, 1);
      const date2 = new Date(2025, 11, 6);

      const result = daysBetween(date1, date2);

      expect(result).toBe(5);
    });

    it('should return absolute value', () => {
      const date1 = new Date(2025, 11, 6);
      const date2 = new Date(2025, 11, 1);

      const result = daysBetween(date1, date2);

      expect(result).toBe(5);
    });
  });

  describe('hoursBetween', () => {
    it('should calculate hours between two datetimes', () => {
      const dt1 = new Date(2025, 11, 6, 10, 0);
      const dt2 = new Date(2025, 11, 6, 15, 0);

      const result = hoursBetween(dt1, dt2);

      expect(result).toBe(5);
    });
  });

  describe('minutesBetween', () => {
    it('should calculate minutes between two datetimes', () => {
      const dt1 = new Date(2025, 11, 6, 14, 0);
      const dt2 = new Date(2025, 11, 6, 14, 30);

      const result = minutesBetween(dt1, dt2);

      expect(result).toBe(30);
    });
  });

  describe('calculateAge', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2025, 11, 6)); // Dec 6, 2025
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate age when birthday has passed this year', () => {
      const birthDate = '2000-01-15';

      const age = calculateAge(birthDate);

      expect(age).toBe(25);
    });

    it('should calculate age when birthday has not passed yet', () => {
      const birthDate = '2000-12-25'; // Birthday in 19 days

      const age = calculateAge(birthDate);

      expect(age).toBe(24); // Still 24 until Dec 25
    });

    it('should calculate age when birthday is today', () => {
      const birthDate = '2000-12-06';

      const age = calculateAge(birthDate);

      expect(age).toBe(25);
    });

    it('should return 0 for babies under 1 year', () => {
      const birthDate = '2025-06-01'; // Born 6 months ago

      const age = calculateAge(birthDate);

      expect(age).toBe(0);
    });

    it('should handle centenarians correctly', () => {
      const birthDate = '1925-01-01';

      const age = calculateAge(birthDate);

      expect(age).toBe(100);
    });

    it('should accept Date object as input', () => {
      const birthDate = new Date(2000, 0, 15);

      const age = calculateAge(birthDate);

      expect(age).toBe(25);
    });
  });

  describe('compareDates', () => {
    it('should return negative when date1 < date2', () => {
      const date1 = '2025-12-05T10:00:00Z';
      const date2 = '2025-12-06T10:00:00Z';

      const result = compareDates(date1, date2);

      expect(result).toBeLessThan(0);
    });

    it('should return positive when date1 > date2', () => {
      const date1 = '2025-12-07T10:00:00Z';
      const date2 = '2025-12-06T10:00:00Z';

      const result = compareDates(date1, date2);

      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 when dates are equal', () => {
      const date1 = '2025-12-06T10:00:00Z';
      const date2 = '2025-12-06T10:00:00Z';

      const result = compareDates(date1, date2);

      expect(result).toBe(0);
    });

    it('should work with Array.sort()', () => {
      const dates = [
        '2025-12-08T10:00:00Z',
        '2025-12-05T10:00:00Z',
        '2025-12-06T10:00:00Z',
        '2025-12-07T10:00:00Z'
      ];

      const sorted = dates.sort((a, b) => compareDates(a, b));

      expect(sorted[0]).toContain('2025-12-05');
      expect(sorted[1]).toContain('2025-12-06');
      expect(sorted[2]).toContain('2025-12-07');
      expect(sorted[3]).toContain('2025-12-08');
    });

    it('should accept Date objects', () => {
      const date1 = new Date(2025, 11, 5);
      const date2 = new Date(2025, 11, 6);

      const result = compareDates(date1, date2);

      expect(result).toBeLessThan(0);
    });
  });

  describe('addDays', () => {
    it('should add positive days correctly', () => {
      const date = new Date(2025, 11, 6);
      const days = 7;

      const result = addDays(date, days);

      expect(result.getDate()).toBe(13);
      expect(result.getMonth()).toBe(11);
    });

    it('should subtract days with negative input', () => {
      const date = new Date(2025, 11, 6);
      const days = -3;

      const result = addDays(date, days);

      expect(result.getDate()).toBe(3);
    });

    it('should handle month boundary crossing', () => {
      const date = new Date(2025, 11, 30);
      const days = 5;

      const result = addDays(date, days);

      expect(result.getDate()).toBe(4);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2026);
    });

    it('should not modify original date (immutability)', () => {
      const original = new Date(2025, 11, 6);
      const originalTime = original.getTime();

      const result = addDays(original, 7);

      expect(original.getTime()).toBe(originalTime);
      expect(result).not.toBe(original);
    });
  });

  describe('addHours', () => {
    it('should add hours correctly', () => {
      const date = new Date(2025, 11, 6, 10, 0);

      const result = addHours(date, 5);

      expect(result.getHours()).toBe(15);
    });

    it('should handle day boundary crossing', () => {
      const date = new Date(2025, 11, 6, 22, 0);

      const result = addHours(date, 5);

      expect(result.getDate()).toBe(7);
      expect(result.getHours()).toBe(3);
    });
  });

  describe('addMinutes', () => {
    it('should add minutes correctly', () => {
      const date = new Date(2025, 11, 6, 14, 0);

      const result = addMinutes(date, 30);

      expect(result.getMinutes()).toBe(30);
    });

    it('should handle hour boundary crossing', () => {
      const date = new Date(2025, 11, 6, 14, 50);

      const result = addMinutes(date, 20);

      expect(result.getHours()).toBe(15);
      expect(result.getMinutes()).toBe(10);
    });
  });

  // ============================================
  // API HELPERS
  // ============================================

  describe('prepareDateRangeForAPI', () => {
    it('should prepare date range with both dates', () => {
      const startDate = '2025-12-01';
      const endDate = '2025-12-06';

      const result = prepareDateRangeForAPI(startDate, endDate);

      expect(result).toHaveProperty('dateFrom');
      expect(result).toHaveProperty('dateTo');
      expect(result.dateFrom).toMatch(/Z$/);
      expect(result.dateTo).toMatch(/Z$/);
    });
  });

  describe('prepareDateTimeForAPI', () => {
    it('should convert local datetime to UTC', () => {
      const localDateTime = '2025-12-06T14:30';

      const result = prepareDateTimeForAPI(localDateTime);

      expect(result).toMatch(/Z$/);
      const parsed = new Date(result);
      expect(parsed.getUTCHours()).toBe(19);
    });
  });

  // ============================================
  // EDGE CASES & BOUNDARIES
  // ============================================

  describe('Edge Cases', () => {
    describe('Timezone Boundaries', () => {
      it('should handle local datetime at 23:59 crossing to next day in UTC', () => {
        const local = '2025-12-06T23:59';

        const utc = localToUTC(local);
        const parsed = new Date(utc);

        expect(parsed.getUTCDate()).toBe(7); // Next day in UTC
      });
    });

    describe('Leap Years', () => {
      it('should handle Feb 29 in leap year', () => {
        const leapDate = new Date(2024, 1, 29);

        const formatted = getLocalDateString(leapDate);

        expect(formatted).toBe('2024-02-29');
      });

      it('should handle Feb 28 to Mar 1 boundary in non-leap year', () => {
        const date = new Date(2025, 1, 28);

        const result = addDays(date, 1);

        expect(result.getMonth()).toBe(2); // March
        expect(result.getDate()).toBe(1);
      });
    });

    describe('Month Boundaries', () => {
      it('should handle Jan 31 + 1 day correctly', () => {
        const date = new Date(2025, 0, 31);

        const result = addDays(date, 1);

        expect(result.getMonth()).toBe(1); // February
        expect(result.getDate()).toBe(1);
      });

      it('should handle Apr 30 + 1 day correctly', () => {
        const date = new Date(2025, 3, 30); // April has 30 days

        const result = addDays(date, 1);

        expect(result.getMonth()).toBe(4); // May
        expect(result.getDate()).toBe(1);
      });
    });

    describe('Negative Dates', () => {
      it('should handle dates before Unix epoch', () => {
        const oldDate = new Date(1960, 0, 1);

        const formatted = getLocalDateString(oldDate);

        expect(formatted).toBe('1960-01-01');
      });
    });
  });
});
