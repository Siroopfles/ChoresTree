import { ChatInputCommandInteraction, PermissionResolvable } from 'discord.js';

/**
 * Interface voor command voorbeelden en gebruik
 */
export interface CommandUsage {
  example: string;
  description: string;
}

/**
 * Interface voor command help documentatie
 */
export interface CommandHelp {
  description: string;
  usage: CommandUsage[];
  category: string;
  subcommands?: Record<string, {
    description: string;
    usage: CommandUsage[];
  }>;
}

/**
 * Interface voor command metadata
 */
export interface CommandMeta {
  name: string;
  description: string;
  aliases?: string[];
  permissions?: PermissionResolvable[];
  cooldown?: number; // in seconds
  group?: string;
  help?: CommandHelp;
}

/**
 * Interface voor validatie resultaat
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Basis command interface
 */
export interface Command {
  meta: CommandMeta;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  validate?(interaction: ChatInputCommandInteraction): Promise<ValidationResult>;
}

/**
 * Interface voor command groups
 */
export interface CommandGroup {
  name: string;
  description: string;
  commands: Command[];
}

// Error types voor command handling
export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
  }
}

export class PermissionError extends CommandError {
  constructor(permission: string) {
    super(`Je mist de benodigde permissie: ${permission}`);
    this.name = 'PermissionError';
  }
}

export class RateLimitError extends CommandError {
  constructor(remainingTime: number) {
    super(`Command is in cooldown. Wacht nog ${remainingTime} seconden.`);
    this.name = 'RateLimitError';
  }
}

export class CommandNotFoundError extends CommandError {
  constructor(commandName: string) {
    super(`Command niet gevonden: ${commandName}`);
    this.name = 'CommandNotFoundError';
  }
}