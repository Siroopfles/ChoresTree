import { Test } from '@nestjs/testing';
import { Connection } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ICacheProvider } from '../../../../core/cache/ICacheProvider';
import { TaskRepository } from '../task.repository';
import { TaskEntity, TaskStatus } from '../../../../atoms/entities/task.entity';

describe('TaskRepository', () => {
  let repository: TaskRepository;
  let connection: Connection;
  let cacheManager: ICacheProvider;

  const mockTask = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    assigneeId: 'user-1',
    dueDate: new Date(),
    status: TaskStatus.TODO,
    metadata: { priority: 'high' },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    priority: 3,
    encryptedFields: ['title', 'description'] as const,
    isEncrypted: false,
  } as TaskEntity;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TaskRepository,
        {
          provide: Connection,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: jest.fn().mockResolvedValue([mockTask]),
              findOne: jest.fn().mockResolvedValue(mockTask),
              save: jest.fn().mockResolvedValue(mockTask),
              update: jest.fn().mockResolvedValue({ affected: 1 }),
            }),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            invalidate: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<TaskRepository>(TaskRepository);
    connection = module.get<Connection>(Connection);
    cacheManager = module.get<ICacheProvider>(CACHE_MANAGER);
  });

  describe('findActive', () => {
    it('should return cached active tasks when available', async () => {
      const cachedTasks = [mockTask];
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(cachedTasks);

      const result = await repository.findActive();

      expect(result).toEqual(cachedTasks);
      expect(cacheManager.get).toHaveBeenCalled();
    });

    it('should fetch and cache active tasks when not in cache', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(null);

      const result = await repository.findActive();

      expect(result).toEqual([mockTask]);
      expect(cacheManager.set).toHaveBeenCalledWith(expect.any(String), [mockTask], 300);
    });
  });

  describe('findByAssignee', () => {
    it('should use longer TTL for completed tasks', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(null);
      jest
        .spyOn(connection.getRepository(TaskEntity), 'find')
        .mockResolvedValueOnce([completedTask]);

      await repository.findByAssignee('user-1');

      expect(cacheManager.set).toHaveBeenCalledWith(expect.any(String), [completedTask], 1800);
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update task status and invalidate caches', async () => {
      await repository.bulkUpdateStatus(['1', '2'], true);

      expect(connection.getRepository(TaskEntity).update).toHaveBeenCalled();
      expect(cacheManager.invalidate).toHaveBeenCalledTimes(2);
    });
  });

  describe('encrypted fields', () => {
    it('should encrypt metadata field on create', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        assigneeId: 'user-1',
        dueDate: new Date(),
        metadata: { priority: 'high' },
      };

      await repository.create(taskData);

      // Verify dat de metadata is geëncrypt
      const repoSpy = jest.spyOn(connection.getRepository(TaskEntity), 'save');
      const savedTask = repoSpy.mock.calls[0][0];
      expect(savedTask.metadata).not.toEqual(taskData.metadata);
      expect(typeof savedTask.metadata).toBe('string');
    });
  });
});
