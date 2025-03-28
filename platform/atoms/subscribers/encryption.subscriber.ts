import {
  EventSubscriber,
  EntitySubscriberInterface,
  LoadEvent,
  InsertEvent,
  UpdateEvent,
  ObjectLiteral,
} from 'typeorm';
import {
  IEncryptionProvider,
  IEncryptField,
  IEncryptionResult,
} from '../interfaces/encryption.interface';
import { EncryptionUtils } from '../utils/encryption.utils';
import { BaseEntity, EncryptedEntity } from '../entities/base.entity';

type EntityWithEncryption = ObjectLiteral & {
  [key: string]: any;
  constructor: Function;
  isEncrypted?: boolean;
};

/**
 * Type guard om te controleren of een entity encrypted moet worden
 */
function isEncryptedEntity(entity: unknown): entity is EncryptedEntity {
  return entity instanceof EncryptedEntity;
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

    return fields.map((field) => ({
      field,
      options: Reflect.getMetadata(`typeorm:encrypted_fields:${field}`, target) || {},
    }));
  }

  /**
   * Encrypt een veld met de juiste key
   */
  private async encryptField(
    value: string | null | undefined,
    options: IEncryptField,
  ): Promise<string | null> {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = String(value);
    if (EncryptionUtils.isEncrypted(stringValue)) {
      return stringValue;
    }

    const result = await this.encryptionProvider.encrypt(stringValue);
    return JSON.stringify(result); // Serialize voor opslag
  }

  /**
   * Decrypt een veld met de juiste key
   */
  private async decryptField(
    value: string | null | undefined,
    options: IEncryptField,
  ): Promise<string | null> {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = String(value);
    if (!EncryptionUtils.isEncrypted(stringValue)) {
      return stringValue;
    }

    try {
      const encryptedData = JSON.parse(stringValue) as IEncryptionResult;
      return this.encryptionProvider.decrypt(encryptedData);
    } catch (error) {
      // Als we de string niet kunnen parsen, is het mogelijk niet encrypted
      return stringValue;
    }
  }

  /**
   * Encrypt velden bij insert/update
   */
  private async encryptFields(entity: EncryptedEntity): Promise<void> {
    const encryptedFields = this.getEncryptedFields(entity.constructor);

    for (const { field, options } of encryptedFields) {
      const value = (entity as any)[field];
      (entity as any)[field] = await this.encryptField(value, options);
    }
  }

  /**
   * Decrypt velden bij laden
   */
  private async decryptFields(entity: EncryptedEntity): Promise<void> {
    const encryptedFields = this.getEncryptedFields(entity.constructor);

    for (const { field, options } of encryptedFields) {
      const value = (entity as any)[field];
      (entity as any)[field] = await this.decryptField(value, options);
    }
  }

  /**
   * Encrypt velden voor insert
   */
  async beforeInsert(event: InsertEvent<any>): Promise<void> {
    if (event.entity && isEncryptedEntity(event.entity)) {
      await this.encryptFields(event.entity);
    }
  }

  /**
   * Encrypt velden voor update
   */
  async beforeUpdate(event: UpdateEvent<any>): Promise<void> {
    if (event.entity && isEncryptedEntity(event.entity)) {
      const databaseEntity = event.databaseEntity;
      if (!databaseEntity || !isEncryptedEntity(databaseEntity)) return;

      const encryptedFields = this.getEncryptedFields(event.entity.constructor);
      for (const { field, options } of encryptedFields) {
        if ((event.entity as any)[field] !== (databaseEntity as any)[field]) {
          (event.entity as any)[field] = await this.encryptField(
            (event.entity as any)[field],
            options,
          );
        }
      }
    }
  }

  /**
   * Decrypt velden na laden
   */
  async afterLoad(event: LoadEvent<any>): Promise<void> {
    if (event.entity && isEncryptedEntity(event.entity)) {
      await this.decryptFields(event.entity);
    }
  }
}
