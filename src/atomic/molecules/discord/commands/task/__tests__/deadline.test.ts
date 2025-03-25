import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { TaskDeadlineCommand } from '../deadline';
import { TaskManagementService } from '../../../../../molecules/task/services/TaskManagementService';
import { ITask } from '@/atomic/atoms/database/interfaces/Task';

// Test types
type MockInteraction = {
  guildId: string | null;
  options: {
    getString: jest.Mock;
    getUser: jest.Mock;
  };
  user: {
    id: string;
  };
  reply: jest.Mock;
  memberPermissions: PermissionsBitField;
};

// Mock de dependencies
jest.mock('@/core');
jest.mock('../../../../../molecules/task/services/TaskManagementService');

describe('TaskDeadlineCommand', () => {
  let command: TaskDeadlineCommand;
  let mockInteraction: MockInteraction;
  let mockTaskService: {
    getTaskById: jest.Mock;
    updateTask: jest.Mock;
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock task service with typed mocks
    mockTaskService = {
      getTaskById: jest.fn().mockResolvedValue(null),
      updateTask: jest.fn().mockResolvedValue(undefined)
    };

    (TaskManagementService.getInstance as jest.Mock).mockReturnValue(mockTaskService);

    // Setup command instance
    command = new TaskDeadlineCommand();

    // Setup mock interaction
    mockInteraction = {
      guildId: '123456789',
      options: {
        getString: jest.fn(),
        getUser: jest.fn()
      },
      user: {
        id: 'user123'
      },
      reply: jest.fn(),
      memberPermissions: new PermissionsBitField([PermissionsBitField.Flags.ManageMessages])
    };
  });

  describe('validate', () => {
    const mockTask: Partial<ITask> = {
      id: 'task123',
      title: 'Test Task'
    };

    beforeEach(() => {
      mockTaskService.getTaskById.mockResolvedValue(mockTask);
      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'id') return 'task123';
        if (name === 'datum') return '2025-12-31';
        return null;
      });
    });

    it('should return invalid when used outside a guild', async () => {
      mockInteraction.guildId = null;

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Dit command kan alleen in servers gebruikt worden');
    });

    it('should return invalid when task does not exist', async () => {
      mockTaskService.getTaskById.mockResolvedValue(null);

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Taak niet gevonden');
    });

    it('should return invalid for invalid date format', async () => {
      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'id') return 'task123';
        if (name === 'datum') return 'invalid-date';
        return null;
      });

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Ongeldige deadline datum. Gebruik het formaat YYYY-MM-DD');
    });

    it('should return invalid for past date', async () => {
      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'id') return 'task123';
        if (name === 'datum') return '2020-01-01';
        return null;
      });

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('De deadline kan niet in het verleden liggen');
    });

    it('should return valid for correct future date', async () => {
      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);
      expect(result.isValid).toBe(true);
    });
  });

  describe('execute', () => {
    const mockTask: Partial<ITask> = {
      id: 'task123',
      title: 'Test Task',
      deadline: new Date('2025-12-31')
    };

    beforeEach(() => {
      mockTaskService.updateTask.mockResolvedValue(mockTask);
      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'id') return 'task123';
        if (name === 'datum') return '2025-12-31';
        return null;
      });
    });

    it('should update task deadline successfully', async () => {
      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockTaskService.updateTask).toHaveBeenCalledWith(
        'task123',
        expect.objectContaining({
          deadline: expect.any(Date)
        }),
        '123456789'
      );

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('31-12-2025'),
        ephemeral: true
      });
    });

    it('should format the date in Dutch locale', async () => {
      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('31-12-2025'),
        ephemeral: true
      });
    });

    it('should handle general errors gracefully', async () => {
      const error = new Error('Test error');
      mockTaskService.updateTask.mockRejectedValue(error);

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Test error'),
        ephemeral: true
      });
    });
  });
});