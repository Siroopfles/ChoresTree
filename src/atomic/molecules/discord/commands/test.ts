import { ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '../../../atoms/discord/types';
import { Validate, RequirePermissions, Cooldown } from '../../../atoms/discord/decorators';
import { RegisterCommand } from '../command-registry';

const meta: CommandMeta = {
  name: 'test',
  description: 'Test command om het command systeem te valideren',
  permissions: [PermissionFlagsBits.ManageMessages],
  cooldown: 10
};

@RegisterCommand(meta)
export class TestCommand implements Command {
  public meta: CommandMeta = meta;

  public async validate(interaction: ChatInputCommandInteraction): Promise<ValidationResult> {
    // Voorbeeld validatie - alleen toestaan in guilds
    if (!interaction.guildId) {
      return {
        isValid: false,
        error: 'Dit command kan alleen in servers gebruikt worden'
      };
    }
    return { isValid: true };
  }

  @RequirePermissions([PermissionFlagsBits.ManageMessages])
  @Cooldown(10)
  @Validate()
  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      content: 'Command systeem werkt! Alle validaties zijn geslaagd.',
      ephemeral: true
    });
  }
}