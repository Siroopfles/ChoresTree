import { z } from 'zod';
import { TaskStatus } from '../entities/task.entity';
import { createEntitySchema, createPartialSchema } from './base.schema';

/**
 * Basis task schema velden
 */
const taskSchemaFields = {
  title: z
    .string()
    .min(1, 'Titel is verplicht')
    .max(200, 'Titel mag maximaal 200 karakters zijn')
    .trim(),
    
  description: z
    .string()
    .max(1000, 'Beschrijving mag maximaal 1000 karakters zijn')
    .trim()
    .optional(),
    
  status: z.nativeEnum(TaskStatus, {
    errorMap: () => ({
      message: 'Status moet één van de volgende waardes zijn: ' +
        Object.values(TaskStatus).join(', ')
    })
  }),
  
  dueDate: z
    .date({
      required_error: 'Deadline is verplicht',
      invalid_type_error: 'Deadline moet een geldige datum zijn'
    })
    .min(new Date(), 'Deadline moet in de toekomst liggen')
    .optional(),
    
  priority: z
    .number({
      required_error: 'Prioriteit is verplicht',
      invalid_type_error: 'Prioriteit moet een nummer zijn'
    })
    .int('Prioriteit moet een geheel getal zijn')
    .min(1, 'Prioriteit moet tussen 1 en 5 zijn')
    .max(5, 'Prioriteit moet tussen 1 en 5 zijn')
    .superRefine((val, ctx) => {
      if (typeof val === 'number' && (val < 1 || val > 5)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Prioriteit moet tussen 1 en 5 zijn'
        });
      }
    }),
    
  assigneeId: z
    .string({
      invalid_type_error: 'Ongeldig gebruikers ID'
    })
    .uuid('Ongeldig gebruikers ID')
    .optional()
};

/**
 * Volledig task schema met basis entity velden
 */
export const taskSchema = createEntitySchema(taskSchemaFields);

/**
 * Schema voor het creëren van een nieuwe taak
 */
export const createTaskSchema = z.object({
  ...taskSchemaFields,
  status: z.nativeEnum(TaskStatus, {
    errorMap: () => ({
      message: 'Status moet één van de volgende waardes zijn: ' +
        Object.values(TaskStatus).join(', ')
    })
  }).default(TaskStatus.TODO),
  priority: z.number()
    .int('Prioriteit moet een geheel getal zijn')
    .min(1, 'Prioriteit moet tussen 1 en 5 zijn')
    .max(5, 'Prioriteit moet tussen 1 en 5 zijn')
    .default(3)
});

/**
 * Schema voor het updaten van een bestaande taak
 */
export const updateTaskSchema = createPartialSchema(taskSchemaFields);

/**
 * Type voor een volledige gevalideerde taak
 */
export type ValidatedTask = z.infer<typeof taskSchema>;

/**
 * Type voor gevalideerde create task data
 */
export type ValidatedCreateTaskData = z.infer<typeof createTaskSchema>;

/**
 * Type voor gevalideerde update task data
 */
export type ValidatedUpdateTaskData = z.infer<typeof updateTaskSchema>;

/**
 * Helper functie voor task validatie
 */
export const validateTask = {
  /**
   * Valideer een complete task
   */
  complete: async (data: unknown): Promise<ValidatedTask> => {
    try {
      return await taskSchema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new Error(`Task validatie errors: ${JSON.stringify(errors)}`);
      }
      throw error;
    }
  },

  /**
   * Valideer data voor het aanmaken van een task
   */
  create: async (data: unknown): Promise<ValidatedCreateTaskData> => {
    try {
      return await createTaskSchema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new Error(`Task validatie errors: ${JSON.stringify(errors)}`);
      }
      throw error;
    }
  },

  /**
   * Valideer data voor het updaten van een task
   */
  update: async (data: unknown): Promise<ValidatedUpdateTaskData> => {
    try {
      return await updateTaskSchema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new Error(`Task validatie errors: ${JSON.stringify(errors)}`);
      }
      throw error;
    }
  }
};