import { BaseEntity } from '../../../atoms/entities/base.entity';
import { IBaseRepository } from './IBaseRepository';

/**
 * Repository interface voor entities die encryptie ondersteunen
 * Breidt de basis repository functionaliteit uit met encryptie operaties
 * @template T Type van de entity, moet BaseEntity extenden
 */
export interface IEncryptedRepository<T extends BaseEntity> extends IBaseRepository<T> {
  /**
   * Encrypt een specifiek veld van de entity
   * @param field Property key van het te encrypten veld
   * @returns Promise die resolved wanneer de encryptie is voltooid
   */
  encryptField(field: keyof T): Promise<void>;

  /**
   * Decrypt een specifiek veld van de entity
   * @param field Property key van het te decrypten veld
   * @returns Promise die resolved wanneer de decryptie is voltooid
   */
  decryptField(field: keyof T): Promise<void>;
}
