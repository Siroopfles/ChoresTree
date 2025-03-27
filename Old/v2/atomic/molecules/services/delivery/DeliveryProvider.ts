import { NotificationChannel } from '../../repositories/notification/NotificationRepository';
import { DeliveryResult } from './types/DeliveryResult';

export interface DeliveryOptions {
  channel: NotificationChannel;
  recipient: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface voor het verzenden van notificaties via verschillende kanalen
 */
export interface DeliveryProvider {
  /**
   * Verzend een notificatie via het gespecificeerde kanaal
   * @param options Opties voor de levering
   * @returns Resultaat van de verzending
   */
  send(options: DeliveryOptions): Promise<DeliveryResult>;
}

export interface RetryableError extends Error {
  permanent: boolean;
  code?: string;
}

export class DeliveryError extends Error implements RetryableError {
  constructor(
    message: string,
    public permanent: boolean,
    public code?: string
  ) {
    super(message);
    this.name = 'DeliveryError';
  }
}