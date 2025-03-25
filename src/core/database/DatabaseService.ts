import { AppDataSource, initializeDatabase } from '@/config/database';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { ServerSettingsRepository } from '@/atomic/molecules/database/repositories/ServerSettingsRepository';
import { ConfigRepository } from '@/atomic/molecules/database/repositories/ConfigRepository';
import { ConfigAuditLogRepository } from '@/atomic/molecules/database/repositories/ConfigAuditLogRepository';
import { NotificationTemplateRepository } from '@/atomic/molecules/database/repositories/NotificationTemplateRepository';
import { ReminderScheduleRepository } from '@/atomic/molecules/database/repositories/ReminderScheduleRepository';
import { NotificationPreferenceRepository } from '@/atomic/molecules/database/repositories/NotificationPreferenceRepository';

export class DatabaseService {
  private static instance: DatabaseService;
  private taskRepository: TaskRepository;
  private serverSettingsRepository: ServerSettingsRepository;
  private configRepository: ConfigRepository;
  private configAuditLogRepository: ConfigAuditLogRepository;
  private notificationTemplateRepository: NotificationTemplateRepository;
  private reminderScheduleRepository: ReminderScheduleRepository;
  private notificationPreferenceRepository: NotificationPreferenceRepository;
  private isInitialized = false;

  private constructor() {
    this.taskRepository = new TaskRepository();
    this.serverSettingsRepository = new ServerSettingsRepository();
    this.configRepository = new ConfigRepository();
    this.configAuditLogRepository = new ConfigAuditLogRepository();
    this.notificationTemplateRepository = new NotificationTemplateRepository();
    this.reminderScheduleRepository = new ReminderScheduleRepository();
    this.notificationPreferenceRepository = new NotificationPreferenceRepository();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await initializeDatabase();
      
      // Voer migraties uit
      await AppDataSource.runMigrations();
      
      this.isInitialized = true;
      console.warn('Database service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  public getTaskRepository(): TaskRepository {
    this.ensureInitialized();
    return this.taskRepository;
  }

  public getNotificationTemplateRepository(): NotificationTemplateRepository {
    this.ensureInitialized();
    return this.notificationTemplateRepository;
  }

  public getReminderScheduleRepository(): ReminderScheduleRepository {
    this.ensureInitialized();
    return this.reminderScheduleRepository;
  }

  public getNotificationPreferenceRepository(): NotificationPreferenceRepository {
    this.ensureInitialized();
    return this.notificationPreferenceRepository;
  }

  public getServerSettingsRepository(): ServerSettingsRepository {
    this.ensureInitialized();
    return this.serverSettingsRepository;
  }

  public getConfigRepository(): ConfigRepository {
    this.ensureInitialized();
    return this.configRepository;
  }

  public getConfigAuditLogRepository(): ConfigAuditLogRepository {
    this.ensureInitialized();
    return this.configAuditLogRepository;
  }

  public async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await AppDataSource.destroy();
      this.isInitialized = false;
      console.warn('Database service cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup database service:', error);
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database service is not initialized. Call initialize() first.');
    }
  }
}
