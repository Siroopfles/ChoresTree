/**
 * Base interface for all metric collectors
 */
export interface MetricsCollector {
  collect(): Promise<Record<string, number | string>>;
  reset(): Promise<void>;
}

/**
 * Database specific metrics
 */
export interface DatabaseMetrics extends MetricsCollector {
  queryCount: number;
  averageQueryTime: number;
  slowQueries: number;
  errorRate: number;
  connectionPoolSize: number;
  activeConnections: number;
}

/**
 * Cache specific metrics
 */
export interface CacheMetrics extends MetricsCollector {
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  evictionCount: number;
  totalOperations: number;
}

/**
 * Health check results
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    [key: string]: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
  };
  timestamp: Date;
}