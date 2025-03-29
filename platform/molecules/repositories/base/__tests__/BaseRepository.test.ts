import { Connection, Repository, EntityMetadata, FindOneOptions, UpdateResult } from 'typeorm';
import { BaseRepository } from '../BaseRepository';
import { BaseEntity } from '../../../../atoms/entities/base.entity';
import { ICacheProvider } from '../../../../core/cache/ICacheProvider';
import { DatabaseMetrics } from '../../../../core/database/connection';

// Mock DatabaseMetrics
jest.mock('../../../../core/database/connection', () => ({
  DatabaseMetrics: {
    getInstance: jest.fn().mockReturnValue({
      recordQueryExecution: jest.fn(),
      recordError: jest.fn(),
    }),
  },
}));

// Test entity
class TestEntity extends BaseEntity {
  name: string;
}

describe('BaseRepository', () => {
  let repository: BaseRepository<TestEntity>;
  let typeormRepository: Repository<TestEntity>;
  let connection: Connection;
  let queryRunner: any;
  let cacheProvider: ICacheProvider;

  beforeEach(() => {
    // Setup cache provider mock
    cacheProvider = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
    };

    // Setup query runner mock
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };

    // Setup repository mock with relations
    typeormRepository = {
      metadata: {
        targetName: 'TestEntity',
        relations: [
          { isLazy: false, isEager: true, propertyName: 'relation1' },
          { isLazy: false, isEager: false, propertyName: 'relation2' },
        ],
      } as EntityMetadata,
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      }),
    } as unknown as Repository<TestEntity>;

    // Setup connection mock
    connection = {
      getRepository: jest.fn().mockReturnValue(typeormRepository),
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as Connection;

    repository = new BaseRepository(connection as Connection, TestEntity, cacheProvider);
  });

  describe('findById', () => {
    it('should return cached entity if available', async () => {
      const mockEntity = { id: '123', name: 'Test' } as TestEntity;
      (cacheProvider.get as jest.Mock).mockResolvedValueOnce(mockEntity);

      const result = await repository.findById('123');

      expect(result).toEqual(mockEntity);
      expect(cacheProvider.get).toHaveBeenCalledWith('entity:TestEntity:123');
      expect(typeormRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when not in cache', async () => {
      const mockEntity = { id: '123', name: 'Test' } as TestEntity;
      (cacheProvider.get as jest.Mock).mockResolvedValueOnce(null);
      (typeormRepository.findOne as jest.Mock).mockResolvedValueOnce(mockEntity);

      const result = await repository.findById('123');

      expect(result).toEqual(mockEntity);
      expect(cacheProvider.get).toHaveBeenCalledWith('entity:TestEntity:123');
      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
        loadEagerRelations: false,
        cache: true,
      });
      expect(cacheProvider.set).toHaveBeenCalledWith('entity:TestEntity:123', mockEntity);
    });
  });

  describe('findAll', () => {
    it('should return cached entities if available', async () => {
      const mockEntities = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
      ] as TestEntity[];
      (cacheProvider.get as jest.Mock).mockResolvedValueOnce(mockEntities);

      const result = await repository.findAll();

      expect(result).toEqual(mockEntities);
      expect(cacheProvider.get).toHaveBeenCalledWith('collection:TestEntity');
      expect(typeormRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when not in cache', async () => {
      const mockEntities = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
      ] as TestEntity[];

      const queryBuilder = typeormRepository.createQueryBuilder();
      (cacheProvider.get as jest.Mock).mockResolvedValueOnce(null);
      (queryBuilder.getMany as jest.Mock).mockResolvedValueOnce(mockEntities);

      const result = await repository.findAll();

      expect(result).toEqual(mockEntities);
      expect(cacheProvider.get).toHaveBeenCalledWith('collection:TestEntity');
      expect(cacheProvider.set).toHaveBeenCalledWith('collection:TestEntity', mockEntities);
    });
  });

  describe('create', () => {
    it('should create entity and update cache', async () => {
      const newEntity = { name: 'New Test' };
      const createdEntity = { id: '123', name: 'New Test' } as TestEntity;

      (typeormRepository.create as jest.Mock).mockReturnValueOnce(createdEntity);
      (typeormRepository.save as jest.Mock).mockResolvedValueOnce(createdEntity);

      const result = await repository.create(newEntity);

      expect(result).toEqual(createdEntity);
      expect(cacheProvider.set).toHaveBeenCalledWith('entity:TestEntity:123', createdEntity);
      expect(cacheProvider.invalidate).toHaveBeenCalledWith('collection:TestEntity');
    });
  });

  describe('update', () => {
    it('should update entity and cache', async () => {
      const updateData = { name: 'Updated Test' };
      const updatedEntity = { id: '123', name: 'Updated Test' } as TestEntity;
      const updateResult: UpdateResult = { raw: [], affected: 1, generatedMaps: [] };

      (typeormRepository.update as jest.Mock).mockResolvedValueOnce(updateResult);
      (typeormRepository.findOne as jest.Mock).mockResolvedValueOnce(updatedEntity);

      const result = await repository.update('123', updateData);

      expect(result).toEqual(updatedEntity);
      expect(cacheProvider.set).toHaveBeenCalledWith('entity:TestEntity:123', updatedEntity);
      expect(cacheProvider.invalidate).toHaveBeenCalledWith('collection:TestEntity');
    });
  });

  describe('delete', () => {
    it('should delete entity and invalidate cache', async () => {
      await repository.delete('123');

      expect(typeormRepository.delete).toHaveBeenCalledWith('123');
      expect(cacheProvider.invalidate).toHaveBeenCalledWith('entity:TestEntity:123');
      expect(cacheProvider.invalidate).toHaveBeenCalledWith('collection:TestEntity');
    });
  });

  describe('transaction', () => {
    it('should execute operations in transaction', async () => {
      const operation = jest.fn().mockResolvedValueOnce({ success: true });

      const result = await repository.transaction(operation);

      expect(result).toEqual({ success: true });
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      // Verify metrics were recorded
      const metrics = DatabaseMetrics.getInstance();
      expect(metrics.recordQueryExecution).toHaveBeenCalledWith('transaction', expect.any(Number));
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Test error');
      const operation = jest.fn().mockRejectedValueOnce(error);

      await expect(repository.transaction(operation)).rejects.toThrow(error);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();

      // Verify error was recorded
      const metrics = DatabaseMetrics.getInstance();
      expect(metrics.recordError).toHaveBeenCalledWith('transaction', error);
    });

    describe('error handling', () => {
      it('should handle and monitor database errors', async () => {
        const error = new Error('Database error');
        (typeormRepository.findOne as jest.Mock).mockRejectedValueOnce(error);

        await expect(repository.findById('123')).rejects.toThrow(error);

        const metrics = DatabaseMetrics.getInstance();
        expect(metrics.recordError).toHaveBeenCalledWith('findById', error);
      });

      it('should monitor query performance', async () => {
        const entity = { id: '123', name: 'Test' } as TestEntity;
        (typeormRepository.findOne as jest.Mock).mockResolvedValueOnce(entity);

        await repository.findById('123');

        const metrics = DatabaseMetrics.getInstance();
        expect(metrics.recordQueryExecution).toHaveBeenCalledWith('findById', expect.any(Number));
      });
    });
  });
});
