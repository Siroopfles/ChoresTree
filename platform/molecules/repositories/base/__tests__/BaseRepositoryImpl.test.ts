import { Test, TestingModule } from '@nestjs/testing';
import { Connection, EntityTarget } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BaseRepositoryImpl } from '../BaseRepositoryImpl';
import { BaseEntity } from '../../../../atoms/entities/base.entity';
import { ICacheProvider } from '../../../../core/cache/ICacheProvider';
import { RepositoryError } from '../../../../atoms/errors/repository.error';

// Test entity class
class TestEntity extends BaseEntity {
  name: string;
}

describe('BaseRepositoryImpl', () => {
  let repository: BaseRepositoryImpl<TestEntity>;
  let connection: Connection;
  let cacheManager: ICacheProvider;

  // Mock data
  const testEntity = {
    id: '123',
    name: 'Test Entity',
  } as TestEntity;

  beforeEach(async () => {
    // Create mocks
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };

    connection = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          connection: { getRepository: jest.fn().mockReturnValue(mockRepository) },
        },
      }),
    } as unknown as Connection;

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BaseRepositoryImpl,
        { provide: Connection, useValue: connection },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: 'ENTITY_TARGET', useValue: TestEntity },
      ],
    }).compile();

    repository = new BaseRepositoryImpl<TestEntity>(
      connection,
      cacheManager,
      TestEntity as EntityTarget<TestEntity>,
    );
  });

  describe('findById', () => {
    it('should return cached entity if available', async () => {
      // Arrange
      (cacheManager.get as jest.Mock).mockResolvedValue(testEntity);

      // Act
      const result = await repository.findById('123');

      // Assert
      expect(result).toEqual(testEntity);
      expect(cacheManager.get).toHaveBeenCalledWith('TestEntity:123');
    });

    it('should fetch from database and cache if not in cache', async () => {
      // Arrange
      (cacheManager.get as jest.Mock).mockResolvedValue(null);
      const mockRepo = connection.getRepository(TestEntity);
      (mockRepo.findOne as jest.Mock).mockResolvedValue(testEntity);

      // Act
      const result = await repository.findById('123');

      // Assert
      expect(result).toEqual(testEntity);
      expect(cacheManager.set).toHaveBeenCalledWith('TestEntity:123', testEntity);
    });

    it('should handle errors properly', async () => {
      // Arrange
      const error = new Error('Database error');
      (cacheManager.get as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(repository.findById('123')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findAll', () => {
    it('should apply filtering options correctly', async () => {
      // Arrange
      const mockQueryBuilder = connection.getRepository(TestEntity).createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([testEntity]);

      // Act
      await repository.findAll({
        where: { name: 'Test' },
        orderBy: { name: 'ASC' },
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalled();
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('create', () => {
    it('should create entity and cache it', async () => {
      // Arrange
      const mockRepo = connection.getRepository(TestEntity);
      (mockRepo.create as jest.Mock).mockReturnValue(testEntity);
      (mockRepo.save as jest.Mock).mockResolvedValue(testEntity);

      // Act
      const result = await repository.create({ name: 'Test Entity' });

      // Assert
      expect(result).toEqual(testEntity);
      expect(cacheManager.set).toHaveBeenCalledWith('TestEntity:123', testEntity);
    });
  });

  describe('update', () => {
    it('should update entity and cache', async () => {
      // Arrange
      const mockRepo = connection.getRepository(TestEntity);
      (mockRepo.findOne as jest.Mock).mockResolvedValue(testEntity);
      (mockRepo.save as jest.Mock).mockResolvedValue({
        ...testEntity,
        name: 'Updated Name',
      });

      // Act
      const result = await repository.update('123', { name: 'Updated Name' });

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should throw error if entity not found', async () => {
      // Arrange
      const mockRepo = connection.getRepository(TestEntity);
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(repository.update('123', { name: 'Test' })).rejects.toThrow(RepositoryError);
    });
  });

  describe('delete', () => {
    it('should delete entity and invalidate cache', async () => {
      // Arrange
      const mockRepo = connection.getRepository(TestEntity);
      (mockRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });

      // Act
      await repository.delete('123');

      // Assert
      expect(cacheManager.invalidate).toHaveBeenCalledWith('TestEntity:123');
    });

    it('should throw error if entity not found', async () => {
      // Arrange
      const mockRepo = connection.getRepository(TestEntity);
      (mockRepo.delete as jest.Mock).mockResolvedValue({ affected: 0 });

      // Act & Assert
      await expect(repository.delete('123')).rejects.toThrow(RepositoryError);
    });
  });

  describe('transaction', () => {
    it('should execute operations in transaction', async () => {
      // Arrange
      const queryRunner = connection.createQueryRunner();
      const operation = jest.fn().mockResolvedValue('result');

      // Act
      const result = await repository.transaction(operation);

      // Assert
      expect(result).toBe('result');
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      // Arrange
      const queryRunner = connection.createQueryRunner();
      const operation = jest.fn().mockRejectedValue(new Error('Transaction error'));

      // Act & Assert
      await expect(repository.transaction(operation)).rejects.toThrow(RepositoryError);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });
});
