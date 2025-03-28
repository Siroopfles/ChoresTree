import { DateUtils } from '../date.utils';

describe('DateUtils', () => {
  describe('isValidDate', () => {
    it('should validate valid dates', () => {
      const validDates = [
        new Date(),
        '2025-01-01',
        1735689600000 // 2025-01-01 timestamp
      ];

      validDates.forEach(date => {
        expect(DateUtils.isValidDate(date)).toBe(true);
      });
    });

    it('should reject invalid dates', () => {
      const invalidDates = [
        'not-a-date',
        '2025-13-01', // invalid month
        'undefined',
        null as unknown as string // Type cast voor test
      ];

      invalidDates.forEach(date => {
        expect(DateUtils.isValidDate(date)).toBe(false);
      });
    });
  });

  describe('formatDateOnly', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2025-01-01T12:00:00Z');
      expect(DateUtils.formatDateOnly(date)).toBe('2025-01-01');
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
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const start = new Date('2025-01-01');
      const result = DateUtils.addDays(start, 5);
      expect(result.toISOString().split('T')[0]).toBe('2025-01-06');
    });

    it('should handle month/year boundaries', () => {
      const start = new Date('2025-12-30');
      const result = DateUtils.addDays(start, 5);
      expect(result.toISOString().split('T')[0]).toBe('2026-01-04');
    });
  });
});