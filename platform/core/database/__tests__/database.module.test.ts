import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { DatabaseModule } from '../database.module';
import { createTestTypeOrmModule, cleanupTestDatabase } from './database.utils';

describe('DatabaseModule', () => {
  let dataSource: DataSource;

  afterEach(async () => {
    if (dataSource) {
      await cleanupTestDatabase(dataSource);
    }
  });

  it('should establish a database connection', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    dataSource = moduleRef.get<DataSource>(DataSource);
    expect(dataSource).toBeDefined();
    expect(dataSource.isInitialized).toBe(true);

    await app.close();
  });

  it('should use test configuration in test environment', async () => {
    // Test met lege entities array voor dit voorbeeld
    const testModule = createTestTypeOrmModule([]);

    const moduleRef = await Test.createTestingModule({
      imports: [testModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    dataSource = moduleRef.get<DataSource>(DataSource);
    expect(dataSource).toBeDefined();
    expect(dataSource.options.database).toBe('chorestree_test');
    expect(dataSource.options.synchronize).toBe(true);
    expect(dataSource.options.dropSchema).toBe(true);
    expect(dataSource.options.logging).toBe(false);

    await app.close();
  });
});
