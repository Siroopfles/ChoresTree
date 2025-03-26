/**
 * Log levels supported by the logger
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Type for log arguments that can be serialized
 */
type LogArg = string | number | boolean | object | null | undefined;

/**
 * Logger utility for consistent logging across the application
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Format log message with context and args
   */
  private static formatMessage(context: string, message: string, args: LogArg[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    return `[${timestamp}] [${context}] ${message} ${formattedArgs}`.trim();
  }

  static debug(context: string, message: string, ...args: LogArg[]): void {
    // In production, debug logs are disabled
    if (process.env.NODE_ENV !== 'production') {
      const formattedMessage = this.formatMessage(context, message, args);
      console.warn(`[DEBUG] ${formattedMessage}`);
    }
  }

  static info(context: string, message: string, ...args: LogArg[]): void {
    const formattedMessage = this.formatMessage(context, message, args);
    console.warn(`[INFO] ${formattedMessage}`);
  }

  static warn(context: string, message: string, ...args: LogArg[]): void {
    const formattedMessage = this.formatMessage(context, message, args);
    console.warn(formattedMessage);
  }

  static error(context: string, message: string, ...args: LogArg[]): void {
    const formattedMessage = this.formatMessage(context, message, args);
    console.error(formattedMessage);
  }

  debug(message: string, ...args: LogArg[]): void {
    Logger.debug(this.context, message, ...args);
  }

  info(message: string, ...args: LogArg[]): void {
    Logger.info(this.context, message, ...args);
  }

  warn(message: string, ...args: LogArg[]): void {
    Logger.warn(this.context, message, ...args);
  }

  error(message: string, ...args: LogArg[]): void {
    Logger.error(this.context, message, ...args);
  }

  /**
   * Create a logger instance implementing TypeORM Logger interface
   */
  static createTypeOrmLogger(context: string): any {
    return {
      logQuery: (query: string, parameters?: LogArg[]) => {
        Logger.debug(context, 'Query:', query, parameters || []);
      },
      logQueryError: (error: string, query: string, parameters?: LogArg[]) => {
        Logger.error(context, 'Query Error:', error, query, parameters || []);
      },
      logQuerySlow: (time: number, query: string, parameters?: LogArg[]) => {
        Logger.warn(context, `Slow Query (${time}ms):`, query, parameters || []);
      },
      logMigration: (message: string) => {
        Logger.info(context, 'Migration:', message);
      },
      logSchemaBuild: (message: string) => {
        Logger.info(context, 'Schema:', message);
      },
      log: (level: 'log' | 'info' | 'warn', message: string) => {
        switch (level) {
          case 'log':
          case 'info':
            Logger.info(context, message);
            break;
          case 'warn':
            Logger.warn(context, message);
            break;
        }
      }
    };
  }
}