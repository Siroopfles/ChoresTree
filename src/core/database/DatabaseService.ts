import { AppDataSource, initializeDatabase } from '@/config/database';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { ServerSettingsRepository } from '@/atomic/molecules/database/repositories/ServerSettingsRepository';

export class DatabaseService {
  private static instance: DatabaseService;
  private taskRepository: TaskRepository;
  private serverSettingsRepository: ServerSettingsRepository;
  private isInitialized = false;

  private constructor() {
    this.taskRepository = new TaskRepository();
    this.serverSettingsRepository = new ServerSettingsRepository();
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

  public getServerSettingsRepository(): ServerSettingsRepository {
    this.ensureInitialized();
    return this.serverSettingsRepository;
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
