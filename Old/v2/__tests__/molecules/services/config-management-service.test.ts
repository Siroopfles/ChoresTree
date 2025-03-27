import { ConfigManagementService } from '@/v2/atomic/molecules/services/config/ConfigManagementService';
import { ConfigRepository } from '@/v2/atomic/molecules/repositories/config/ConfigRepository';
import { ServerEntity } from '@/v2/atomic/atoms/database/entities/ServerEntity';
import { PermissionService } from '@/v2/atomic/molecules/services/permission/PermissionService';
import { ServerConfigDto } from '@/v2/atomic/molecules/services/config/dto/ServerConfigDto';

// Mock repositories
jest.mock('@/v2/atomic/molecules/repositories/config/ConfigRepository');
jest.mock('@/v2/atomic/molecules/services/permission/PermissionService');

describe('ConfigManagementService (Molecules)', () => {
  let configService: ConfigManagementService;
  let mockConfigRepo: jest.Mocked<ConfigRepository>;
  let mockPermissionService: jest.Mocked<PermissionService>;
  let testServer: ServerEntity;

  beforeEach(() => {
    // Reset mocks
    mockConfigRepo = {
      findByServerId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      bulkUpdate: jest.fn(),
    } as unknown as jest.Mocked<ConfigRepository>;

    mockPermissionService = {
      hasPermission: jest.fn().mockResolvedValue(true),
      validateScope: jest.fn().mockResolvedValue(true)
    } as unknown as jest.Mocked<PermissionService>;

    // Initialize service
    configService = new ConfigManagementService(mockConfigRepo, mockPermissionService);

    // Setup test data
    testServer = {
      id: 'test-server-id',
      serverId: '123456789',
      serverName: 'Test Server',
      timezone: 'Europe/Amsterdam',
      language: 'nl'
    } as ServerEntity;
  });

  describe('Server Configuratie Beheer', () => {
    it('moet server configuratie kunnen ophalen', async () => {
      const mockConfig: ServerConfigDto = {
        id: 'config-1',
        serverId: testServer.id,
        settings: { notifications: true }
      };

      mockConfigRepo.findByServerId.mockResolvedValue(mockConfig);

      const result = await configService.getServerConfig(testServer.id);

      expect(result).toBeDefined();
      expect(result).toEqual(mockConfig);
      expect(mockConfigRepo.findByServerId).toHaveBeenCalledWith(testServer.id);
    });

    it('moet nieuwe server configuratie kunnen aanmaken met permissie check', async () => {
      const newConfig: Partial<ServerConfigDto> = {
        serverId: testServer.id,
        settings: { notifications: true }
      };

      const createdConfig: ServerConfigDto = {
        id: 'new-config-1',
        serverId: testServer.id,
        settings: { notifications: true }
      };

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockConfigRepo.create.mockResolvedValue(createdConfig);

      const result = await configService.createServerConfig(newConfig, 'admin-user');

      expect(result).toBeDefined();
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('admin-user', 'CONFIG_CREATE');
      expect(mockConfigRepo.create).toHaveBeenCalledWith(newConfig);
    });

    it('moet configuratie update weigeren zonder permissie', async () => {
      const updateConfig = {
        id: 'config-1',
        serverId: testServer.id,
        settings: { notifications: false }
      };

      mockPermissionService.hasPermission.mockResolvedValue(false);

      await expect(
        configService.updateServerConfig(updateConfig, 'unauthorized-user')
      ).rejects.toThrow('Insufficient permissions');

      expect(mockConfigRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('Default Settings', () => {
    it('moet default settings kunnen toepassen op nieuwe configuratie', async () => {
      const newConfig: Partial<ServerConfigDto> = {
        serverId: testServer.id
      };

      const createdConfig: ServerConfigDto = {
        id: 'new-config-1',
        serverId: testServer.id,
        settings: {
          notifications: true,
          language: 'nl',
          timezone: 'Europe/Amsterdam'
        }
      };

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockConfigRepo.create.mockResolvedValue(createdConfig);

      const result = await configService.createServerConfig(newConfig, 'admin-user');

      expect(result.settings).toEqual(createdConfig.settings);
    });

    it('moet bestaande settings behouden bij partial update', async () => {
      const existingConfig: ServerConfigDto = {
        id: 'config-1',
        serverId: testServer.id,
        settings: {
          notifications: true,
          language: 'nl',
          timezone: 'Europe/Amsterdam'
        }
      };

      const updateConfig = {
        id: 'config-1',
        serverId: testServer.id,
        settings: { notifications: false }
      };

      const updatedConfig: ServerConfigDto = {
        ...existingConfig,
        settings: {
          ...existingConfig.settings,
          notifications: false
        }
      };

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockConfigRepo.findByServerId.mockResolvedValue(existingConfig);
      mockConfigRepo.update.mockResolvedValue(updatedConfig);

      const result = await configService.updateServerConfig(updateConfig, 'admin-user');

      expect(result.settings).toEqual({
        notifications: false,
        language: 'nl',
        timezone: 'Europe/Amsterdam'
      });
    });
  });

  describe('Bulk Updates', () => {
    it('moet bulk updates kunnen uitvoeren met validatie', async () => {
      const updates = [
        { serverId: 'server-1', settings: { notifications: false } },
        { serverId: 'server-2', settings: { notifications: false } }
      ];

      const updatedConfigs: ServerConfigDto[] = updates.map(update => ({
        id: `config-${update.serverId}`,
        serverId: update.serverId,
        settings: update.settings
      }));

      mockPermissionService.hasPermission.mockResolvedValue(true);
      mockConfigRepo.bulkUpdate.mockResolvedValue(updatedConfigs);

      const results = await configService.bulkUpdateConfigs(updates, 'admin-user');

      expect(results).toHaveLength(2);
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('admin-user', 'CONFIG_BULK_UPDATE');
      expect(mockConfigRepo.bulkUpdate).toHaveBeenCalledWith(updates);
    });

    it('moet bulk update valideren en stoppen bij eerste fout', async () => {
      const updates = [
        { serverId: 'server-1', settings: { invalidKey: true } },
        { serverId: 'server-2', settings: { notifications: false } }
      ];

      mockPermissionService.hasPermission.mockResolvedValue(true);

      await expect(
        configService.bulkUpdateConfigs(updates, 'admin-user')
      ).rejects.toThrow('Invalid configuration key');

      expect(mockConfigRepo.bulkUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('moet gepaste error geven bij niet-bestaande server', async () => {
      mockConfigRepo.findByServerId.mockResolvedValue(null);

      await expect(
        configService.getServerConfig('non-existent')
      ).rejects.toThrow('Server configuration not found');
    });

    it('moet database errors netjes afhandelen', async () => {
      mockConfigRepo.update.mockRejectedValue(new Error('Database error'));
      mockPermissionService.hasPermission.mockResolvedValue(true);

      await expect(
        configService.updateServerConfig({
          id: 'config-1',
          serverId: testServer.id,
          settings: {}
        }, 'admin-user')
      ).rejects.toThrow('Failed to update configuration');
    });
  });
});