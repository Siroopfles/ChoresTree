export interface ServerConfigSettings {
  notifications?: boolean;
  language?: string;
  timezone?: string;
  [key: string]: boolean | string | undefined;
}

export interface ServerConfigDto {
  id: string;
  serverId: string;
  settings: ServerConfigSettings;
  createdAt?: Date;
  updatedAt?: Date;
}