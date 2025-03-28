import { IEntity } from '../entity.interface';
import { IEntityService, CreateDTO, UpdateDTO, ServiceError } from '../service.interface';

// Test entity type voor type checking
interface TestEntity extends IEntity {
  name: string;
  value: number;
  optional?: string;
}

/**
 * Deze tests valideren TypeScript types en constraints.
 * Unused variables zijn nodig voor type checking.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class TestService implements IEntityService<TestEntity> {
  async create(data: CreateDTO<TestEntity>): Promise<TestEntity> {
    // Type check: data zou geen IEntity velden moeten hebben
    // @ts-expect-error - Should not allow system fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const error1 = data.id;
    // @ts-expect-error - Should not allow system fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const error2 = data.createdAt;

    // Wel toegestaan - type checking
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const validFields = {
      name: data.name,
      value: data.value,
      optional: data.optional,
    };

    throw new Error('Not implemented');
  }

  async update(id: string, data: UpdateDTO<TestEntity>): Promise<TestEntity> {
    // Type check: alle velden optional behalve bij create
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const partial: UpdateDTO<TestEntity> = {
      name: 'test', // Optional, niet alle velden nodig
    };

    // @ts-expect-error - Should not allow system fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const error1 = data.id;
    // @ts-expect-error - Should not allow system fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const error2 = data.version;

    throw new Error('Not implemented');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async validate(data: Partial<TestEntity>): Promise<boolean> {
    // Type check: mag system fields bevatten want Partial<T>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const validFields = {
      id: data.id,
      name: data.name,
      value: data.value,
    };

    return true;
  }
}

describe('Service Interface Type Tests', () => {
  it('should enforce correct types for error handling', () => {
    // Valid service error object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const validError: ServiceError = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid data',
      errors: [{ field: 'name', message: 'Required' }],
    };

    // @ts-expect-error - Should require code
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorWithoutCode: ServiceError = {
      message: 'Missing code',
    };

    // @ts-expect-error - Should require message
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorWithoutMessage: ServiceError = {
      code: 'ERROR',
    };

    // Valid without errors array
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const validErrorWithoutErrors: ServiceError = {
      code: 'ERROR',
      message: 'Valid error',
    };
  });

  it('should enforce entity constraints on generic type', () => {
    // @ts-expect-error - Should only allow types extending IEntity
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class InvalidService implements IEntityService<string> {
      create(): Promise<string> {
        throw new Error('Not implemented');
      }
    }
  });
});
