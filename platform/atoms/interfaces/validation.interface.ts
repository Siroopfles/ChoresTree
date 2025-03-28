import { IEntity } from './entity.interface';
import { ValidationError } from './service.interface';

/**
 * Interface voor entity validatie
 */
export interface IEntityValidator<T extends IEntity> {
  /**
   * Valideer een complete entity
   * @param entity De entity om te valideren
   * @returns Array van validation errors, leeg als valid
   */
  validateEntity(entity: T): Promise<ValidationError[]>;

  /**
   * Valideer specifieke velden van een entity
   * @param data De velden om te valideren
   * @returns Array van validation errors, leeg als valid
   */
  validateFields(data: Partial<T>): Promise<ValidationError[]>;

  /**
   * Valideer data voor entity creatie
   * Stricter dan validateFields omdat alle required velden aanwezig moeten zijn
   * @param data De data voor nieuwe entity
   * @returns Array van validation errors, leeg als valid
   */
  validateCreate(data: Omit<T, keyof IEntity>): Promise<ValidationError[]>;
}

/**
 * Interface voor schema-based validatie (e.g. Zod)
 */
export interface ISchemaValidator<T extends IEntity> extends IEntityValidator<T> {
  /**
   * Het validatie schema voor deze entity
   */
  readonly schema: unknown;

  /**
   * Valideer tegen het schema
   * @param data Data om te valideren
   * @returns Array van validation errors, leeg als valid
   */
  validateSchema(data: unknown): Promise<ValidationError[]>;
}

/**
 * Interface voor custom validation rules
 */
export interface ICustomValidator<T extends IEntity> {
  /**
   * Voer custom validatie regels uit
   * @param entity De entity om te valideren 
   * @returns Array van validation errors, leeg als valid
   */
  validate(entity: T): Promise<ValidationError[]>;
}