import { Test } from '@nestjs/testing';
import { Connection } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationRepository } from '../notification.repository';
import {
  NotificationEntity,
  NotificationType,
  NotificationStatus,
} from '../../../../atoms/entities/notification.entity';
import { ICacheProvider } from '../../../../core/cache/ICacheProvider';

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let connection: Connection;
  let cacheManager: ICacheProvider;

  const mockNotification: NotificationEntity = {
    id: '1',
    recipientId: 'user1',
    type: NotificationType.TASK_ASSIGNED,
    content: 'Test notification',
    status: NotificationStatus.UNREAD,
    priority: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    partitionKey: new Date(),
  } as NotificationEntity;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationRepository,
        {
          provide: Connection,
          useValue: {
            getRepository: jest.fn(() => ({
              create: jest.fn(),
              save: jest.fn(),
              find: jest.fn(),
              findOne: jest.fn(),
              delete: jest.fn(),
              softDelete: jest.fn(),
              createQueryBuilder: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn(),
                getOne: jest.fn(),
              })),
            })),
            createQueryRunner: jest.fn(() => ({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                connection: {},
              },
            })),
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

    repository = moduleRef.get<NotificationRepository>(NotificationRepository);
    connection = moduleRef.get<Connection>(Connection);
    cacheManager = moduleRef.get<ICacheProvider>(CACHE_MANAGER);
  });

  describe('findUnreadByUser', () => {
    it('should use cache when available', async () => {
      const cachedNotifications = [mockNotification];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedNotifications);

      const result = await repository.findUnreadByUser('user1');

      expect(cacheManager.get).toHaveBeenCalledWith('unread:user1');
      expect(result).toEqual(cachedNotifications);
    });

    it('should query database when cache miss', async () => {
      const dbNotifications = [mockNotification];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      const mockRepo = connection.getRepository(NotificationEntity);
      jest.spyOn(mockRepo, 'find').mockResolvedValue(dbNotifications);

      const result = await repository.findUnreadByUser('user1');

      expect(connection.getRepository(NotificationEntity).find).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith('unread:user1', dbNotifications, 60);
      expect(result).toEqual(dbNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should update notification and invalidate caches', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockNotification);
      jest.spyOn(repository, 'update').mockResolvedValue(mockNotification);

      await repository.markAsRead('1', 'user1');

      expect(repository.update).toHaveBeenCalledWith('1', { status: NotificationStatus.READ });
      expect(cacheManager.invalidate).toHaveBeenCalledTimes(3);
      expect(cacheManager.invalidate).toHaveBeenCalledWith('Notification:1');
      expect(cacheManager.invalidate).toHaveBeenCalledWith('unread:user1');
      expect(cacheManager.invalidate).toHaveBeenCalledWith('recent:user1');
    });

    it('should throw error for unauthorized user', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue({
        ...mockNotification,
        recipientId: 'otherUser',
      });

      await expect(repository.markAsRead('1', 'user1')).rejects.toThrow();
    });
  });

  describe('getRecentNotifications', () => {
    it('should implement sliding window cache', async () => {
      const recentNotifications = [mockNotification];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      const mockRepo = connection.getRepository(NotificationEntity);
      jest.spyOn(mockRepo, 'find').mockResolvedValue(recentNotifications);

      const result = await repository.getRecentNotifications('user1');

      expect(cacheManager.set).toHaveBeenCalledWith('recent:user1', recentNotifications, 300);
      expect(result).toEqual(recentNotifications);
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should cleanup old notifications in batches', async () => {
      const oldNotifications = Array(5)
        .fill(mockNotification)
        .map((n, i) => ({
          ...n,
          id: String(i),
        }));
      const mockRepo = connection.getRepository(NotificationEntity);
      jest.spyOn(mockRepo, 'find').mockResolvedValue(oldNotifications);

      await repository.cleanupOldNotifications();

      expect(connection.getRepository(NotificationEntity).softDelete).toHaveBeenCalledWith(
        oldNotifications.map((n) => n.id),
      );
      expect(cacheManager.invalidate).toHaveBeenCalledTimes(oldNotifications.length * 3);
    });
  });
});
