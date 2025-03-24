import { DatabaseService } from '@/core/database/DatabaseService';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';
import { AppDataSource } from '@/config/database';

/**
 * Database organism voor complexe database operaties die meerdere repositories combineren
 * of transacties over meerdere tabellen uitvoeren
 */
export class DatabaseOperations {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  /**
   * Batch verwerking van taken met transactie support
   */
  async batchProcessTasks(
    serverId: string,
    updates: Array<{ taskId: string; status: TaskStatus }>
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const taskRepo = this.databaseService.getTaskRepository();
      
      for (const update of updates) {
        await taskRepo.update(update.taskId, { status: update.status });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Server migratie met alle gerelateerde data
   */
  async migrateServer(
    oldServerId: string,
    newServerId: string
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update server settings
      const settingsRepo = this.databaseService.getServerSettingsRepository();
      const settings = await settingsRepo.getServerSettings(oldServerId);
      await settingsRepo.create({
        ...settings,
        id: undefined,
        serverId: newServerId,
      });

      // Migreer taken
      const taskRepo = this.databaseService.getTaskRepository();
      const tasks = await taskRepo.findByServerId(oldServerId);
      
      for (const task of tasks) {
        await taskRepo.create({
          ...task,
          id: undefined,
          serverId: newServerId,
        });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Bulk task deadline updates met notificatie scheduling
   */
  async updateTaskDeadlines(
    serverId: string,
    updates: Array<{ taskId: string; newDeadline: Date }>
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const taskRepo = this.databaseService.getTaskRepository();
      const settingsRepo = this.databaseService.getServerSettingsRepository();
      await settingsRepo.getServerSettings(serverId); // Valideer server bestaat

      for (const update of updates) {
        const task = await taskRepo.findById(update.taskId);
        if (task && task.serverId === serverId) {
          await taskRepo.update(task.id, { 
            deadline: update.newDeadline,
            // Reset status als de taak verlopen was
            status: task.status === TaskStatus.OVERDUE ? TaskStatus.PENDING : task.status,
          });
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Schoonmaak van verlopen taken met archivering
   */
  async cleanupExpiredTasks(
    serverId: string,
    beforeDate: Date
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const taskRepo = this.databaseService.getTaskRepository();
      const tasks = await taskRepo.findCompletedTasksBefore(serverId, beforeDate);

      // Hier zou je de taken kunnen archiveren naar een andere tabel
      // Voor nu verwijderen we ze alleen
      for (const task of tasks) {
        await taskRepo.delete(task.id);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}