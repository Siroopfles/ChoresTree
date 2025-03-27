import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { TaskCreateCommand } from '../create';
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
jest.mock('@/core/database/DatabaseService');
jest.mock('@/core');
jest.mock('../../../../../molecules/task/services/TaskManagementService');

describe('TaskCreateCommand', () => {
  let command: TaskCreateCommand;
  let mockInteraction: MockInteraction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup command instance
    command = new TaskCreateCommand();

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
      mockInteraction.options.getString = jest.fn()
        .mockImplementation((name) => name === 'deadline' ? 'invalid-date' : null);

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Ongeldige deadline datum. Gebruik het formaat YYYY-MM-DD');
    });

    it('should return valid for correct input', async () => {
      mockInteraction.options.getString = jest.fn()
        .mockImplementation((name) => name === 'deadline' ? '2025-12-31' : null);

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(true);
    });
  });

  describe('execute', () => {
    it('should create a task successfully', async () => {
      // Mock input data
      const mockTask: Partial<ITask> = {
        id: 'task123',
        title: 'Test Task',
        description: 'Test Description',
        deadline: new Date('2025-12-31')
      };

      mockInteraction.options.getString = jest.fn()
        .mockImplementation((name) => {
          switch (name) {
            case 'naam': return 'Test Task';
            case 'beschrijving': return 'Test Description';
            case 'deadline': return '2025-12-31';
            default: return null;
          }
        });

      // Mock TaskManagementService
      (TaskManagementService.getInstance as jest.Mock).mockReturnValue({
        createTask: jest.fn().mockResolvedValue(mockTask)
      });

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      // Verify reply was called with success message
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Test Task'),
        ephemeral: true
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      
      // Mock TaskManagementService to throw error
      (TaskManagementService.getInstance as jest.Mock).mockReturnValue({
        createTask: jest.fn().mockRejectedValue(error)
      });

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      // Verify error reply
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Test error'),
        ephemeral: true
      });
    });
  });
});