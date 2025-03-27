import { PermissionService, Permission, PermissionType } from '@/v2/atomic/molecules/services/permission/PermissionService';
import { UserRepository } from '@/v2/atomic/molecules/repositories/user/UserRepository';
import { RoleRepository } from '@/v2/atomic/molecules/repositories/role/RoleRepository';
import { PermissionServiceImpl } from '@/v2/atomic/molecules/services/permission/PermissionServiceImpl';

// Mock repositories
jest.mock('@/v2/atomic/molecules/repositories/user/UserRepository');
jest.mock('@/v2/atomic/molecules/repositories/role/RoleRepository');

describe('PermissionService (Molecules)', () => {
  let permissionService: PermissionService;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockRoleRepo: jest.Mocked<RoleRepository>;

  beforeEach(() => {
    // Reset mocks
    mockUserRepo = {
      findById: jest.fn(),
      findRoles: jest.fn()
    } as unknown as jest.Mocked<UserRepository>;

    mockRoleRepo = {
      findById: jest.fn(),
      findPermissions: jest.fn()
    } as unknown as jest.Mocked<RoleRepository>;

    // Initialize service
    permissionService = new PermissionServiceImpl(mockUserRepo, mockRoleRepo);
  });

  describe('Role-Based Toegangscontrole', () => {
    it('moet toegang verlenen met juiste rol permissies', async () => {
      const userId = 'user-1';
      const roles = [
        { id: 'role-1', name: 'Admin', permissions: [PermissionType.CONFIG_CREATE, PermissionType.CONFIG_UPDATE] }
      ];

      mockUserRepo.findRoles.mockResolvedValue(roles);
      mockRoleRepo.findPermissions.mockResolvedValue([
        { name: PermissionType.CONFIG_CREATE, description: '', scope: ['*'] }
      ]);

      const hasPermission = await permissionService.hasPermission(userId, PermissionType.CONFIG_CREATE);

      expect(hasPermission).toBe(true);
      expect(mockUserRepo.findRoles).toHaveBeenCalledWith(userId);
    });

    it('moet toegang weigeren zonder juiste rol permissies', async () => {
      const userId = 'user-1';
      const roles = [
        { id: 'role-1', name: 'Viewer', permissions: ['VIEW_ONLY'] }
      ];

      mockUserRepo.findRoles.mockResolvedValue(roles);

      const hasPermission = await permissionService.hasPermission(userId, PermissionType.CONFIG_CREATE);

      expect(hasPermission).toBe(false);
    });

    it('moet permissies correct overerven van hogere rollen', async () => {
      const userId = 'user-1';
      const roles = [
        { id: 'role-1', name: 'Moderator', permissions: [PermissionType.TASK_CREATE], inheritsFrom: 'role-2' },
        { id: 'role-2', name: 'Viewer', permissions: [PermissionType.NOTIFICATION_CREATE] }
      ];

      mockUserRepo.findRoles.mockResolvedValue([roles[0]]);
      mockRoleRepo.findById.mockResolvedValue(roles[1]);

      const hasTaskPermission = await permissionService.hasPermission(userId, PermissionType.TASK_CREATE);
      const hasNotificationPermission = await permissionService.hasPermission(userId, PermissionType.NOTIFICATION_CREATE);

      expect(hasTaskPermission).toBe(true);
      expect(hasNotificationPermission).toBe(true);
    });
  });

  describe('Permission Validatie', () => {
    it('moet permissie scope valideren', async () => {
      const userId = 'user-1';
      const permission: Permission = {
        name: PermissionType.CONFIG_UPDATE,
        description: 'Update server configuratie',
        scope: ['server:${serverId}']
      };

      mockUserRepo.findRoles.mockResolvedValue([
        { id: 'role-1', name: 'ServerAdmin', permissions: [permission.name] }
      ]);
      mockRoleRepo.findPermissions.mockResolvedValue([permission]);

      const isValid = await permissionService.validateScope(userId, ['server:test-server-id']);

      expect(isValid).toBe(true);
    });

    it('moet permissie weigeren bij scope mismatch', async () => {
      const userId = 'user-1';
      const permission: Permission = {
        name: PermissionType.CONFIG_UPDATE,
        description: 'Update server configuratie',
        scope: ['server:specific-server']
      };

      mockUserRepo.findRoles.mockResolvedValue([
        { id: 'role-1', name: 'ServerAdmin', permissions: [permission.name] }
      ]);
      mockRoleRepo.findPermissions.mockResolvedValue([permission]);

      const isValid = await permissionService.validateScope(userId, ['server:different-server']);

      expect(isValid).toBe(false);
    });
  });

  describe('Permission Management', () => {
    it('moet permissies kunnen toevoegen aan rol', async () => {
      const roleId = 'role-1';
      const permissions: Permission[] = [
        {
          name: PermissionType.TASK_CREATE,
          description: 'Create tasks',
          scope: ['server:${serverId}']
        }
      ];

      await permissionService.addPermissionsToRole!(roleId, permissions);

      expect(mockRoleRepo.findById).toHaveBeenCalledWith(roleId);
    });

    it('moet gebruiker permissies kunnen ophalen', async () => {
      const userId = 'user-1';
      const expectedPermissions: Permission[] = [
        {
          name: PermissionType.CONFIG_UPDATE,
          description: 'Update server configuratie',
          scope: ['server:${serverId}']
        }
      ];

      mockUserRepo.findRoles.mockResolvedValue([
        { id: 'role-1', name: 'Admin', permissions: [PermissionType.CONFIG_UPDATE] }
      ]);
      mockRoleRepo.findPermissions.mockResolvedValue(expectedPermissions);

      const permissions = await permissionService.getUserPermissions!(userId);

      expect(permissions).toEqual(expectedPermissions);
      expect(mockUserRepo.findRoles).toHaveBeenCalledWith(userId);
    });
  });

  describe('Error Handling', () => {
    it('moet errors geven bij ongeldige permissie types', async () => {
      const userId = 'user-1';

      await expect(
        // @ts-ignore - Testing invalid permission type
        permissionService.hasPermission(userId, 'INVALID_PERMISSION')
      ).rejects.toThrow('Invalid permission type');
    });

    it('moet errors geven bij niet-bestaande gebruiker', async () => {
      const userId = 'non-existent';
      mockUserRepo.findRoles.mockResolvedValue([]);

      const hasPermission = await permissionService.hasPermission(userId, PermissionType.CONFIG_CREATE);

      expect(hasPermission).toBe(false);
    });
  });
});