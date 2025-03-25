export enum ConfigScope {
  GLOBAL = 'global',
  SERVER = 'server',
  CHANNEL = 'channel',
  ROLE = 'role',
  USER = 'user'
}

export interface ConfigValue {
  value: string | number | boolean | object;
  scope: ConfigScope;
  lastUpdated: Date;
  updatedBy: string;
}

export interface ServerConfig {
  serverId: string;
  version: string;
  settings: {
    prefix: string;
    language: string;
    timezone: string;
    notifications: {
      enabled: boolean;
      channel?: string;
    };
  };
  customization: {
    colors: {
      primary: string;
      secondary: string;
      error: string;
    };
    emojis: Record<string, string>;
  };
}

export interface ConfigPermission {
  roleId: string;
  serverId: string;
  allowedScopes: ConfigScope[];
  allowedOperations: ('read' | 'write' | 'delete')[];
}

export interface ConfigAuditLog {
  id: string;
  serverId: string;
  userId: string;
  action: 'create' | 'update' | 'delete';
  scope: ConfigScope;
  oldValue?: ConfigValue;
  newValue: ConfigValue;
  timestamp: Date;
}

export interface ConfigValidationError {
  field: string;
  message: string;
  scope: ConfigScope;
  value?: unknown;
}

export type ConfigValidationResult = {
  isValid: boolean;
  errors?: ConfigValidationError[];
};

export interface IConfigValidator {
  validate(config: Partial<ServerConfig>): ConfigValidationResult;
  validateScope(scope: ConfigScope, value: unknown): ConfigValidationResult;
}

export interface IConfigRepository {
  getServerConfig(serverId: string): Promise<ServerConfig>;
  updateServerConfig(serverId: string, config: Partial<ServerConfig>): Promise<void>;
  getPermissions(serverId: string, roleId: string): Promise<ConfigPermission>;
  setPermissions(permission: ConfigPermission): Promise<void>;
  logAuditEvent(event: Omit<ConfigAuditLog, 'id' | 'timestamp'>): Promise<void>;
}