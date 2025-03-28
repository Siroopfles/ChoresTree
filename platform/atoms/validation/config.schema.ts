import { z } from 'zod';

/**
 * Environment variabelen schema
 */
export const envSchema = z.object({
  // Server configuratie
  NODE_ENV: z.enum(['development', 'production', 'test'], {
    description: 'Node environment',
    errorMap: () => ({
      message: 'NODE_ENV moet development, production of test zijn'
    })
  }),
  PORT: z.coerce.number().int().positive({
    message: 'PORT moet een positief geheel getal zijn'
  }).default(3000),

  // Database configuratie  
  DB_HOST: z.string({
    required_error: 'Database host is verplicht'
  }).min(1, 'Database host mag niet leeg zijn'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1, 'Database naam is verplicht'),
  DB_USER: z.string().min(1, 'Database gebruiker is verplicht'),
  DB_PASSWORD: z.string().min(1, 'Database wachtwoord is verplicht'),

  // Redis configuratie
  REDIS_URL: z.string().url({
    message: 'Redis URL moet een geldige URL zijn'
  }),
  REDIS_PASSWORD: z.string().optional(),

  // Discord configuratie
  DISCORD_TOKEN: z.string().min(1, 'Discord token is verplicht'),
  DISCORD_CLIENT_ID: z.string().min(1, 'Discord client ID is verplicht'),

  // Encryptie configuratie
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key moet minimaal 32 karakters zijn'),
  ENCRYPTION_IV: z.string().length(16, 'Encryption IV moet exact 16 karakters zijn')
});

/**
 * Type voor gevalideerde environment variabelen
 */
export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Config schema dat environment variabelen en andere configuratie combineert
 */
export const configSchema = envSchema.extend({
  // Database config object
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    user: z.string(),
    password: z.string()
  }),

  // Redis config object  
  redis: z.object({
    url: z.string(),
    password: z.string().optional()
  }),

  // Discord config object
  discord: z.object({
    token: z.string(),
    clientId: z.string()
  }),

  // Encryptie config object
  encryption: z.object({
    key: z.string(),
    iv: z.string()
  })
});

/**
 * Type voor volledige gevalideerde configuratie
 */
export type ValidatedConfig = z.infer<typeof configSchema>;

/**
 * Helper functie om environment variabelen te valideren
 */
export async function validateEnv(env: NodeJS.ProcessEnv): Promise<ValidatedEnv> {
  try {
    return await envSchema.parseAsync(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new Error(`Environment validatie errors: ${JSON.stringify(errors)}`);
    }
    throw error;
  }
}

/**
 * Helper functie om een config object te genereren uit gevalideerde env vars
 */
export async function createConfig(env: NodeJS.ProcessEnv): Promise<ValidatedConfig> {
  const validatedEnv = await validateEnv(env);

  return {
    ...validatedEnv,
    database: {
      host: validatedEnv.DB_HOST,
      port: validatedEnv.DB_PORT,
      name: validatedEnv.DB_NAME,
      user: validatedEnv.DB_USER,
      password: validatedEnv.DB_PASSWORD
    },
    redis: {
      url: validatedEnv.REDIS_URL,
      password: validatedEnv.REDIS_PASSWORD
    },
    discord: {
      token: validatedEnv.DISCORD_TOKEN,
      clientId: validatedEnv.DISCORD_CLIENT_ID
    },
    encryption: {
      key: validatedEnv.ENCRYPTION_KEY,
      iv: validatedEnv.ENCRYPTION_IV
    }
  };
}