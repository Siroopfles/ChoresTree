import { TemplateManager } from '../services/TemplateManager';
import { NotificationType } from '../../../atoms/notification/types';
import { TemplateError } from '../../../atoms/notification/errors';

describe('TemplateManager', () => {
  let templateManager: TemplateManager;

  beforeEach(() => {
    templateManager = new TemplateManager();
  });

  describe('registerTemplate', () => {
    const validTemplate = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.TASK_REMINDER,
      title: 'Task Reminder: {taskName}',
      content: 'Your task {taskName} is due {dueDate}',
      variables: ['taskName', 'dueDate'],
    };

    it('should register a valid template', () => {
      const result = templateManager.registerTemplate(validTemplate);
      expect(result).toEqual(validTemplate);
      expect(templateManager.hasTemplate(validTemplate.id)).toBe(true);
    });

    it('should throw error when registering duplicate template', () => {
      templateManager.registerTemplate(validTemplate);
      expect(() => templateManager.registerTemplate(validTemplate))
        .toThrow(TemplateError);
    });

    it('should throw error for invalid template', () => {
      const invalidTemplate = {
        ...validTemplate,
        id: 'not-a-uuid',
      };

      expect(() => templateManager.registerTemplate(invalidTemplate))
        .toThrow();
    });
  });

  describe('applyTemplate', () => {
    const template = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.TASK_REMINDER,
      title: 'Task Reminder: {taskName}',
      content: 'Your task {taskName} is due {dueDate}',
      variables: ['taskName', 'dueDate'],
    };

    const variables = {
      taskName: 'Complete Project',
      dueDate: 'tomorrow',
    };

    beforeEach(() => {
      templateManager.registerTemplate(template);
    });

    it('should apply variables correctly', () => {
      const result = templateManager.applyTemplate(template.id, variables);
      
      expect(result).toEqual({
        title: 'Task Reminder: Complete Project',
        message: 'Your task Complete Project is due tomorrow',
      });
    });

    it('should throw error for missing variables', () => {
      const incompleteVars = {
        taskName: 'Complete Project',
      };

      expect(() => templateManager.applyTemplate(template.id, incompleteVars))
        .toThrow();
    });

    it('should throw error for non-existent template', () => {
      expect(() => templateManager.applyTemplate('non-existent', variables))
        .toThrow(TemplateError);
    });
  });

  describe('updateTemplate', () => {
    const template = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.TASK_REMINDER,
      title: 'Task Reminder: {taskName}',
      content: 'Your task {taskName} is due {dueDate}',
      variables: ['taskName', 'dueDate'],
    };

    beforeEach(() => {
      templateManager.registerTemplate(template);
    });

    it('should update existing template', () => {
      const updatedTemplate = {
        ...template,
        title: 'Updated: {taskName}',
      };

      const result = templateManager.updateTemplate(template.id, updatedTemplate);
      expect(result.title).toBe('Updated: {taskName}');
    });

    it('should throw error when updating non-existent template', () => {
      expect(() => templateManager.updateTemplate('non-existent', template))
        .toThrow(TemplateError);
    });

    it('should throw error when template ID mismatches', () => {
      const mismatchTemplate = {
        ...template,
        id: '987fcdeb-51d2-4a56-b789-123456789012',
      };

      expect(() => templateManager.updateTemplate(template.id, mismatchTemplate))
        .toThrow(TemplateError);
    });
  });

  describe('deleteTemplate', () => {
    const template = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.TASK_REMINDER,
      title: 'Task Reminder: {taskName}',
      content: 'Your task {taskName} is due {dueDate}',
      variables: ['taskName', 'dueDate'],
    };

    beforeEach(() => {
      templateManager.registerTemplate(template);
    });

    it('should delete existing template', () => {
      templateManager.deleteTemplate(template.id);
      expect(templateManager.hasTemplate(template.id)).toBe(false);
    });

    it('should throw error when deleting non-existent template', () => {
      expect(() => templateManager.deleteTemplate('non-existent'))
        .toThrow(TemplateError);
    });
  });

  describe('getAllTemplates', () => {
    const templates = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: NotificationType.TASK_REMINDER,
        title: 'Task Reminder: {taskName}',
        content: 'Your task {taskName} is due {dueDate}',
        variables: ['taskName', 'dueDate'],
      },
      {
        id: '987fcdeb-51d2-4a56-b789-123456789012',
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task: {taskName}',
        content: '{assignedBy} assigned you a task: {taskName}',
        variables: ['taskName', 'assignedBy'],
      },
    ];

    beforeEach(() => {
      templates.forEach(template => templateManager.registerTemplate(template));
    });

    it('should return all registered templates', () => {
      const result = templateManager.getAllTemplates();
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining(templates));
    });
  });
});