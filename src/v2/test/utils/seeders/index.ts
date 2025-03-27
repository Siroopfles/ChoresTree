import { DataSource } from 'typeorm';
import { ServerEntity } from '../../../atomic/atoms/database/entities/ServerEntity';
import { TaskEntity } from '../../../atomic/atoms/database/entities/TaskEntity';
import { NotificationEntity } from '../../../atomic/atoms/database/entities/NotificationEntity';
import { ConfigScope } from '../../../atomic/atoms/config/types';
import {
  ServerConfigEntity,
  ConfigPermissionEntity,
  ConfigAuditLogEntity
} from '../../../atomic/atoms/config/entities/ConfigEntity';

/**
 * Test data seeder utility
 */
export class TestSeeder {
  constructor(private dataSource: DataSource) {}

  /**
   * Seed basic test server
   */
  async seedServer(overrides: Partial<ServerEntity> = {}): Promise<ServerEntity> {
    const server = new ServerEntity();
    server.serverId = overrides.serverId || '123456789';
    server.serverName = overrides.serverName || 'Test Server';
    server.timezone = overrides.timezone || 'Europe/Amsterdam';
    server.language = overrides.language || 'nl';
    server.prefix = overrides.prefix || '!';
    server.isPremium = overrides.isPremium || false;
    server.maxTasks = overrides.maxTasks || 100;

    return this.dataSource.manager.save(ServerEntity, server);
  }

  /**
   * Seed test task
   */
  async seedTask(server: ServerEntity, overrides: Partial<TaskEntity> = {}): Promise<TaskEntity> {
    const task = new TaskEntity();
    task.title = overrides.title || 'Test Task';
    task.description = overrides.description || 'Test Description';
    task.serverId = server.id;
    task.channelId = overrides.channelId || '123456';
    task.createdByUserId = overrides.createdByUserId || 'user123';
    task.priority = overrides.priority || 'MEDIUM';
    task.status = overrides.status || 'PENDING';
    
    if (overrides.assignedUserId) {
      task.assignedUserId = overrides.assignedUserId;
    }

    if (overrides.dueDate) {
      task.dueDate = overrides.dueDate;
    }

    return this.dataSource.manager.save(TaskEntity, task);
  }

  /**
   * Clean all test data
   */
  /**
   * Seed test server config
   */
  async seedServerConfig(overrides: Partial<ServerConfigEntity> = {}): Promise<ServerConfigEntity> {
    const config = new ServerConfigEntity();
    config.serverId = overrides.serverId || '123456789';
    config.version = overrides.version || '2.0.0';
    config.settings = overrides.settings || {
      prefix: '!',
      language: 'nl',
      timezone: 'Europe/Amsterdam',
      notifications: {
        enabled: true
      }
    };
    config.customization = overrides.customization || {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        error: '#dc3545'
      },
      emojis: {}
    };

    return this.dataSource.manager.save(ServerConfigEntity, config);
  }

  /**
   * Seed test config permission
   */
  async seedConfigPermission(overrides: Partial<ConfigPermissionEntity> = {}): Promise<ConfigPermissionEntity> {
    const permission = new ConfigPermissionEntity();
    permission.serverId = overrides.serverId || '123456789';
    permission.roleId = overrides.roleId || 'role123';
    permission.allowedScopes = overrides.allowedScopes || [ConfigScope.SERVER, ConfigScope.CHANNEL];
    permission.allowedOperations = overrides.allowedOperations || ['read', 'write'];

    return this.dataSource.manager.save(ConfigPermissionEntity, permission);
  }

  /**
   * Seed test config audit log
   */
  async seedConfigAuditLog(overrides: Partial<ConfigAuditLogEntity> = {}): Promise<ConfigAuditLogEntity> {
    const auditLog = new ConfigAuditLogEntity();
    auditLog.serverId = overrides.serverId || '123456789';
    auditLog.userId = overrides.userId || 'user123';
    auditLog.action = overrides.action || 'update';
    auditLog.scope = overrides.scope || ConfigScope.SERVER;
    auditLog.oldValue = overrides.oldValue;
    auditLog.newValue = overrides.newValue || { setting: 'new-value' };

    return this.dataSource.manager.save(ConfigAuditLogEntity, auditLog);
  }

  /**
   * Seed test notification
   */
  async seedNotification(overrides: Partial<NotificationEntity> = {}): Promise<NotificationEntity> {
    // Create task if not provided
    let task = overrides.task;
    if (!task) {
      const server = await this.seedServer();
      task = await this.seedTask(server);
    }

    const notification = new NotificationEntity();
    notification.type = overrides.type || 'REMINDER';
    notification.status = overrides.status || 'PENDING';
    notification.scheduledFor = overrides.scheduledFor || new Date(Date.now() + 3600000); // 1 hour in future
    notification.channelId = overrides.channelId || '123456';
    notification.taskId = task.id;
    notification.task = task;
    
    // Optional fields
    if (overrides.targetUserId) notification.targetUserId = overrides.targetUserId;
    if (overrides.targetRoleId) notification.targetRoleId = overrides.targetRoleId;
    
    notification.isRecurring = overrides.isRecurring || false;
    if (overrides.recurrencePattern) notification.recurrencePattern = overrides.recurrencePattern;
    if (overrides.recurrenceEndDate) notification.recurrenceEndDate = overrides.recurrenceEndDate;
    if (overrides.customMessage) notification.customMessage = overrides.customMessage;
    
    notification.retryCount = overrides.retryCount || 0;
    if (overrides.lastError) notification.lastError = overrides.lastError;

    return this.dataSource.manager.save(NotificationEntity, notification);
  }

  async cleanup(): Promise<void> {
    await this.dataSource.manager.delete(ConfigAuditLogEntity, {});
    await this.dataSource.manager.delete(ConfigPermissionEntity, {});
    await this.dataSource.manager.delete(ServerConfigEntity, {});
    await this.dataSource.manager.delete(NotificationEntity, {});
    await this.dataSource.manager.delete(TaskEntity, {});
    await this.dataSource.manager.delete(ServerEntity, {});
  }
}