import { z } from 'zod';

/**
 * Permissie niveaus voor configuratie toegang
 */
export enum ConfigPermissionLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3,
}

/**
 * Types van configuratie waarden
 */
export enum ConfigValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
}

/**
 * Interface die overeenkomt met de database entity
 */
export interface ConfigValueData<T = unknown> {
  key: string;
  value: T;
  type: ConfigValueType;
  defaultValue: T;
  serverId: string;
  updatedBy: string;
}

/**
 * Server specifieke configuratie
 */
export interface ServerConfig {
  serverId: string;
  values: Map<string, ConfigValueData>;
  permissionOverrides: Map<string, ConfigPermissionLevel>;
}

/**
 * Configuratie update event data
 */
export interface ConfigUpdateEventData {
  serverId: string;
  key: string;
  oldValue: ConfigValueData | null;
  newValue: ConfigValueData;
  updatedBy: string;
}

/**
 * Audit log entry voor configuratie wijzigingen
 */
export interface ConfigAuditLogEntry {
  serverId: string;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  updatedBy: string;
  timestamp: Date;
  action: 'update' | 'delete' | 'create';
}

// Zod schema's voor validatie
export const configValueDataSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  type: z.nativeEnum(ConfigValueType),
  defaultValue: z.unknown(),
  serverId: z.string(),
  updatedBy: z.string(),
});

export const serverConfigSchema = z.object({
  serverId: z.string(),
  values: z.map(z.string(), configValueDataSchema),
  permissionOverrides: z.map(z.string(), z.nativeEnum(ConfigPermissionLevel)),
});

// Type guards
export function isConfigValueData(value: unknown): value is ConfigValueData {
  return configValueDataSchema.safeParse(value).success;
}

export function isServerConfig(config: unknown): config is ServerConfig {
  return serverConfigSchema.safeParse(config).success;
}

// Event types
export const CONFIG_EVENTS = {
  CONFIG_UPDATED: 'config:updated',
  CONFIG_DELETED: 'config:deleted',
  CONFIG_CREATED: 'config:created',
  CACHE_INVALIDATED: 'config:cache:invalidated',
} as const;

// Error types
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export class ConfigPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigPermissionError';
  }
}

export class ConfigNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigNotFoundError';
  }
}