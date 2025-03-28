import { z } from 'zod';
import { baseSchema, createEntitySchema, createPartialSchema, validateSchema } from '../base.schema';

describe('Base Schema', () => {
  const validBaseData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: 1
  };

  describe('baseSchema validation', () => {
    it('should validate correct base data', async () => {
      const result = await validateSchema(baseSchema, validBaseData);
      expect(result).toEqual(validBaseData);
    });

    it('should fail on invalid UUID', async () => {
      const invalid = {
        ...validBaseData,
        id: 'invalid-uuid'
      };
      await expect(validateSchema(baseSchema, invalid))
        .rejects.toThrow(/ID moet een geldig UUID zijn/);
    });

    it('should fail on invalid createdAt date', async () => {
      const invalid = {
        ...validBaseData,
        createdAt: 'not-a-date'
      };
      await expect(validateSchema(baseSchema, invalid))
        .rejects.toThrow(/Aanmaakdatum moet een geldige datum zijn/);
    });

    it('should fail on missing updatedAt', async () => {
      const { updatedAt: _updatedAt, ...invalid } = validBaseData;
      await expect(validateSchema(baseSchema, invalid))
        .rejects.toThrow(/Wijzigingsdatum is verplicht/);
    });

    it('should fail on invalid version', async () => {
      const invalid = {
        ...validBaseData,
        version: -1
      };
      await expect(validateSchema(baseSchema, invalid))
        .rejects.toThrow(/Versie moet een positief geheel getal zijn/);
    });
  });

  describe('createEntitySchema', () => {
    // Test schema voor een custom entity
    const customSchema = z.object({
      name: z.string({
        required_error: 'Naam is verplicht'
      }),
      active: z.boolean()
    });

    const validEntityData = {
      ...validBaseData,
      name: 'Test Entity',
      active: true
    };

    it('should create extended schema with base fields', async () => {
      const entitySchema = createEntitySchema(customSchema.shape);
      const result = await validateSchema(entitySchema, validEntityData);
      expect(result).toEqual(validEntityData);
    });

    it('should fail on missing custom field', async () => {
      const entitySchema = createEntitySchema(customSchema.shape);
      const { name: _name, ...invalid } = validEntityData;
      await expect(validateSchema(entitySchema, invalid))
        .rejects.toThrow(/Naam is verplicht/);
    });

    it('should validate nested objects', async () => {
      const nestedSchema = z.object({
        metadata: z.object({
          key: z.string(),
          value: z.number()
        })
      });

      const entitySchema = createEntitySchema(nestedSchema.shape);
      const data = {
        ...validBaseData,
        metadata: { key: 'test', value: 123 }
      };

      const result = await validateSchema(entitySchema, data);
      expect(result).toEqual(data);
    });
  });

  describe('createPartialSchema', () => {
    const customSchema = z.object({
      name: z.string(),
      count: z.number(),
      metadata: z.object({
        key: z.string(),
        active: z.boolean()
      }).optional()
    });

    it('should allow partial base fields', async () => {
      const partialSchema = createPartialSchema(customSchema.shape);
      const partialData = {
        id: validBaseData.id,
        version: validBaseData.version
      };

      const result = await validateSchema(partialSchema, partialData);
      expect(result).toEqual(partialData);
    });

    it('should allow partial custom fields', async () => {
      const partialSchema = createPartialSchema(customSchema.shape);
      const partialData = {
        name: 'Test'
      };

      const result = await validateSchema(partialSchema, partialData);
      expect(result).toEqual(partialData);
    });

    it('should validate types for provided fields', async () => {
      const partialSchema = createPartialSchema(customSchema.shape);
      const invalid = {
        count: 'not-a-number'
      };

      await expect(validateSchema(partialSchema, invalid))
        .rejects.toThrow(/Expected number/);
    });

    it('should allow empty object', async () => {
      const partialSchema = baseSchema.partial().extend(customSchema.shape).partial();
      const result = await validateSchema(partialSchema, {});
      expect(result).toEqual({});
    });
  });

  describe('validateSchema error handling', () => {
    it('should transform Zod errors to custom format', async () => {
      const invalid = {
        ...validBaseData,
        id: 'invalid',
        version: -1
      };

      try {
        await validateSchema(baseSchema, invalid);
        fail('Should have thrown an error');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toContain('Validatie errors');
        const errors = JSON.parse(error.message.replace('Validatie errors: ', ''));
        expect(errors).toContainEqual({
          field: 'id',
          message: 'ID moet een geldig UUID zijn'
        });
        expect(errors).toContainEqual({
          field: 'version',
          message: 'Versie moet een positief geheel getal zijn'
        });
      }
    });

    it('should handle nested field errors', async () => {
      const nestedSchema = createEntitySchema({
        nested: z.object({
          field: z.number({
            invalid_type_error: 'Moet een nummer zijn'
          })
        })
      });

      const invalid = {
        ...validBaseData,
        nested: {
          field: 'not-a-number'
        }
      };

      try {
        await validateSchema(nestedSchema, invalid);
        fail('Should have thrown an error');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        const errors = JSON.parse(error.message.replace('Validatie errors: ', ''));
        expect(errors).toContainEqual({
          field: 'nested.field',
          message: 'Moet een nummer zijn'
        });
      }
    });

    it('should pass through non-Zod errors', async () => {
      const error = new Error('Network error');
      const schema = z.object({}).refine(() => {
        throw error;
      });

      await expect(validateSchema(schema, {}))
        .rejects.toThrow(error);
    });
  });
});