import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { TaskUpdateCommand } from '../update';
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

describe('TaskUpdateCommand', () => {
  let command: TaskUpdateCommand;
  let mockInteraction: MockInteraction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup command instance
    command = new TaskUpdateCommand();

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
      memberPermissions: new PermissionsBitField()
    };
  });

  describe('validate', () => {
    it('should return invalid when used outside a guild', async () => {
      mockInteraction.guildId = null;

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Dit command kan alleen in servers gebruikt worden');
    });

    it('should return invalid for invalid deadline format', async () => {
      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'deadline') return 'invalid-date';
        return null;
      });

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Ongeldige deadline datum. Gebruik het formaat YYYY-MM-DD');
    });

    it('should return valid for correct input', async () => {
      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'deadline') return '2025-12-31';
        return 'test';
      });

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(true);
    });
  });

  describe('execute', () => {
    it('should update task successfully', async () => {
      const mockTask: Partial<ITask> = {
        id: 'task123',
        title: 'Updated Task',
        description: 'Updated Description',
        deadline: new Date('2025-12-31')
      };

      (TaskManagementService.getInstance as jest.Mock).mockReturnValue({
        updateTask: jest.fn().mockResolvedValue(mockTask)
      });

      mockInteraction.options.getString.mockImplementation((name) => {
        switch (name) {
          case 'id': return 'task123';
          case 'naam': return 'Updated Task';
          case 'beschrijving': return 'Updated Description';
          case 'deadline': return '2025-12-31';
          default: return null;
        }
      });

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Updated Task'),
        ephemeral: true
      });
    });

    it('should require at least one field to update', async () => {
      mockInteraction.options.getString.mockReturnValue(null);

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Je moet minimaal één veld opgeven om te wijzigen'),
        ephemeral: true
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');

      (TaskManagementService.getInstance as jest.Mock).mockReturnValue({
        updateTask: jest.fn().mockRejectedValue(error)
      });

      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'id') return 'task123';
        if (name === 'naam') return 'Updated Task';
        return null;
      });

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Test error'),
        ephemeral: true
      });
    });
  });
});