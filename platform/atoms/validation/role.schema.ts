import { z } from 'zod';
import { createEntitySchema } from './base.schema';

/**
 * Beschikbare permissie types
 */
export const PermissionTypes = {
  TASK_CREATE: 'TASK_CREATE',
  TASK_READ: 'TASK_READ', 
  TASK_UPDATE: 'TASK_UPDATE',
  TASK_DELETE: 'TASK_DELETE',
  TASK_ASSIGN: 'TASK_ASSIGN',
  MEMBER_MANAGE: 'MEMBER_MANAGE',
  ROLE_MANAGE: 'ROLE_MANAGE',
  SETTINGS_MANAGE: 'SETTINGS_MANAGE'
} as const;

/**
 * Discord snowflake ID regex pattern
 */
const SNOWFLAKE_PATTERN = /^\d{17,19}$/;

/**
 * Schema voor Discord rol metadata
 */
const discordMetadataSchema = z.object({
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Kleur moet een geldige HEX code zijn (#RRGGBB)')
    .optional(),
  position: z.number()
    .int('Positie moet een geheel getal zijn')
    .nonnegative('Positie moet 0 of hoger zijn')
    .optional(),
  managed: z.boolean()
    .optional(),
  mentionable: z.boolean()
    .optional()
}).catchall(z.union([z.string(), z.number(), z.boolean()]));

/**
 * Basis role schema velden
 */
const roleSchemaFields = {
  name: z
    .string({
      required_error: 'Naam is verplicht',
      invalid_type_error: 'Naam moet een tekst zijn'
    })
    .min(1, 'Naam mag niet leeg zijn')
    .max(100, 'Naam mag maximaal 100 karakters zijn')
    .regex(/^[\w\s-]+$/, 'Naam mag alleen letters, cijfers, spaties en koppeltekens bevatten')
    .trim(),

  permissions: z
    .array(
      z.enum(Object.values(PermissionTypes) as [string, ...string[]], {
        errorMap: (_issue) => ({
          message: 'Ongeldige permissie. Toegestane waardes: ' + 
            Object.values(PermissionTypes).join(', ')
        })
      })
    )
    .min(1, 'Minimaal één permissie is verplicht')
    .transform(perms => [...new Set(perms)]), // Verwijder duplicaten

  discordRoleId: z
    .string({
      required_error: 'Discord rol ID is verplicht',
      invalid_type_error: 'Discord rol ID moet een tekst zijn'
    })
    .regex(SNOWFLAKE_PATTERN, 'Discord rol ID moet een geldig snowflake ID zijn'),

  serverId: z
    .string({
      required_error: 'Server ID is verplicht', 
      invalid_type_error: 'Server ID moet een tekst zijn'
    })
    .regex(SNOWFLAKE_PATTERN, 'Server ID moet een geldig snowflake ID zijn'),

  metadata: discordMetadataSchema.optional()
};

/**
 * Volledig role schema met basis entity velden
 */
export const roleSchema = createEntitySchema(roleSchemaFields);

/**
 * Schema voor het creëren van een nieuwe rol
 */
export const createRoleSchema = z.object(roleSchemaFields);

/**
 * Schema voor het updaten van een bestaande rol
 */
export const updateRoleSchema = z.object(roleSchemaFields).partial();

/**
 * Type voor een volledige gevalideerde rol
 */
export type ValidatedRole = z.infer<typeof roleSchema>;

/**
 * Type voor gevalideerde create role data
 */
export type ValidatedCreateRoleData = z.infer<typeof createRoleSchema>;

/**
 * Type voor gevalideerde update role data
 */
export type ValidatedUpdateRoleData = z.infer<typeof updateRoleSchema>;

/**
 * Helper functie voor role validatie
 */
export const validateRole = {
  /**
   * Valideer een complete rol
   */
  complete: async (data: unknown): Promise<ValidatedRole> => {
    try {
      return await roleSchema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new Error(`Role validatie errors: ${JSON.stringify(errors)}`);
      }
      throw error;
    }
  },

  /**
   * Valideer data voor het aanmaken van een rol
   */
  create: async (data: unknown): Promise<ValidatedCreateRoleData> => {
    try {
      return await createRoleSchema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new Error(`Create role validatie errors: ${JSON.stringify(errors)}`);
      }
      throw error;
    }
  },

  /**
   * Valideer data voor het updaten van een rol
   */
  update: async (data: unknown): Promise<ValidatedUpdateRoleData> => {
    try {
      return await updateRoleSchema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new Error(`Update role validatie errors: ${JSON.stringify(errors)}`);
      }
      throw error;
    }
  }
};