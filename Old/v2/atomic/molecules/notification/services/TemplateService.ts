import { NotificationTemplateEntity } from '../../../atoms/notification/templates/NotificationTemplate.entity';
import { NotificationType } from '../../../atoms/notification/types/enums';
import { defaultTemplates } from '../../../atoms/notification/templates/defaults';
import { validateTemplate } from '../../../atoms/notification/templates/validation';
import { TemplateRepository } from '../repositories/TemplateRepository';

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class TemplateService {
  private static instance: TemplateService;
  private repository: TemplateRepository;

  private constructor() {
    this.repository = new TemplateRepository();
  }

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Set a custom template for a specific notification type
   */
  async setTemplate(
    type: NotificationType,
    serverId: string,
    template: string
  ): Promise<NotificationTemplateEntity> {
    try {
      // Validate template before saving
      validateTemplate(template, type);

      const existing = await this.repository.findTemplate(type, serverId);

      if (existing) {
        const updated = await this.repository.updateTemplate(type, serverId, template);
        if (!updated) {
          throw new TemplateError('Failed to update template');
        }
        return updated;
      }

      return this.repository.createTemplate(type, serverId, template);
    } catch (error) {
      throw new TemplateError(
        `Failed to set template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a template for a specific notification type
   */
  async getTemplate(
    type: NotificationType,
    serverId: string,
    defaultTemplate?: string
  ): Promise<string> {
    try {
      const template = await this.repository.findTemplate(type, serverId);

      if (!template) {
        if (defaultTemplate) {
          validateTemplate(defaultTemplate, type);
          return defaultTemplate;
        }
        return defaultTemplates[type];
      }

      return template.template;
    } catch (error) {
      throw new TemplateError(
        `Failed to get template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a custom template
   */
  async deleteTemplate(type: NotificationType, serverId: string): Promise<void> {
    try {
      await this.repository.deleteTemplate(type, serverId);
    } catch (error) {
      throw new TemplateError(
        `Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all templates for a server
   */
  async getAllTemplates(serverId: string): Promise<NotificationTemplateEntity[]> {
    try {
      return this.repository.getAllTemplates(serverId);
    } catch (error) {
      throw new TemplateError(
        `Failed to get templates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}