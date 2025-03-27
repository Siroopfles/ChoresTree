import { DataSource } from 'typeorm';
import { Logger } from '../../utils/logger';
import type { DatabaseMetrics as IDatabaseMetrics } from './interfaces/Metrics';

type QueryParameters = string | number | boolean | null | undefined | Date | Buffer | QueryParameters[];

interface DatabasePoolStats {
  count: string;
}

export class DatabaseMetricsCollector implements IDatabaseMetrics {
  private readonly logger: Logger;
  private readonly dataSource: DataSource;
  private queryStats: {
    count: number;
    totalTime: number;
    slowCount: number;
    errorCount: number;
  };

  queryCount: number = 0;
  averageQueryTime: number = 0;
  slowQueries: number = 0;
  errorRate: number = 0;
  connectionPoolSize: number = 0;
  activeConnections: number = 0;

  constructor(dataSource: DataSource) {
    this.logger = new Logger('DatabaseMetrics');
    this.dataSource = dataSource;
    this.queryStats = {
      count: 0,
      totalTime: 0,
      slowCount: 0,
      errorCount: 0,
    };

    this.setupMetricsCollection();
  }

  private setupMetricsCollection(): void {
    // Override query execution to collect metrics
    const originalCreateQueryRunner = this.dataSource.createQueryRunner.bind(this.dataSource);
    const self = this;
    
    this.dataSource.createQueryRunner = () => {
      const queryRunner = originalCreateQueryRunner();
      const originalQuery = queryRunner.query.bind(queryRunner);

      // Override with correct TypeORM query method signature
      queryRunner.query = async function<T>(
        query: string,
        parameters?: QueryParameters[]
      ): Promise<T> {
        const startTime = process.hrtime();
        
        try {
          const result = await originalQuery(query, parameters);
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const timeMs = (seconds * 1000) + (nanoseconds / 1000000);
          
          self.trackQuery(timeMs, true);
          return result;
        } catch (error) {
          self.trackQuery(0, false);
          const queryError = `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          self.logger.error(queryError);
          throw error;
        }
      };

      return queryRunner;
    };
  }

  /**
   * Track individual query execution
   */
  private trackQuery(timeMs: number, success: boolean): void {
    this.queryStats.count++;
    this.queryStats.totalTime += timeMs;

    if (timeMs > 100) { // Queries slower than 100ms
      this.queryStats.slowCount++;
      this.logger.warn(`Slow query detected (${timeMs}ms)`);
    }

    if (!success) {
      this.queryStats.errorCount++;
    }

    // Update metrics
    this.queryCount = this.queryStats.count;
    this.averageQueryTime = this.queryStats.totalTime / this.queryStats.count;
    this.slowQueries = this.queryStats.slowCount;
    this.errorRate = (this.queryStats.errorCount / this.queryStats.count) * 100;
  }

  /**
   * Collect current database metrics
   */
  async collect(): Promise<Record<string, number | string>> {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      
      // Get connection pool stats using raw query
      const poolStatsResult = await queryRunner.query(
        'SELECT COUNT(*) as count FROM pg_stat_activity WHERE datname = current_database()'
      ) as DatabasePoolStats[];

      this.connectionPoolSize = parseInt(process.env.PG_POOL_SIZE || '100');
      this.activeConnections = parseInt(poolStatsResult[0].count);

      await queryRunner.release();

      return {
        queryCount: this.queryCount,
        averageQueryTime: Math.round(this.averageQueryTime),
        slowQueries: this.slowQueries,
        errorRate: Math.round(this.errorRate * 100) / 100,
        connectionPoolSize: this.connectionPoolSize,
        activeConnections: this.activeConnections,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to collect database metrics', error);
      throw error;
    }
  }

  /**
   * Reset all metrics
   */
  async reset(): Promise<void> {
    this.queryStats = {
      count: 0,
      totalTime: 0,
      slowCount: 0,
      errorCount: 0,
    };
    this.queryCount = 0;
    this.averageQueryTime = 0;
    this.slowQueries = 0;
    this.errorRate = 0;
  }
}