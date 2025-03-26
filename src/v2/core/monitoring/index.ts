export * from './interfaces/Metrics';
export * from './DatabaseMetrics';
export * from './CacheMetrics';
export * from './HealthChecks';

// Maintenance tools
export * from './maintenance/CacheWarmup';
export * from './maintenance/IndexMaintenance';

// Monitoring Factory
import { DataSource } from 'typeorm';
import { CacheModule } from '../cache/CacheModule';
import { DatabaseMetricsCollector } from './DatabaseMetrics';
import { CacheMetricsCollector } from './CacheMetrics';
import { HealthChecker } from './HealthChecks';
import { CacheWarmupUtil } from './maintenance/CacheWarmup';
import { IndexMaintenanceUtil } from './maintenance/IndexMaintenance';

export interface MonitoringOptions {
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
  metricsInterval?: number; // in milliseconds
}

export class MonitoringService {
  private readonly dataSource: DataSource;
  private readonly cacheModule: CacheModule;
  private readonly options: MonitoringOptions;

  private databaseMetrics?: DatabaseMetricsCollector;
  private cacheMetrics?: CacheMetricsCollector;
  private healthChecker?: HealthChecker;
  private cacheWarmup?: CacheWarmupUtil;
  private indexMaintenance?: IndexMaintenanceUtil;

  constructor(
    dataSource: DataSource,
    cacheModule: CacheModule,
    options: MonitoringOptions = {}
  ) {
    this.dataSource = dataSource;
    this.cacheModule = cacheModule;
    this.options = {
      enableMetrics: true,
      enableHealthChecks: true,
      metricsInterval: 60000, // default: 1 minute
      ...options
    };

    this.initialize();
  }

  private initialize(): void {
    if (this.options.enableMetrics) {
      this.databaseMetrics = new DatabaseMetricsCollector(this.dataSource);
      this.cacheMetrics = new CacheMetricsCollector(this.cacheModule);
    }

    if (this.options.enableHealthChecks) {
      this.healthChecker = new HealthChecker(this.dataSource, this.cacheModule);
    }

    // Initialize maintenance tools
    this.cacheWarmup = new CacheWarmupUtil(this.dataSource, this.cacheModule);
    this.indexMaintenance = new IndexMaintenanceUtil(this.dataSource);
  }

  /**
   * Get database metrics collector
   */
  getDatabaseMetrics(): DatabaseMetricsCollector {
    if (!this.databaseMetrics) {
      throw new Error('Database metrics not enabled');
    }
    return this.databaseMetrics;
  }

  /**
   * Get cache metrics collector
   */
  getCacheMetrics(): CacheMetricsCollector {
    if (!this.cacheMetrics) {
      throw new Error('Cache metrics not enabled');
    }
    return this.cacheMetrics;
  }

  /**
   * Get health checker
   */
  getHealthChecker(): HealthChecker {
    if (!this.healthChecker) {
      throw new Error('Health checks not enabled');
    }
    return this.healthChecker;
  }

  /**
   * Get cache warmup utility
   */
  getCacheWarmup(): CacheWarmupUtil {
    return this.cacheWarmup!;
  }

  /**
   * Get index maintenance utility
   */
  getIndexMaintenance(): IndexMaintenanceUtil {
    return this.indexMaintenance!;
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring(): void {
    if (this.options.enableMetrics) {
      setInterval(async () => {
        try {
          if (this.databaseMetrics) {
            await this.databaseMetrics.collect();
          }
          if (this.cacheMetrics) {
            await this.cacheMetrics.collect();
          }
        } catch (error) {
          console.error('Periodic monitoring failed:', error);
        }
      }, this.options.metricsInterval);
    }
  }
}