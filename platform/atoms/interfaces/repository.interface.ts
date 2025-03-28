import { IEntity } from './entity.interface';

/**
 * Basis interface voor alle repositories
 * Definieert standaard CRUD operaties die elke repository moet implementeren
 */
export interface IBaseRepository<T extends IEntity> {
  /**
   * Zoek een entity op basis van ID
   * @param id De unieke identifier
   */
  findById(id: string): Promise<T | null>;

  /**
   * Sla een nieuwe entity op
   * @param entity De entity om op te slaan
   */
  save(entity: T): Promise<T>;

  /**
   * Update een bestaande entity
   * @param id De unieke identifier
   * @param data De velden om te updaten
   */
  update(id: string, data: Partial<T>): Promise<T>;

  /**
   * Verwijder een entity
   * @param id De unieke identifier
   */
  delete(id: string): Promise<void>;
}

/**
 * Interface voor repositories die encryption ondersteunen
 */
export interface IEncryptedRepository<T extends IEntity> extends IBaseRepository<T> {
  /**
   * De encryptie sleutel voor deze repository
   */
  readonly encryptionKey: string;
  
  /**
   * Encrypt een veld
   * @param value De waarde om te encrypten
   */
  encrypt(value: string): Promise<string>;
  
  /**
   * Decrypt een veld
   * @param value De encrypted waarde
   */
  decrypt(value: string): Promise<string>;
}