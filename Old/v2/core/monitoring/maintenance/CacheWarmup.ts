import { DataSource } from 'typeorm';
import { Logger } from '../../../utils/logger';
import { CacheModule } from '../../cache/CacheModule';

export class CacheWarmupUtil {
  private readonly logger: Logger;
  private readonly dataSource: DataSource;
  private readonly cacheModule: CacheModule;

  constructor(dataSource: DataSource, cacheModule: CacheModule) {
    this.logger = new Logger('CacheWarmup');
    this.dataSource = dataSource;
    this.cacheModule = cacheModule;
  }

  /**
   * Warm up frequently accessed data
   */
  async warmupCache(): Promise<void> {
    try {
      this.logger.info('Starting cache warmup...');

      // Get frequently accessed configurations
      const configs = await this.warmupConfigs();
      this.logger.info(`Cached ${configs} configurations`);

      // Get active tasks
      const tasks = await this.warmupTasks();
      this.logger.info(`Cached ${tasks} active tasks`);

      // Get pending notifications
      const notifications = await this.warmupNotifications();
      this.logger.info(`Cached ${notifications} pending notifications`);

      this.logger.info('Cache warmup completed successfully');
    } catch (error) {
      this.logger.error('Cache warmup failed', error);
      throw error;
    }
  }

  /**
   * Cache frequently accessed configurations
   */
  private async warmupConfigs(): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const configs = await queryRunner.query(
        'SELECT * FROM configurations WHERE access_count > 100'
      );

      for (const config of configs) {
        await this.cacheModule.getProvider().set(
          `config:${config.id}`,
          JSON.stringify(config),
          { ttl: 3600 } // 1 hour TTL
        );
      }

      return configs.length;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cache active tasks
   */
  private async warmupTasks(): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const tasks = await queryRunner.query(
        'SELECT * FROM tasks WHERE status = \'active\' AND deadline > NOW()'
      );

      for (const task of tasks) {
        await this.cacheModule.getProvider().set(
          `task:${task.id}`,
          JSON.stringify(task),
          { ttl: 1800 } // 30 minutes TTL
        );
      }

      return tasks.length;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cache pending notifications
   */
  private async warmupNotifications(): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const notifications = await queryRunner.query(
        'SELECT * FROM notifications WHERE status = \'pending\' AND schedule_time > NOW()'
      );

      for (const notification of notifications) {
        await this.cacheModule.getProvider().set(
          `notification:${notification.id}`,
          JSON.stringify(notification),
          { ttl: 900 } // 15 minutes TTL
        );
      }

      return notifications.length;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Clear and rewarm cache
   */
  async refreshCache(): Promise<void> {
    try {
      this.logger.info('Starting cache refresh...');
      
      await this.cacheModule.getProvider().clear();
      await this.warmupCache();
      
      this.logger.info('Cache refresh completed successfully');
    } catch (error) {
      this.logger.error('Cache refresh failed', error);
      throw error;
    }
  }
}