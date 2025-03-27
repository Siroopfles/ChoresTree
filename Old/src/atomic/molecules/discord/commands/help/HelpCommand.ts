import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, CommandMeta, ValidationResult } from '@/atomic/atoms/discord/types/command';
import { RegisterCommand } from '../../command-registry';
import { commandRegistry } from '../../command-registry';

const meta: CommandMeta = {
  name: 'help',
  description: 'Toon help informatie over beschikbare commands',
  aliases: ['h', '?'],
  group: 'util',
  help: {
    description: 'Bekijk informatie over beschikbare commands en hoe ze te gebruiken',
    category: 'Algemeen',
    usage: [
      {
        example: '/help',
        description: 'Toon een overzicht van alle command categorieën'
      },
      {
        example: '/help [command]',
        description: 'Toon gedetailleerde informatie over een specifiek command'
      }
    ]
  }
};

@RegisterCommand(meta)
export class HelpCommand implements Command {
  public meta: CommandMeta = meta;

  public async validate(): Promise<ValidationResult> {
    return { isValid: true };
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const commandName = interaction.options.getString('command') || undefined;
      const helpText = commandRegistry.generateHelp(commandName);

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(commandName ? `Help: ${commandName}` : 'Command Overzicht')
        .setDescription(helpText)
        .setFooter({ text: 'Tip: Gebruik /help [command] voor meer details over een specifiek command' });

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      await interaction.reply({
        content: `❌ Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        ephemeral: true
      });
    }
  }
}

// Export de command builder voor Discord.js registratie
export const commandBuilder = {
  name: meta.name,
  description: meta.description,
  options: [
    {
      name: 'command',
      description: 'Naam van het command waarover je meer wilt weten',
      type: 3, // STRING type
      required: false
    }
  ]
};