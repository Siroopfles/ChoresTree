import { validateEnv, createConfig } from '../config.schema';

describe('Config Schema Validatie', () => {
  describe('Environment Variabelen Validatie', () => {
    it('should validate valid environment variables', async () => {
      const env = {
        NODE_ENV: 'development',
        PORT: '3000',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'chorestree',
        DB_USER: 'admin',
        DB_PASSWORD: 'secret',
        REDIS_URL: 'redis://localhost:6379',
        DISCORD_TOKEN: 'discord-token',
        DISCORD_CLIENT_ID: 'client-id',
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef', // 32 chars
        ENCRYPTION_IV: '0123456789abcdef' // 16 chars
      };

      const result = await validateEnv(env);
      
      expect(result).toEqual({
        NODE_ENV: 'development',
        PORT: 3000,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'chorestree',
        DB_USER: 'admin',
        DB_PASSWORD: 'secret',
        REDIS_URL: 'redis://localhost:6379',
        DISCORD_TOKEN: 'discord-token',
        DISCORD_CLIENT_ID: 'client-id',
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
        ENCRYPTION_IV: '0123456789abcdef'
      });
    });

    it('should reject invalid environment variables', async () => {
      const env = {
        NODE_ENV: 'invalid',
        PORT: '-1',
        DB_HOST: '',
        REDIS_URL: 'invalid-url',
        ENCRYPTION_KEY: 'short',
        ENCRYPTION_IV: 'tooshort'
      };

      await expect(validateEnv(env)).rejects.toThrow('Environment validatie errors');
    });

    it('should coerce string values to correct types', async () => {
      const env = {
        NODE_ENV: 'production',
        PORT: '8080',
        DB_PORT: '5433',
        DB_HOST: 'db.example.com',
        DB_NAME: 'prod',
        DB_USER: 'admin',
        DB_PASSWORD: 'secret',
        REDIS_URL: 'redis://redis.example.com',
        DISCORD_TOKEN: 'token',
        DISCORD_CLIENT_ID: 'client-id',
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
        ENCRYPTION_IV: '0123456789abcdef'
      };

      const result = await validateEnv(env);
      
      expect(typeof result.PORT).toBe('number');
      expect(typeof result.DB_PORT).toBe('number');
      expect(result.PORT).toBe(8080);
      expect(result.DB_PORT).toBe(5433);
    });
  });

  describe('Config Object Creation', () => {
    it('should create a valid config object', async () => {
      const env = {
        NODE_ENV: 'development',
        PORT: '3000',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'chorestree',
        DB_USER: 'admin',
        DB_PASSWORD: 'secret',
        REDIS_URL: 'redis://localhost:6379',
        DISCORD_TOKEN: 'discord-token',
        DISCORD_CLIENT_ID: 'client-id',
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
        ENCRYPTION_IV: '0123456789abcdef'
      };

      const config = await createConfig(env);
      
      expect(config).toEqual({
        NODE_ENV: 'development',
        PORT: 3000,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'chorestree',
        DB_USER: 'admin',
        DB_PASSWORD: 'secret',
        REDIS_URL: 'redis://localhost:6379',
        DISCORD_TOKEN: 'discord-token',
        DISCORD_CLIENT_ID: 'client-id',
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
        ENCRYPTION_IV: '0123456789abcdef',
        database: {
          host: 'localhost',
          port: 5432,
          name: 'chorestree',
          user: 'admin',
          password: 'secret'
        },
        redis: {
          url: 'redis://localhost:6379'
        },
        discord: {
          token: 'discord-token',
          clientId: 'client-id'
        },
        encryption: {
          key: '0123456789abcdef0123456789abcdef',
          iv: '0123456789abcdef'
        }
      });
    });

    it('should provide descriptive Dutch error messages', async () => {
      const env = {
        NODE_ENV: 'invalid',
        PORT: '-1',
        DB_HOST: '',
        REDIS_URL: 'invalid-url',
        ENCRYPTION_KEY: 'short',
        ENCRYPTION_IV: 'tooshort'
      };

      try {
        await createConfig(env);
        fail('Should have thrown validation error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('NODE_ENV moet development, production of test zijn');
        expect(message).toContain('PORT moet een positief geheel getal zijn');
        expect(message).toContain('Database host mag niet leeg zijn');
        expect(message).toContain('Redis URL moet een geldige URL zijn');
        expect(message).toContain('Encryption key moet minimaal 32 karakters zijn');
        expect(message).toContain('Encryption IV moet exact 16 karakters zijn');
      }
    });
  });
});