import { IEntity } from '../entity.interface';
import { IEntityValidator, ISchemaValidator, ICustomValidator } from '../validation.interface';
import { ValidationError } from '../service.interface';

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
describe('Validation Interface Type Tests', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class TestValidator implements IEntityValidator<TestEntity> {
    async validateEntity(entity: TestEntity): Promise<ValidationError[]> {
      // Type check: heeft toegang tot alle entity fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const fields = {
        id: entity.id,
        name: entity.name,
        value: entity.value,
        optional: entity.optional,
        createdAt: entity.createdAt,
      };

      return [];
    }

    async validateFields(data: Partial<TestEntity>): Promise<ValidationError[]> {
      // Type check: alle velden zijn optional
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const fields = {
        name: data.name,
        value: data.value,
        optional: data.optional,
      };

      return [];
    }

    async validateCreate(data: Omit<TestEntity, keyof IEntity>): Promise<ValidationError[]> {
      // Type check: geen system fields toegestaan
      // @ts-expect-error - Should not allow system fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const error1 = data.id;

      // @ts-expect-error - Should not allow system fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const error2 = data.createdAt;

      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class TestSchemaValidator implements ISchemaValidator<TestEntity> {
    schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        value: { type: 'number' },
      },
    };

    async validateEntity(_entity: TestEntity): Promise<ValidationError[]> {
      return [];
    }

    async validateFields(_data: Partial<TestEntity>): Promise<ValidationError[]> {
      return [];
    }

    async validateCreate(_data: Omit<TestEntity, keyof IEntity>): Promise<ValidationError[]> {
      return [];
    }

    async validateSchema(_data: unknown): Promise<ValidationError[]> {
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class TestCustomValidator implements ICustomValidator<TestEntity> {
    async validate(entity: TestEntity): Promise<ValidationError[]> {
      // Custom business rules validatie
      if (entity.value < 0) {
        return [
          {
            field: 'value',
            message: 'Value must be positive',
          },
        ];
      }
      return [];
    }
  }

  it('should enforce correct validation error type', () => {
    // Valid validation error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const validError: ValidationError = {
      field: 'name',
      message: 'Required field',
    };

    // @ts-expect-error - Should require field
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorWithoutField: ValidationError = {
      message: 'Missing field',
    };

    // @ts-expect-error - Should require message
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorWithoutMessage: ValidationError = {
      field: 'name',
    };
  });

  it('should enforce entity constraints on generic type', () => {
    // @ts-expect-error - Should only allow types extending IEntity
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class InvalidValidator implements IEntityValidator<string> {
      validateEntity(): Promise<ValidationError[]> {
        return Promise.resolve([]);
      }
    }
  });
});
