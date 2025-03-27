import { NotificationTemplate } from '@/atomic/atoms/database/entities/NotificationTemplate';
import { NotificationType } from '@/atomic/atoms/notification/types';
import { DatabaseService } from '@/core/database/DatabaseService';

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class TemplateService {
  private static instance: TemplateService;

  private constructor() {}

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  async setTemplate(
    type: NotificationType,
    serverId: string,
    template: string
  ): Promise<NotificationTemplate> {
    try {
      const repository = DatabaseService.getInstance().getNotificationTemplateRepository();
      const existing = await repository.getTemplate(type, serverId);

      if (existing) {
        const updated = await repository.updateTemplate(type, serverId, template);
        if (!updated) {
          throw new TemplateError('Failed to update template');
        }
        return updated;
      }

      return repository.createTemplate(type, serverId, template);
    } catch (error) {
      throw new TemplateError(
        `Failed to set template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getTemplate(
    type: NotificationType,
    serverId: string,
    defaultTemplate?: string
  ): Promise<string> {
    try {
      const repository = DatabaseService.getInstance().getNotificationTemplateRepository();
      const template = await repository.getTemplate(type, serverId);

      if (!template) {
        if (defaultTemplate) {
          return defaultTemplate;
        }
        return this.getDefaultTemplate(type);
      }

      return template.template;
    } catch (error) {
      throw new TemplateError(
        `Failed to get template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteTemplate(
    type: NotificationType,
    serverId: string
  ): Promise<void> {
    try {
      const repository = DatabaseService.getInstance().getNotificationTemplateRepository();
      await repository.deleteTemplate(type, serverId);
    } catch (error) {
      throw new TemplateError(
        `Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private getDefaultTemplate(type: NotificationType): string {
    switch (type) {
      case NotificationType.REMINDER:
        return '🔔 Reminder voor taak "{task.title}"\n\nDeadline: {task.deadline}\nStatus: {task.status}';
      
      case NotificationType.TASK_CREATED:
        return '📝 Nieuwe taak aangemaakt: "{task.title}"\n\nBeschrijving: {task.description}\nToegewezen aan: {task.assignee}';
      
      case NotificationType.TASK_UPDATED:
        return '✏️ Taak bijgewerkt: "{task.title}"\n\nAangepaste velden: {changes}';
      
      case NotificationType.TASK_COMPLETED:
        return '✅ Taak voltooid: "{task.title}"\n\nVoltooid door: {completedBy}';
      
      case NotificationType.TASK_OVERDUE:
        return '⚠️ Taak over tijd: "{task.title}"\n\nDeadline was: {task.deadline}';
      
      default:
        throw new TemplateError(`No default template for type: ${type}`);
    }
  }
}