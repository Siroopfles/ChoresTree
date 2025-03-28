import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IEntity } from '../interfaces/entity.interface';

/**
 * Basis entity class die alle entities moeten extenden
 * Implementeert de IEntity interface en voegt standaard velden toe
 */
@Entity()
export abstract class BaseEntity implements IEntity {
  /**
   * Unieke identifier gegenereerd door de database
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Timestamp wanneer de entity is aangemaakt
   * Automatisch gezet door TypeORM
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * Timestamp wanneer de entity voor het laatst is gewijzigd
   * Automatisch geüpdatet door TypeORM
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Versienummer voor optimistic locking
   * Automatisch geïncrementeerd door TypeORM bij elke update
   */
  @VersionColumn()
  version!: number;
}

/**
 * Basis class voor entities die encryptie nodig hebben
 */
export abstract class EncryptedEntity extends BaseEntity {
  /**
   * Flag die aangeeft dat deze entity encrypted velden heeft
   * Gebruikt door repositories voor encryptie handling
   */
  public readonly isEncrypted: boolean = true;

  /**
   * Lijst van velden die geëncrypt moeten worden
   * Moet worden overschreven door child classes
   */
  public abstract readonly encryptedFields: string[];

  [key: string]: any; // Index signature voor dynamic property access
}
