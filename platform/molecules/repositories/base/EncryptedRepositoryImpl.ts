import { Injectable } from '@nestjs/common';
import { BaseRepositoryImpl } from './BaseRepositoryImpl';
import { IEncryptedRepository } from '../../../atoms/interfaces/repository/IEncryptedRepository';
import { BaseEntity } from '../../../atoms/entities/base.entity';
import { RepositoryError } from '../../../atoms/errors/repository.error';
import { DeepPartial } from 'typeorm';
import { FindOptions } from '../../../atoms/interfaces/repository/types';

@Injectable()
export class EncryptedRepositoryImpl<T extends BaseEntity>
  extends BaseRepositoryImpl<T>
  implements IEncryptedRepository<T>
{
  // Map om bij te houden welke velden geëncrypt zijn
  private encryptedFields: Set<keyof T> = new Set();

  /**
   * Encrypt een waarde met de repository encryptie key
   */
  protected async encrypt(value: string): Promise<string> {
    // TODO: Implementeer echte encryptie logica
    return Buffer.from(value).toString('base64');
  }

  /**
   * Decrypt een waarde met de repository encryptie key
   */
  protected async decrypt(value: string): Promise<string> {
    // TODO: Implementeer echte decryptie logica
    return Buffer.from(value, 'base64').toString();
  }

  /**
   * Encrypt een specifiek veld van de entity
   */
  async encryptField(field: keyof T): Promise<void> {
    this.encryptedFields.add(field);
  }

  /**
   * Decrypt een specifiek veld van de entity
   */
  async decryptField(field: keyof T): Promise<void> {
    this.encryptedFields.delete(field);
  }

  /**
   * Override de create methode om automatische encryptie toe te passen
   */
  async create(entityData: Partial<T>): Promise<T> {
    try {
      const encryptedData = await this.encryptFields(entityData);
      return super.create(encryptedData);
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error creating encrypted entity: ${error.message}`,
          'ENCRYPT_CREATE_ERROR',
        );
      }
      throw error;
    }
  }

  /**
   * Override de update methode om automatische encryptie toe te passen
   */
  async update(id: string, entityData: Partial<T>): Promise<T> {
    try {
      const encryptedData = await this.encryptFields(entityData);
      return super.update(id, encryptedData);
    } catch (error) {
      if (error instanceof Error) {
        throw new RepositoryError(
          `Error updating encrypted entity: ${error.message}`,
          'ENCRYPT_UPDATE_ERROR',
        );
      }
      throw error;
    }
  }

  /**
   * Override de findById methode om automatische decryptie toe te passen
   */
  async findById(id: string): Promise<T | null> {
    const entity = await super.findById(id);
    if (entity) {
      return this.decryptFields(entity);
    }
    return null;
  }

  /**
   * Override de findAll methode om automatische decryptie toe te passen
   */
  async findAll(options?: FindOptions): Promise<T[]> {
    const entities = await super.findAll(options);
    return Promise.all(entities.map((entity) => this.decryptFields(entity)));
  }

  /**
   * Encrypt alle gemarkeerde velden in een entity
   */
  private async encryptFields(entity: Partial<T>): Promise<Partial<T>> {
    const result = { ...entity };

    for (const field of this.encryptedFields) {
      const value = result[field];
      if (typeof value === 'string') {
        result[field] = (await this.encrypt(value)) as any;
      }
    }

    return result;
  }

  /**
   * Decrypt alle geëncrypte velden in een entity
   */
  private async decryptFields(entity: T): Promise<T> {
    const result = { ...entity };

    for (const field of this.encryptedFields) {
      const value = result[field];
      if (typeof value === 'string') {
        result[field] = (await this.decrypt(value)) as any;
      }
    }

    return result;
  }

  /**
   * Override de getCacheKey methode om rekening te houden met encryptie
   */
  protected getCacheKey(id: string): string {
    const encryptedSuffix = this.encryptedFields.size > 0 ? ':encrypted' : '';
    return `${super.getCacheKey(id)}${encryptedSuffix}`;
  }
}
