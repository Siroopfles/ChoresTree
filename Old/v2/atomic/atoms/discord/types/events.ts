import { ClientEvents } from 'discord.js';

/**
 * Base interface for Discord event handlers with improved type safety
 */
export interface BaseDiscordEvent<K extends keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(...args: ClientEvents[K]): Promise<void>;
}

/**
 * Event metadata for logging and monitoring
 */
export interface EventMetadata {
  timestamp: Date;
  guildId?: string;
  channelId?: string;
  userId?: string;
}

/**
 * Event result status
 */
export enum EventStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  IGNORED = 'IGNORED'
}

/**
 * Event execution result
 */
export interface EventResult {
  status: EventStatus;
  metadata: EventMetadata;
  error?: Error;
}

/**
 * Type-safe Discord event map
 */
export type DiscordEventMap = {
  [K in keyof ClientEvents]: BaseDiscordEvent<K>;
};