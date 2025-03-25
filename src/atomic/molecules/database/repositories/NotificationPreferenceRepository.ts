import { NotificationPreference } from '@/atomic/atoms/database/entities/NotificationPreference';
import { NotificationType } from '@/atomic/atoms/notification/types';
import { AppDataSource } from '@/config/database';
import { Repository } from 'typeorm';

export class NotificationPreferenceRepository {
  private repository: Repository<NotificationPreference>;

  constructor() {
    this.repository = AppDataSource.getRepository(NotificationPreference);
  }

  async createPreference(
    userId: string,
    serverId: string,
    type: NotificationType,
    enabled: boolean = true,
    mentionUser: boolean = true
  ): Promise<NotificationPreference> {
    const preference = this.repository.create({
      userId,
      serverId,
      type,
      enabled,
      mentionUser,
    });
    return this.repository.save(preference);
  }

  async getPreference(
    userId: string,
    serverId: string,
    type: NotificationType
  ): Promise<NotificationPreference | null> {
    return this.repository.findOne({
      where: {
        userId,
        serverId,
        type,
      },
    });
  }

  async updatePreference(
    userId: string,
    serverId: string,
    type: NotificationType,
    updates: Partial<Pick<NotificationPreference, 'enabled' | 'mentionUser'>>
  ): Promise<NotificationPreference | null> {
    await this.repository.update(
      { userId, serverId, type },
      updates
    );

    return this.getPreference(userId, serverId, type);
  }

  async deletePreference(
    userId: string,
    serverId: string,
    type: NotificationType
  ): Promise<void> {
    await this.repository.delete({ userId, serverId, type });
  }

  async getUserPreferences(
    userId: string,
    serverId: string
  ): Promise<NotificationPreference[]> {
    return this.repository.find({
      where: {
        userId,
        serverId,
      },
    });
  }

  async getEnabledUsers(
    serverId: string,
    type: NotificationType
  ): Promise<NotificationPreference[]> {
    return this.repository.find({
      where: {
        serverId,
        type,
        enabled: true,
      },
    });
  }
}