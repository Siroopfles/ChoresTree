import { Collection } from 'discord.js';
import { Command, CommandMeta, CommandGroup, CommandNotFoundError, RateLimitError } from '../../atoms/discord/types/command';
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
  private aliases: Collection<string, string>;
  private groups: Collection<string, CommandGroup>;
  private cooldowns: Collection<string, Collection<string, number>>;

  private constructor() {
    this.commands = new Collection();
    this.aliases = new Collection();
    this.groups = new Collection();
    this.cooldowns = new Collection();
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
      throw new Error(`Command ${meta.name} is al geregistreerd`);
    }

    const command = new CommandClass();
    this.commands.set(meta.name, command);

    // Registreer aliassen als die er zijn
    if (meta.aliases) {
      meta.aliases.forEach(alias => {
        if (this.aliases.has(alias)) {
          throw new Error(`Alias '${alias}' is al in gebruik`);
        }
        this.aliases.set(alias, meta.name);
      });
    }

    // Voeg toe aan group als die is gespecificeerd
    if (meta.group) {
      const group = this.groups.get(meta.group) || {
        name: meta.group,
        description: `Commands in de ${meta.group} categorie`,
        commands: []
      };
      group.commands.push(command);
      this.groups.set(meta.group, group);
    }

    // Emit event when new command is registered
    eventBus.emit('commandRegistry.commandRegistered', {
      name: meta.name,
      meta,
    });
  }

  public getCommand(nameOrAlias: string): Command {
    // Check directe command naam
    const command = this.commands.get(nameOrAlias);
    if (command) return command;

    // Check aliassen
    const commandName = this.aliases.get(nameOrAlias);
    if (commandName) {
      const aliasedCommand = this.commands.get(commandName);
      if (aliasedCommand) return aliasedCommand;
    }

    throw new CommandNotFoundError(nameOrAlias);
  }

  public getAllCommands(): Collection<string, Command> {
    return this.commands;
  }

  public getGroups(): Collection<string, CommandGroup> {
    return this.groups;
  }

  /**
   * Check en update cooldown voor een command
   */
  public checkCooldown(userId: string, command: Command): void {
    if (!command.meta.cooldown) return;

    const now = Date.now();
    const cooldownAmount = command.meta.cooldown * 1000;

    const userCooldowns = this.cooldowns.get(command.meta.name) || new Collection();
    const expirationTime = userCooldowns.get(userId);

    if (expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      if (timeLeft > 0) {
        throw new RateLimitError(Math.ceil(timeLeft));
      }
    }

    userCooldowns.set(userId, now + cooldownAmount);
    this.cooldowns.set(command.meta.name, userCooldowns);
  }

  /**
   * Helper voor het genereren van help documentatie
   */
  public generateHelp(command?: string): string {
    if (command) {
      const cmd = this.getCommand(command);
      if (!cmd.meta.help) {
        return `Geen help documentatie beschikbaar voor ${command}`;
      }

      const { description, usage, subcommands } = cmd.meta.help;
      let helpText = `__**${cmd.meta.name}**__\n${description}\n\n`;
      
      if (usage.length > 0) {
        helpText += '**Voorbeelden:**\n';
        usage.forEach(u => {
          helpText += `• ${u.example} - ${u.description}\n`;
        });
      }

      if (subcommands) {
        helpText += '\n**Subcommands:**\n';
        Object.entries(subcommands).forEach(([name, sub]) => {
          helpText += `• ${name} - ${sub.description}\n`;
        });
      }

      return helpText;
    }

    // Algemeen help overzicht per categorie
    let helpText = '**Command Overzicht**\n\n';
    this.groups.forEach((group, name) => {
      helpText += `__${name}__\n`;
      group.commands.forEach(cmd => {
        helpText += `• ${cmd.meta.name} - ${cmd.meta.description}\n`;
      });
      helpText += '\n';
    });

    return helpText;
  }
}

// Export singleton instance
export const commandRegistry = CommandRegistry.getInstance();
