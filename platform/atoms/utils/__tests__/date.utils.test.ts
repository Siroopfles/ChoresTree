import { DateUtils, IDateConfig, IDateFormat } from '../date.utils';

describe('DateUtils', () => {
  beforeEach(() => {
    // Reset naar default configuratie voor elke test
    DateUtils.configure({
      defaultTimezone: 'Europe/Amsterdam',
      defaultLocale: 'nl-NL',
      cacheSize: 50,
    });
  });

  describe('configuration', () => {
    it('should allow configuration updates', () => {
      const config: Partial<IDateConfig> = {
        defaultTimezone: 'America/New_York',
        defaultLocale: 'en-US',
      };

      DateUtils.configure(config);

      const date = new Date('2025-01-01T12:00:00Z');
      const result = DateUtils.format(date, { format: 'short' });

      // Amerikaans formaat (M/D/YYYY)
      expect(result).toMatch(/1\/1\/2025/);
    });

    it('should throw error when locale/timezone missing', () => {
      DateUtils.configure({
        defaultTimezone: undefined,
        defaultLocale: undefined,
      });

      const date = new Date();
      expect(() => {
        DateUtils.format(date, { format: 'date' });
      }).toThrow('Locale and timezone must be provided');
    });
  });

  describe('format', () => {
    const testDate = new Date('2025-01-01T12:00:00Z');

    it('should format with custom locale and timezone', () => {
      const options: IDateFormat = {
        format: 'date,time',
        locale: 'nl-NL',
        timezone: 'Europe/Amsterdam',
      };

      const result = DateUtils.format(testDate, options);
      expect(result).toMatch(/01-01-2025/); // Nederlands formaat (DD-MM-YYYY)
      expect(result).toMatch(/13:00/); // Amsterdam timezone (+1)
    });

    it('should use default locale and timezone', () => {
      const result = DateUtils.format(testDate, { format: 'date' });
      expect(result).toMatch(/01-01-2025/); // Default Nederlands formaat
    });

    it('should handle different format options', () => {
      expect(DateUtils.format(testDate, { format: 'short' })).toMatch(/01-01-2025/);

      expect(DateUtils.format(testDate, { format: 'long' })).toMatch(/1 januari 2025/);

      expect(DateUtils.format(testDate, { format: 'date,time' })).toMatch(/13:00/);
    });

    // Performance test
    it('should cache formatters for better performance', () => {
      const options: IDateFormat = {
        format: 'date,time',
        locale: 'nl-NL',
        timezone: 'Europe/Amsterdam',
      };

      const iterations = 1000;
      const start = performance.now();

      // Warm-up cache
      DateUtils.format(testDate, options);

      // Test cached performance
      for (let i = 0; i < iterations; i++) {
        DateUtils.format(testDate, options);
      }

      const avgTime = (performance.now() - start) / iterations;
      expect(avgTime).toBeLessThan(0.1); // Gemiddeld onder 0.1ms per format
    });
  });

  describe('isValidDate', () => {
    it('should validate valid dates', () => {
      const validDates = [
        new Date(),
        '2025-01-01',
        1735689600000, // 2025-01-01 timestamp
      ];

      validDates.forEach((date) => {
        expect(DateUtils.isValidDate(date)).toBe(true);
      });
    });

    it('should reject invalid dates', () => {
      const invalidDates = [
        'not-a-date',
        '2025-13-01', // invalid month
        'undefined',
        null as unknown as string,
      ];

      invalidDates.forEach((date) => {
        expect(DateUtils.isValidDate(date)).toBe(false);
      });
    });
  });

  describe('formatDateOnly', () => {
    it('should format date to DD-MM-YYYY', () => {
      const date = new Date('2025-01-01T12:00:00Z');
      expect(DateUtils.formatDateOnly(date)).toMatch(/01-01-2025/);
    });
  });

  describe('isPastDate', () => {
    it('should identify past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(DateUtils.isPastDate(pastDate)).toBe(true);
    });

    it('should identify future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(DateUtils.isPastDate(futureDate)).toBe(false);
    });
  });

  describe('isWithinDays', () => {
    it('should identify dates within range', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      expect(DateUtils.isWithinDays(tomorrow, 2)).toBe(true);
    });

    it('should reject dates outside range', () => {
      const today = new Date();
      const farFuture = new Date(today);
      farFuture.setDate(today.getDate() + 10);

      expect(DateUtils.isWithinDays(farFuture, 5)).toBe(false);
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between dates', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-05');

      expect(DateUtils.daysBetween(start, end)).toBe(4);
    });

    it('should handle same day', () => {
      const date = new Date('2025-01-01');
      expect(DateUtils.daysBetween(date, date)).toBe(0);
    });

    it('should handle timezone differences', () => {
      const start = new Date('2025-01-01T23:00:00Z'); // Late night UTC
      const end = new Date('2025-01-02T01:00:00Z'); // Early morning UTC

      expect(DateUtils.daysBetween(start, end)).toBe(1);
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const start = new Date('2025-01-01');
      const result = DateUtils.addDays(start, 5);
      expect(DateUtils.formatDateOnly(result)).toMatch(/06-01-2025/);
    });

    it('should handle month/year boundaries', () => {
      const start = new Date('2025-12-30');
      const result = DateUtils.addDays(start, 5);
      expect(DateUtils.formatDateOnly(result)).toMatch(/04-01-2026/);
    });
  });
});
