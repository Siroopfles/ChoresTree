import { validate } from 'class-validator';
import { RoleEntity } from '../role.entity';
import { TaskRolesEntity } from '../task-roles.entity';

describe('RoleEntity', () => {
  let role: RoleEntity;

  beforeEach(() => {
    role = new RoleEntity();
    role.name = 'Admin';
    role.permissions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
    role.discordRoleId = '123456789';
    role.serverId = '987654321';
    role.metadata = {
      color: '#FF0000',
      position: 1,
      mentionable: true,
    };
  });

  it('should create a valid role entity', () => {
    expect(role).toBeInstanceOf(RoleEntity);
    expect(role.name).toBe('Admin');
    expect(role.permissions).toHaveLength(4);
    expect(role.discordRoleId).toBe('123456789');
    expect(role.serverId).toBe('987654321');
    expect(role.metadata).toBeDefined();
  });

  it('should validate required fields', async () => {
    const emptyRole = new RoleEntity();
    const errors = await validate(emptyRole);

    expect(errors).toHaveLength(4); // name, permissions, discordRoleId, serverId
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['name', 'permissions', 'discordRoleId', 'serverId']),
    );
  });

  it('should validate permissions array contains only strings', async () => {
    // Using unknown type for invalid data to test validation
    role.permissions = ['CREATE', 123 as unknown as string, 'DELETE'];
    const errors = await validate(role);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('permissions');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should allow empty metadata', async () => {
    role.metadata = undefined;
    const errors = await validate(role);
    expect(errors).toHaveLength(0);
  });

  describe('Relations', () => {
    it('should have taskRoles relation', () => {
      const role = new RoleEntity();
      const taskRole = new TaskRolesEntity();

      role.taskRoles = [taskRole];
      expect(role.taskRoles).toHaveLength(1);
      expect(role.taskRoles[0]).toBe(taskRole);
    });

    it('should initialize with empty taskRoles', () => {
      const role = new RoleEntity();
      expect(role.taskRoles).toBeUndefined();
    });
  });

  it('should validate metadata structure', async () => {
    role.metadata = {
      color: '#FF0000',
      position: 1,
      mentionable: true,
      managed: false,
    };
    const errors = await validate(role);
    expect(errors).toHaveLength(0);
  });

  it('should extend BaseEntity', () => {
    expect(role).toHaveProperty('id');
    expect(role).toHaveProperty('createdAt');
    expect(role).toHaveProperty('updatedAt');
    expect(role).toHaveProperty('version');
  });

  it('should validate name is not empty', async () => {
    role.name = '';
    const errors = await validate(role);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('name');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should validate serverId is not empty', async () => {
    role.serverId = '';
    const errors = await validate(role);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('serverId');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should validate discordRoleId is not empty', async () => {
    role.discordRoleId = '';
    const errors = await validate(role);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('discordRoleId');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });
});
