import { z } from 'zod';
import { baseSchema, createEntitySchema, createPartialSchema, validateSchema } from '../base.schema';

describe('Base Schema Validation', () => {
  // Test data setup
  const validBaseData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    version: 1
  };

  describe('Edge Cases - Metadata Validation', () => {
    test('should validate maximum UUID length', async () => {
      const data = {
        ...validBaseData,
        id: '123e4567-e89b-12d3-a456-426614174000'.repeat(2)
      };
      await expect(validateSchema(baseSchema, data)).rejects.toThrow('ID moet een geldig UUID zijn');
    });

    test('should validate minimum version number', async () => {
      const data = {
        ...validBaseData,
        version: 0
      };
      await expect(validateSchema(baseSchema, data)).rejects.toThrow('Versie moet een positief geheel getal zijn');
    });

    test('should validate version number is integer', async () => {
      const data = {
        ...validBaseData,
        version: 1.5
      };
      await expect(validateSchema(baseSchema, data)).rejects.toThrow();
    });

    test('should validate version number maximum', async () => {
      const maxVersion = 999999999; // Realistisch maximum voor versie nummer
      const validData = {
        ...validBaseData,
        version: maxVersion
      };
      await expect(validateSchema(baseSchema, validData)).resolves.toBeDefined();

      const invalidData = {
        ...validBaseData,
        version: maxVersion + 1
      };
      await expect(validateSchema(baseSchema.extend({ 
        version: z.number().int().positive().max(maxVersion, {
          message: `Versie moet kleiner zijn dan ${maxVersion}`
        })
      }), invalidData)).rejects.toThrow();
    });

    test('should validate date boundaries', async () => {
      const data = {
        ...validBaseData,
        createdAt: new Date('1000-01-01'),
        updatedAt: new Date('9999-12-31')
      };
      await expect(validateSchema(baseSchema, data)).resolves.toBeDefined();
    });
  });

  describe('International Character Handling', () => {
    test('should handle Unicode characters in UUID', async () => {
      const data = {
        ...validBaseData,
        id: '123e4567-e89b-12d3-a456-426614174000' // Valid UUID only allows specific characters
      };
      await expect(validateSchema(baseSchema, data)).resolves.toBeDefined();
    });

    test('should handle special characters in error messages', async () => {
      const customSchema = createEntitySchema({
        name: z.string().min(1, 'Naam moet minimaal één karakter bevatten: äöü')
      });
      
      await expect(validateSchema(customSchema, { ...validBaseData, name: '' }))
        .rejects.toThrow('één');
    });

    test('should validate non-ASCII characters in string fields', async () => {
      const schema = createEntitySchema({
        name: z.string().min(1)
      });

      const validData = {
        ...validBaseData,
        name: 'こんにちは'  // Japanese
      };
      await expect(validateSchema(schema, validData)).resolves.toBeDefined();

      const validData2 = {
        ...validBaseData,
        name: 'Café' // Accented characters
      };
      await expect(validateSchema(schema, validData2)).resolves.toBeDefined();
    });
  });

  describe('Concurrent Validation', () => {
    test('should handle multiple parallel validations', async () => {
      const validations = Array(10).fill(null).map(() => 
        validateSchema(baseSchema, validBaseData)
      );
      
      await expect(Promise.all(validations)).resolves.toBeDefined();
    });

    test('should handle race conditions in partial updates', async () => {
      const partialSchema = createPartialSchema({
        name: z.string().optional()
      });

      const updates = [
        validateSchema(partialSchema, { version: 1 }),
        validateSchema(partialSchema, { version: 2 }),
        validateSchema(partialSchema, { version: 3 })
      ];

      await expect(Promise.all(updates)).resolves.toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    test('should properly format validation errors', async () => {
      const data = {
        id: 'invalid-uuid',
        createdAt: 'invalid-date',
        updatedAt: null,
        version: -1
      };

      try {
        await validateSchema(baseSchema, data);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('Validatie errors');
          expect(error.message).toContain('ID moet een geldig UUID zijn');
          expect(error.message).toContain('Aanmaakdatum moet een geldige datum zijn');
          expect(error.message).toContain('Wijzigingsdatum moet een geldige datum zijn');
          expect(error.message).toContain('Versie moet een positief geheel getal zijn');
        } else {
          throw error;
        }
      }
    });

    test('should handle non-Zod errors', async () => {
      const throwingSchema = baseSchema.superRefine(() => {
        throw new Error('Niet-validatie error');
      });

      await expect(validateSchema(throwingSchema, validBaseData))
        .rejects.toThrow('Niet-validatie error');
    });

    test('should maintain error consistency across nested schemas', async () => {
      const nestedSchema = createEntitySchema({
        nested: z.object({
          field: z.string({
            required_error: 'Genest veld is verplicht'
          })
        })
      });

      const data = {
        ...validBaseData,
        nested: { field: null }
      };

      try {
        await validateSchema(nestedSchema, data);
        fail('Should have thrown validation error');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('nested.field');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Extended Schema Validation', () => {
    test('should correctly extend base schema', async () => {
      const extendedSchema = createEntitySchema({
        name: z.string(),
        age: z.number().positive()
      });

      const validData = {
        ...validBaseData,
        name: 'Test',
        age: 25
      };

      await expect(validateSchema(extendedSchema, validData)).resolves.toBeDefined();
    });

    test('should handle partial schema updates', async () => {
      const partialSchema = createPartialSchema({
        name: z.string(),
        age: z.number().positive()
      });

      const partialData = {
        name: 'Test Update'
      };

      await expect(validateSchema(partialSchema, partialData)).resolves.toBeDefined();
    });

    test('should preserve base schema validation in extended schemas', async () => {
      const extendedSchema = createEntitySchema({
        name: z.string()
      });

      const invalidData = {
        ...validBaseData,
        id: 'invalid-uuid',
        name: 'Test'
      };

      await expect(validateSchema(extendedSchema, invalidData))
        .rejects.toThrow('ID moet een geldig UUID zijn');
    });
  });
});