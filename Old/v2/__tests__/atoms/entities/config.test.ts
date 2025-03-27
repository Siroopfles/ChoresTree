import { getTestDb, withTestTransaction } from '../../../test/jest/setup-after-env';
import { ServerConfigEntity, ConfigPermissionEntity, ConfigAuditLogEntity } from '../../../atomic/atoms/config/entities/ConfigEntity';
import { ConfigScope } from '../../../atomic/atoms/config/types';
import { DataSource } from 'typeorm';
import { TestSeeder } from '../../../test/utils/seeders';

describe('Config Entities (Atoms)', () => {
  let dataSource: DataSource;
  let testSeeder: TestSeeder;

  beforeAll(async () => {
    dataSource = getTestDb();
    expect(dataSource).toBeValidDatabase();
    testSeeder = new TestSeeder(dataSource);
  });

  describe('ServerConfigEntity', () => {
    describe('Entity Constructie & Validatie', () => {
      it('should create server config with required properties', async () => {
        await withTestTransaction(async () => {
          const serverConfig = await testSeeder.seedServerConfig();

          expect(serverConfig.id).toBeDefined();
          expect(serverConfig.serverId).toBe('123456789');
          expect(serverConfig.version).toBe('2.0.0'); // default waarde
          expect(serverConfig.settings).toBeDefined();
          expect(serverConfig.settings.prefix).toBe('!');
          expect(serverConfig.settings.language).toBe('nl');
          expect(serverConfig.settings.timezone).toBe('Europe/Amsterdam');
          expect(serverConfig.settings.notifications.enabled).toBe(true);
          expect(serverConfig.customization).toBeDefined();
          expect(serverConfig.customization.colors).toBeDefined();
          expect(serverConfig.createdAt).toBeDefined();
          expect(serverConfig.updatedAt).toBeDefined();
        });
      });

      it('should enforce required fields for ServerConfigEntity', async () => {
        await withTestTransaction(async () => {
          const serverConfig = new ServerConfigEntity();
          // Missing required fields

          await expect(
            dataSource.manager.save(ServerConfigEntity, serverConfig)
          ).rejects.toThrow();
        });
      });

      it('should enforce unique serverId constraint', async () => {
        await withTestTransaction(async () => {
          // Create first config
          const config1 = await testSeeder.seedServerConfig();

          // Attempt to create config with same serverId
          await expect(
            testSeeder.seedServerConfig({ serverId: config1.serverId })
          ).rejects.toThrow();
        });
      });
    });

    describe('Default Waardes', () => {
      it('should set correct default version', async () => {
        await withTestTransaction(async () => {
          const serverConfig = await testSeeder.seedServerConfig();
          expect(serverConfig.version).toBe('2.0.0');
        });
      });
    });
  });

  describe('ConfigPermissionEntity', () => {
    describe('Entity Constructie & Validatie', () => {
      it('should create permission with required properties', async () => {
        await withTestTransaction(async () => {
          const permission = await testSeeder.seedConfigPermission();

          expect(permission.id).toBeDefined();
          expect(permission.serverId).toBe('123456789');
          expect(permission.roleId).toBe('role123');
          expect(permission.allowedScopes).toEqual([ConfigScope.SERVER, ConfigScope.CHANNEL]);
          expect(permission.allowedOperations).toEqual(['read', 'write']);
          expect(permission.createdAt).toBeDefined();
          expect(permission.updatedAt).toBeDefined();
        });
      });

      it('should enforce required fields for ConfigPermissionEntity', async () => {
        await withTestTransaction(async () => {
          const permission = new ConfigPermissionEntity();
          // Missing required fields

          await expect(
            dataSource.manager.save(ConfigPermissionEntity, permission)
          ).rejects.toThrow();
        });
      });
    });

    describe('Type Validatie', () => {
      it('should validate ConfigScope array', async () => {
        await withTestTransaction(async () => {
          // Test met ongeldige scope
          await expect(
            testSeeder.seedConfigPermission({
              allowedScopes: ['invalid_scope' as ConfigScope],
              allowedOperations: ['read']
            })
          ).rejects.toThrow();

          // Test met geldige scopes
          const savedPermission = await testSeeder.seedConfigPermission({
            allowedScopes: [ConfigScope.SERVER, ConfigScope.CHANNEL],
            allowedOperations: ['read']
          });
          expect(savedPermission.allowedScopes).toEqual([ConfigScope.SERVER, ConfigScope.CHANNEL]);
        });
      });
    });
  });

  describe('ConfigAuditLogEntity', () => {
    it('should enforce required fields for ConfigAuditLogEntity', async () => {
      await withTestTransaction(async () => {
        const auditLog = new ConfigAuditLogEntity();
        // Missing required fields
        await expect(
          dataSource.manager.save(ConfigAuditLogEntity, auditLog)
        ).rejects.toThrow();
      });
    });

    describe('Entity Constructie & Validatie', () => {
      it('should create audit log entry with required properties', async () => {
        await withTestTransaction(async () => {
          const auditLog = await testSeeder.seedConfigAuditLog();

          expect(auditLog.id).toBeDefined();
          expect(auditLog.serverId).toBe('123456789');
          expect(auditLog.userId).toBe('user123');
          expect(auditLog.action).toBe('update');
          expect(auditLog.scope).toBe(ConfigScope.SERVER);
          expect(auditLog.newValue).toEqual({ setting: 'new-value' });
          expect(auditLog.timestamp).toBeDefined();
        });
      });

      it('should handle optional oldValue field', async () => {
        await withTestTransaction(async () => {
          // Without oldValue
          // Without oldValue
          const logWithoutOld = await testSeeder.seedConfigAuditLog({
            action: 'create',
            newValue: { setting: 'value' }
          });
          expect(logWithoutOld.oldValue).toBeNull();

          // With oldValue
          const logWithOld = await testSeeder.seedConfigAuditLog({
            action: 'update',
            oldValue: { setting: 'old-value' },
            newValue: { setting: 'new-value' }
          });
          expect(logWithOld.oldValue).toEqual({ setting: 'old-value' });
        });
      });
    });
  });

  afterEach(async () => {
    await withTestTransaction(async () => {
      await testSeeder.cleanup();
    });
  });
});