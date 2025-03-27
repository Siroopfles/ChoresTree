import { Injectable } from '@nestjs/common';
import { NotificationRepository, Notification } from '../../repositories/notification/NotificationRepository';
import { TemplateEngine } from '../template/TemplateEngine';
import { DeliveryProvider, DeliveryError } from '../delivery/DeliveryProvider';
import { NotificationStatus } from './types/NotificationStatus';
import { NotificationData } from './types/NotificationData';

@Injectable()
export class NotificationDispatcher {
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAYS = [
    5 * 60 * 1000,    // 5 minuten
    15 * 60 * 1000,   // 15 minuten
    30 * 60 * 1000,   // 30 minuten
    60 * 60 * 1000,   // 1 uur
    120 * 60 * 1000   // 2 uur
  ];

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly templateEngine: TemplateEngine,
    private readonly deliveryProvider: DeliveryProvider
  ) {}

  public async processScheduledNotifications(): Promise<void> {
    const notifications = await this.notificationRepository.findPendingNotifications();
    
    for (const notification of notifications) {
      if (this.shouldProcessNotification(notification)) {
        await this.processNotification(notification);
      }
    }
  }

  public async processNotification(notification: Notification): Promise<void> {
    try {
      // Convert notification data to Record<string, unknown>
      const templateData = this.convertToTemplateData(notification.data);

      // Render template
      const content = await this.templateEngine.render(
        notification.template,
        templateData
      );

      // Attempt delivery
      const result = await this.deliveryProvider.send({
        channel: notification.channel,
        recipient: notification.recipient,
        content,
        metadata: {
          notificationId: notification.id,
          retryAttempt: notification.retryCount || 0
        }
      });

      if (result.success) {
        await this.notificationRepository.markAsDelivered(notification.id, result);
      }
    } catch (error) {
      await this.handleDeliveryError(notification, error);
    }
  }

  private convertToTemplateData(data: NotificationData): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    // Extract all properties from the notification data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        result[key] = value;
      }
    });

    return result;
  }

  private shouldProcessNotification(notification: Notification): boolean {
    // Check scheduling
    if (notification.scheduledFor > new Date()) {
      return false;
    }

    // Voor gefaalde notificaties, check retry timing
    if (notification.status === NotificationStatus.FAILED) {
      const retryCount = notification.retryCount || 0;
      if (retryCount >= this.MAX_RETRIES) {
        return false;
      }

      if (notification.lastAttempt) {
        const delay = this.RETRY_DELAYS[retryCount];
        const nextAttemptDue = new Date(notification.lastAttempt.getTime() + delay);
        if (nextAttemptDue > new Date()) {
          return false;
        }
      }
    }

    return true;
  }

  private async handleDeliveryError(notification: Notification, error: unknown): Promise<void> {
    // Check voor permanente delivery failures
    if (error instanceof DeliveryError && error.permanent) {
      await this.notificationRepository.updateStatus(
        notification.id,
        NotificationStatus.PERMANENTLY_FAILED,
        error.message
      );
      return;
    }

    // Check voor template rendering errors
    if (error instanceof Error && error.message.includes('Template')) {
      await this.notificationRepository.updateStatus(
        notification.id,
        NotificationStatus.ERROR,
        'Template rendering failed'
      );
      return;
    }

    // Handle retry logic voor tijdelijke failures
    const retryCount = notification.retryCount || 0;
    if (retryCount >= this.MAX_RETRIES) {
      await this.notificationRepository.updateStatus(
        notification.id,
        NotificationStatus.PERMANENTLY_FAILED,
        'Max retry attempts reached'
      );
      return;
    }

    // Increment retry counter en markeer als failed
    await this.notificationRepository.incrementRetryCount(notification.id);
    await this.notificationRepository.updateStatus(
      notification.id,
      NotificationStatus.FAILED,
      'Temporary delivery failure - will retry'
    );
  }
}