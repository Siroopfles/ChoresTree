import { Injectable, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection, In, FindOptionsWhere } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BaseRepositoryImpl } from '../base/BaseRepositoryImpl';
import { RoleEntity } from '../../../atoms/entities/role.entity';
import { PermissionEntity } from '../../../atoms/entities/permission.entity';
import { ICacheProvider } from '../../../core/cache/ICacheProvider';
import { RepositoryError } from '../../../atoms/errors/repository.error';

const CACHE_TTL = {
  PERMANENT: 0, // Permanent cache
  PERMISSIONS: 3600, // 1 hour
  HIERARCHY: 1800, // 30 minutes
  DISCORD: 300, // 5 minutes
};

@Injectable()
export class RoleRepository extends BaseRepositoryImpl<RoleEntity> {
  constructor(
    @InjectConnection() connection: Connection,
    @Inject(CACHE_MANAGER) cacheManager: ICacheProvider,
  ) {
    super(connection, cacheManager, RoleEntity);
  }

  // Uitgebreide cache key generatie
  protected getCacheKey(id: string, type?: 'permissions' | 'hierarchy' | 'discord'): string {
    const baseKey = super.getCacheKey(id);
    return type ? `${baseKey}:${type}` : baseKey;
  }

  // Role hiërarchie management
  async findByHierarchy(parentId?: string): Promise<RoleEntity[]> {
    try {
      const cacheKey = `roles:hierarchy:${parentId || 'root'}`;
      const cached = await this.cacheManager.get<RoleEntity[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const queryBuilder = this.repository
        .createQueryBuilder('role')
        .leftJoinAndSelect('role.parent', 'parent')
        .leftJoinAndSelect('role.children', 'children')
        .orderBy('role.name', 'ASC');

      if (parentId) {
        queryBuilder.where('role.parent.id = :parentId', { parentId });
      } else {
        queryBuilder.where('role.parent IS NULL');
      }

      const roles = await queryBuilder.getMany();
      await this.cacheManager.set(cacheKey, roles, CACHE_TTL.HIERARCHY);

      return roles;
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error finding roles by hierarchy: ${error.message}`,
          'HIERARCHY_QUERY_ERROR',
        );
      }
      throw error;
    }
  }

  // Permission management met caching
  async getPermissionsForRole(roleId: string): Promise<PermissionEntity[]> {
    try {
      const cacheKey = this.getCacheKey(roleId, 'permissions');
      const cached = await this.cacheManager.get<PermissionEntity[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const role = await this.repository.findOne({
        where: { id: roleId },
        relations: ['permissions', 'parent'],
      });

      if (!role) {
        throw new RepositoryError(`Role with id ${roleId} not found`, 'ROLE_NOT_FOUND');
      }

      const permissions = await role.getAllPermissions();
      await this.cacheManager.set(cacheKey, permissions, CACHE_TTL.PERMISSIONS);

      return permissions;
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error getting permissions for role: ${error.message}`,
          'PERMISSION_QUERY_ERROR',
        );
      }
      throw error;
    }
  }

  // Discord synchronisatie
  async syncWithDiscord(discordRoleId: string, roleData: Partial<RoleEntity>): Promise<RoleEntity> {
    try {
      const cacheKey = `discord:role:${discordRoleId}`;

      let role = await this.repository.findOne({
        where: { discordRoleId },
      });

      if (role) {
        role = await this.update(role.id, roleData);
      } else {
        role = await this.create({
          ...roleData,
          discordRoleId,
        });
      }

      await this.cacheManager.set(cacheKey, role, CACHE_TTL.DISCORD);
      return role;
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error syncing with Discord: ${error.message}`,
          'DISCORD_SYNC_ERROR',
        );
      }
      throw error;
    }
  }

  // Access control helpers
  async getRolesByPermission(permissionSlug: string): Promise<RoleEntity[]> {
    try {
      const cacheKey = `permission:${permissionSlug}:roles`;
      const cached = await this.cacheManager.get<RoleEntity[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const roles = await this.repository
        .createQueryBuilder('role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .where('permission.slug = :slug', { slug: permissionSlug })
        .getMany();

      await this.cacheManager.set(cacheKey, roles, CACHE_TTL.PERMISSIONS);
      return roles;
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error getting roles by permission: ${error.message}`,
          'PERMISSION_ROLE_QUERY_ERROR',
        );
      }
      throw error;
    }
  }

  // Cache management helpers
  async invalidateHierarchyCache(roleId: string): Promise<void> {
    const role = await this.findById(roleId);
    if (!role) return;

    // Invalidate eigen cache en parent/children caches
    await this.cacheManager.invalidate(this.getCacheKey(roleId, 'hierarchy'));
    if (role.parent) {
      await this.cacheManager.invalidate(this.getCacheKey(role.parent.id, 'hierarchy'));
    }
  }

  async invalidatePermissionCache(roleId: string): Promise<void> {
    await this.cacheManager.invalidate(this.getCacheKey(roleId, 'permissions'));
  }

  // Override base methods om cache correct te beheren
  async update(id: string, entityData: Partial<RoleEntity>): Promise<RoleEntity> {
    const role = await super.update(id, entityData);

    // Invalidate gerelateerde caches
    await this.invalidateHierarchyCache(id);
    await this.invalidatePermissionCache(id);

    return role;
  }

  async delete(id: string): Promise<void> {
    // Invalidate caches voor verwijderen
    await this.invalidateHierarchyCache(id);
    await this.invalidatePermissionCache(id);

    await super.delete(id);
  }
}
