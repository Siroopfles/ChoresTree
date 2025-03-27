import { getTestDb, withTestTransaction } from '../../../test/jest/setup-after-env';
import { ServerEntity } from '../../../atomic/atoms/database/entities/ServerEntity';
import { DataSource } from 'typeorm';
import { TestSeeder } from '../../../test/utils/seeders';

describe('Server Entity (Atoms)', () => {
  let dataSource: DataSource;
  let testSeeder: TestSeeder;

  beforeAll(async () => {
    dataSource = getTestDb();
    expect(dataSource).toBeValidDatabase();
    testSeeder = new TestSeeder(dataSource);
  });

  describe('Entity Constructie & Validatie', () => {
    it('should create server with required properties', async () => {
      await withTestTransaction(async () => {
        const server = await testSeeder.seedServer();

        expect(server.id).toBeDefined();
        expect(server.serverId).toBeDefined();
        expect(server.serverName).toBeDefined();
        expect(server.createdAt).toBeDefined();
        expect(server.updatedAt).toBeDefined();
        expect(server.lastActiveAt).toBeDefined();
      });
    });

    it('should enforce required fields for ServerEntity', async () => {
      await withTestTransaction(async () => {
        const server = new ServerEntity();
        // Missing required fields
        await expect(
          dataSource.manager.save(ServerEntity, server)
        ).rejects.toThrow();
      });
    });

    it('should enforce unique serverId constraint', async () => {
      await withTestTransaction(async () => {
        const server = await testSeeder.seedServer();
        
        // Probeer server met zelfde serverId aan te maken
        await expect(
          testSeeder.seedServer({ serverId: server.serverId })
        ).rejects.toThrow();
      });
    });
  });

  describe('Default Waardes', () => {
    it('should set correct default values', async () => {
      await withTestTransaction(async () => {
        const server = await testSeeder.seedServer();
        
        expect(server.prefix).toBe('!');
        expect(server.timezone).toBe('UTC');
        expect(server.language).toBe('en');
        expect(server.isPremium).toBe(false);
        expect(server.maxTasks).toBe(100);
      });
    });

    it('should allow overriding default values', async () => {
      await withTestTransaction(async () => {
        const server = await testSeeder.seedServer({
          prefix: '$',
          timezone: 'Europe/Amsterdam',
          language: 'nl',
          isPremium: true,
          maxTasks: 200
        });

        expect(server.prefix).toBe('$');
        expect(server.timezone).toBe('Europe/Amsterdam');
        expect(server.language).toBe('nl');
        expect(server.isPremium).toBe(true);
        expect(server.maxTasks).toBe(200);
      });
    });
  });

  describe('Relaties', () => {
    it('should handle tasks relationship', async () => {
      await withTestTransaction(async () => {
        const server = await testSeeder.seedServer();
        const task = await testSeeder.seedTask(server);

        // Laad server met tasks relatie
        const serverWithTasks = await dataSource.manager.findOne(ServerEntity, {
          where: { id: server.id },
          relations: { tasks: true }
        });

        expect(serverWithTasks?.tasks).toBeDefined();
        expect(serverWithTasks?.tasks.length).toBe(1);
        expect(serverWithTasks?.tasks[0].id).toBe(task.id);
      });
    });
  });

  describe('Optionele Velden', () => {
    it('should handle optional notification channel', async () => {
      await withTestTransaction(async () => {
        const server = await testSeeder.seedServer({
          notificationChannelId: 'channel123'
        });

        expect(server.notificationChannelId).toBe('channel123');

        // Test zonder notification channel
        const serverNoChannel = await testSeeder.seedServer({
          notificationChannelId: undefined
        });

        expect(serverNoChannel.notificationChannelId).toBeNull();
      });
    });

    it('should handle optional admin role', async () => {
      await withTestTransaction(async () => {
        const server = await testSeeder.seedServer({
          adminRoleId: 'role123'
        });

        expect(server.adminRoleId).toBe('role123');

        // Test zonder admin role
        const serverNoRole = await testSeeder.seedServer({
          adminRoleId: undefined
        });

        expect(serverNoRole.adminRoleId).toBeNull();
      });
    });
  });

  afterEach(async () => {
    await withTestTransaction(async () => {
      await testSeeder.cleanup();
    });
  });
});