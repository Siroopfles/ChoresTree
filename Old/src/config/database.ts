import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';

// Redis configuratie
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxMemory: '500mb', // Constraint uit techContext.md
  maxRetriesPerRequest: 3,
};

// Database configuratie volgens techContext.md constraints
export const databaseConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'chorestree',
  synchronize: false, // We gebruiken migrations voor veiligheid
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/atomic/atoms/database/entities/**/*.ts'],
  migrations: ['src/atomic/atoms/database/migrations/**/*.ts'],
  poolSize: 100, // Maximum connections uit techContext.md
  connectTimeout: 5000, // 5s timeout uit techContext.md
};

// Database connection setup
export const AppDataSource = new DataSource(databaseConfig);

// Redis client setup
export const redisClient = new Redis({
  ...redisConfig,
  retryStrategy: (times: number) => {
    if (times > 3) {
      return null; // Stop retrying after 3 attempts
    }
    return Math.min(times * 1000, 3000); // Exponential backoff with max 3s
  },
});

// Database connection met retry logic
export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.warn('Database connection initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Redis connection met error handling
redisClient.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redisClient.on('connect', () => {
  console.warn('Redis connection established');
});
