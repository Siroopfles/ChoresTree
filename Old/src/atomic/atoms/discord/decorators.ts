import { ChatInputCommandInteraction, PermissionResolvable } from 'discord.js';
import { Command, PermissionError, RateLimitError } from './types';
import { eventBus } from '../../../core/eventBus';

type MethodDecorator = (
  target: Command,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<(interaction: ChatInputCommandInteraction) => Promise<void>>
) => TypedPropertyDescriptor<(interaction: ChatInputCommandInteraction) => Promise<void>>;

/**
 * Decorator voor command validatie
 */
export function Validate(): MethodDecorator {
  return function (
    target: Command,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(interaction: ChatInputCommandInteraction) => Promise<void>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function(this: Command, interaction: ChatInputCommandInteraction) {
      if (this.validate) {
        const validationResult = await this.validate(interaction);
        if (!validationResult.isValid) {
          await interaction.reply({
            content: validationResult.error || 'Command validatie gefaald',
            ephemeral: true
          });

          await eventBus.emit('command.validation.failed', {
            commandName: this.meta.name,
            error: validationResult.error,
            userId: interaction.user.id,
            guildId: interaction.guildId
          });

          return;
        }
      }

      return originalMethod.apply(this, [interaction]);
    };

    return descriptor;
  };
}

/**
 * Decorator voor permissie checks
 */
export function RequirePermissions(permissions: PermissionResolvable[]): MethodDecorator {
  return function (
    target: Command,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(interaction: ChatInputCommandInteraction) => Promise<void>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function(this: Command, interaction: ChatInputCommandInteraction) {
      for (const permission of permissions) {
        if (!interaction.memberPermissions?.has(permission)) {
          await interaction.reply({
            content: `Je hebt de volgende permissie nodig: ${permission}`,
            ephemeral: true
          });

          await eventBus.emit('command.permission.denied', {
            commandName: this.meta.name,
            permission,
            userId: interaction.user.id,
            guildId: interaction.guildId
          });

          throw new PermissionError(permission.toString());
        }
      }

      return originalMethod.apply(this, [interaction]);
    };

    return descriptor;
  };
}

/**
 * Decorator voor cooldown checks
 */
export function Cooldown(seconds: number): MethodDecorator {
  const cooldowns = new Map<string, Map<string, number>>();

  return function (
    target: Command,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(interaction: ChatInputCommandInteraction) => Promise<void>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function(this: Command, interaction: ChatInputCommandInteraction) {
      const { id: userId } = interaction.user;
      const commandName = this.meta.name;

      if (!cooldowns.has(commandName)) {
        cooldowns.set(commandName, new Map());
      }

      const timestamps = cooldowns.get(commandName)!;
      const cooldownAmount = seconds * 1000;
      const now = Date.now();

      if (timestamps.has(userId)) {
        const expirationTime = timestamps.get(userId)! + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          await interaction.reply({
            content: `Wacht nog ${timeLeft.toFixed(1)} seconden voordat je dit command opnieuw gebruikt.`,
            ephemeral: true
          });

          throw new RateLimitError(Math.ceil(timeLeft));
        }
      }

      timestamps.set(userId, now);
      setTimeout(() => timestamps.delete(userId), cooldownAmount);

      return originalMethod.apply(this, [interaction]);
    };

    return descriptor;
  };
}