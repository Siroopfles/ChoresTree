import { ChatInputCommandInteraction, PermissionResolvable } from 'discord.js';

export interface CommandMeta {
  name: string;
  description: string;
  permissions?: PermissionResolvable[];
  cooldown?: number; // in seconds
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface Command {
  meta: CommandMeta;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  validate?(interaction: ChatInputCommandInteraction): Promise<ValidationResult>;
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
    super(`Missing required permission: ${permission}`);
    this.name = 'PermissionError';
  }
}

export class RateLimitError extends CommandError {
  constructor(remainingTime: number) {
    super(`Command is on cooldown. Please wait ${remainingTime} seconds.`);
    this.name = 'RateLimitError';
  }
}
