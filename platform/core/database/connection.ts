import { DataSourceOptions } from 'typeorm';
import * as dd from 'datadog-metrics';

// Database metrics collector
export class DatabaseMetrics {
  private static instance: DatabaseMetrics;

  private constructor() {
    dd.init({ host: 'localhost', prefix: 'chorestree.database.' });
  }

  static getInstance(): DatabaseMetrics {
    if (!this.instance) {
      this.instance = new DatabaseMetrics();
    }
    return this.instance;
  }

  recordQueryExecution(query: string, duration: number): void {
    dd.histogram('query.duration', duration, [`query:${query.substring(0, 50)}`]);
  }

  recordConnectionPoolStatus(active: number, idle: number): void {
    dd.gauge('pool.connections.active', active);
    dd.gauge('pool.connections.idle', idle);
  }

  recordError(type: string, error: Error): void {
    dd.increment('errors', 1, [`type:${type}`, `message:${error.message}`]);
  }
}

// Connection configuration met performance optimalisaties
export const connectionOptions: DataSourceOptions = {
  type: 'postgres',
  // Database configuratie
  username: 'postgres',
  password: 'postgres',
  database: 'chorestree',
  synchronize: false,

  // Pool configuratie
  poolSize: 20, // Optimale pool grootte

  // Extra PostgreSQL configuratie
  extra: {
    max_connections: 100,
    application_name: 'ChoresTree',
    statement_timeout: 5000,
    idle_in_transaction_session_timeout: 60000,
    statement_cache_size: 100,
  },

  // Logging configuratie
  logging: ['query', 'error'],
  logger: 'advanced-console',
};

// Connection pool monitoring
export const monitorConnectionPool = (connection: any) => {
  const metrics = DatabaseMetrics.getInstance();

  setInterval(() => {
    const pool = connection.driver.pool;
    if (pool) {
      metrics.recordConnectionPoolStatus(pool.totalCount - pool.idleCount, pool.idleCount);
    }
  }, 5000);
};

// Query performance monitoring middleware
export const createQueryMonitoringMiddleware = () => {
  const metrics = DatabaseMetrics.getInstance();

  return {
    beforeQuery: (query: string) => {
      return {
        startTime: process.hrtime(),
        query,
      };
    },
    afterQuery: (data: { startTime: [number, number]; query: string }) => {
      const duration = process.hrtime(data.startTime);
      const durationMs = (duration[0] * 1e9 + duration[1]) / 1e6;
      metrics.recordQueryExecution(data.query, durationMs);
    },
    onError: (error: Error, data: { query: string }) => {
      metrics.recordError('query', error);
    },
  };
};
