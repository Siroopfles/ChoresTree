import 'reflect-metadata';
import { Entity, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, Column, Index } from 'typeorm';
import { IBaseEntity, IServerScoped } from '../interfaces/BaseEntity';

@Entity()
@Index('idx_server_shard', ['serverShardKey'])

export abstract class BaseEntity implements IBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}

export abstract class ServerScopedEntity extends BaseEntity implements IServerScoped {
  @Column()
  serverId: string;

  // Index op serverId voor sharding en snelle queries per server
  @Column({
    type: 'int',
    name: 'server_shard_key',
    generatedType: 'STORED',
    asExpression: `hash_number(server_id)`,
  })
  serverShardKey: number;
}
