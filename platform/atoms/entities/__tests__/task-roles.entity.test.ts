import { TaskRolesEntity } from '../task-roles.entity';
import { TaskEntity } from '../task.entity';
import { RoleEntity } from '../role.entity';

describe('TaskRolesEntity', () => {
  let taskRoles: TaskRolesEntity;
  let task: TaskEntity;
  let role: RoleEntity;

  beforeEach(() => {
    task = new TaskEntity();
    task.id = 'task-1';
    task.title = 'Test Task';

    role = new RoleEntity();
    role.id = 'role-1';
    role.name = 'Test Role';
    role.permissions = ['read'];
    role.discordRoleId = '123';
    role.serverId = 'server-1';

    taskRoles = new TaskRolesEntity();
    taskRoles.id = 'task-role-1';
    taskRoles.taskId = task.id;
    taskRoles.roleId = role.id;
    taskRoles.task = task;
    taskRoles.role = role;
    taskRoles.metadata = {
      addedBy: 'user-1',
      addedAt: new Date().toISOString()
    };
  });

  it('should create a task-role relation', () => {
    expect(taskRoles).toBeDefined();
    expect(taskRoles.id).toBe('task-role-1');
    expect(taskRoles.taskId).toBe(task.id);
    expect(taskRoles.roleId).toBe(role.id);
    expect(taskRoles.task).toBe(task);
    expect(taskRoles.role).toBe(role);
    expect(taskRoles.metadata).toBeDefined();
    expect(taskRoles.metadata?.addedBy).toBe('user-1');
  });

  it('should have correct relation properties', () => {
    expect(taskRoles.task).toBeInstanceOf(TaskEntity);
    expect(taskRoles.role).toBeInstanceOf(RoleEntity);
  });

  it('should allow metadata to be optional', () => {
    const taskRolesWithoutMeta = new TaskRolesEntity();
    taskRolesWithoutMeta.taskId = task.id;
    taskRolesWithoutMeta.roleId = role.id;
    
    expect(taskRolesWithoutMeta.metadata).toBeUndefined();
  });
});