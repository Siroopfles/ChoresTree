import { ServerSettings } from '@/atomic/atoms/database/entities/ServerSettings';
import { ServerScopedRepository } from './BaseRepository';
import { AppDataSource } from '@/config/database';
import { DEFAULT_SERVER_SETTINGS } from '@/atomic/atoms/database/interfaces/ServerSettings';

export class ServerSettingsRepository extends ServerScopedRepository<ServerSettings> {
  constructor() {
    super(AppDataSource.getRepository(ServerSettings), 'server_settings', 3600); // 1 uur cache TTL
  }

  // Ophalen van server settings met caching
  async getServerSettings(serverId: string): Promise<ServerSettings> {
    const cacheKey = this.getServerCacheKey(serverId);
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Zoek bestaande settings of maak nieuwe aan
    let settings = await this.repository.findOneBy({ serverId });

    if (!settings) {
      // Creëer nieuwe settings met defaults
      settings = await this.create({
        serverId,
        ...DEFAULT_SERVER_SETTINGS,
        notificationChannelId: '', // Dit moet later worden ingesteld
        adminRoleIds: [],
        managerRoleIds: [],
      });
    }

    await this.setCache(cacheKey, settings);
    return settings;
  }

  // Update server settings met cache invalidatie
  async updateServerSettings(
    serverId: string,
    updates: Partial<ServerSettings>
  ): Promise<ServerSettings> {
    const settings = await this.getServerSettings(serverId);
    const updated = await this.update(settings.id, updates);
    
    if (!updated) {
      throw new Error(`Failed to update settings for server ${serverId}`);
    }

    const cacheKey = this.getServerCacheKey(serverId);
    await this.clearCache(cacheKey);

    return updated;
  }

  // Bulk operaties voor server migraties
  async migrateServerSettings(
    updates: Array<{ serverId: string; settings: Partial<ServerSettings> }>
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const { serverId, settings } of updates) {
        const existing = await this.getServerSettings(serverId);
        await queryRunner.manager.update(ServerSettings, existing.id, settings);
        const cacheKey = this.getServerCacheKey(serverId);
        await this.clearCache(cacheKey);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Helper voor feature flags
  async isFeatureEnabled(serverId: string, feature: string): Promise<boolean> {
    const settings = await this.getServerSettings(serverId);
    return settings.isFeatureEnabled(feature as keyof typeof settings.enabledFeatures);
  }
}