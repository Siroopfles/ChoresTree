import { z } from 'zod';
import { NotificationStatus, NotificationType } from '../entities/notification.entity';
import { createEntitySchema, createPartialSchema } from './base.schema';

/**
 * Basis notification schema velden
 */
const notificationSchemaFields = {
  type: z.nativeEnum(NotificationType, {
    errorMap: (issue) => {
      if (issue.code === 'invalid_type') {
        return { message: 'Type is verplicht' };
      }
      if (issue.code === 'invalid_enum_value') {
        return {
          message: 'Type moet één van de volgende waardes zijn: ' +
            Object.values(NotificationType).join(', ')
        };
      }
      return { message: 'Type moet een geldige waarde zijn' };
    }
  }),

  status: z.nativeEnum(NotificationStatus, {
    errorMap: (issue) => {
      if (issue.code === 'invalid_type') {
        return { message: 'Status is verplicht' };
      }
      if (issue.code === 'invalid_enum_value') {
        return {
          message: 'Status moet één van de volgende waardes zijn: ' +
            Object.values(NotificationStatus).join(', ')
        };
      }
      return { message: 'Status moet een geldige waarde zijn' };
    }
  }),

  priority: z
    .number({
      required_error: 'Prioriteit is verplicht',
      invalid_type_error: 'Prioriteit moet een nummer zijn'
    })
    .int('Prioriteit moet een geheel getal zijn')
    .min(1, 'Prioriteit moet tussen 1 en 5 zijn')
    .max(5, 'Prioriteit moet tussen 1 en 5 zijn'),

  content: z
    .string({
      required_error: 'Content is verplicht',
      invalid_type_error: 'Content moet een tekst zijn'
    })
    .min(1, 'Content mag niet leeg zijn')
    .max(2000, 'Content mag maximaal 2000 karakters zijn')
    .trim(),

  recipientId: z
    .string({
      required_error: 'Ontvanger ID is verplicht',
      invalid_type_error: 'Ontvanger ID moet een tekst zijn'
    })
    .min(1, 'Ontvanger ID mag niet leeg zijn'),

  taskId: z
    .string()
    .uuid('Taak ID moet een geldig UUID zijn')
    .optional(),

  metadata: z
    .record(z.unknown())
    .optional()
};

/**
 * Volledig notification schema met basis entity velden
 */
export const notificationSchema = createEntitySchema(notificationSchemaFields);

/**
 * Schema voor het creëren van een nieuwe notificatie
 */
export const createNotificationSchema = z.object({
  ...notificationSchemaFields,
  status: z.nativeEnum(NotificationStatus).default(NotificationStatus.UNREAD),
  priority: z.number().int().min(1).max(5).default(3)
});

/**
 * Schema voor het updaten van een bestaande notificatie
 */
export const updateNotificationSchema = createPartialSchema(notificationSchemaFields);

/**
 * Type voor een volledige gevalideerde notificatie
 */
export type ValidatedNotification = z.infer<typeof notificationSchema>;

/**
 * Type voor gevalideerde create notification data
 */
export type ValidatedCreateNotificationData = z.infer<typeof createNotificationSchema>;

/**
 * Type voor gevalideerde update notification data
 */
export type ValidatedUpdateNotificationData = z.infer<typeof updateNotificationSchema>;

/**
 * Helper functie voor notification validatie
 */
export const validateNotification = {
  /**
   * Valideer een complete notification
   */
  complete: async (data: unknown): Promise<ValidatedNotification> => {
    try {
      return await notificationSchema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new Error(`Notification validatie errors: ${JSON.stringify(errors)}`);
      }
      throw error;
    }
  },

  /**
   * Valideer data voor het aanmaken van een notification
   */
  create: async (data: unknown): Promise<ValidatedCreateNotificationData> => {
    try {
      return await createNotificationSchema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new Error(`Create notification validatie errors: ${JSON.stringify(errors)}`);
      }
      throw error;
    }
  },

  /**
   * Valideer data voor het updaten van een notification
   */
  update: async (data: unknown): Promise<ValidatedUpdateNotificationData> => {
    try {
      return await updateNotificationSchema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new Error(`Update notification validatie errors: ${JSON.stringify(errors)}`);
      }
      throw error;
    }
  }
};