import '@testing-library/jest-dom';

// Mock timezone to Peru (GMT-5) for consistent tests
process.env.TZ = 'America/Lima';

// Add custom matchers if needed
expect.extend({
  toBeValidDateString(received: string) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const pass = dateRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date string`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date string (YYYY-MM-DD)`,
        pass: false,
      };
    }
  },

  toBeValidDateTimeString(received: string) {
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    const pass = dateTimeRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid datetime string`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid datetime string (YYYY-MM-DDTHH:mm)`,
        pass: false,
      };
    }
  },
});

// Extend Jest matchers type
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDateString(): R;
      toBeValidDateTimeString(): R;
    }
  }
}
