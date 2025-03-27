import { DataSource } from 'typeorm';
import { TestSeeder } from '../utils/seeders';

declare global {
  var __TEST_DB__: DataSource | undefined;
  var __TEST_SEEDER__: TestSeeder | undefined;

  namespace jest {
    interface Matchers<R> {
      toBeValidDatabase(): R;
    }
  }
}

export {};