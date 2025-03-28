import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Encrypt } from '../decorators/encrypt.decorator';

/**
 * Status opties voor een taak
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

/**
 * Task entity met encryptie ondersteuning voor gevoelige velden
 */
@Entity('tasks')
export class TaskEntity extends BaseEntity {
  /**
   * De titel van de taak (encrypted)
   */
  @Encrypt()
  @Column()
  title!: string;

  /**
   * De beschrijving van de taak (encrypted)
   */
  @Encrypt()
  @Column({ nullable: true })
  description?: string;

  /**
   * De status van de taak
   */
  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO
  })
  status!: TaskStatus;

  /**
   * De deadline van de taak
   */
  @Column({ nullable: true })
  dueDate?: Date;

  /**
   * De prioriteit van de taak (1-5)
   */
  @Column({ default: 3 })
  priority!: number;

  /**
   * ID van de gebruiker aan wie de taak is toegewezen
   */
  @Column({ nullable: true })
  assigneeId?: string;
}

/**
 * Type voor het aanmaken van een nieuwe taak
 */
export type CreateTaskData = Omit<
  TaskEntity,
  keyof BaseEntity
>;