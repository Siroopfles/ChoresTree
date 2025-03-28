/**
 * Configuratie interface voor DateUtils
 */
export interface IDateConfig {
  defaultTimezone?: string;
  defaultLocale?: string;
  cacheSize?: number;
}

/**
 * Interface voor datum formatting opties
 */
export interface IDateFormat {
  format: string;
  locale?: string;
  timezone?: string;
}

/**
 * DateCache voor het cachen van formatters en timezone conversies
 */
class DateCache {
  private formattersCache: Map<string, Intl.DateTimeFormat>;
  private timezoneCache: Map<string, string>;
  private readonly maxSize: number;

  constructor(maxSize: number = 50) {
    this.formattersCache = new Map();
    this.timezoneCache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Haal een formatter op of maak een nieuwe aan
   */
  getFormatter(format: string, locale: string, timezone: string): Intl.DateTimeFormat {
    const key = `${format}|${locale}|${timezone}`;

    if (this.formattersCache.has(key)) {
      return this.formattersCache.get(key)!;
    }

    // Verwijder oudste entry als cache vol is
    if (this.formattersCache.size >= this.maxSize) {
      const firstKey = this.formattersCache.keys().next().value;
      if (firstKey) {
        this.formattersCache.delete(firstKey);
      }
    }

    const formatter = new Intl.DateTimeFormat(locale, {
      ...this.parseFormat(format),
      timeZone: timezone,
    });

    this.formattersCache.set(key, formatter);
    return formatter;
  }

  /**
   * Parse een format string naar Intl.DateTimeFormatOptions
   */
  private parseFormat(format: string): Intl.DateTimeFormatOptions {
    const options: Intl.DateTimeFormatOptions = {};
    const tokens = format.split(',').map((t) => t.trim());

    tokens.forEach((token) => {
      switch (token) {
        case 'date':
          options.year = 'numeric';
          options.month = '2-digit';
          options.day = '2-digit';
          break;
        case 'time':
          options.hour = '2-digit';
          options.minute = '2-digit';
          options.second = '2-digit';
          break;
        case 'short':
          options.dateStyle = 'short';
          break;
        case 'long':
          options.dateStyle = 'long';
          break;
      }
    });

    return options;
  }

  /**
   * Clear de caches
   */
  clear(): void {
    this.formattersCache.clear();
    this.timezoneCache.clear();
  }
}

/**
 * Utility class voor het werken met datums
 */
export class DateUtils {
  private static readonly defaultConfig: IDateConfig = {
    defaultTimezone: 'Europe/Amsterdam',
    defaultLocale: 'nl-NL',
    cacheSize: 50,
  };

  private static config: IDateConfig = { ...DateUtils.defaultConfig };
  private static readonly cache: DateCache = new DateCache(DateUtils.defaultConfig.cacheSize!);

  /**
   * Configureer de DateUtils
   */
  public static configure(config: Partial<IDateConfig>): void {
    DateUtils.config = { ...DateUtils.config, ...config };
  }

  /**
   * Valideer of een datum geldig is
   */
  public static isValidDate(date: Date | string | number): boolean {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }

  /**
   * Format een datum volgens het opgegeven formaat en timezone
   */
  public static format(date: Date, options: IDateFormat): string {
    const locale = options.locale || DateUtils.config.defaultLocale;
    const timezone = options.timezone || DateUtils.config.defaultTimezone;

    if (!locale || !timezone) {
      throw new Error('Locale and timezone must be provided either in options or default config');
    }

    const formatter = DateUtils.cache.getFormatter(options.format, locale, timezone);

    return formatter.format(date);
  }

  /**
   * Format een datum naar ISO string zonder tijd
   */
  public static formatDateOnly(date: Date): string {
    return DateUtils.format(date, { format: 'date' });
  }

  /**
   * Check of een datum in het verleden ligt
   */
  public static isPastDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  }

  /**
   * Check of een datum binnen het opgegeven aantal dagen ligt
   */
  public static isWithinDays(date: Date, days: number): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate <= futureDate && compareDate >= today;
  }

  /**
   * Bereken het aantal dagen tussen twee datums
   */
  public static daysBetween(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Voeg een aantal dagen toe aan een datum
   */
  public static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
