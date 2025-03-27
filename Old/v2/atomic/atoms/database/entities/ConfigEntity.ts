import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../core/database/base/BaseEntity';
import { ServerEntity } from './ServerEntity';

/**
 * Config entity representing server-specific configuration settings
 * Supports encrypted values for sensitive configuration data
 */
@Entity('configs')
export class ConfigEntity extends BaseEntity {
  @Column({ name: 'key' })
  key: string;

  @Column({ name: 'value', type: 'text', transformer: {
    to: (value: string) => encrypt(value),
    from: (value: string) => decrypt(value)
  }})
  value: string;

  @Column({ name: 'type' })
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'SECRET';

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ name: 'is_encrypted', default: false })
  isEncrypted: boolean;

  @Column({ name: 'validation_regex', nullable: true })
  validationRegex?: string;

  // Default waarde als JSON string
  @Column({ name: 'default_value', nullable: true })
  defaultValue?: string;

  // Relatie met Server
  @ManyToOne(() => ServerEntity, { nullable: false })
  @JoinColumn({ name: 'server_id' })
  server: ServerEntity;

  @Column({ name: 'server_id' })
  serverId: string;

  // Helper methods
  /**
   * Get typed configuration value
   */
  getTypedValue<T>(): T {
    switch (this.type) {
      case 'NUMBER':
        return Number(this.value) as T;
      case 'BOOLEAN':
        return (this.value.toLowerCase() === 'true') as T;
      case 'JSON':
        return JSON.parse(this.value) as T;
      default:
        return this.value as T;
    }
  }

  /**
   * Validate configuration value
   */
  isValid(): boolean {
    if (!this.value) return false;
    
    // Type-specific validation
    switch (this.type) {
      case 'NUMBER':
        return !isNaN(Number(this.value));
      case 'BOOLEAN':
        return ['true', 'false'].includes(this.value.toLowerCase());
      case 'JSON':
        try {
          JSON.parse(this.value);
          return true;
        } catch {
          return false;
        }
    }

    // Regex validation if specified
    if (this.validationRegex) {
      const regex = new RegExp(this.validationRegex);
      return regex.test(this.value);
    }

    return true;
  }

  /**
   * Reset to default value if available
   */
  resetToDefault(): boolean {
    if (!this.defaultValue) return false;
    this.value = this.defaultValue;
    return true;
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