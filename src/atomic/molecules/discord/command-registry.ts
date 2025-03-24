import { Collection } from 'discord.js';
import { Command, CommandMeta } from '../../atoms/discord/types';
import { eventBus } from '../../../core/eventBus';

type CommandConstructor = new () => Command;

// Command decorator factory
export function RegisterCommand(meta: CommandMeta): ClassDecorator {
  return function (target: Function): void {
    // Register command when class is defined
    CommandRegistry.getInstance().registerCommand(meta, target as CommandConstructor);
  };
}

export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Collection<string, Command>;

  private constructor() {
    this.commands = new Collection();
    
    // Emit event when registry is initialized
    eventBus.emit('commandRegistry.initialized', null);
  }

  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  public registerCommand(meta: CommandMeta, CommandClass: CommandConstructor): void {
    if (this.commands.has(meta.name)) {
      throw new Error(`Command ${meta.name} is already registered`);
    }

    const command = new CommandClass();
    this.commands.set(meta.name, command);

    // Emit event when new command is registered
    eventBus.emit('commandRegistry.commandRegistered', {
      name: meta.name,
      meta,
    });
  }

  public getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  public getAllCommands(): Collection<string, Command> {
    return this.commands;
  }
}

// Export singleton instance
export const commandRegistry = CommandRegistry.getInstance();
