import { ChatInputCommandInteraction } from 'discord.js';
import { Command, CommandMeta } from '../../../atoms/discord/types';
import { RegisterCommand } from '../command-registry';

const meta: CommandMeta = {
  name: 'ping',
  description: 'Replies with Pong!',
  cooldown: 5, // 5 seconds cooldown
};

@RegisterCommand(meta)
export class PingCommand implements Command {
  public meta: CommandMeta = meta;

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sent = await interaction.reply({ 
      content: 'Pinging...', 
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply({
      content: `Pong! 🏓\nLatency: ${latency}ms\nAPI Latency: ${apiLatency}ms`,
    });
  }
}