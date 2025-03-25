import { 
  AutocompleteInteraction,
  ChatInputCommandInteraction, 
  PermissionResolvable, 
  RESTPostAPIApplicationCommandsJSONBody
} from 'discord.js';

/**
 * Base interface for slash command definitions
 */
export interface BaseCommand {
  data: RESTPostAPIApplicationCommandsJSONBody;
  permissions?: PermissionResolvable[];
  enabled: boolean;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

/**
 * Command execution context with metadata
 */
export interface CommandContext {
  guildId: string;
  channelId: string;
  userId: string;
  timestamp: Date;
}

/**
 * Command execution result status
 */
export enum CommandStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_INPUT = 'INVALID_INPUT'
}

/**
 * Command execution result
 */
export interface CommandResult {
  status: CommandStatus;
  context: CommandContext;
  error?: Error;
  executionTimeMs: number;
}

/**
 * Command validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}