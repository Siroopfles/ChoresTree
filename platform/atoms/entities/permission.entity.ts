import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('permissions')
export class PermissionEntity extends BaseEntity {
  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ nullable: true })
  description?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  // Cache helper method
  getCacheKey(): string {
    return `permission:${this.slug}`;
  }
}
