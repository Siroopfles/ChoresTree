import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ConfigScope, ServerConfig } from '../types';

@Entity('server_configs')
export class ServerConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  serverId!: string;

  @Column({ default: '2.0.0' })
  version!: string;

  @Column('jsonb')
  settings!: ServerConfig['settings'];

  @Column('jsonb')
  customization!: ServerConfig['customization'];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('config_permissions')
export class ConfigPermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  serverId!: string;

  @Column()
  roleId!: string;

  @Column('simple-array')
  allowedScopes!: ConfigScope[];

  @Column('simple-array')
  allowedOperations!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('config_audit_logs')
export class ConfigAuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  serverId!: string;

  @Column()
  userId!: string;

  @Column()
  action!: string;

  @Column()
  scope!: ConfigScope;

  @Column('jsonb', { nullable: true })
  oldValue?: Record<string, unknown>;

  @Column('jsonb')
  newValue!: Record<string, unknown>;

  @CreateDateColumn()
  timestamp!: Date;
}