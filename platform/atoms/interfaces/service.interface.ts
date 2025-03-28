import { IEntity } from './entity.interface';

/**
 * Error types voor service operaties
 */
export type ValidationError = {
  field: string;
  message: string;
};

export type ServiceError = {
  code: string;
  message: string;
  errors?: ValidationError[];
};

/**
 * Base type voor Create operatie input data
 * Verwijdert system fields van entity type
 */
export type CreateDTO<T extends IEntity> = Omit<T, keyof IEntity>;

/**
 * Base type voor Update operatie input data
 * Maakt alle velden optional behalve id
 */
export type UpdateDTO<T extends IEntity> = Partial<CreateDTO<T>>;

/**
 * Basis interface voor entity services
 * Definieert standaard CRUD operaties met error handling
 */
export interface IEntityService<T extends IEntity> {
  /**
   * Maak een nieuwe entity aan
   * @param data De data voor de nieuwe entity
   * @throws {ServiceError} Als validatie faalt of er andere fouten zijn
   */
  create(data: CreateDTO<T>): Promise<T>;

  /**
   * Update een bestaande entity
   * @param id ID van de entity
   * @param data De velden om te updaten
   * @throws {ServiceError} Als validatie faalt of entity niet bestaat
   */
  update(id: string, data: UpdateDTO<T>): Promise<T>;

  /**
   * Verwijder een entity
   * @param id ID van de entity
   * @throws {ServiceError} Als entity niet bestaat of niet verwijderd kan worden
   */
  delete(id: string): Promise<void>;

  /**
   * Valideer entity data
   * @param data De data om te valideren
   * @returns true als valid, false als invalid
   */
  validate(data: Partial<T>): Promise<boolean>;
}

/**
 * Interface voor services die encryptie gebruiken
 */
export interface IEncryptedEntityService<T extends IEntity> extends IEntityService<T> {
  /**
   * Valideer ook encryptie-specifieke velden
   */
  validateEncryption(data: Partial<T>): Promise<boolean>;
}