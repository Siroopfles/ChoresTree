import { TaskProcessor } from '../TaskProcessor';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { EventBus } from '@/core/eventBus';
import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus, TaskPriority } from '@/atomic/atoms/database/interfaces/Task';

jest.mock('@/atomic/molecules/database/repositories/TaskRepository');
jest.mock('@/core/eventBus');

describe('TaskProcessor', () => {
  let processor: TaskProcessor;
  let taskRepository: jest.Mocked<TaskRepository>;
  let eventBus: jest.Mocked<EventBus>;
  
  const createMockTask = (overrides = {}): Task => ({
    id: '123',
    title: 'Test Task',
    description: 'Test Description',
    assigneeId: 'user123',
    serverId: 'server123',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    deadline: new Date(Date.now() - 1000), // 1 second ago
    createdAt: new Date(),
    updatedAt: new Date(),
    serverShardKey: 1,
    isOverdue: () => true,
    shouldSendReminder: () => false,
    ...overrides
  });

  beforeEach(() => {
    taskRepository = new TaskRepository() as jest.Mocked<TaskRepository>;
    eventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as jest.Mocked<EventBus>;

    processor = TaskProcessor.getInstance(taskRepository, eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPendingTasks', () => {
    it('should process overdue tasks correctly', async () => {
      const task = createMockTask();
      taskRepository.findOverdueTasks.mockResolvedValue([task]);

      // Start de processor
      await processor['processPendingTasks']();

      // Verificatie
      expect(taskRepository.findOverdueTasks).toHaveBeenCalledWith('*');
      expect(taskRepository.update).toHaveBeenCalledWith(task.id, {
        status: TaskStatus.OVERDUE,
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        'task.status.updated',
        expect.objectContaining({
          taskId: task.id,
          serverId: task.serverId,
          previousStatus: TaskStatus.PENDING,
          newStatus: TaskStatus.OVERDUE,
          updatedById: 'system',
        })
      );
    });

    it('should handle multiple servers correctly', async () => {
      const server1Task = createMockTask({ serverId: 'server1' });
      const server2Task = createMockTask({ 
        id: '456',
        serverId: 'server2',
      });
      
      taskRepository.findOverdueTasks.mockResolvedValue([
        server1Task,
        server2Task
      ]);

      await processor['processPendingTasks']();

      // Verificatie per server
      expect(taskRepository.update).toHaveBeenCalledTimes(2);
      expect(eventBus.emit).toHaveBeenCalledTimes(2);
      
      // Server 1 updates
      expect(taskRepository.update).toHaveBeenCalledWith(
        server1Task.id,
        expect.objectContaining({
          status: TaskStatus.OVERDUE,
        })
      );

      // Server 2 updates
      expect(taskRepository.update).toHaveBeenCalledWith(
        server2Task.id,
        expect.objectContaining({
          status: TaskStatus.OVERDUE,
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      taskRepository.findOverdueTasks.mockRejectedValue(new Error('Database error'));

      await processor['processPendingTasks']();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should stop processing on cleanup', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      processor.stopProcessing();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});