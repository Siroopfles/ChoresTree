import { EventSubscriber, EntitySubscriberInterface, LoadEvent, InsertEvent, UpdateEvent, ObjectLiteral } from 'typeorm';
import { IEncryptionProvider, IEncryptField } from '../interfaces/encryption.interface';
import { EncryptionUtils } from '../utils/encryption.utils';
import { BaseEntity } from '../entities/base.entity';

type EntityWithEncryption = ObjectLiteral & Partial<BaseEntity>;

/**
 * Type guard om te controleren of een entity BaseEntity properties heeft
 */
function isBaseEntity(entity: unknown): entity is BaseEntity {
  return (
    entity !== null &&
    typeof entity === 'object' &&
    'id' in entity &&
    'createdAt' in entity &&
    'updatedAt' in entity &&
    'version' in entity
  );
}

/**
 * TypeORM subscriber die automatisch velden encrypt/decrypt 
 * gemarkeerd met de @Encrypt decorator.
 */
@EventSubscriber()
export class EncryptionSubscriber implements EntitySubscriberInterface {
  constructor(private readonly encryptionProvider: IEncryptionProvider) {}

  /**
   * Helper om encrypted velden op te halen uit entity metadata
   */
  private getEncryptedFields(target: Function): { 
    field: string;
    options: IEncryptField;
  }[] {
    const fields: string[] = Reflect.getMetadata('typeorm:encrypted_fields', target) || [];
    
    return fields.map(field => ({
      field,
      options: Reflect.getMetadata(`typeorm:encrypted_fields:${field}`, target) || {}
    }));
  }

  /**
   * Encrypt een veld met de juiste key
   */
  private async encryptField(
    value: string | null | undefined,
    options: IEncryptField
  ): Promise<string | null> {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = String(value);
    if (EncryptionUtils.isEncrypted(stringValue)) {
      return stringValue;
    }

    return this.encryptionProvider.encrypt(
      stringValue,
      options.key
    );
  }

  /**
   * Decrypt een veld met de juiste key
   */
  private async decryptField(
    value: string | null | undefined,
    options: IEncryptField
  ): Promise<string | null> {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = String(value);
    if (!EncryptionUtils.isEncrypted(stringValue)) {
      return stringValue;
    }

    return this.encryptionProvider.decrypt(
      stringValue,
      options.key
    );
  }

  /**
   * Encrypt velden bij insert/update
   */
  private async encryptFields(entity: EntityWithEncryption): Promise<void> {
    const encryptedFields = this.getEncryptedFields(entity.constructor);
    
    for (const { field, options } of encryptedFields) {
      const value = entity[field];
      entity[field] = await this.encryptField(value, options);
    }
  }

  /**
   * Decrypt velden bij laden
   */
  private async decryptFields(entity: EntityWithEncryption): Promise<void> {
    const encryptedFields = this.getEncryptedFields(entity.constructor);
    
    for (const { field, options } of encryptedFields) {
      const value = entity[field];
      entity[field] = await this.decryptField(value, options);
    }
  }

  /**
   * Encrypt velden voor insert
   */
  async beforeInsert(event: InsertEvent<EntityWithEncryption>): Promise<void> {
    await this.encryptFields(event.entity);
  }

  /**
   * Encrypt velden voor update
   */
  async beforeUpdate(event: UpdateEvent<EntityWithEncryption>): Promise<void> {
    if (event.entity) {
      await this.encryptFields(event.entity);
    }
  }

  /**
   * Decrypt velden na laden
   */
  async afterLoad(event: LoadEvent<EntityWithEncryption>): Promise<void> {
    // Controleer of entity BaseEntity properties heeft
    if (isBaseEntity(event.entity)) {
      await this.decryptFields(event.entity);
    }
  }
}