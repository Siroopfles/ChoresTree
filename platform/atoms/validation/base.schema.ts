import { z } from 'zod';

/**
 * Base schema voor alle entities met standaard velden
 */
export const baseSchema = z.object({
  id: z.string().uuid({
    message: 'ID moet een geldig UUID zijn'
  }),
  createdAt: z.date({
    required_error: 'Aanmaakdatum is verplicht',
    invalid_type_error: 'Aanmaakdatum moet een geldige datum zijn'
  }),
  updatedAt: z.date({
    required_error: 'Wijzigingsdatum is verplicht', 
    invalid_type_error: 'Wijzigingsdatum moet een geldige datum zijn'
  }),
  version: z.number().int().positive({
    message: 'Versie moet een positief geheel getal zijn'
  })
});

/**
 * Type van het base schema
 */
export type BaseSchema = z.infer<typeof baseSchema>;

/**
 * Helper functie om een schema te extenden met het base schema
 */
export function createEntitySchema<T extends z.ZodRawShape>(schema: T) {
  return baseSchema.extend(schema);
}

/**
 * Helper functie om een partial schema te maken voor updates
 */
export function createPartialSchema<T extends z.ZodRawShape>(schema: T) {
  return baseSchema.partial().extend(schema).partial();
}

/**
 * Helper functie om een schema te valideren met custom error handling
 */
export async function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Formateer errors naar Nederlandse messages
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new Error(`Validatie errors: ${JSON.stringify(errors)}`);
    }
    throw error;
  }
}