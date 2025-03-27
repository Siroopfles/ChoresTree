import { ClientEvents, Guild, GuildMember } from 'discord.js';
import { EventResult, EventStatus, EventMetadata } from '../types/events';

type BaseDiscordObject = {
  channelId?: string | null;
  guildId?: string | null;
  userId?: string | null;
};

/**
 * Creates event metadata from Discord event arguments
 */
export function createEventMetadata<K extends keyof ClientEvents>(
  eventName: K,
  args: ClientEvents[K]
): EventMetadata {
  const metadata: EventMetadata = {
    timestamp: new Date()
  };

  // Extract common metadata from different event types
  for (const arg of args) {
    if (arg === null || arg === undefined) continue;

    // Handle Guild instances
    if (arg instanceof Guild) {
      metadata.guildId = arg.id;
      continue;
    }

    // Handle GuildMember instances
    if (arg instanceof GuildMember) {
      metadata.guildId = arg.guild.id;
      metadata.userId = arg.id;
      continue;
    }

    // Handle objects with common Discord properties
    if (typeof arg === 'object') {
      const discordObj = arg as BaseDiscordObject;
      
      if (discordObj.channelId) {
        metadata.channelId = discordObj.channelId;
      }
      
      if (discordObj.guildId) {
        metadata.guildId = discordObj.guildId;
      }
      
      if (discordObj.userId) {
        metadata.userId = discordObj.userId;
      }
    }
  }

  return metadata;
}

/**
 * Validates if an event should be processed based on conditions
 */
export function validateEventProcessing<K extends keyof ClientEvents>(
  eventName: K,
  args: ClientEvents[K]
): EventResult {
  const metadata = createEventMetadata(eventName, args);

  // Ignore DM events for now
  if (!metadata.guildId) {
    return {
      status: EventStatus.IGNORED,
      metadata,
      error: new Error('Event outside guild context')
    };
  }

  // Check if event has required metadata
  if (eventName.startsWith('guild') && !metadata.guildId) {
    return {
      status: EventStatus.FAILURE,
      metadata,
      error: new Error('Missing guild context for guild event')
    };
  }

  return {
    status: EventStatus.SUCCESS,
    metadata
  };
}

/**
 * Creates a standardized error result for event processing
 */
export function createEventError(
  error: Error,
  metadata: EventMetadata
): EventResult {
  return {
    status: EventStatus.FAILURE,
    metadata,
    error
  };
}