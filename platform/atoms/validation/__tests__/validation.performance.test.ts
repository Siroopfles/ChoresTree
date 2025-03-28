import { performance } from 'perf_hooks';
import { z } from 'zod';
import { baseSchema, createEntitySchema, validateSchema } from '../base.schema';
import { notificationSchema, validateNotification } from '../notification.schema';
import { configSchema } from '../config.schema';
import { roleSchema } from '../role.schema';
import { taskSchema } from '../task.schema';
import { NotificationStatus, NotificationType } from '../../entities/notification.entity';
import { TaskStatus } from '../../entities/task.entity';

describe('Validation Performance Tests', () => {
  // Helper om test data te genereren
  const generateNotificationData = (index: number) => ({
    id: `123e4567-e89b-12d3-a456-${index.toString().padStart(12, '0')}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    type: NotificationType.TASK_ASSIGNED,
    status: NotificationStatus.UNREAD,
    priority: 3,
    content: `Test notification ${index}`,
    recipientId: `user${index}`,
    taskId: `123e4567-e89b-12d3-a456-${(index + 1).toString().padStart(12, '0')}`,
    metadata: { index },
  });

  // Helper om array van test data te genereren
  const generateDataset = (size: number) =>
    Array.from({ length: size }, (_, i) => generateNotificationData(i));

  describe('Load Testing', () => {
    test('should handle large datasets efficiently', async () => {
      const dataset = generateDataset(1000);
      const startTime = performance.now();

      await Promise.all(dataset.map((data) => validateNotification.complete(data)));

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerItem = totalTime / dataset.length;

      // Log alleen bij performance problemen
      if (avgTimePerItem >= 100) {
        console.warn(`Load Test Performance Warning:
          Total Time: ${totalTime.toFixed(2)}ms
          Average Time Per Item: ${avgTimePerItem.toFixed(2)}ms
          Items Processed: ${dataset.length}
          Throughput: ${(dataset.length / (totalTime / 1000)).toFixed(2)} items/sec
        `);
      }

      // Validatie moet onder 100ms per item blijven
      expect(avgTimePerItem).toBeLessThan(100);
    });

    test('should scale linearly with input size', async () => {
      // Valideer batch verwerking efficiëntie
      const batchSizes = [10, 20, 30]; // Kleinere batches voor betere controle
      const repetitions = 5; // Meerdere runs voor stabielere metingen
      const metrics: Array<{ size: number; time: number }> = [];

      for (const batchSize of batchSizes) {
        const times: number[] = [];

        // Voer meerdere keren uit voor stabielere metingen
        for (let i = 0; i < repetitions; i++) {
          const dataset = generateDataset(batchSize);
          const startTime = performance.now();

          await Promise.all(dataset.map((data) => validateNotification.complete(data)));

          times.push(performance.now() - startTime);
        }

        // Gebruik mediaan tijd voor stabielere resultaten
        const medianTime = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
        metrics.push({
          size: batchSize,
          time: medianTime,
        });

        // Log tijden voor debugging
        console.warn(`Batch size ${batchSize}:
          Min time: ${Math.min(...times).toFixed(2)}ms
          Max time: ${Math.max(...times).toFixed(2)}ms
          Median time: ${medianTime.toFixed(2)}ms
          Avg time per item: ${(medianTime / batchSize).toFixed(2)}ms
        `);
      }

      // Bereken scaling factor tussen elke dataset size
      // Controleer scaling tussen datasets
      for (let i = 1; i < metrics.length; i++) {
        const scalingFactor =
          metrics[i].time / metrics[i - 1].time / (metrics[i].size / metrics[i - 1].size);

        // Log alleen bij non-lineaire scaling
        if (scalingFactor > 1.2) {
          console.warn(
            `Non-linear Scaling Warning: Factor ${scalingFactor.toFixed(2)} between ${metrics[i - 1].size} and ${metrics[i].size} items`,
          );
        }

        // Scaling factor moet dicht bij 1 liggen voor lineaire scaling
        expect(scalingFactor).toBeLessThan(1.2);
      }
    });
  });

  describe('Benchmark Tests', () => {
    interface BenchmarkResult {
      name: string;
      time: number;
    }

    const runBenchmark = async (schema: z.ZodSchema, data: unknown): Promise<number> => {
      const startTime = performance.now();
      await validateSchema(schema, data);
      return performance.now() - startTime;
    };

    test('should benchmark different schema types', async () => {
      const testData = generateNotificationData(1);
      const benchmarks: BenchmarkResult[] = [];

      // Test alle beschikbare schema's
      benchmarks.push({
        name: 'Base Schema',
        time: await runBenchmark(baseSchema, {
          id: testData.id,
          createdAt: testData.createdAt,
          updatedAt: testData.updatedAt,
          version: testData.version,
        }),
      });

      // Test notification schema
      benchmarks.push({
        name: 'Notification Schema',
        time: await runBenchmark(notificationSchema, testData),
      });

      // Test config schema met correcte lengths
      benchmarks.push({
        name: 'Config Schema',
        time: await runBenchmark(configSchema, {
          NODE_ENV: 'test',
          DB_HOST: 'localhost',
          DB_NAME: 'test_db',
          DB_USER: 'test_user',
          DB_PASSWORD: 'test_pass',
          DB_PORT: 5432,
          REDIS_URL: 'redis://localhost:6379',
          DISCORD_TOKEN: 'test_token',
          DISCORD_CLIENT_ID: 'test_client_id',
          ENCRYPTION_KEY: 'this-is-a-very-long-encryption-key-32-chars',
          ENCRYPTION_IV: '16-chars-iv-here',
          database: {
            host: 'localhost',
            port: 5432,
            name: 'test_db',
            user: 'test_user',
            password: 'test_pass',
          },
          redis: {
            url: 'redis://localhost:6379',
          },
          discord: {
            token: 'test_token',
            clientId: 'test_client_id',
          },
          encryption: {
            key: 'this-is-a-very-long-encryption-key-32-chars',
            iv: '16-chars-iv-here',
          },
        }),
      });

      // Test role schema met correcte snowflake IDs
      benchmarks.push({
        name: 'Role Schema',
        time: await runBenchmark(roleSchema, {
          id: testData.id,
          createdAt: testData.createdAt,
          updatedAt: testData.updatedAt,
          version: testData.version,
          name: 'ADMIN',
          permissions: ['TASK_CREATE', 'TASK_READ', 'TASK_UPDATE', 'TASK_DELETE'],
          discordRoleId: '123456789012345678', // 18-digit snowflake
          serverId: '876543210987654321', // 18-digit snowflake
          metadata: {
            color: '#FF0000',
            position: 1,
            managed: false,
            mentionable: true,
          },
        }),
      });

      // Test task schema
      benchmarks.push({
        name: 'Task Schema',
        time: await runBenchmark(taskSchema, {
          id: testData.id,
          createdAt: testData.createdAt,
          updatedAt: testData.updatedAt,
          version: testData.version,
          title: 'Test Task',
          description: 'Test Description',
          status: TaskStatus.TODO,
          priority: 1,
          dueDate: new Date(Date.now() + 86400000), // Morgen
        }),
      });

      // Test complex nested schema
      const complexSchema = createEntitySchema({
        nested: createEntitySchema({
          deepNested: createEntitySchema({
            field: createEntitySchema({
              value: createEntitySchema({}),
            }),
          }),
        }),
      });

      benchmarks.push({
        name: 'Complex Nested Schema',
        time: await runBenchmark(complexSchema, {
          id: testData.id,
          createdAt: testData.createdAt,
          updatedAt: testData.updatedAt,
          version: testData.version,
          nested: {
            id: testData.id,
            createdAt: testData.createdAt,
            updatedAt: testData.updatedAt,
            version: testData.version,
            deepNested: {
              id: testData.id,
              createdAt: testData.createdAt,
              updatedAt: testData.updatedAt,
              version: testData.version,
              field: {
                id: testData.id,
                createdAt: testData.createdAt,
                updatedAt: testData.updatedAt,
                version: testData.version,
                value: {
                  id: testData.id,
                  createdAt: testData.createdAt,
                  updatedAt: testData.updatedAt,
                  version: testData.version,
                },
              },
            },
          },
        }),
      });

      // Log en valideer benchmark results
      for (const benchmark of benchmarks) {
        // Log alleen wanneer de test faalt
        if (benchmark.time >= 100) {
          console.warn(
            `Performance Warning: ${benchmark.name} took ${benchmark.time.toFixed(2)}ms`,
          );
        }
        expect(benchmark.time).toBeLessThan(100);
      }
    });
  });

  describe('Concurrent Validation', () => {
    test('should handle high concurrency efficiently', async () => {
      const concurrencyLevels = [10, 50, 100];
      const testData = generateNotificationData(1);

      for (const concurrency of concurrencyLevels) {
        const startTime = performance.now();
        const validations = Array(concurrency)
          .fill(null)
          .map(() => validateNotification.complete(testData));

        await Promise.all(validations);
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        const avgTime = totalTime / concurrency;
        if (avgTime >= 100) {
          console.warn(
            `Performance Warning: Concurrency Level ${concurrency} - Average time ${avgTime.toFixed(2)}ms exceeds threshold`,
          );
        }

        // Valideer performance onder hoge concurrency
        expect(totalTime / concurrency).toBeLessThan(100);
      }
    });

    test('should handle concurrent mixed operations', async () => {
      const operations = [
        ...Array(20).fill(() =>
          validateNotification.create({
            type: NotificationType.TASK_ASSIGNED,
            content: 'Test notification',
            recipientId: 'user123',
          }),
        ),
        ...Array(20).fill(() =>
          validateNotification.update({
            content: 'Updated content',
            status: NotificationStatus.READ,
          }),
        ),
        ...Array(20).fill(() => validateNotification.complete(generateNotificationData(1))),
      ];

      const startTime = performance.now();
      await Promise.all(operations.map((op) => op()));
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / operations.length;
      if (avgTime >= 100) {
        console.warn(
          `Performance Warning: Mixed Operations - Average time ${avgTime.toFixed(2)}ms exceeds threshold`,
        );
      }

      expect(totalTime / operations.length).toBeLessThan(100);
    });
  });

  describe('Stress Testing', () => {
    test('should handle repeated rapid validations', async () => {
      const iterations = 1000;
      const testData = generateNotificationData(1);
      const startTime = performance.now();
      const results: number[] = [];
      const errors: Error[] = [];

      for (let i = 0; i < iterations; i++) {
        try {
          const iterationStart = performance.now();
          await validateNotification.complete(testData);
          results.push(performance.now() - iterationStart);
        } catch (error: unknown) {
          if (error instanceof Error) {
            errors.push(error);
          } else {
            errors.push(new Error('Unknown error occurred'));
          }
        }
      }

      const totalTime = performance.now() - startTime;
      const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
      const maxTime = Math.max(...results);

      // Log alleen bij performance problemen of errors
      if (avgTime >= 100 || maxTime >= 200 || errors.length > 0) {
        console.warn(`Stress Test Warning:
          Total Time: ${totalTime.toFixed(2)}ms
          Average Time: ${avgTime.toFixed(2)}ms
          Max Time: ${maxTime.toFixed(2)}ms
          Errors: ${errors.length}
          Success Rate: ${(((iterations - errors.length) / iterations) * 100).toFixed(2)}%
        `);
      }

      expect(errors.length).toBe(0); // Geen errors toegestaan
      expect(avgTime).toBeLessThan(100);
    });

    test('should handle memory pressure', async () => {
      const largeDataset = generateDataset(10000);
      const startHeap = process.memoryUsage().heapUsed;
      const batchSize = 1000;
      const batchResults: number[] = [];

      // Process in batches om heap overflow te voorkomen

      for (let i = 0; i < largeDataset.length; i += batchSize) {
        const batch = largeDataset.slice(i, i + batchSize);
        const batchStart = performance.now();

        await Promise.all(batch.map((data) => validateNotification.complete(data)));

        const batchTime = performance.now() - batchStart;
        batchResults.push(batchTime);

        // Log waarschuwing als batch te lang duurt
        if (batchTime / batchSize >= 100) {
          console.warn(
            `Batch Performance Warning: Batch ${i / batchSize + 1} averaged ${(batchTime / batchSize).toFixed(2)}ms per operation`,
          );
        }
      }

      const endHeap = process.memoryUsage().heapUsed;
      const heapGrowth = (endHeap - startHeap) / 1024 / 1024; // MB

      const avgBatchTime = batchResults.reduce((a, b) => a + b, 0) / batchResults.length;

      // Log alleen bij significante heap growth of performance issues
      if (heapGrowth > 50 || avgBatchTime >= 100) {
        console.warn(`Memory Pressure Warning:
          Initial Heap: ${(startHeap / 1024 / 1024).toFixed(2)}MB
          Final Heap: ${(endHeap / 1024 / 1024).toFixed(2)}MB
          Heap Growth: ${heapGrowth.toFixed(2)}MB
          Average Batch Time: ${avgBatchTime.toFixed(2)}ms
        `);
      }

      // Valideer memory gebruik en performance
      expect(heapGrowth).toBeLessThan(100); // Max 100MB groei
    });
  });
});
