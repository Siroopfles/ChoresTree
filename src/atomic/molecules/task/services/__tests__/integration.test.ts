import { TaskManagementService } from '../TaskManagementService';
import { AssignmentService } from '../AssignmentService';
import { StatusTrackingService } from '../StatusTrackingService';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { EventBus } from '@/core/eventBus';
import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskStatus, TaskPriority } from '@/atomic/atoms/database/interfaces/Task';

jest.mock('@/atomic/molecules/database/repositories/TaskRepository');
jest.mock('@/core/eventBus');

describe('Task Services Integration', () => {
  let taskManagementService: TaskManagementService;
  let assignmentService: AssignmentService;
  let statusTrackingService: StatusTrackingService;
  let taskRepository: jest.Mocked<TaskRepository>;
  let eventBus: jest.Mocked<EventBus>;

  interface TaskEvent {
    event: 'task.created' | 'task.assigned' | 'task.reassigned' | 'task.status.updated';
    data: {
      taskId: string;
      serverId: string;
      assigneeId?: string;
      newAssigneeId?: string;
      previousAssignee?: string;
      previousStatus?: TaskStatus;
      newStatus?: TaskStatus;
      timestamp: Date;
    };
  }

  let emittedEvents: TaskEvent[];

  const createMockTask = (overrides = {}): Task => ({
    id: '123',
    title: 'Test Task',
    description: 'Test Description',
    assigneeId: 'user123',
    serverId: 'server123',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    createdAt: new Date(),
    updatedAt: new Date(),
    serverShardKey: 1,
    isOverdue: () => false,
    shouldSendReminder: () => false,
    ...overrides
  });

  beforeEach(() => {
    emittedEvents = [];
    taskRepository = new TaskRepository() as jest.Mocked<TaskRepository>;
    eventBus = {
      emit: jest.fn((event: TaskEvent['event'], data: Partial<TaskEvent['data']>) => {
        emittedEvents.push({
          event,
          data: {
            taskId: 'mock-id',
            serverId: 'mock-server',
            ...data,
            timestamp: new Date()
          }
        } as TaskEvent);
        return Promise.resolve();
      }),
      on: jest.fn(),
      off: jest.fn(),
    } as jest.Mocked<EventBus>;

    taskManagementService = TaskManagementService.getInstance(taskRepository, eventBus);
    assignmentService = AssignmentService.getInstance(taskRepository, eventBus);
    statusTrackingService = StatusTrackingService.getInstance(taskRepository, eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Task Lifecycle', () => {
    it('should handle complete task lifecycle', async () => {
      // 1. Create task
      const taskData = {
        title: 'Integration Test Task',
        description: 'Test Description',
        assigneeId: 'user123',
        serverId: 'server123',
      };

      const mockCreatedTask = createMockTask(taskData);
      taskRepository.createNewTask.mockResolvedValue(mockCreatedTask);
      taskRepository.findById.mockResolvedValue(mockCreatedTask);
      taskRepository.update.mockImplementation((id, data) => 
        Promise.resolve({ ...mockCreatedTask, ...data } as Task)
      );

      // Create task
      const task = await taskManagementService.createTask(taskData);
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(emittedEvents[0].event).toBe('task.created');

      // 2. Assign to different user
      const newAssignee = 'user456';
      await assignmentService.assignTask(task.id, newAssignee, task.serverId);
      expect(emittedEvents[1].event).toBe('task.assigned');
      expect(emittedEvents[1].data.assigneeId).toBe(newAssignee);

      // 3. Update status to IN_PROGRESS
      await statusTrackingService.updateStatus(
        task.id,
        TaskStatus.IN_PROGRESS,
        task.serverId,
        newAssignee
      );
      expect(emittedEvents[2].event).toBe('task.status.updated');
      expect(emittedEvents[2].data.newStatus).toBe(TaskStatus.IN_PROGRESS);

      // 4. Complete the task
      await statusTrackingService.updateStatus(
        task.id,
        TaskStatus.COMPLETED,
        task.serverId,
        newAssignee
      );
      expect(emittedEvents[3].event).toBe('task.status.updated');
      expect(emittedEvents[3].data.newStatus).toBe(TaskStatus.COMPLETED);

      // Verify event sequence
      const eventSequence = emittedEvents.map(e => e.event);
      expect(eventSequence).toEqual([
        'task.created',
        'task.assigned',
        'task.status.updated',
        'task.status.updated'
      ]);
    });

    it('should handle task reassignment and status changes correctly', async () => {
      const mockTask = createMockTask({ status: TaskStatus.IN_PROGRESS });
      taskRepository.findById.mockResolvedValue(mockTask);
      taskRepository.update.mockImplementation((id, data) => 
        Promise.resolve({ ...mockTask, ...data } as Task)
      );

      // Reassign task
      await assignmentService.reassignTask(
        mockTask.id,
        'newUser123',
        mockTask.serverId
      );

      // Verify task was moved back to PENDING
      expect(taskRepository.update).toHaveBeenCalledWith(
        mockTask.id,
        expect.objectContaining({
          assigneeId: 'newUser123',
          status: TaskStatus.PENDING
        })
      );

      expect(emittedEvents[0].event).toBe('task.reassigned');
      expect(emittedEvents[0].data.newAssigneeId).toBe('newUser123');
    });
  });
});