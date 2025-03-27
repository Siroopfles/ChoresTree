import { Entity, Column } from 'typeorm';
import { ServerScopedEntity } from './BaseEntity';
import { ConfigValueType, ConfigValueData } from '@/atomic/atoms/config/types/config';

@Entity('config_values')
export class ConfigValue extends ServerScopedEntity implements ConfigValueData {
  @Column()
  key: string;

  @Column('jsonb')
  value: unknown;

  @Column({
    type: 'enum',
    enum: ConfigValueType,
  })
  type: ConfigValueType;

  @Column('jsonb')
  defaultValue: unknown;

  @Column()
  updatedBy: string;

  // Helper methode om naar ConfigValueData te converteren
  public toData<T>(): ConfigValueData<T> {
    return {
      key: this.key,
      value: this.value as T,
      type: this.type,
      defaultValue: this.defaultValue as T,
      serverId: this.serverId,
      updatedBy: this.updatedBy,
    };
  }

  // Helper methode om ConfigValueData naar entity te converteren
  public static fromData<T>(data: ConfigValueData<T>): Partial<ConfigValue> {
    return {
      key: data.key,
      value: data.value,
      type: data.type,
      defaultValue: data.defaultValue,
      serverId: data.serverId,
      updatedBy: data.updatedBy,
    };
  }
}