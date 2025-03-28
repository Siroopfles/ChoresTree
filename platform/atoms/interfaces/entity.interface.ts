/**
 * Basis interface voor alle entities in het systeem.
 * Definieert de standaard velden die elke entity moet hebben.
 */
export interface IEntity {
  /** Unieke identifier van de entity */
  readonly id: string;

  /** Timestamp wanneer de entity is aangemaakt */
  readonly createdAt: Date;

  /** Timestamp wanneer de entity voor het laatst is gewijzigd */
  readonly updatedAt: Date;

  /** Versienummer voor optimistic locking */
  readonly version: number;
}

/**
 * Type voor entity create operaties zonder system fields
 */
export type CreateEntityData<T extends IEntity> = Omit<T, keyof IEntity>;

/**
 * Type voor entity update operaties
 */
export type UpdateEntityData<T extends IEntity> = Partial<CreateEntityData<T>>;

/**
 * Type voor entity ID's
 */
export type EntityId = string;
