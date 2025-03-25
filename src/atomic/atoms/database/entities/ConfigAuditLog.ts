import { Entity, Column } from 'typeorm';
import { ServerScopedEntity } from './BaseEntity';

@Entity('config_audit_log')
export class ConfigAuditLog extends ServerScopedEntity {
  @Column()
  key: string;

  @Column('jsonb')
  oldValue: unknown;

  @Column('jsonb')
  newValue: unknown;

  @Column()
  updatedBy: string;

  @Column({
    type: 'enum',
    enum: ['update', 'delete', 'create'],
  })
  action: 'update' | 'delete' | 'create';

  // We gebruiken createdAt van BaseEntity als timestamp
}