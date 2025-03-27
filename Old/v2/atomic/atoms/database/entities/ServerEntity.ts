import { Entity, Column, OneToMany, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from '../../../../core/database/base/BaseEntity';
import { TaskEntity } from './TaskEntity';

/**
 * Server entity representing a Discord server using the bot
 * Contains server-specific settings and configuration
 */
@Entity('servers')
export class ServerEntity extends BaseEntity {
  @Column({ name: 'server_id', unique: true })
  serverId: string;

  @Column({ name: 'server_name' })
  serverName: string;

  @Column({ name: 'prefix', default: '!' })
  prefix: string;

  @Column({ name: 'timezone', default: 'UTC' })
  timezone: string;

  @Column({ name: 'language', default: 'en' })
  language: string;

  @Column({ name: 'is_premium', default: false })
  isPremium: boolean;

  @Column({ name: 'max_tasks', default: 100 })
  maxTasks: number;

  @Column({ name: 'notification_channel_id', nullable: true })
  notificationChannelId?: string;

  @Column({ name: 'admin_role_id', nullable: true })
  adminRoleId?: string;

  @OneToMany(() => TaskEntity, task => task.server, {
    cascade: true,
    eager: false
  })
  tasks: TaskEntity[];

  @UpdateDateColumn({ name: 'last_active_at' })
  lastActiveAt: Date;
}