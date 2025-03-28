import { validateRole, PermissionTypes } from '../role.schema';

describe('Role Schema Validatie', () => {
  describe('createRoleSchema', () => {
    it('should validate a valid create role payload', async () => {
      const data = {
        name: 'Test Role',
        permissions: [PermissionTypes.TASK_READ, PermissionTypes.TASK_CREATE],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
      };

      const result = await validateRole.create(data);

      expect(result).toEqual({
        name: 'Test Role',
        permissions: [PermissionTypes.TASK_READ, PermissionTypes.TASK_CREATE],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
      });
    });

    it('should remove duplicate permissions', async () => {
      const data = {
        name: 'Test Role',
        permissions: [PermissionTypes.TASK_READ, PermissionTypes.TASK_READ],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
      };

      const result = await validateRole.create(data);
      expect(result.permissions).toEqual([PermissionTypes.TASK_READ]);
    });

    it('should reject invalid create role data', async () => {
      const data = {
        name: '',
        permissions: [],
        discordRoleId: 'invalid',
        serverId: 'invalid',
      };

      await expect(validateRole.create(data)).rejects.toThrow('Create role validatie errors');
    });
  });

  describe('updateRoleSchema', () => {
    it('should validate a valid partial update', async () => {
      const data = {
        name: 'Updated Role',
        permissions: [PermissionTypes.TASK_READ],
      };

      const result = await validateRole.update(data);
      expect(result).toEqual({
        name: 'Updated Role',
        permissions: [PermissionTypes.TASK_READ],
      });
    });

    it('should reject invalid update data', async () => {
      const data = {
        name: '@invalid@',
        permissions: ['INVALID_PERMISSION'] as unknown as string[],
      };

      await expect(validateRole.update(data)).rejects.toThrow('Update role validatie errors');
    });
  });

  describe('permissions validation', () => {
    it('should accept valid permission combinations', async () => {
      const data = {
        name: 'Admin Role',
        permissions: [
          PermissionTypes.TASK_CREATE,
          PermissionTypes.TASK_UPDATE,
          PermissionTypes.MEMBER_MANAGE,
          PermissionTypes.ROLE_MANAGE,
        ],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
      };

      const result = await validateRole.create(data);
      expect(result.permissions).toHaveLength(4);
    });

    it('should reject empty permissions array', async () => {
      const data = {
        name: 'Test Role',
        permissions: [],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
      };

      await expect(validateRole.create(data)).rejects.toThrow(
        'Minimaal één permissie is verplicht',
      );
    });

    it('should reject invalid permission types', async () => {
      const data = {
        name: 'Test Role',
        permissions: ['INVALID_PERMISSION'] as unknown as string[],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
      };

      await expect(validateRole.create(data)).rejects.toThrow('Ongeldige permissie');
    });
  });

  describe('discord integration validation', () => {
    it('should validate valid snowflake IDs', async () => {
      const data = {
        name: 'Discord Role',
        permissions: [PermissionTypes.TASK_READ],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
        metadata: {
          color: '#FF0000',
          position: 1,
          managed: false,
          mentionable: true,
        },
      };

      const result = await validateRole.create(data);
      expect(result.discordRoleId).toBe('123456789012345678');
      expect(result.serverId).toBe('876543210987654321');
      expect(result.metadata).toEqual({
        color: '#FF0000',
        position: 1,
        managed: false,
        mentionable: true,
      });
    });

    it('should reject invalid snowflake format', async () => {
      const data = {
        name: 'Test Role',
        permissions: [PermissionTypes.TASK_READ],
        discordRoleId: '123', // Too short
        serverId: '876543210987654321abc', // Invalid format
      };

      await expect(validateRole.create(data)).rejects.toThrow(
        'Discord rol ID moet een geldig snowflake ID zijn',
      );
    });

    it('should validate discord metadata', async () => {
      const data = {
        name: 'Test Role',
        permissions: [PermissionTypes.TASK_READ],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
        metadata: {
          color: '#FF00FF',
          position: 0,
          managed: true,
          mentionable: false,
        },
      };

      const result = await validateRole.create(data);
      expect(result.metadata).toEqual({
        color: '#FF00FF',
        position: 0,
        managed: true,
        mentionable: false,
      });
    });

    it('should reject invalid metadata values', async () => {
      const data = {
        name: 'Test Role',
        permissions: [PermissionTypes.TASK_READ],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
        metadata: {
          color: 'not-a-hex',
          position: -1,
          managed: 'not-a-boolean',
        },
      };

      await expect(validateRole.create(data)).rejects.toThrow();
    });
  });

  describe('name validation', () => {
    it('should validate valid role names', async () => {
      const data = {
        name: 'Valid-Role-123',
        permissions: [PermissionTypes.TASK_READ],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
      };

      const result = await validateRole.create(data);
      expect(result.name).toBe('Valid-Role-123');
    });

    it('should trim whitespace from name', async () => {
      const data = {
        name: '  Test Role  ',
        permissions: [PermissionTypes.TASK_READ],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
      };

      const result = await validateRole.create(data);
      expect(result.name).toBe('Test Role');
    });

    it('should reject invalid name characters', async () => {
      const data = {
        name: 'Invalid@Role#Name',
        permissions: [PermissionTypes.TASK_READ],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
      };

      await expect(validateRole.create(data)).rejects.toThrow(
        'Naam mag alleen letters, cijfers, spaties en koppeltekens bevatten',
      );
    });

    it('should enforce name length limits', async () => {
      const data = {
        name: 'a'.repeat(101),
        permissions: [PermissionTypes.TASK_READ],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
      };

      await expect(validateRole.create(data)).rejects.toThrow(
        'Naam mag maximaal 100 karakters zijn',
      );
    });
  });

  describe('error messages', () => {
    it('should provide descriptive Dutch error messages', async () => {
      const data = {
        name: '@invalid@',
        permissions: ['INVALID'] as unknown as string[],
        discordRoleId: 'invalid',
        serverId: '123',
      };

      try {
        await validateRole.create(data);
        fail('Should have thrown validation error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain(
          'Naam mag alleen letters, cijfers, spaties en koppeltekens bevatten',
        );
        expect(message).toContain('Ongeldige permissie');
        expect(message).toContain('Discord rol ID moet een geldig snowflake ID zijn');
        expect(message).toContain('Server ID moet een geldig snowflake ID zijn');
      }
    });

    it('should combine multiple field errors', async () => {
      const data = {
        name: '',
        permissions: [],
        discordRoleId: 'invalid',
        serverId: 'invalid',
      };

      try {
        await validateRole.create(data);
        fail('Should have thrown validation error');
      } catch (error) {
        const errors = JSON.parse(
          (error as Error).message.split('Create role validatie errors: ')[1],
        );
        expect(errors).toHaveLength(5);
        // Name heeft twee validatie errors
        expect(errors).toContainEqual({
          field: 'name',
          message: 'Naam mag niet leeg zijn',
        });
        expect(errors).toContainEqual({
          field: 'name',
          message: 'Naam mag alleen letters, cijfers, spaties en koppeltekens bevatten',
        });
        expect(errors).toContainEqual({
          field: 'permissions',
          message: 'Minimaal één permissie is verplicht',
        });
      }
    });
  });

  describe('complete roleSchema', () => {
    it('should validate a complete role entity', async () => {
      const now = new Date();
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Complete Role',
        permissions: [PermissionTypes.TASK_READ, PermissionTypes.TASK_CREATE],
        discordRoleId: '123456789012345678',
        serverId: '876543210987654321',
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      const result = await validateRole.complete(data);
      expect(result).toEqual(data);
    });

    it('should reject invalid complete role data', async () => {
      const data = {
        id: 'invalid-uuid',
        name: '@invalid@',
        permissions: [],
        discordRoleId: 'invalid',
        serverId: 'invalid',
        version: -1,
      };

      await expect(validateRole.complete(data)).rejects.toThrow('Role validatie errors');
    });
  });
});
