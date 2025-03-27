import { Entity, Column, ManyToOne, JoinColumn, BeforeUpdate, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../core/database/base/BaseEntity';
import { ServerEntity } from './ServerEntity';
import { NotificationEntity } from './NotificationEntity';

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'PENDING': ['IN_PROGRESS', 'CANCELLED'],
  'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
  'COMPLETED': [],
  'CANCELLED': ['PENDING']
};

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
  status: TaskStatus;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate?: Date;

  @Column({ name: 'priority', default: 'MEDIUM' })
  priority: TaskPriority;

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

  @OneToMany(() => NotificationEntity, notification => notification.task)
  notifications: NotificationEntity[];

  @BeforeUpdate()
  validateStatusTransition() {
    if (this.status !== this.__oldStatus && this.__oldStatus) {
      const validTransitions = VALID_STATUS_TRANSITIONS[this.__oldStatus];
      if (!validTransitions.includes(this.status)) {
        throw new Error(`Invalid status transition from ${this.__oldStatus} to ${this.status}`);
      }
    }
    this.__oldStatus = this.status;
  }

  private __oldStatus?: TaskStatus;

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

  /**
   * Set task deadline and create reminder notification
   */
  async setDeadline(date: Date) {
    this.dueDate = date;
    
    if (this.notifications) {
      // Remove existing deadline notifications
      this.notifications = this.notifications.filter(n => n.type !== 'DEADLINE');
    }

    // Create new deadline notification
    const notification = new NotificationEntity();
    notification.task = this;
    notification.type = 'DEADLINE';
    notification.scheduledFor = new Date(date.getTime() - 24 * 60 * 60 * 1000); // 1 day before
    notification.message = `Task "${this.title}" is due in 24 hours`;
    
    if (!this.notifications) {
      this.notifications = [];
    }
    this.notifications.push(notification);
  }

  /**
   * Validates task assignment
   */
  validateAssignment() {
    if (this.assignedUserId && this.assignedRoleId) {
      throw new Error('Task cannot be assigned to both user and role');
    }
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