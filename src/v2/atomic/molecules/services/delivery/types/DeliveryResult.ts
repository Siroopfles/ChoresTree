export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  timestamp: Date;
  channel: string;
  recipient: string;
  error?: {
    code: string;
    message: string;
    permanent: boolean;
  };
  metadata?: {
    deliveryProvider: string;
    retryAttempt?: number;
    [key: string]: unknown;
  };
}