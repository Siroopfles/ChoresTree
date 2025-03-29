import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RoleRepository } from '../role.repository';
import { RoleEntity } from '../../../../atoms/entities/role.entity';
import { PermissionEntity } from '../../../../atoms/entities/permission.entity';
import { ICacheProvider } from '../../../../core/cache/ICacheProvider';
import { RepositoryError } from '../../../../atoms/errors/repository.error';

describe('RoleRepository', () => {
  let repository: RoleRepository;
  let connection: Connection;
  let cacheManager: ICacheProvider;

  // Mock data helpers
  const createMockPermission = (data: Partial<PermissionEntity>): PermissionEntity =>
    ({
      id: 'p1',
      slug: 'test.permission',
      name: 'Test Permission',
      description: '',
      metadata: {},
      getCacheKey: jest.fn().mockReturnValue(`permission:${data.slug || 'test.permission'}`),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      ...data,
    }) as PermissionEntity;

  const createMockRole = (data: Partial<RoleEntity>): RoleEntity =>
    ({
      id: 'r1',
      name: 'Test Role',
      discordRoleId: 'discord-123',
      serverId: 'server-123',
      isDefault: false,
      permissions: [],
      children: [],
      getAllPermissions: jest.fn().mockResolvedValue([]),
      isInHierarchy: jest.fn().mockResolvedValue(false),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      ...data,
    }) as RoleEntity;

  const mockPermission = createMockPermission({});

  const mockRole = createMockRole({
    permissions: [mockPermission],
  });

  const mockChildRole = createMockRole({
    id: 'r2',
    name: 'Child Role',
    discordRoleId: 'discord-456',
    serverId: 'server-123',
    parent: mockRole,
    permissions: [],
  });

  beforeEach(async () => {
    // Create mocks
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
      })),
    };

    connection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          connection: { getRepository: jest.fn().mockReturnValue(mockRepository) },
        },
      }),
    } as unknown as Connection;

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleRepository,
        { provide: Connection, useValue: connection },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    repository = module.get<RoleRepository>(RoleRepository);
  });

  describe('Role Hierarchy Management', () => {
    it('should find roles by hierarchy with caching', async () => {
      // Arrange
      const mockHierarchy = [mockRole, mockChildRole];
      (cacheManager.get as jest.Mock).mockResolvedValue(null);
      const queryBuilder = connection.getRepository(RoleEntity).createQueryBuilder();
      (queryBuilder.getMany as jest.Mock).mockResolvedValue(mockHierarchy);

      // Act
      const result = await repository.findByHierarchy();

      // Assert
      expect(result).toEqual(mockHierarchy);
      expect(cacheManager.set).toHaveBeenCalledWith('roles:hierarchy:root', mockHierarchy, 1800);
    });

    it('should return cached hierarchy if available', async () => {
      // Arrange
      const cachedHierarchy = [mockRole];
      (cacheManager.get as jest.Mock).mockResolvedValue(cachedHierarchy);

      // Act
      const result = await repository.findByHierarchy();

      // Assert
      expect(result).toEqual(cachedHierarchy);
      const queryBuilder = connection.getRepository(RoleEntity).createQueryBuilder;
      expect(queryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('Permission Management', () => {
    it('should get permissions for role with caching', async () => {
      // Arrange
      (cacheManager.get as jest.Mock).mockResolvedValue(null);
      const mockRepo = connection.getRepository(RoleEntity);
      (mockRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockRole,
        getAllPermissions: jest.fn().mockResolvedValue([mockPermission]),
      });

      // Act
      const result = await repository.getPermissionsForRole('r1');

      // Assert
      expect(result).toEqual([mockPermission]);
      expect(cacheManager.set).toHaveBeenCalledWith('Role:r1:permissions', [mockPermission], 3600);
    });

    it('should throw error when role not found', async () => {
      // Arrange
      (cacheManager.get as jest.Mock).mockResolvedValue(null);
      const mockRepo = connection.getRepository(RoleEntity);
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(repository.getPermissionsForRole('invalid')).rejects.toThrow(RepositoryError);
    });
  });

  describe('Discord Synchronization', () => {
    it('should sync existing role with Discord', async () => {
      // Arrange
      const discordRoleId = 'discord123';
      const mockRepo = connection.getRepository(RoleEntity);
      (mockRepo.findOne as jest.Mock).mockResolvedValue(mockRole);
      const updateData = { name: 'Updated Role' };

      // Act
      await repository.syncWithDiscord(discordRoleId, updateData);

      // Assert
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockRole,
          ...updateData,
        }),
      );
    });

    it('should create new role when Discord role not found', async () => {
      // Arrange
      const discordRoleId = 'discord123';
      const mockRepo = connection.getRepository(RoleEntity);
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);
      const newRoleData = { name: 'Discord Role' };

      // Act
      await repository.syncWithDiscord(discordRoleId, newRoleData);

      // Assert
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newRoleData,
          discordRoleId,
        }),
      );
    });
  });

  describe('Access Control', () => {
    it('should get roles by permission with caching', async () => {
      // Arrange
      const permissionSlug = 'test.permission';
      (cacheManager.get as jest.Mock).mockResolvedValue(null);
      const queryBuilder = connection.getRepository(RoleEntity).createQueryBuilder();
      (queryBuilder.getMany as jest.Mock).mockResolvedValue([mockRole]);

      // Act
      const result = await repository.getRolesByPermission(permissionSlug);

      // Assert
      expect(result).toEqual([mockRole]);
      expect(cacheManager.set).toHaveBeenCalledWith(
        `permission:${permissionSlug}:roles`,
        [mockRole],
        3600,
      );
    });
  });

  describe('Cache Management', () => {
    it('should invalidate hierarchy cache on role update', async () => {
      // Arrange
      const mockRepo = connection.getRepository(RoleEntity);
      (mockRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(mockRole) // voor findById
        .mockResolvedValueOnce(mockRole); // voor update

      // Act
      await repository.update('r1', { name: 'Updated Role' });

      // Assert
      expect(cacheManager.invalidate).toHaveBeenCalledWith('Role:r1:hierarchy');
      expect(cacheManager.invalidate).toHaveBeenCalledWith('Role:r1:permissions');
    });

    it('should invalidate all related caches on role delete', async () => {
      // Arrange
      const mockRepo = connection.getRepository(RoleEntity);
      (mockRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });

      // Act
      await repository.delete('r1');

      // Assert
      expect(cacheManager.invalidate).toHaveBeenCalledWith('Role:r1:hierarchy');
      expect(cacheManager.invalidate).toHaveBeenCalledWith('Role:r1:permissions');
      expect(cacheManager.invalidate).toHaveBeenCalledWith('Role:r1');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle large permission sets efficiently', async () => {
      // Arrange
      const largePermissionSet = Array.from({ length: 100 }, (_, i) =>
        createMockPermission({
          id: `p${i}`,
          slug: `permission.${i}`,
          name: `Permission ${i}`,
        }),
      );

      const roleWithManyPermissions = createMockRole({
        permissions: largePermissionSet,
        getAllPermissions: jest.fn().mockResolvedValue(largePermissionSet),
      });

      const mockRepo = connection.getRepository(RoleEntity);
      (mockRepo.findOne as jest.Mock).mockResolvedValue(roleWithManyPermissions);

      // Act
      const startTime = process.hrtime();
      const permissions = await repository.getPermissionsForRole('r1');
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

      // Assert
      expect(permissions).toHaveLength(100);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle deep role hierarchies efficiently', async () => {
      // Arrange
      const createNestedRoles = (depth: number, parent?: RoleEntity): RoleEntity[] => {
        if (depth === 0) return [];
        const role = createMockRole({
          id: `r${depth}`,
          name: `Role ${depth}`,
          discordRoleId: `discord-${depth}`,
          serverId: 'server-123',
          parent,
          children: [],
        });
        return [role, ...createNestedRoles(depth - 1, role)];
      };

      const deepHierarchy = createNestedRoles(10); // 10 levels deep
      const queryBuilder = connection.getRepository(RoleEntity).createQueryBuilder();
      (queryBuilder.getMany as jest.Mock).mockResolvedValue(deepHierarchy);

      // Act
      const startTime = process.hrtime();
      const roles = await repository.findByHierarchy();
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      // Assert
      expect(roles).toHaveLength(10);
      expect(duration).toBeLessThan(100);
    });
  });
});
