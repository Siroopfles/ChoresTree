import { TaskManagementService } from '@/v2/atomic/molecules/services/task/TaskManagementService';
import { TaskRepository } from '@/v2/atomic/molecules/repositories/task/TaskRepository';
import { PermissionService, PermissionType } from '@/v2/atomic/molecules/services/permission/PermissionService';
import { NotificationDispatcher } from '@/v2/atomic/molecules/services/notification/NotificationDispatcher';
import { TaskStatus } from '@/v2/atomic/molecules/services/task/types/TaskStatus';
import { TaskPriority } from '@/v2/atomic/molecules/services/task/types/TaskPriority';

// Mock repositories and dependencies
jest.mock('@/v2/atomic/molecules/repositories/task/TaskRepository');
jest.mock('@/v2/atomic/molecules/services/permission/PermissionService');
jest.mock('@/v2/atomic/molecules/services/notification/NotificationDispatcher');

describe('TaskManagementService (Molecules)', () => {
  let taskService: TaskManagementService;
  let mockTaskRepo: jest.Mocked<TaskRepository>;
  let mockPermissionService: jest.Mocked<PermissionService>;
  let mockNotificationDispatcher: jest.Mocked<NotificationDispatcher>;

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  beforeEach(() => {
    // Reset mocks
    mockTaskRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByAssignee: jest.fn(),
      findByStatus: jest.fn(),
      updateStatus: jest.fn(),
      updateAssignee: jest.fn()
    } as unknown as jest.Mocked<TaskRepository>;

    mockPermissionService = {
      hasPermission: jest.fn().mockResolvedValue(true),
      validateScope: jest.fn().mockResolvedValue(true)
    } as unknown as jest.Mocked<PermissionService>;

    mockNotificationDispatcher = {
      processNotification: jest.fn()
    } as unknown as jest.Mocked<NotificationDispatcher>;

    // Initialize service
    taskService = new TaskManagementService(
      mockTaskRepo,
      mockPermissionService,
      mockNotificationDispatcher
    );
  });

  describe('Task Lifecycle', () => {
    it('moet nieuwe taak kunnen aanmaken met deadline validatie', async () => {
      const newTask = {
        title: 'Test Task',
        description: 'Test Description',
        serverId: 'server-1',
        channelId: 'channel-1',
        createdByUserId: 'user-1',
        priority: TaskPriority.MEDIUM,
        dueDate: tomorrow
      };

      mockTaskRepo.create.mockResolvedValue({ ...newTask, id: 'task-1', status: TaskStatus.OPEN });

      const result = await taskService.createTask(newTask, 'user-1');

      expect(result).toBeDefined();
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('user-1', PermissionType.TASK_CREATE);
      expect(mockTaskRepo.create).toHaveBeenCalledWith(expect.objectContaining(newTask));
    });

    it('moet deadline in het verleden weigeren', async () => {
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const taskWithPastDue = {
        title: 'Past Due Task',
        serverId: 'server-1',
        dueDate: pastDate
      };

      await expect(
        taskService.createTask(taskWithPastDue, 'user-1')
      ).rejects.toThrow('Due date cannot be in the past');
    });
  });

  describe('Assignment Logic', () => {
    it('moet taak kunnen toewijzen met notificatie', async () => {
      const task = {
        id: 'task-1',
        title: 'Test Task',
        status: TaskStatus.OPEN,
        serverId: 'server-1'
      };

      mockTaskRepo.findById.mockResolvedValue(task);
      mockTaskRepo.updateAssignee.mockResolvedValue({ ...task, assignedUserId: 'user-2' });

      await taskService.assignTask('task-1', 'user-2', 'user-1');

      expect(mockTaskRepo.updateAssignee).toHaveBeenCalledWith('task-1', 'user-2');
      expect(mockNotificationDispatcher.processNotification).toHaveBeenCalled();
    });

    it('moet workload valideren bij toewijzing', async () => {
      mockTaskRepo.findByAssignee.mockResolvedValue(Array(5).fill({ status: TaskStatus.IN_PROGRESS }));

      await expect(
        taskService.assignTask('task-1', 'busy-user', 'user-1')
      ).rejects.toThrow('User has too many active tasks');
    });
  });

  describe('Status Updates', () => {
    it('moet status updates valideren op volgorde', async () => {
      const task = {
        id: 'task-1',
        status: TaskStatus.OPEN,
        serverId: 'server-1'
      };

      mockTaskRepo.findById.mockResolvedValue(task);
      mockTaskRepo.updateStatus.mockImplementation((id, status) => 
        Promise.resolve({ ...task, status })
      );

      // Valid transition
      await taskService.updateTaskStatus('task-1', TaskStatus.IN_PROGRESS, 'user-1');
      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith('task-1', TaskStatus.IN_PROGRESS);

      // Invalid transition
      await expect(
        taskService.updateTaskStatus('task-1', TaskStatus.REVIEWED, 'user-1')
      ).rejects.toThrow('Invalid status transition');
    });

    it('moet completion date valideren bij afronden', async () => {
      const task = {
        id: 'task-1',
        status: TaskStatus.IN_PROGRESS,
        dueDate: tomorrow,
        serverId: 'server-1'
      };

      mockTaskRepo.findById.mockResolvedValue(task);

      await taskService.updateTaskStatus('task-1', TaskStatus.COMPLETED, 'user-1');

      expect(mockTaskRepo.updateStatus).toHaveBeenCalledWith(
        'task-1',
        TaskStatus.COMPLETED,
        expect.any(Date)
      );
    });
  });

  describe('Deadline Management', () => {
    it('moet deadline kunnen updaten met notificaties', async () => {
      const task = {
        id: 'task-1',
        title: 'Test Task',
        dueDate: tomorrow,
        assignedUserId: 'user-2',
        serverId: 'server-1'
      };

      const newDueDate = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

      mockTaskRepo.findById.mockResolvedValue(task);
      mockTaskRepo.update.mockImplementation(updates => 
        Promise.resolve({ ...task, ...updates })
      );

      await taskService.updateTaskDeadline('task-1', newDueDate, 'user-1');

      expect(mockTaskRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          dueDate: newDueDate
        })
      );
      expect(mockNotificationDispatcher.processNotification).toHaveBeenCalled();
    });

    it('moet deadline extension limiet respecteren', async () => {
      const task = {
        id: 'task-1',
        dueDate: tomorrow,
        extensionCount: 2, // Max bereikt
        serverId: 'server-1'
      };

      mockTaskRepo.findById.mockResolvedValue(task);

      const farFutureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await expect(
        taskService.updateTaskDeadline('task-1', farFutureDate, 'user-1')
      ).rejects.toThrow('Maximum deadline extensions reached');
    });
  });

  describe('Error Handling', () => {
    it('moet ontbrekende taken correct afhandelen', async () => {
      mockTaskRepo.findById.mockResolvedValue(null);

      await expect(
        taskService.updateTaskStatus('non-existent', TaskStatus.IN_PROGRESS, 'user-1')
      ).rejects.toThrow('Task not found');
    });

    it('moet permissie fouten correct afhandelen', async () => {
      mockPermissionService.hasPermission.mockResolvedValue(false);

      await expect(
        taskService.createTask({ title: 'Test' }, 'unauthorized-user')
      ).rejects.toThrow('Insufficient permissions');
    });
  });
});