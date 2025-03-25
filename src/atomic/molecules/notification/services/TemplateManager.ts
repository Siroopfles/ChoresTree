import { NotificationTemplate } from '../../../atoms/notification/types';
import { validateTemplate, validateTemplateVariables } from '../../../atoms/notification/validation';
import { TemplateError } from '../../../atoms/notification/errors';

/**
 * Manages notification templates and handles variable substitution
 */
export class TemplateManager {
  private templates: Map<string, NotificationTemplate> = new Map();

  /**
   * Register a new notification template
   */
  public registerTemplate(template: unknown): NotificationTemplate {
    const validatedTemplate = validateTemplate(template);
    
    if (this.templates.has(validatedTemplate.id)) {
      throw new TemplateError(`Template with ID ${validatedTemplate.id} already exists`);
    }

    this.templates.set(validatedTemplate.id, validatedTemplate);
    return validatedTemplate;
  }

  /**
   * Get a template by ID
   */
  public getTemplate(templateId: string): NotificationTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new TemplateError(`Template with ID ${templateId} not found`);
    }
    return template;
  }

  /**
   * Delete a template by ID
   */
  public deleteTemplate(templateId: string): void {
    if (!this.templates.delete(templateId)) {
      throw new TemplateError(`Template with ID ${templateId} not found`);
    }
  }

  /**
   * Update an existing template
   */
  public updateTemplate(templateId: string, template: unknown): NotificationTemplate {
    if (!this.templates.has(templateId)) {
      throw new TemplateError(`Template with ID ${templateId} not found`);
    }

    const validatedTemplate = validateTemplate(template);
    if (validatedTemplate.id !== templateId) {
      throw new TemplateError('Template ID mismatch');
    }

    this.templates.set(templateId, validatedTemplate);
    return validatedTemplate;
  }

  /**
   * Apply variables to a template
   */
  public applyTemplate(templateId: string, variables: Record<string, string>): {
    title: string;
    message: string;
  } {
    const template = this.getTemplate(templateId);
    validateTemplateVariables(template, variables);

    let { title, content } = template;

    // Replace variables in title and content
    template.variables.forEach((variable: string) => {
      const value = variables[variable];
      const pattern = new RegExp(`{${variable}}`, 'g');
      
      title = title.replace(pattern, value);
      content = content.replace(pattern, value);
    });

    return {
      title,
      message: content,
    };
  }

  /**
   * Check if a template exists
   */
  public hasTemplate(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  /**
   * Get all registered templates
   */
  public getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Validate template variables without applying them
   */
  public validateVariables(templateId: string, variables: Record<string, string>): void {
    const template = this.getTemplate(templateId);
    validateTemplateVariables(template, variables);
  }
}