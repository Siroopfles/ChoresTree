import { ServerConfigDto } from '../../services/config/dto/ServerConfigDto';
import { ConfigUpdateDto } from '../../services/config/dto/ConfigUpdateDto';

export interface ConfigRepository {
  /**
   * Vindt server configuratie op basis van server ID
   */
  findByServerId(serverId: string): Promise<ServerConfigDto | null>;

  /**
   * Maakt nieuwe server configuratie aan
   */
  create(config: Partial<ServerConfigDto>): Promise<ServerConfigDto>;

  /**
   * Update bestaande server configuratie
   */
  update(config: ServerConfigDto): Promise<ServerConfigDto>;

  /**
   * Verwijdert server configuratie
   */
  delete(serverId: string): Promise<boolean>;

  /**
   * Voert bulk updates uit op meerdere server configuraties
   */
  bulkUpdate(updates: ConfigUpdateDto[]): Promise<ServerConfigDto[]>;
}