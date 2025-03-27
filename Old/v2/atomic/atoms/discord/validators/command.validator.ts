import { ValidationResult } from '../types/commands';
import { ChatInputCommandInteraction } from 'discord.js';

/**
 * Validates a command interaction based on common requirements
 */
export function validateCommandInteraction(
  interaction: ChatInputCommandInteraction
): ValidationResult {
  const errors: string[] = [];

  // Validate guild context
  if (!interaction.guild) {
    errors.push('Command must be executed in a guild');
  }

  // Validate member permissions
  if (!interaction.member) {
    errors.push('Command must be executed by a guild member');
  }

  // Validate channel permissions
  if (!interaction.channel) {
    errors.push('Command must be executed in a valid channel');
  }

  // Check if bot has required permissions in channel
  const botMember = interaction.guild?.members.cache.get(interaction.client.user.id);
  if (!botMember?.permissions.has('SendMessages')) {
    errors.push('Bot lacks required permissions in this channel');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates command options based on type and requirements
 */
export function validateCommandOptions(
  interaction: ChatInputCommandInteraction,
  requiredOptions: string[]
): ValidationResult {
  const errors: string[] = [];

  for (const option of requiredOptions) {
    if (!interaction.options.get(option)) {
      errors.push(`Missing required option: ${option}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}