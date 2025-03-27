import { ServerConfigSettings } from './ServerConfigDto';

export interface ConfigUpdateDto {
  id?: string;
  serverId: string;
  settings: Partial<ServerConfigSettings>;
}