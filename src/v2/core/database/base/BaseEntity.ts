import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

/**
 * Base entity class with common fields for all entities
 * Implements soft delete pattern and automatic timestamps
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  /**
   * Check if entity is considered deleted (soft-delete)
   */
  isDeleted(): boolean {
    return !!this.deletedAt;
  }

  /**
   * Get time elapsed since entity creation
   */
  getAge(): number {
    return Date.now() - this.createdAt.getTime();
  }

  /**
   * Get time elapsed since last update
   */
  getLastUpdateAge(): number {
    return Date.now() - this.updatedAt.getTime();
  }

  /**
   * Convert entity to plain object for serialization
   */
  toJSON(): Record<string, unknown> {
    const plainObject: Record<string, unknown> = {};
    
    Object.entries(this).forEach(([key, value]) => {
      // Skip undefined values and functions
      if (value !== undefined && typeof value !== 'function') {
        plainObject[key] = value;
      }
    });

    return plainObject;
  }
}