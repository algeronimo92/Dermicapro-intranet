/**
 * Unit Tests for Date Utilities (Backend)
 *
 * Testing strategy:
 * - AAA Pattern (Arrange, Act, Assert)
 * - All dates must be in UTC (backend requirement)
 * - Test positive cases, edge cases, and negative cases
 * - Target: >90% code coverage
 */

import {
  parseStartOfDay,
  parseEndOfDay,
  prepareDateRange,
  addDays,
  addHours,
  addMinutes,
  formatDateForLog,
  isValidDateString,
  isInPast,
  isInFuture,
  minutesBetween,
  getStartOfDay,
  getEndOfDay,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  isBefore,
  isAfter,
  isSameDay,
  parseDateFromQuery,
} from '../dateUtils';

describe('DateUtils - Backend', () => {
  // ============================================
  // PARSE DATE STRINGS TO UTC
  // ============================================

  describe('parseStartOfDay', () => {
    it('should parse date string to UTC midnight', () => {
      // Arrange
      const dateString = '2025-12-06';

      // Act
      const result = parseStartOfDay(dateString);

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(11); // December (0-indexed)
      expect(result.getUTCDate()).toBe(6);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });

    it('should use UTC timezone, not local', () => {
      // Arrange
      const dateString = '2025-12-06';

      // Act
      const result = parseStartOfDay(dateString);

      // Assert
      expect(result.toISOString()).toBe('2025-12-06T00:00:00.000Z');
    });

    it('should handle end of month correctly', () => {
      // Arrange
      const dateString = '2025-12-31';

      // Act
      const result = parseStartOfDay(dateString);

      // Assert
      expect(result.getUTCDate()).toBe(31);
      expect(result.getUTCMonth()).toBe(11);
      expect(result.toISOString()).toBe('2025-12-31T00:00:00.000Z');
    });

    it('should handle leap year dates', () => {
      // Arrange
      const dateString = '2024-02-29';

      // Act
      const result = parseStartOfDay(dateString);

      // Assert
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(29);
      expect(result.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    });

    it('should handle start of year', () => {
      // Arrange
      const dateString = '2025-01-01';

      // Act
      const result = parseStartOfDay(dateString);

      // Assert
      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('parseEndOfDay', () => {
    it('should parse date string to UTC end of day', () => {
      // Arrange
      const dateString = '2025-12-06';

      // Act
      const result = parseEndOfDay(dateString);

      // Assert
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(11);
      expect(result.getUTCDate()).toBe(6);
      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
      expect(result.getUTCMilliseconds()).toBe(999);
    });

    it('should return correct ISO string', () => {
      // Arrange
      const dateString = '2025-12-06';

      // Act
      const result = parseEndOfDay(dateString);

      // Assert
      expect(result.toISOString()).toBe('2025-12-06T23:59:59.999Z');
    });

    it('should handle end of month', () => {
      // Arrange
      const dateString = '2025-12-31';

      // Act
      const result = parseEndOfDay(dateString);

      // Assert
      expect(result.getUTCDate()).toBe(31);
      expect(result.toISOString()).toBe('2025-12-31T23:59:59.999Z');
    });

    it('should handle leap year date', () => {
      // Arrange
      const dateString = '2024-02-29';

      // Act
      const result = parseEndOfDay(dateString);

      // Assert
      expect(result.toISOString()).toBe('2024-02-29T23:59:59.999Z');
    });
  });

  // ============================================
  // PREPARE DATE RANGE FOR PRISMA QUERIES
  // ============================================

  describe('prepareDateRange', () => {
    it('should prepare range with both dates', () => {
      // Arrange
      const dateFrom = '2025-12-01';
      const dateTo = '2025-12-06';

      // Act
      const result = prepareDateRange(dateFrom, dateTo);

      // Assert
      expect(result).toHaveProperty('gte');
      expect(result).toHaveProperty('lte');
      expect(result.gte).toBeInstanceOf(Date);
      expect(result.lte).toBeInstanceOf(Date);
      expect(result.gte?.toISOString()).toBe('2025-12-01T00:00:00.000Z');
      expect(result.lte?.toISOString()).toBe('2025-12-06T23:59:59.999Z');
    });

    it('should prepare range with only dateFrom', () => {
      // Arrange
      const dateFrom = '2025-12-01';

      // Act
      const result = prepareDateRange(dateFrom);

      // Assert
      expect(result).toHaveProperty('gte');
      expect(result).not.toHaveProperty('lte');
      expect(result.gte?.toISOString()).toBe('2025-12-01T00:00:00.000Z');
    });

    it('should prepare range with only dateTo', () => {
      // Arrange
      const dateTo = '2025-12-06';

      // Act
      const result = prepareDateRange(undefined, dateTo);

      // Assert
      expect(result).toHaveProperty('lte');
      expect(result).not.toHaveProperty('gte');
      expect(result.lte?.toISOString()).toBe('2025-12-06T23:59:59.999Z');
    });

    it('should return empty object when no dates provided', () => {
      // Act
      const result = prepareDateRange();

      // Assert
      expect(result).toEqual({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle undefined values explicitly', () => {
      // Act
      const result = prepareDateRange(undefined, undefined);

      // Assert
      expect(result).toEqual({});
    });

    it('should work for Prisma query format', () => {
      // Arrange
      const dateFrom = '2025-12-01';
      const dateTo = '2025-12-31';

      // Act
      const range = prepareDateRange(dateFrom, dateTo);

      // Assert
      // Simulating Prisma query structure
      const query = {
        where: {
          scheduledDate: range // { gte: Date, lte: Date }
        }
      };

      expect(query.where.scheduledDate).toHaveProperty('gte');
      expect(query.where.scheduledDate).toHaveProperty('lte');
    });
  });

  // ============================================
  // DATE MANIPULATION (UTC-aware)
  // ============================================

  describe('addDays', () => {
    it('should add positive days correctly in UTC', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6));
      const days = 7;

      // Act
      const result = addDays(date, days);

      // Assert
      expect(result.getUTCDate()).toBe(13);
      expect(result.getUTCMonth()).toBe(11);
      expect(result.getUTCFullYear()).toBe(2025);
    });

    it('should subtract days with negative input', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6));
      const days = -3;

      // Act
      const result = addDays(date, days);

      // Assert
      expect(result.getUTCDate()).toBe(3);
      expect(result.getUTCMonth()).toBe(11);
    });

    it('should handle month boundary crossing', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 30));
      const days = 5;

      // Act
      const result = addDays(date, days);

      // Assert
      expect(result.getUTCDate()).toBe(4);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCFullYear()).toBe(2026);
    });

    it('should handle year boundary crossing', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 31));
      const days = 1;

      // Act
      const result = addDays(date, days);

      // Assert
      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should not modify original date (immutability)', () => {
      // Arrange
      const original = new Date(Date.UTC(2025, 11, 6));
      const originalTime = original.getTime();

      // Act
      const result = addDays(original, 7);

      // Assert
      expect(original.getTime()).toBe(originalTime); // Original unchanged
      expect(result).not.toBe(original); // Different object
      expect(result.getTime()).not.toBe(originalTime);
    });

    it('should add zero days correctly', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6));

      // Act
      const result = addDays(date, 0);

      // Assert
      expect(result.getUTCDate()).toBe(6);
      expect(result.getTime()).toBe(date.getTime());
    });

    it('should handle leap year boundary (Feb 28 to Mar 1)', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 1, 28)); // Non-leap year

      // Act
      const result = addDays(date, 1);

      // Assert
      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(2); // March
    });

    it('should handle leap year Feb 29', () => {
      // Arrange
      const date = new Date(Date.UTC(2024, 1, 29)); // Leap year

      // Act
      const result = addDays(date, 1);

      // Assert
      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(2); // March
    });
  });

  describe('addHours', () => {
    it('should add positive hours correctly in UTC', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6, 10, 0, 0));
      const hours = 5;

      // Act
      const result = addHours(date, hours);

      // Assert
      expect(result.getUTCHours()).toBe(15);
      expect(result.getUTCDate()).toBe(6);
    });

    it('should subtract hours with negative input', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6, 10, 0, 0));
      const hours = -3;

      // Act
      const result = addHours(date, hours);

      // Assert
      expect(result.getUTCHours()).toBe(7);
    });

    it('should handle day boundary crossing', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6, 22, 0, 0));
      const hours = 5;

      // Act
      const result = addHours(date, hours);

      // Assert
      expect(result.getUTCDate()).toBe(7);
      expect(result.getUTCHours()).toBe(3);
    });

    it('should handle month boundary crossing', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 31, 23, 0, 0));
      const hours = 2;

      // Act
      const result = addHours(date, hours);

      // Assert
      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCFullYear()).toBe(2026);
      expect(result.getUTCHours()).toBe(1);
    });

    it('should not modify original date (immutability)', () => {
      // Arrange
      const original = new Date(Date.UTC(2025, 11, 6, 10, 0, 0));
      const originalTime = original.getTime();

      // Act
      const result = addHours(original, 5);

      // Assert
      expect(original.getTime()).toBe(originalTime);
      expect(result).not.toBe(original);
    });
  });

  describe('addMinutes', () => {
    it('should add positive minutes correctly in UTC', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6, 14, 0, 0));
      const minutes = 30;

      // Act
      const result = addMinutes(date, minutes);

      // Assert
      expect(result.getUTCMinutes()).toBe(30);
      expect(result.getUTCHours()).toBe(14);
    });

    it('should subtract minutes with negative input', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6, 14, 30, 0));
      const minutes = -15;

      // Act
      const result = addMinutes(date, minutes);

      // Assert
      expect(result.getUTCMinutes()).toBe(15);
    });

    it('should handle hour boundary crossing', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6, 14, 50, 0));
      const minutes = 20;

      // Act
      const result = addMinutes(date, minutes);

      // Assert
      expect(result.getUTCHours()).toBe(15);
      expect(result.getUTCMinutes()).toBe(10);
    });

    it('should handle day boundary crossing', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6, 23, 50, 0));
      const minutes = 20;

      // Act
      const result = addMinutes(date, minutes);

      // Assert
      expect(result.getUTCDate()).toBe(7);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(10);
    });

    it('should not modify original date (immutability)', () => {
      // Arrange
      const original = new Date(Date.UTC(2025, 11, 6, 14, 0, 0));
      const originalTime = original.getTime();

      // Act
      const result = addMinutes(original, 30);

      // Assert
      expect(original.getTime()).toBe(originalTime);
      expect(result).not.toBe(original);
    });
  });

  // ============================================
  // LOGGING / DEBUG HELPERS
  // ============================================

  describe('formatDateForLog', () => {
    it('should format date for logging in UTC and Peru timezone', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6, 19, 30, 0));

      // Act
      const result = formatDateForLog(date);

      // Assert
      expect(result).toContain('2025-12-06T19:30:00.000Z');
      expect(result).toContain('Perú:');
      // Format: "2025-12-06T19:30:00.000Z (Perú: 6/12/2025, 2:30:00 p. m.)"
    });

    it('should handle midnight UTC correctly', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6, 0, 0, 0));

      // Act
      const result = formatDateForLog(date);

      // Assert
      expect(result).toContain('T00:00:00.000Z');
      expect(result).toContain('Perú:');
    });

    it('should show both UTC and Lima timezone', () => {
      // Arrange
      const date = new Date(Date.UTC(2025, 11, 6, 19, 30, 0)); // 19:30 UTC

      // Act
      const result = formatDateForLog(date);

      // Assert
      // In Lima (GMT-5), 19:30 UTC = 14:30 local (2:30 PM)
      expect(result).toContain('2025-12-06T19:30:00.000Z');
      expect(result).toContain('Perú:');
      expect(result).toMatch(/\d+\/\d+\/\d+/); // Contains formatted date
    });
  });

  // ============================================
  // EDGE CASES & BOUNDARIES
  // ============================================

  describe('Edge Cases', () => {
    describe('Leap Years', () => {
      it('should handle Feb 29 in leap year', () => {
        // Arrange
        const leapDate = '2024-02-29';

        // Act
        const result = parseStartOfDay(leapDate);

        // Assert
        expect(result.getUTCMonth()).toBe(1); // February
        expect(result.getUTCDate()).toBe(29);
        expect(result.toISOString()).toBe('2024-02-29T00:00:00.000Z');
      });

      it('should handle Feb 28 to Mar 1 boundary in non-leap year', () => {
        // Arrange
        const date = new Date(Date.UTC(2025, 1, 28));

        // Act
        const result = addDays(date, 1);

        // Assert
        expect(result.getUTCMonth()).toBe(2); // March
        expect(result.getUTCDate()).toBe(1);
      });

      it('should handle adding year to Feb 29 (leap year)', () => {
        // Arrange
        const date = new Date(Date.UTC(2024, 1, 29));

        // Act
        const result = addDays(date, 365); // Next year (non-leap)

        // Assert
        // JavaScript will correctly handle this
        expect(result.getUTCFullYear()).toBe(2025);
      });
    });

    describe('Month Boundaries', () => {
      it('should handle Jan 31 + 1 day correctly', () => {
        // Arrange
        const date = new Date(Date.UTC(2025, 0, 31));

        // Act
        const result = addDays(date, 1);

        // Assert
        expect(result.getUTCMonth()).toBe(1); // February
        expect(result.getUTCDate()).toBe(1);
      });

      it('should handle Apr 30 + 1 day correctly', () => {
        // Arrange
        const date = new Date(Date.UTC(2025, 3, 30)); // April has 30 days

        // Act
        const result = addDays(date, 1);

        // Assert
        expect(result.getUTCMonth()).toBe(4); // May
        expect(result.getUTCDate()).toBe(1);
      });

      it('should handle Dec 31 + 1 day crossing year', () => {
        // Arrange
        const date = new Date(Date.UTC(2025, 11, 31));

        // Act
        const result = addDays(date, 1);

        // Assert
        expect(result.getUTCFullYear()).toBe(2026);
        expect(result.getUTCMonth()).toBe(0);
        expect(result.getUTCDate()).toBe(1);
      });
    });

    describe('Large Time Ranges', () => {
      it('should handle adding 365 days (full year)', () => {
        // Arrange
        const date = new Date(Date.UTC(2025, 0, 1));

        // Act
        const result = addDays(date, 365);

        // Assert
        expect(result.getUTCFullYear()).toBe(2026);
        expect(result.getUTCMonth()).toBe(0);
        expect(result.getUTCDate()).toBe(1);
      });

      it('should handle adding 30 days (invoice due date scenario)', () => {
        // Arrange
        const date = new Date(Date.UTC(2025, 11, 6));

        // Act
        const result = addDays(date, 30);

        // Assert
        expect(result.getUTCMonth()).toBe(0); // January next year
        expect(result.getUTCDate()).toBe(5);
        expect(result.getUTCFullYear()).toBe(2026);
      });

      it('should handle subtracting large number of days', () => {
        // Arrange
        const date = new Date(Date.UTC(2025, 11, 6));

        // Act
        const result = addDays(date, -365);

        // Assert
        expect(result.getUTCFullYear()).toBe(2024);
      });
    });

    describe('Precision & Milliseconds', () => {
      it('should preserve milliseconds when adding days', () => {
        // Arrange
        const date = new Date(Date.UTC(2025, 11, 6, 14, 30, 45, 123));

        // Act
        const result = addDays(date, 1);

        // Assert
        expect(result.getUTCMilliseconds()).toBe(123);
      });

      it('should handle parseEndOfDay with exact milliseconds', () => {
        // Arrange
        const dateString = '2025-12-06';

        // Act
        const result = parseEndOfDay(dateString);

        // Assert
        expect(result.getUTCMilliseconds()).toBe(999);
        expect(result.toISOString()).toContain('.999Z');
      });
    });

    describe('Real-World Scenarios', () => {
      it('should calculate invoice due date (30 days from now)', () => {
        // Arrange
        const issueDate = new Date(); // Now
        const daysUntilDue = 30;

        // Act
        const dueDate = addDays(issueDate, daysUntilDue);

        // Assert
        expect(dueDate).toBeInstanceOf(Date);
        expect(dueDate.getTime()).toBeGreaterThan(issueDate.getTime());
      });

      it('should prepare date range for monthly report', () => {
        // Arrange
        const firstDay = '2025-12-01';
        const lastDay = '2025-12-31';

        // Act
        const range = prepareDateRange(firstDay, lastDay);

        // Assert
        expect(range.gte?.getUTCDate()).toBe(1);
        expect(range.lte?.getUTCDate()).toBe(31);
        expect(range.gte?.getUTCHours()).toBe(0);
        expect(range.lte?.getUTCHours()).toBe(23);
        expect(range.lte?.getUTCMinutes()).toBe(59);
      });

      it('should handle payment date parsing', () => {
        // Arrange
        const paymentDateString = '2025-12-06';

        // Act
        const paymentDate = parseStartOfDay(paymentDateString);

        // Assert
        expect(paymentDate.toISOString()).toBe('2025-12-06T00:00:00.000Z');
      });
    });
  });

  // ============================================
  // ADDITIONAL UTILITY FUNCTIONS
  // ============================================

  describe('isValidDateString', () => {
    it('should return true for valid YYYY-MM-DD format', () => {
      expect(isValidDateString('2025-12-06')).toBe(true);
    });

    it('should return false for invalid format', () => {
      expect(isValidDateString('12/06/2025')).toBe(false);
      expect(isValidDateString('2025-13-01')).toBe(false);
      expect(isValidDateString('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidDateString('')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(isValidDateString(123 as any)).toBe(false);
      expect(isValidDateString(null as any)).toBe(false);
    });
  });

  describe('isInPast', () => {
    it('should return true for past date', () => {
      const pastDate = new Date(2020, 0, 1);
      expect(isInPast(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date(2030, 0, 1);
      expect(isInPast(futureDate)).toBe(false);
    });
  });

  describe('isInFuture', () => {
    it('should return true for future date', () => {
      const futureDate = new Date(2030, 0, 1);
      expect(isInFuture(futureDate)).toBe(true);
    });

    it('should return false for past date', () => {
      const pastDate = new Date(2020, 0, 1);
      expect(isInFuture(pastDate)).toBe(false);
    });
  });

  describe('minutesBetween', () => {
    it('should calculate minutes between two dates', () => {
      const date1 = new Date(2025, 11, 6, 14, 0);
      const date2 = new Date(2025, 11, 6, 14, 30);
      expect(minutesBetween(date1, date2)).toBe(30);
    });

    it('should return absolute value', () => {
      const date1 = new Date(2025, 11, 6, 14, 30);
      const date2 = new Date(2025, 11, 6, 14, 0);
      expect(minutesBetween(date1, date2)).toBe(30);
    });
  });

  describe('getStartOfDay', () => {
    it('should set time to midnight UTC', () => {
      const date = new Date(Date.UTC(2025, 11, 6, 14, 30, 45));
      const result = getStartOfDay(date);

      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should set time to 23:59:59.999 UTC', () => {
      const date = new Date(Date.UTC(2025, 11, 6, 14, 30));
      const result = getEndOfDay(date);

      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
      expect(result.getUTCMilliseconds()).toBe(999);
    });
  });

  describe('getFirstDayOfMonth', () => {
    it('should return first day of month in UTC', () => {
      const date = new Date(Date.UTC(2025, 11, 15));
      const result = getFirstDayOfMonth(date);

      expect(result.getUTCDate()).toBe(1);
      expect(result.getUTCMonth()).toBe(11);
    });
  });

  describe('getLastDayOfMonth', () => {
    it('should return last day of month in UTC', () => {
      const date = new Date(Date.UTC(2025, 11, 15));
      const result = getLastDayOfMonth(date);

      expect(result.getUTCDate()).toBe(31); // December has 31 days
      expect(result.getUTCMonth()).toBe(11);
    });

    it('should handle February correctly', () => {
      const date = new Date(Date.UTC(2025, 1, 15));
      const result = getLastDayOfMonth(date);

      expect(result.getUTCDate()).toBe(28); // Non-leap year
    });

    it('should handle leap year February', () => {
      const date = new Date(Date.UTC(2024, 1, 15));
      const result = getLastDayOfMonth(date);

      expect(result.getUTCDate()).toBe(29); // Leap year
    });
  });

  describe('isBefore', () => {
    it('should return true when date1 < date2', () => {
      const date1 = new Date(2025, 11, 5);
      const date2 = new Date(2025, 11, 6);
      expect(isBefore(date1, date2)).toBe(true);
    });

    it('should return false when date1 >= date2', () => {
      const date1 = new Date(2025, 11, 6);
      const date2 = new Date(2025, 11, 5);
      expect(isBefore(date1, date2)).toBe(false);
    });
  });

  describe('isAfter', () => {
    it('should return true when date1 > date2', () => {
      const date1 = new Date(2025, 11, 7);
      const date2 = new Date(2025, 11, 6);
      expect(isAfter(date1, date2)).toBe(true);
    });

    it('should return false when date1 <= date2', () => {
      const date1 = new Date(2025, 11, 5);
      const date2 = new Date(2025, 11, 6);
      expect(isAfter(date1, date2)).toBe(false);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day in UTC', () => {
      const date1 = new Date(Date.UTC(2025, 11, 6, 10, 0));
      const date2 = new Date(Date.UTC(2025, 11, 6, 15, 30));
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(Date.UTC(2025, 11, 6));
      const date2 = new Date(Date.UTC(2025, 11, 7));
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('parseDateFromQuery (deprecated)', () => {
    it('should parse date and show deprecation warning', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = parseDateFromQuery('2025-12-06');

      expect(result.toISOString()).toBe('2025-12-06T00:00:00.000Z');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'parseDateFromQuery is deprecated. Use prepareDateRange instead.'
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
