import { NotificationTemplate } from '@/atomic/atoms/database/entities/NotificationTemplate';
import { NotificationType } from '@/atomic/atoms/notification/types';
import { AppDataSource } from '@/config/database';
import { Repository } from 'typeorm';

export class NotificationTemplateRepository {
  private repository: Repository<NotificationTemplate>;

  constructor() {
    this.repository = AppDataSource.getRepository(NotificationTemplate);
  }

  async createTemplate(
    type: NotificationType,
    serverId: string,
    template: string
  ): Promise<NotificationTemplate> {
    const newTemplate = this.repository.create({
      type,
      serverId,
      template,
    });
    return this.repository.save(newTemplate);
  }

  async getTemplate(
    type: NotificationType,
    serverId: string
  ): Promise<NotificationTemplate | null> {
    return this.repository.findOne({
      where: {
        type,
        serverId,
      },
    });
  }

  async updateTemplate(
    type: NotificationType,
    serverId: string,
    template: string
  ): Promise<NotificationTemplate | null> {
    await this.repository.update(
      { type, serverId },
      { template }
    );

    return this.getTemplate(type, serverId);
  }

  async deleteTemplate(
    type: NotificationType,
    serverId: string
  ): Promise<void> {
    await this.repository.delete({ type, serverId });
  }

  async getAllTemplates(serverId: string): Promise<NotificationTemplate[]> {
    return this.repository.find({
      where: { serverId },
    });
  }
}