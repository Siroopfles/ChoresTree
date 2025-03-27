import { IBaseEntity } from '@/atomic/atoms/database/interfaces/BaseEntity';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';

export interface StatusHistoryEntry extends IBaseEntity {
  taskId: string;
  serverId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  updatedById: string;
  updatedAt: Date;
}