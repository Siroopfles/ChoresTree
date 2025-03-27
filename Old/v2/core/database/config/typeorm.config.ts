import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { connectionConfig } from './connection.config';
import path from 'path';

/**
 * TypeORM configuration for the ChoresTree Discord Bot
 */
export const typeormConfig: PostgresConnectionOptions = {
  ...connectionConfig as Partial<PostgresConnectionOptions>,
  
  // Connection details
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'chorestree',

  // Entity configuration
  entities: [
    path.join(__dirname, '../../atomic/atoms/entities/**/*.entity.{ts,js}'),
    path.join(__dirname, '../../atomic/molecules/**/entities/**/*.entity.{ts,js}')
  ],
  
  // Migration configuration
  migrations: [
    path.join(__dirname, '../migrations/**/*.{ts,js}')
  ],
  migrationsTableName: 'typeorm_migrations',

  // Schema configuration
  schema: process.env.DB_SCHEMA || 'public',
  
  // Cache configuration
  cache: {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
    duration: 60000, // Cache for 1 minute by default
  },

  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Verify SSL certificate
  } : false,

  // Extended postgres-specific options
  extra: {
    ...connectionConfig.extra,
    application_name: 'chorestree_bot', // Identifier in pg_stat_activity
  }
};

/**
 * Creates a DataSource instance with the typeorm configuration
 */
export const createDataSource = (): DataSource => {
  return new DataSource(typeormConfig);
};

/**
 * Generate the connection URL for external tools
 */
export const getDatabaseUrl = (): string => {
  const config = typeormConfig as PostgresConnectionOptions;
  const ssl = process.env.NODE_ENV === 'production' ? '?sslmode=require' : '';
  
  return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${ssl}`;
};

// Re-export connection config utilities
export { connectionConfig, healthCheck, poolMonitoring } from './connection.config';