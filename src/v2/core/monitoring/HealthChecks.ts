import { DataSource } from 'typeorm';
import { Logger } from '../../utils/logger';
import { CacheModule } from '../cache/CacheModule';
import type { HealthCheckResult } from './interfaces/Metrics';

export class HealthChecker {
  private readonly logger: Logger;
  private readonly dataSource: DataSource;
  private readonly cacheModule: CacheModule;

  constructor(dataSource: DataSource, cacheModule: CacheModule) {
    this.logger = new Logger('HealthChecker');
    this.dataSource = dataSource;
    this.cacheModule = cacheModule;
  }

  /**
   * Voer health checks uit voor alle systeem componenten
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'healthy',
      details: {},
      timestamp: new Date()
    };

    // Check database connectie
    const dbHealth = await this.checkDatabase();
    result.details.database = dbHealth;

    // Check cache connectie
    const cacheHealth = await this.checkCache();
    result.details.cache = cacheHealth;

    // Bepaal overall system status
    if (Object.values(result.details).some(check => check.status === 'down')) {
      result.status = 'unhealthy';
    } else if (Object.values(result.details).some(check => check.latency && check.latency > 100)) {
      result.status = 'degraded';
    }

    return result;
  }

  /**
   * Database health check
   */
  private async checkDatabase(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    const startTime = process.hrtime();

    try {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.query('SELECT 1');
      await queryRunner.release();

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const latency = (seconds * 1000) + (nanoseconds / 1000000);

      return {
        status: 'up',
        latency
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Cache health check
   */
  private async checkCache(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    const startTime = process.hrtime();

    try {
      const provider = this.cacheModule.getProvider();
      const testKey = 'health:test';
      
      // Test basic cache operations
      await provider.set(testKey, 'test', { ttl: 10 });
      await provider.get(testKey);
      await provider.delete(testKey);

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const latency = (seconds * 1000) + (nanoseconds / 1000000);

      return {
        status: 'up',
        latency
      };
    } catch (error) {
      this.logger.error('Cache health check failed', error);
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown cache error'
      };
    }
  }

  /**
   * Uitgebreide system check met memory gebruik
   */
  async getSystemStatus(): Promise<{
    health: HealthCheckResult;
    memory: {
      total: number;
      used: number;
      free: number;
    };
  }> {
    const health = await this.checkHealth();
    
    // Collect memory stats
    const memory = process.memoryUsage();
    
    return {
      health,
      memory: {
        total: Math.round(memory.heapTotal / 1024 / 1024), // MB
        used: Math.round(memory.heapUsed / 1024 / 1024),   // MB
        free: Math.round((memory.heapTotal - memory.heapUsed) / 1024 / 1024) // MB
      }
    };
  }
}