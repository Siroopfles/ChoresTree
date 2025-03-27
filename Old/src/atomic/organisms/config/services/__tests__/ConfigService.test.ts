import { ConfigService } from '../ConfigService';
import { DatabaseService } from '@/core/database/DatabaseService';
import { ConfigValueType, ConfigPermissionError, ConfigValueData } from '@/atomic/atoms/config/types/config';
import { eventBus } from '@/core/eventBus';

// Mock dependencies
jest.mock('@/core/database/DatabaseService');
jest.mock('@/core/eventBus');

interface MockConfigRepository {
  getConfigValue: jest.Mock;
  updateConfigValue: jest.Mock;
  getServerConfig: jest.Mock;
  createAuditLogEntry: jest.Mock;
}

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockConfigRepository: MockConfigRepository;

  const mockServerId = '123456789012345678';
  const mockUserId = 'user123';
  const mockKey = 'test.config';
  const mockValue = 'test-value';
  const mockType = ConfigValueType.STRING;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock repository
    mockConfigRepository = {
      getConfigValue: jest.fn(),
      updateConfigValue: jest.fn(),
      getServerConfig: jest.fn(),
      createAuditLogEntry: jest.fn(),
    };

    // Setup mock database service
    (DatabaseService.getInstance as jest.Mock).mockReturnValue({
      getConfigRepository: jest.fn().mockReturnValue(mockConfigRepository),
      getServerSettingsRepository: jest.fn().mockReturnValue({
        getServerSettings: jest.fn().mockResolvedValue({
          adminRoleIds: ['admin123'],
          managerRoleIds: ['manager123'],
        }),
      }),
    });

    configService = ConfigService.getInstance();
  });

  describe('getConfig', () => {
    it('should return config value for authorized user', async () => {
      const mockConfigValue: ConfigValueData<string> = {
        key: mockKey,
        value: mockValue,
        type: mockType,
        defaultValue: mockValue,
        serverId: mockServerId,
        updatedBy: mockUserId,
      };

      mockConfigRepository.getConfigValue.mockResolvedValue(mockConfigValue);

      const result = await configService.getConfig<string>(
        mockServerId,
        mockKey,
        mockUserId
      );

      expect(result).toBe(mockValue);
      expect(mockConfigRepository.getConfigValue).toHaveBeenCalledWith(
        mockServerId,
        mockKey
      );
    });

    it('should throw error for invalid server ID', async () => {
      await expect(
        configService.getConfig('invalid', mockKey, mockUserId)
      ).rejects.toThrow();
    });

    it('should throw error for invalid key format', async () => {
      await expect(
        configService.getConfig(mockServerId, 'Invalid.Key!', mockUserId)
      ).rejects.toThrow();
    });
  });

  describe('setConfig', () => {
    it('should update config for authorized user', async () => {
      await configService.setConfig(
        mockServerId,
        mockKey,
        mockValue,
        mockType,
        'admin123'
      );

      expect(mockConfigRepository.updateConfigValue).toHaveBeenCalled();
      expect(mockConfigRepository.createAuditLogEntry).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should throw error for unauthorized user', async () => {
      await expect(
        configService.setConfig(
          mockServerId,
          mockKey,
          mockValue,
          mockType,
          'unauthorized123'
        )
      ).rejects.toThrow(ConfigPermissionError);
    });

    it('should allow manager to update config', async () => {
      await configService.setConfig(
        mockServerId,
        mockKey,
        mockValue,
        mockType,
        'manager123'
      );

      expect(mockConfigRepository.updateConfigValue).toHaveBeenCalled();
    });
  });

  describe('getServerConfig', () => {
    it('should return server config for authorized user', async () => {
      const mockConfig = {
        serverId: mockServerId,
        values: new Map(),
        permissionOverrides: new Map(),
      };

      mockConfigRepository.getServerConfig.mockResolvedValue(mockConfig);

      const result = await configService.getServerConfig(
        mockServerId,
        'admin123'
      );

      expect(result).toBe(mockConfig);
      expect(mockConfigRepository.getServerConfig).toHaveBeenCalledWith(
        mockServerId
      );
    });

    it('should throw error for unauthorized user', async () => {
      await expect(
        configService.getServerConfig(mockServerId, 'unauthorized123')
      ).rejects.toThrow(ConfigPermissionError);
    });
  });

  describe('permission levels', () => {
    it('should allow admin to perform all operations', async () => {
      const mockConfigValue: ConfigValueData<string> = {
        key: mockKey,
        value: mockValue,
        type: mockType,
        defaultValue: mockValue,
        serverId: mockServerId,
        updatedBy: 'admin123',
      };

      mockConfigRepository.getConfigValue.mockResolvedValue(mockConfigValue);

      // Read operation
      await expect(
        configService.getConfig(mockServerId, mockKey, 'admin123')
      ).resolves.not.toThrow();

      // Write operation
      await expect(
        configService.setConfig(
          mockServerId,
          mockKey,
          mockValue,
          mockType,
          'admin123'
        )
      ).resolves.not.toThrow();
    });

    it('should allow manager to read and write', async () => {
      const mockConfigValue: ConfigValueData<string> = {
        key: mockKey,
        value: mockValue,
        type: mockType,
        defaultValue: mockValue,
        serverId: mockServerId,
        updatedBy: 'manager123',
      };

      mockConfigRepository.getConfigValue.mockResolvedValue(mockConfigValue);

      // Read operation
      await expect(
        configService.getConfig(mockServerId, mockKey, 'manager123')
      ).resolves.not.toThrow();

      // Write operation
      await expect(
        configService.setConfig(
          mockServerId,
          mockKey,
          mockValue,
          mockType,
          'manager123'
        )
      ).resolves.not.toThrow();
    });

    it('should allow any user to read', async () => {
      const mockConfigValue: ConfigValueData<string> = {
        key: mockKey,
        value: mockValue,
        type: mockType,
        defaultValue: mockValue,
        serverId: mockServerId,
        updatedBy: 'regular123',
      };

      mockConfigRepository.getConfigValue.mockResolvedValue(mockConfigValue);

      await expect(
        configService.getConfig(mockServerId, mockKey, 'regular123')
      ).resolves.not.toThrow();
    });

    it('should prevent regular user from writing', async () => {
      await expect(
        configService.setConfig(
          mockServerId,
          mockKey,
          mockValue,
          mockType,
          'regular123'
        )
      ).rejects.toThrow(ConfigPermissionError);
    });
  });
});