/**
 * Utility functies voor het werken met datums
 */
export const DateUtils = {
  /**
   * Valideer of een datum geldig is
   */
  isValidDate(date: Date | string | number): boolean {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  },

  /**
   * Format een datum naar ISO string zonder tijd
   */
  formatDateOnly(date: Date): string {
    return date.toISOString().split('T')[0];
  },

  /**
   * Check of een datum in het verleden ligt
   */
  isPastDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  },

  /**
   * Check of een datum binnen het opgegeven aantal dagen ligt
   */
  isWithinDays(date: Date, days: number): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate <= futureDate && compareDate >= today;
  },

  /**
   * Bereken het aantal dagen tussen twee datums
   */
  daysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  },

  /**
   * Voeg een aantal dagen toe aan een datum
   */
  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
};