import { Task } from '@/atomic/atoms/database/entities/Task';

export type TemplateVariables = Record<string, unknown>;

export class NotificationFormatterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationFormatterError';
  }
}

export class NotificationFormatter {
  /**
   * Format a template by replacing placeholders with actual values
   */
  static format(
    template: string,
    task: Task,
    variables: TemplateVariables = {}
  ): string {
    try {
      let content = template;

      // Replace task placeholders
      content = content.replace(/{task\.([^}]+)}/g, (_, prop) => {
        const value = task[prop as keyof Task];
        if (value === undefined) {
          throw new NotificationFormatterError(`Invalid task property: ${prop}`);
        }
        return value.toString();
      });

      // Replace additional variables
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        if (!content.includes(placeholder)) {
          throw new NotificationFormatterError(`Template does not contain placeholder: ${placeholder}`);
        }
        content = content.replace(
          new RegExp(placeholder, 'g'),
          value?.toString() || ''
        );
      });

      return content;
    } catch (error) {
      if (error instanceof NotificationFormatterError) {
        throw error;
      }
      throw new NotificationFormatterError(
        `Failed to format template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add user mentions to a formatted message
   */
  static addMentions(content: string, userIds: string[]): string {
    if (!userIds.length) {
      return content;
    }

    const mentions = userIds.map(id => `<@${id}>`).join(' ');
    return `${mentions}\n${content}`;
  }
}