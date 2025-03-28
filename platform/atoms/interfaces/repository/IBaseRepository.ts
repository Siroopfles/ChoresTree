import { BaseEntity } from '../../../atoms/entities/base.entity';
import { FindOptions } from './types';

/**
 * Basis repository interface voor CRUD operaties
 * Moet worden geïmplementeerd door alle concrete repositories
 * @template T Type van de entity, moet BaseEntity extenden
 */
export interface IBaseRepository<T extends BaseEntity> {
  /**
   * Zoekt een entity op basis van ID
   * @param id Unieke identifier van de entity
   * @returns Promise met de gevonden entity of null als deze niet bestaat
   */
  findById(id: string): Promise<T | null>;

  /**
   * Haalt alle entities op die voldoen aan de gegeven criteria
   * @param options Opties voor filtering, sortering en paginatie
   * @returns Promise met array van entities
   */
  findAll(options?: FindOptions): Promise<T[]>;

  /**
   * Maakt een nieuwe entity aan
   * @param entity Partial entity object met de te creëren data
   * @returns Promise met de gecreëerde entity
   */
  create(entity: Partial<T>): Promise<T>;

  /**
   * Update een bestaande entity
   * @param id Unieke identifier van de entity
   * @param entity Partial entity object met de te updaten velden
   * @returns Promise met de geüpdatete entity
   */
  update(id: string, entity: Partial<T>): Promise<T>;

  /**
   * Verwijdert een entity
   * @param id Unieke identifier van de entity
   * @returns Promise die resolved wanneer de entity is verwijderd
   */
  delete(id: string): Promise<void>;

  /**
   * Voert een operatie uit binnen een database transactie
   * Zorgt voor atomiciteit van meerdere database operaties
   * @param operation Functie die de transactie operaties bevat
   * @returns Promise met het resultaat van de operatie
   * @throws Als er een error optreedt wordt de transactie teruggedraaid
   */
  transaction<R>(operation: (repo: this) => Promise<R>): Promise<R>;
}
