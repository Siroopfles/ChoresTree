import { getTestDb, withTestTransaction } from '@/v2/test/jest/setup-after-env';
import { TaskEntity } from '@/v2/atomic/atoms/database/entities/TaskEntity';
import { ServerEntity } from '@/v2/atomic/atoms/database/entities/ServerEntity';
import { TaskRepositoryImpl } from '@/v2/atomic/molecules/common/repositories/task/TaskRepositoryImpl';
import { DataSource } from 'typeorm';
import { MemoryCacheProvider } from '@/v2/core/cache/providers/MemoryCacheProvider';

// Setup mocks
const mockFindTasks = jest.fn().mockResolvedValue([]);
const mockFindTasksNeedingAttention = jest.fn().mockResolvedValue([]);
const mockGetTaskStatistics = jest.fn().mockResolvedValue({
  total: 0,
  completed: 0,
  overdue: 0,
  pending: 0
});

// Mock the TaskQueryBuilder
jest.mock('@/v2/atomic/molecules/common/query/builders/TaskQueryBuilder', () => {
  return {
    TaskQueryBuilder: jest.fn().mockImplementation(() => ({
      findTasks: mockFindTasks,
      findTasksNeedingAttention: mockFindTasksNeedingAttention,
      getTaskStatistics: mockGetTaskStatistics
    }))
  };
});

describe('TaskRepository (Molecules)', () => {
  let dataSource: DataSource;
  let taskRepository: TaskRepositoryImpl;
  let server: ServerEntity;
  let cacheProvider: MemoryCacheProvider;

  beforeAll(async () => {
    dataSource = getTestDb();
    expect(dataSource).toBeValidDatabase();

    // Initialize repository with cache
    const typeormRepo = dataSource.getRepository(TaskEntity);
    cacheProvider = new MemoryCacheProvider();
    taskRepository = new TaskRepositoryImpl(typeormRepo, cacheProvider);

    // Reset all mocks
    mockFindTasks.mockClear();
    mockFindTasksNeedingAttention.mockClear();
    mockGetTaskStatistics.mockClear();

    // Create test server
    server = new ServerEntity();
    server.serverId = '123456789';
    server.serverName = 'Test Server';
    server.timezone = 'Europe/Amsterdam';
    server.language = 'nl';
    await dataSource.manager.save(ServerEntity, server);
  });

  describe('Basis Task Operaties', () => {
    it('moet een nieuwe taak kunnen aanmaken en ophalen', async () => {
      await withTestTransaction(async () => {
        // Create task
        const task = await taskRepository.create({
          title: 'Test Task',
          description: 'Test Description',
          serverId: server.id,
          channelId: '123456',
          createdByUserId: 'user123',
          priority: 'MEDIUM'
        } as TaskEntity);

        expect(task).toBeDefined();
        expect(task.id).toBeDefined();
        expect(task.title).toBe('Test Task');
        expect(task.priority).toBe('MEDIUM');

        // Verify can be found
        const found = await taskRepository.findById(task.id);
        expect(found).toBeDefined();
        expect(found?.title).toBe('Test Task');
      });
    });
  });

  describe('Task Queries', () => {
    it('moet taken per server kunnen ophalen', async () => {
      await withTestTransaction(async () => {
        // Setup mock response
        const mockTasks = [
          { id: 'task1', title: 'Server Task 1' },
          { id: 'task2', title: 'Server Task 2' }
        ] as TaskEntity[];
        mockFindTasks.mockResolvedValueOnce(mockTasks);

        // Find server tasks
        const tasks = await taskRepository.findByServerId(server.id);
        expect(tasks).toHaveLength(2);
        expect(tasks[0].title).toBe('Server Task 1');

        // Verify query builder called correctly
        expect(mockFindTasks).toHaveBeenCalledWith({
          serverId: server.id,
          withAssignee: true,
          orderBy: 'dueDate'
        });

        // Verify caching
        const cacheKey = `server-tasks:${server.id}`;
        expect(await cacheProvider.get(cacheKey)).toBeDefined();
      });
    });

    it('moet taken per gebruiker kunnen ophalen', async () => {
      await withTestTransaction(async () => {
        const userId = 'test-user';
        const mockTasks = [
          { id: 'task1', assignedUserId: userId },
          { id: 'task2', assignedUserId: userId }
        ] as TaskEntity[];
        mockFindTasks.mockResolvedValueOnce(mockTasks);

        const tasks = await taskRepository.findByAssignedUser(userId);
        expect(tasks).toHaveLength(2);
        expect(mockFindTasks).toHaveBeenCalledWith({
          assignedUserId: userId,
          withAssignee: true,
          withServer: true,
          orderBy: 'dueDate'
        });
      });
    });

    it('moet taken op status kunnen filteren', async () => {
      await withTestTransaction(async () => {
        const mockTasks = [
          { id: 'task1', status: 'IN_PROGRESS' }
        ] as TaskEntity[];
        mockFindTasks.mockResolvedValueOnce(mockTasks);

        const tasks = await taskRepository.findByStatus('IN_PROGRESS');
        expect(tasks).toHaveLength(1);
        expect(mockFindTasks).toHaveBeenCalledWith({
          status: ['IN_PROGRESS'],
          withAssignee: true,
          orderBy: 'dueDate'
        });
      });
    });

    it('moet taken op prioriteit kunnen filteren', async () => {
      await withTestTransaction(async () => {
        const mockTasks = [
          { id: 'task1', priority: 'HIGH' }
        ] as TaskEntity[];
        mockFindTasks.mockResolvedValueOnce(mockTasks);

        const tasks = await taskRepository.findByPriority('HIGH');
        expect(tasks).toHaveLength(1);
        expect(mockFindTasks).toHaveBeenCalledWith({
          priority: ['HIGH'],
          withAssignee: true,
          orderBy: 'dueDate'
        });
      });
    });

    it('moet taken kunnen filteren op due date range', async () => {
      await withTestTransaction(async () => {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-12-31');
        const mockTasks = [
          { id: 'task1', dueDate: new Date('2025-06-01') }
        ] as TaskEntity[];
        mockFindTasks.mockResolvedValueOnce(mockTasks);

        const tasks = await taskRepository.findTasksDueInRange(startDate, endDate);
        expect(tasks).toHaveLength(1);
        expect(mockFindTasks).toHaveBeenCalledWith({
          dueAfter: startDate,
          dueBefore: endDate,
          withAssignee: true,
          orderBy: 'dueDate'
        });
      });
    });

    it('moet taken per kanaal kunnen ophalen met batch processing', async () => {
      await withTestTransaction(async () => {
        const channelIds = ['channel1', 'channel2', 'channel3'];
        const mockTasksBatch1 = [{ id: 'task1' }] as TaskEntity[];
        const mockTasksBatch2 = [{ id: 'task2' }] as TaskEntity[];
        const mockTasksBatch3 = [{ id: 'task3' }] as TaskEntity[];

        mockFindTasks
          .mockResolvedValueOnce(mockTasksBatch1)
          .mockResolvedValueOnce(mockTasksBatch2)
          .mockResolvedValueOnce(mockTasksBatch3);

        const tasks = await taskRepository.findByChannels(channelIds);
        expect(tasks).toHaveLength(3);

        // Verify each channel query
        channelIds.forEach(channelId => {
          expect(mockFindTasks).toHaveBeenCalledWith({
            channelId,
            withAssignee: true,
            withServer: true,
            orderBy: 'dueDate'
          });
        });
      });
    });
  });

  describe('Task Updates', () => {
    it('moet taak status kunnen updaten met permissie check', async () => {
      await withTestTransaction(async () => {
        // Create task
        const task = await taskRepository.create({
          title: 'Permission Test',
          serverId: server.id,
          channelId: '123456',
          createdByUserId: 'user123',
          priority: 'MEDIUM'
        } as TaskEntity);

        jest.spyOn(task, 'canBeModifiedBy').mockReturnValue(true);

        // Update status
        const updated = await taskRepository.updateStatus(
          task.id,
          'IN_PROGRESS',
          'user123'
        );

        expect(updated).toBeDefined();
        expect(updated?.status).toBe('IN_PROGRESS');
      });
    });

    it('moet taak toewijzing weigeren zonder permissie', async () => {
      await withTestTransaction(async () => {
        // Create task
        const task = await taskRepository.create({
          title: 'Permission Test',
          serverId: server.id,
          channelId: '123456',
          createdByUserId: 'user123',
          priority: 'MEDIUM'
        } as TaskEntity);

        jest.spyOn(task, 'canBeModifiedBy').mockReturnValue(false);

        // Try to assign
        const result = await taskRepository.assignToUser(
          task.id,
          'new-user',
          'unauthorized-user'
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('moet null teruggeven voor niet-bestaande taken', async () => {
      await withTestTransaction(async () => {
        const result = await taskRepository.findById('non-existent-id');
        expect(result).toBeNull();
      });
    });

    it('moet null teruggeven bij updaten van niet-bestaande taak', async () => {
      await withTestTransaction(async () => {
        const result = await taskRepository.updateStatus(
          'non-existent-id',
          'IN_PROGRESS',
          'user123'
        );
        expect(result).toBeNull();
      });
    });
  });

  afterAll(async () => {
    // Cleanup
    await dataSource.manager.delete(TaskEntity, {});
    await dataSource.manager.delete(ServerEntity, {});
  });
});