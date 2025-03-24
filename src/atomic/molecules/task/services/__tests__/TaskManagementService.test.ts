import { TaskManagementService } from '../TaskManagementService';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { EventBus } from '@/core/eventBus';
import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus, TaskPriority } from '@/atomic/atoms/database/interfaces/Task';

jest.mock('@/atomic/molecules/database/repositories/TaskRepository');
jest.mock('@/core/eventBus');

describe('TaskManagementService', () => {
  // Default mock task voor hergebruik
  const defaultMockTask = {
    id: '123',
    title: 'Test Task',
    description: 'Test Description',
    assigneeId: 'user123',
    serverId: 'server123',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    createdAt: new Date(),
    updatedAt: new Date(),
    serverShardKey: 'shard1',
    isOverdue: () => false,
    shouldSendReminder: () => false,
  };

  let service: TaskManagementService;
  let taskRepository: jest.Mocked<TaskRepository>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    taskRepository = new TaskRepository() as jest.Mocked<TaskRepository>;
    eventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as jest.Mocked<EventBus>;

    service = TaskManagementService.getInstance(taskRepository, eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    const mockTask = {
      id: '123',
      title: 'Test Task',
      description: 'Test Description',
      assigneeId: 'user123',
      serverId: 'server123',
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      createdAt: new Date(),
      updatedAt: new Date(),
      serverShardKey: 'shard1',
      isOverdue: () => false,
      shouldSendReminder: () => false,
    } as unknown as Task;

    it('should create a task successfully', async () => {
      taskRepository.createNewTask.mockResolvedValue(mockTask);

      const result = await service.createTask({
        title: 'Test Task',
        description: 'Test Description',
        assigneeId: 'user123',
        serverId: 'server123',
      });

      expect(result).toEqual(mockTask);
      expect(taskRepository.createNewTask).toHaveBeenCalledWith({
        title: 'Test Task',
        description: 'Test Description',
        assigneeId: 'user123',
        serverId: 'server123',
      });
      expect(eventBus.emit).toHaveBeenCalledWith('task.created', expect.any(Object));
    });

    it('should throw error when validation fails', async () => {
      const invalidTask = {
        title: '', // Invalid: empty title
        description: 'Test Description',
        assigneeId: 'user123',
        serverId: 'server123',
      };

      await expect(service.createTask(invalidTask)).rejects.toThrow();
    });
  });

  describe('updateTask', () => {
    const mockTask = { ...defaultMockTask } as unknown as Task;

    it('should update a task successfully', async () => {
      taskRepository.findById.mockResolvedValue(mockTask);
      taskRepository.update.mockResolvedValue({
        ...mockTask,
        title: 'Updated Title'
      } as unknown as Task);

      const result = await service.updateTask('123', { title: 'Updated Title' }, 'server123');

      expect(result.title).toBe('Updated Title');
      expect(taskRepository.update).toHaveBeenCalledWith('123', { title: 'Updated Title' });
      expect(eventBus.emit).toHaveBeenCalledWith('task.updated', expect.any(Object));
    });

    it('should throw error when task not found', async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateTask('123', { title: 'Updated Title' }, 'server123')
      ).rejects.toThrow('Task not found');
    });
  });

  describe('deleteTask', () => {
    const mockTask = { ...defaultMockTask } as unknown as Task;

    it('should delete a task successfully', async () => {
      taskRepository.findById.mockResolvedValue(mockTask);
      taskRepository.delete.mockResolvedValue(true);

      await service.deleteTask('123', 'server123');

      expect(taskRepository.delete).toHaveBeenCalledWith('123');
      expect(eventBus.emit).toHaveBeenCalledWith('task.deleted', expect.any(Object));
    });

    it('should throw error when task not found', async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(service.deleteTask('123', 'server123')).rejects.toThrow('Task not found');
    });
  });

  describe('updateTaskStatus', () => {
    const mockTask = { ...defaultMockTask } as unknown as Task;

    it('should update task status successfully', async () => {
      taskRepository.findById.mockResolvedValue(mockTask);
      taskRepository.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS
      } as unknown as Task);

      const result = await service.updateTaskStatus(
        '123',
        TaskStatus.IN_PROGRESS,
        'server123',
        'user123'
      );

      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
      expect(eventBus.emit).toHaveBeenCalledWith('task.status.updated', expect.any(Object));
    });
  });
});