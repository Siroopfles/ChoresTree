import { z } from 'zod';
import { ConfigValueData, ConfigValueType, ConfigValidationError } from '../types/config';

type ValidationSchemas = {
  [K in ConfigValueType]: z.ZodType<unknown>;
};

/**
 * Validatie schema's voor verschillende config types
 */
const validationSchemas: ValidationSchemas = {
  [ConfigValueType.STRING]: z.string(),
  [ConfigValueType.NUMBER]: z.number(),
  [ConfigValueType.BOOLEAN]: z.boolean(),
  [ConfigValueType.ARRAY]: z.array(z.unknown()),
  [ConfigValueType.OBJECT]: z.record(z.unknown()),
};

/**
 * Valideert een configuratie waarde tegen zijn type
 */
export function validateConfigValue<T>(config: ConfigValueData<T>): void {
  const schema = validationSchemas[config.type];
  if (!schema) {
    throw new ConfigValidationError(`Invalid config type: ${config.type}`);
  }

  const result = schema.safeParse(config.value);
  if (!result.success) {
    throw new ConfigValidationError(
      `Invalid config value for ${config.key}: ${result.error.message}`
    );
  }
}

/**
 * Valideert de configuratie key structuur
 */
export function validateConfigKey(key: string): void {
  // Keys moeten lowercase zijn en mogen alleen letters, nummers, punten en underscores bevatten
  const keyRegex = /^[a-z0-9._]+$/;
  if (!keyRegex.test(key)) {
    throw new ConfigValidationError(
      'Config key must only contain lowercase letters, numbers, dots and underscores'
    );
  }

  // Keys mogen niet langer zijn dan 64 karakters
  if (key.length > 64) {
    throw new ConfigValidationError('Config key must not exceed 64 characters');
  }

  // Keys mogen niet beginnen of eindigen met een punt
  if (key.startsWith('.') || key.endsWith('.')) {
    throw new ConfigValidationError('Config key must not start or end with a dot');
  }
}

/**
 * Valideert server ID formaat
 */
export function validateServerId(serverId: string): void {
  // Discord server IDs zijn 17-19 cijfers lang
  const serverIdRegex = /^\d{17,19}$/;
  if (!serverIdRegex.test(serverId)) {
    throw new ConfigValidationError('Invalid server ID format');
  }
}

/**
 * Helper functie om type-safe default values te maken
 */
export function createDefaultValue<T>(
  type: ConfigValueType,
  value: T
): T {
  const schema = validationSchemas[type];
  if (!schema) {
    throw new ConfigValidationError(`Invalid config type: ${type}`);
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ConfigValidationError(
      `Invalid default value: ${result.error.message}`
    );
  }

  return value;
}