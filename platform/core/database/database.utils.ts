import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { connectionOptions } from './connection';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';

/**
 * Creëert een TypeORM test configuratie voor repository tests
 * @param entities Array van entity classes om te registreren
 * @returns TypeORM module configuratie voor tests
 */
export const createTestTypeOrmModule = (entities: EntityClassOrSchema[]) => {
  const testOptions: TypeOrmModuleOptions & PostgresConnectionOptions = {
    ...(connectionOptions as PostgresConnectionOptions),
    database: 'chorestree_test',
    entities,
    synchronize: true, // Voor tests synchroniseren we de database
    dropSchema: true, // Voor tests database opnieuw opzetten
    logging: false, // Logging uit voor tests
  };

  return TypeOrmModule.forRootAsync({
    useFactory: async (): Promise<TypeOrmModuleOptions> => testOptions,
    dataSourceFactory: async (options) => {
      if (!options) {
        throw new Error('Test database options not provided');
      }
      return new DataSource(options).initialize();
    },
  });
};

/**
 * Helper functie om een mock repository te maken voor tests
 * @param entity Entity class om repository voor te maken
 * @returns Repository configuratie voor de test module
 */
export const createMockRepository = (entity: EntityClassOrSchema) => {
  return TypeOrmModule.forFeature([entity]);
};

/**
 * Test database configuratie helper object
 */
export const TestDatabaseConfig = {
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'chorestree_test',
};

/**
 * Cleanup functie om de test database op te ruimen na tests
 * @param dataSource Active TypeORM DataSource
 */
export const cleanupTestDatabase = async (dataSource: DataSource) => {
  if (dataSource.isInitialized) {
    await dataSource.dropDatabase();
    await dataSource.destroy();
  }
};
