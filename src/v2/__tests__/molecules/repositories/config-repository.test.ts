import { getTestDb, withTestTransaction } from '@/v2/test/jest/setup-after-env';
import { ConfigEntity } from '@/v2/atomic/atoms/database/entities/ConfigEntity';
import { ServerEntity } from '@/v2/atomic/atoms/database/entities/ServerEntity';
import { ConfigRepositoryImpl } from '@/v2/atomic/molecules/common/repositories/config/ConfigRepositoryImpl';
import { DataSource } from 'typeorm';
import { MemoryCacheProvider } from '@/v2/core/cache/providers/MemoryCacheProvider';

describe('ConfigRepository (Molecules)', () => {
  let dataSource: DataSource;
  let configRepository: ConfigRepositoryImpl;
  let server: ServerEntity;
  let cacheProvider: MemoryCacheProvider;

  beforeAll(async () => {
    dataSource = getTestDb();
    expect(dataSource).toBeValidDatabase();

    // Initialize repository with cache
    const repository = dataSource.getRepository(ConfigEntity);
    cacheProvider = new MemoryCacheProvider();
    configRepository = new ConfigRepositoryImpl(repository, cacheProvider);

    // Create test server
    server = new ServerEntity();
    server.serverId = '123456789';
    server.serverName = 'Test Server';
    server.timezone = 'Europe/Amsterdam';
    server.language = 'nl';
    await dataSource.manager.save(ServerEntity, server);
  });

  describe('Basis Config Operaties', () => {
    it('moet een string config kunnen aanmaken en ophalen', async () => {
      await withTestTransaction(async () => {
        // Arrange & Act
        const config = await configRepository.setValue(
          server.id,
          'test.string',
          'test value',
          'STRING'
        );

        // Assert
        expect(config).toBeDefined();
        expect(config?.key).toBe('test.string');
        expect(config?.value).toBe('test value');
        expect(config?.type).toBe('STRING');

        // Test getValue
        const value = await configRepository.getValue<string>(server.id, 'test.string');
        expect(value).toBe('test value');

        // Verify caching
        const cacheKey = `config-value:${server.id}:test.string`;
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeDefined();
      });
    });

    it('moet een number config kunnen valideren en opslaan', async () => {
      await withTestTransaction(async () => {
        // Valid number
        const config = await configRepository.setValue(
          server.id,
          'test.number',
          123,
          'NUMBER'
        );
        expect(config).toBeDefined();
        expect(await configRepository.getValue<number>(server.id, 'test.number')).toBe(123);

        // Invalid number should throw
        await expect(
          configRepository.setValue(server.id, 'test.invalid', 'not a number', 'NUMBER')
        ).rejects.toThrow();
      });
    });

    it('moet een boolean config kunnen valideren en opslaan', async () => {
      await withTestTransaction(async () => {
        // Valid boolean
        const config = await configRepository.setValue(
          server.id,
          'test.boolean',
          true,
          'BOOLEAN'
        );
        expect(config).toBeDefined();
        expect(await configRepository.getValue<boolean>(server.id, 'test.boolean')).toBe(true);

        // Invalid boolean should throw
        await expect(
          configRepository.setValue(server.id, 'test.invalid', 'not a boolean', 'BOOLEAN')
        ).rejects.toThrow();
      });
    });

    it('moet een json config kunnen valideren en opslaan', async () => {
      await withTestTransaction(async () => {
        const testObject = { key: 'value', nested: { test: true } };
        
        // Valid JSON
        const config = await configRepository.setValue(
          server.id,
          'test.json',
          testObject,
          'JSON'
        );
        expect(config).toBeDefined();
        
        const value = await configRepository.getValue<typeof testObject>(server.id, 'test.json');
        expect(value).toEqual(testObject);

        // Invalid JSON should throw using circular reference
        const circular: Record<string, unknown> = { self: null };
        (circular as Record<string, unknown>).self = circular;
        await expect(
          configRepository.setValue(server.id, 'test.invalid', circular, 'JSON')
        ).rejects.toThrow();
      });
    });
  });

  describe('Cache Gedrag', () => {
    it('moet configs in cache opslaan bij ophalen', async () => {
      await withTestTransaction(async () => {
        // Create config
        await configRepository.setValue(server.id, 'cache.test', 'cached value', 'STRING');

        // First fetch - should cache
        await configRepository.getValue(server.id, 'cache.test');
        
        const cacheKey = `config-value:${server.id}:cache.test`;
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeDefined();
        expect(JSON.parse(cached as string)).toBe('cached value');
      });
    });

    it('moet cache invalideren bij updates', async () => {
      await withTestTransaction(async () => {
        // Create and cache config
        await configRepository.setValue(server.id, 'cache.update', 'original', 'STRING');
        await configRepository.getValue(server.id, 'cache.update');

        // Update value
        await configRepository.setValue(server.id, 'cache.update', 'updated', 'STRING');
        
        // Cache should be invalidated
        const cacheKey = `config-value:${server.id}:cache.update`;
        const cached = await cacheProvider.get(cacheKey);
        expect(cached).toBeNull();
      });
    });
  });

  describe('System Configs', () => {
    it('moet system configs kunnen beheren', async () => {
      await withTestTransaction(async () => {
        // Create system config
        await dataSource.manager.save(ConfigEntity, {
          key: 'system.setting',
          value: 'system value',
          type: 'STRING',
          isSystem: true,
          serverId: server.id
        });

        // Should not be able to delete system config
        const deleted = await configRepository.deleteIfNotSystem(server.id, 'system.setting');
        expect(deleted).toBe(false);

        // Should be able to find system configs
        const systemConfigs = await configRepository.getSystemConfigs(server.id);
        expect(systemConfigs).toHaveLength(1);
        expect(systemConfigs[0].key).toBe('system.setting');
      });
    });
  });

  describe('Bulk Operaties', () => {
    it('moet meerdere configs tegelijk kunnen updaten', async () => {
      await withTestTransaction(async () => {
        const configs = [
          { key: 'bulk.1', value: 'value 1', type: 'STRING' as const },
          { key: 'bulk.2', value: 123, type: 'NUMBER' as const },
          { key: 'bulk.3', value: true, type: 'BOOLEAN' as const }
        ];

        // Bulk update
        await configRepository.bulkUpdate(server.id, configs);

        // Verify all values
        const values = await configRepository.getMultipleValues(
          server.id,
          configs.map(c => c.key)
        );

        expect(values['bulk.1']).toBe('value 1');
        expect(values['bulk.2']).toBe(123);
        expect(values['bulk.3']).toBe(true);
      });
    });
  });

  describe('Default Values', () => {
    it('moet configs kunnen resetten naar default waardes', async () => {
      await withTestTransaction(async () => {
        // Create config with default value
        await dataSource.manager.save(ConfigEntity, {
          key: 'default.test',
          value: 'current value',
          defaultValue: 'default value',
          type: 'STRING',
          serverId: server.id
        });

        // Reset to default
        const reset = await configRepository.resetToDefault(server.id, 'default.test');
        expect(reset).toBeDefined();
        expect(reset?.value).toBe('default value');
      });
    });

    it('moet null teruggeven bij reset zonder default waarde', async () => {
      await withTestTransaction(async () => {
        // Create config without default value
        await dataSource.manager.save(ConfigEntity, {
          key: 'no.default',
          value: 'value',
          type: 'STRING',
          serverId: server.id
        });

        // Try to reset
        const reset = await configRepository.resetToDefault(server.id, 'no.default');
        expect(reset).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('moet null teruggeven bij niet-bestaande config', async () => {
      await withTestTransaction(async () => {
        const value = await configRepository.getValue(server.id, 'non.existent');
        expect(value).toBeNull();
      });
    });

    it('moet default value teruggeven indien opgegeven', async () => {
      await withTestTransaction(async () => {
        const value = await configRepository.getValue(
          server.id,
          'non.existent',
          'default'
        );
        expect(value).toBe('default');
      });
    });
  });

  afterAll(async () => {
    await dataSource.manager.delete(ConfigEntity, {});
    await dataSource.manager.delete(ServerEntity, {});
  });
});