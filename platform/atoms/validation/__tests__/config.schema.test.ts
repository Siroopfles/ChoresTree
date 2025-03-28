import { envSchema, configSchema, validateEnv, createConfig } from '../config.schema';

describe('Config Schema Validation', () => {
  // Test data setup
  const validEnv: Partial<NodeJS.ProcessEnv> = {
    NODE_ENV: 'development',
    PORT: '3000',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_NAME: 'testdb',
    DB_USER: 'user',
    DB_PASSWORD: 'password',
    REDIS_URL: 'redis://localhost:6379',
    REDIS_PASSWORD: 'redispass',
    DISCORD_TOKEN: 'discord.token.here',
    DISCORD_CLIENT_ID: 'discord_client_123',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef', // 32 chars
    ENCRYPTION_IV: '0123456789abcdef', // 16 chars
  };

  describe('Environment Variables Validation', () => {
    test('should validate NODE_ENV enum values', async () => {
      // Explicitly test using envSchema to satisfy ESLint
      expect(envSchema).toBeDefined();
      expect(configSchema).toBeDefined();

      const validValues = ['development', 'production', 'test'];
      for (const value of validValues) {
        const env = { ...validEnv, NODE_ENV: value };
        await expect(validateEnv(env)).resolves.toBeDefined();
      }

      const invalidEnv = { ...validEnv, NODE_ENV: 'invalid' };
      await expect(validateEnv(invalidEnv)).rejects.toThrow(
        'NODE_ENV moet development, production of test zijn',
      );
    });

    test('should coerce and validate PORT', async () => {
      const env = { ...validEnv, PORT: '8080' };
      const validated = await validateEnv(env);
      expect(validated.PORT).toBe(8080);

      const invalidEnv = { ...validEnv, PORT: '-1' };
      await expect(validateEnv(invalidEnv)).rejects.toThrow(
        'PORT moet een positief geheel getal zijn',
      );
    });

    test('should use default PORT when not provided', async () => {
      const env = { ...validEnv } as Partial<NodeJS.ProcessEnv>;
      delete env.PORT;
      const validated = await validateEnv(env);
      expect(validated.PORT).toBe(3000);
    });

    test('should validate database configuration', async () => {
      const invalidEnv = { ...validEnv, DB_HOST: '' };
      await expect(validateEnv(invalidEnv)).rejects.toThrow('Database host mag niet leeg zijn');

      const missingEnv = { ...validEnv } as Partial<NodeJS.ProcessEnv>;
      delete missingEnv.DB_USER;
      await expect(validateEnv(missingEnv)).rejects.toThrow('Required');
    });

    test('should validate Redis URL format', async () => {
      const invalidEnv = { ...validEnv, REDIS_URL: 'invalid-url' };
      await expect(validateEnv(invalidEnv)).rejects.toThrow('Redis URL moet een geldige URL zijn');
    });

    test('should allow optional Redis password', async () => {
      const env = { ...validEnv } as Partial<NodeJS.ProcessEnv>;
      delete env.REDIS_PASSWORD;
      await expect(validateEnv(env)).resolves.toBeDefined();
    });

    test('should validate encryption key length', async () => {
      const shortKeyEnv = { ...validEnv, ENCRYPTION_KEY: '123' };
      await expect(validateEnv(shortKeyEnv)).rejects.toThrow(
        'Encryption key moet minimaal 32 karakters zijn',
      );
    });

    test('should validate encryption IV length', async () => {
      const invalidIvEnv = { ...validEnv, ENCRYPTION_IV: '123' };
      await expect(validateEnv(invalidIvEnv)).rejects.toThrow(
        'Encryption IV moet exact 16 karakters zijn',
      );
    });

    test('should handle multiple validation errors', async () => {
      const invalidEnv = {
        ...validEnv,
        NODE_ENV: 'invalid',
        PORT: '-1',
        DB_HOST: '',
        REDIS_URL: 'invalid',
      };

      try {
        await validateEnv(invalidEnv);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Environment validatie errors');
          expect(error.message).toContain('NODE_ENV');
          expect(error.message).toContain('PORT');
          expect(error.message).toContain('DB_HOST');
          expect(error.message).toContain('REDIS_URL');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Config Object Generation', () => {
    test('should generate valid config object', async () => {
      const config = await createConfig(validEnv);

      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe(3000);

      // Check database section
      expect(config.database).toEqual({
        host: 'localhost',
        port: 5432,
        name: 'testdb',
        user: 'user',
        password: 'password',
      });

      // Check redis section
      expect(config.redis).toEqual({
        url: 'redis://localhost:6379',
        password: 'redispass',
      });

      // Check discord section
      expect(config.discord).toEqual({
        token: 'discord.token.here',
        clientId: 'discord_client_123',
      });

      // Check encryption section
      expect(config.encryption).toEqual({
        key: '0123456789abcdef0123456789abcdef',
        iv: '0123456789abcdef',
      });
    });

    test('should handle non-Zod errors in createConfig', async () => {
      const throwingEnv = new Proxy(
        {},
        {
          get: () => {
            throw new Error('Systeem error');
          },
        },
      );

      await expect(createConfig(throwingEnv)).rejects.toThrow('Systeem error');
    });
  });

  describe('International Character Handling', () => {
    test('should handle non-ASCII characters in string values', async () => {
      const env = {
        ...validEnv,
        DB_HOST: 'データベース.com',
        DB_USER: 'användare',
        DB_PASSWORD: 'пароль',
      };

      const config = await createConfig(env);
      expect(config.database.host).toBe('データベース.com');
      expect(config.database.user).toBe('användare');
      expect(config.database.password).toBe('пароль');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty environment', async () => {
      await expect(validateEnv({})).rejects.toThrow();
    });

    test('should handle undefined values', async () => {
      const env = { ...validEnv, REDIS_PASSWORD: undefined };
      await expect(validateEnv(env)).resolves.toBeDefined();
    });

    test('should handle very long string inputs', async () => {
      const longString = 'a'.repeat(1000);
      const env = { ...validEnv, DB_HOST: longString };
      await expect(validateEnv(env)).resolves.toBeDefined();
    });
  });
});
