import { DataSourceOptions, DataSource } from 'typeorm';
import { Logger } from '../../../utils/logger';

interface PoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
}

interface ConnectionPool {
  totalCount: number;
  activeCount: number;
  idleCount: number;
  waitingCount: number;
}

/**
 * Database connection configuration with built-in retry mechanism,
 * connection pooling, and health checks
 */
export const connectionConfig: Partial<DataSourceOptions> = {
  // Connection Pool Settings
  extra: {
    max: 100, // Maximum number of connections in pool
    idleTimeoutMillis: 5000, // 5s timeout for idle connections
    connectionTimeoutMillis: 5000, // 5s connection timeout
    
    // Connection retry settings
    retry: {
      maxAttempts: 5,
      initialDelayMs: 1000, // Start with 1s delay
      maxDelayMs: 10000, // Max 10s delay between retries
    },

    // Connection pool monitoring
    monitoring: {
      enabled: true,
      collectMetricsIntervalMs: 10000, // Collect metrics every 10s
    },

    // Health check configuration
    healthCheck: {
      enabled: true,
      intervalMs: 30000, // Run health check every 30s
      timeoutMs: 3000, // Health check timeout
      query: 'SELECT 1', // Simple health check query
    },
  },

  // Logging configuration
  logging: ['error', 'warn', 'schema'],
  logger: Logger.createTypeOrmLogger('Database'),

  // Core connection settings
  synchronize: false, // Disable auto-sync in production
  migrationsRun: true, // Auto-run migrations on startup
};

/**
 * Retry strategy with exponential backoff
 */
export const retryStrategy = {
  getDelayMs: (attempt: number): number => {
    const baseDelay = 1000; // 1s base delay
    const maxDelay = 10000; // 10s max delay
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay;
  },
};

/**
 * Health check utility functions
 */
export const healthCheck = {
  /**
   * Performs a health check on the database connection
   */
  async check(connection: DataSource): Promise<boolean> {
    try {
      await connection.query('SELECT 1');
      return true;
    } catch (error) {
      Logger.error('Database', 'Health check failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  },

  /**
   * Starts periodic health checks
   */
  startPeriodicChecks(connection: DataSource, intervalMs: number = 30000): void {
    setInterval(async () => {
      const isHealthy = await healthCheck.check(connection);
      Logger.debug('Database', `Health check status: ${isHealthy ? 'healthy' : 'unhealthy'}`);
    }, intervalMs);
  },
};

/**
 * Connection pool monitoring
 */
export const poolMonitoring = {
  /**
   * Collects and logs pool metrics
   */
  async collectMetrics(pool: ConnectionPool): Promise<void> {
    const metrics: PoolMetrics = {
      totalConnections: pool.totalCount,
      activeConnections: pool.activeCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
    };

    Logger.info('Database', 'Pool metrics:', metrics);
  },

  /**
   * Starts periodic pool metrics collection
   */
  startPeriodicCollection(pool: ConnectionPool, intervalMs: number = 10000): void {
    setInterval(() => poolMonitoring.collectMetrics(pool), intervalMs);
  },
};