import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../core/database/base/BaseEntity';
import { ServerEntity } from './ServerEntity';

/**
 * Task entity representing a task within a server
 * Contains encrypted description for sensitive data protection 
 */
@Entity('tasks')
export class TaskEntity extends BaseEntity {
  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'description', type: 'text', transformer: {
    to: (value: string) => encrypt(value),
    from: (value: string) => decrypt(value)
  }})
  description: string;

  @Column({ name: 'status', default: 'PENDING' })
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate?: Date;

  @Column({ name: 'priority', default: 'MEDIUM' })
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @Column({ name: 'assigned_user_id', nullable: true })
  assignedUserId?: string;

  @Column({ name: 'assigned_role_id', nullable: true })
  assignedRoleId?: string;

  @Column({ name: 'channel_id' })
  channelId: string;

  @Column({ name: 'created_by_user_id' })
  createdByUserId: string;

  // Relatie met Server
  @ManyToOne(() => ServerEntity, { nullable: false })
  @JoinColumn({ name: 'server_id' })
  server: ServerEntity;

  @Column({ name: 'server_id' })
  serverId: string;

  // Helper methods
  /**
   * Check if task is overdue
   */
  isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate;
  }

  /**
   * Get time remaining until due date
   */
  getTimeRemaining(): number | null {
    if (!this.dueDate) return null;
    return this.dueDate.getTime() - Date.now();
  }

  /**
   * Check if task can be modified by user
   */
  canBeModifiedBy(userId: string, userRoles: string[]): boolean {
    if (this.createdByUserId === userId) return true;
    if (this.assignedUserId === userId) return true;
    if (this.assignedRoleId && userRoles.includes(this.assignedRoleId)) return true;
    return false;
  }
}

// Placeholder voor encryptie functies - moet geïmplementeerd worden met echte encryptie
function encrypt(value: string): string {
  // TODO: Implementeer echte encryptie
  return value;
}

function decrypt(value: string): string {
  // TODO: Implementeer echte decryptie
  return value;
}