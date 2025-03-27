/// <reference types="jest" />
import { getTestDb, withTestTransaction } from '../../../test/jest/setup-after-env';
import { DataSource } from 'typeorm';
import { TestSeeder } from '../../../test/utils/seeders';
import { ServerEntity } from '../../../atomic/atoms/database/entities/ServerEntity';
import { TaskEntity } from '../../../atomic/atoms/database/entities/TaskEntity';

declare const describe: jest.Describe;
declare const beforeAll: jest.Lifecycle;
declare const beforeEach: jest.Lifecycle;
declare const afterEach: jest.Lifecycle;
declare const it: jest.It;
declare const expect: jest.Expect;

describe('TaskEntity (Atoms)', () => {
  let dataSource: DataSource;
  let testSeeder: TestSeeder;
  let server: ServerEntity;

  beforeAll(async () => {
    dataSource = getTestDb();
    expect(dataSource).toBeValidDatabase();
    testSeeder = new TestSeeder(dataSource);
  });

  beforeEach(async () => {
    await withTestTransaction(async () => {
      server = await testSeeder.seedServer();
    });
  });

  describe('Entity Construction & Validation', () => {
    it('should create task with required properties', async () => {
      await withTestTransaction(async () => {
        const task = await testSeeder.seedTask(server);
        expect(task.id).toBeDefined();
        expect(task.title).toBe('Test Task');
        expect(task.status).toBe('PENDING');
        expect(task.createdAt).toBeDefined();
        expect(task.updatedAt).toBeDefined();
      });
    });
  });

  describe('Status Transitions', () => {
    it('should validate status transitions', async () => {
      await withTestTransaction(async () => {
        const task = await testSeeder.seedTask(server);
        expect(task.status).toBe('PENDING');

        // Valid transition: PENDING -> IN_PROGRESS
        task.status = 'IN_PROGRESS';
        await dataSource.manager.save(task);
        expect(task.status).toBe('IN_PROGRESS');

        // Valid transition: IN_PROGRESS -> COMPLETED
        task.status = 'COMPLETED';
        await dataSource.manager.save(task);
        expect(task.status).toBe('COMPLETED');
      });
    });
  });

  describe('Deadline Handling', () => {
    it('should create deadline notification when setting due date', async () => {
      await withTestTransaction(async () => {
        const task = await testSeeder.seedTask(server);
        const dueDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours ahead
        
        await task.setDeadline(dueDate);
        await dataSource.manager.save(task);

        const savedTask = await dataSource.manager.findOne(TaskEntity, {
          where: { id: task.id },
          relations: ['notifications']
        });

        expect(savedTask?.notifications).toHaveLength(1);
        expect(savedTask?.notifications[0].type).toBe('DEADLINE');
      });
    });
  });

  afterEach(async () => {
    await withTestTransaction(async () => {
      await testSeeder.cleanup();
    });
  });
});