import { ChatInputCommandInteraction, PermissionResolvable } from 'discord.js';
import { Command, PermissionError } from '../../atoms/discord/types';
import { eventBus } from '../../../core/eventBus';

export class PermissionChecker {
  public async checkPermissions(
    interaction: ChatInputCommandInteraction,
    command: Command,
  ): Promise<void> {
    const { member, guild } = interaction;
    const { permissions = [] } = command.meta;

    // Skip permission check for DMs
    if (!guild || !member) {
      return;
    }

    // Check each required permission
    for (const permission of permissions) {
      if (!this.hasPermission(member, permission)) {
        // Emit permission denied event
        eventBus.emit('permissions.denied', {
          userId: member.user.id,
          commandName: command.meta.name,
          permission,
        });

        throw new PermissionError(String(permission));
      }
    }

    // Emit permission granted event
    eventBus.emit('permissions.granted', {
      userId: member.user.id,
      commandName: command.meta.name,
      permissions,
    });
  }

  private hasPermission(
    member: any,
    permission: PermissionResolvable,
  ): boolean {
    // Handle array of permissions
    if (Array.isArray(permission)) {
      return permission.every((p) => this.hasPermission(member, p));
    }

    // Check if member has permission
    return member.permissions.has(permission);
  }
}

// Export singleton instance
export const permissionChecker = new PermissionChecker();