import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ReminderFrequency } from '../../notification/types';

@Entity('reminder_schedules')
export class ReminderSchedule extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  taskId: string;

  @Column('uuid')
  serverId: string;

  @Column({
    type: 'enum',
    enum: ReminderFrequency,
  })
  frequency: ReminderFrequency;

  @Column('timestamp')
  nextReminder: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}