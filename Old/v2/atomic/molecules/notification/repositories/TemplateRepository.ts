import { NotificationTemplateEntity } from '../../../atoms/notification/templates/NotificationTemplate.entity';
import { NotificationType } from '../../../atoms/notification/types/enums';
import { DatabaseService } from '@/core/database/DatabaseService';
import { mapToLegacyNotificationType } from '../../../atoms/notification/types/compatibility';

export class TemplateRepository {
  private get repository() {
    return DatabaseService.getInstance().getNotificationTemplateRepository();
  }

  async findTemplate(type: NotificationType, serverId: string): Promise<NotificationTemplateEntity | null> {
    const legacyType = mapToLegacyNotificationType(type);
    const template = await this.repository.getTemplate(legacyType, serverId);
    return template ? { ...template, type } as NotificationTemplateEntity : null;
  }

  async createTemplate(
    type: NotificationType,
    serverId: string,
    template: string
  ): Promise<NotificationTemplateEntity> {
    const legacyType = mapToLegacyNotificationType(type);
    const created = await this.repository.createTemplate(legacyType, serverId, template);
    return { ...created, type } as NotificationTemplateEntity;
  }

  async updateTemplate(
    type: NotificationType,
    serverId: string,
    template: string
  ): Promise<NotificationTemplateEntity | null> {
    const legacyType = mapToLegacyNotificationType(type);
    const updated = await this.repository.updateTemplate(legacyType, serverId, template);
    return updated ? { ...updated, type } as NotificationTemplateEntity : null;
  }

  async deleteTemplate(type: NotificationType, serverId: string): Promise<void> {
    const legacyType = mapToLegacyNotificationType(type);
    await this.repository.deleteTemplate(legacyType, serverId);
  }

  async getAllTemplates(serverId: string): Promise<NotificationTemplateEntity[]> {
    const templates = await this.repository.getAllTemplates(serverId);
    // Map legacy templates to v2 templates
    return templates.map(template => {
      try {
        const type = NotificationType[template.type.toUpperCase() as keyof typeof NotificationType];
        return { ...template, type } as NotificationTemplateEntity;
      } catch {
        // Fallback to TASK_REMINDER for unknown types
        return { ...template, type: NotificationType.TASK_REMINDER } as NotificationTemplateEntity;
      }
    });
  }
}