import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { TaskListCommand } from '../list';
import { TaskManagementService } from '../../../../../molecules/task/services/TaskManagementService';
import { ITask } from '@/atomic/atoms/database/interfaces/Task';
import { TaskStatus } from '@/atomic/atoms/database/interfaces/Task';

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

describe('TaskListCommand', () => {
  let command: TaskListCommand;
  let mockInteraction: MockInteraction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup command instance
    command = new TaskListCommand();

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

    it('should return valid for correct input', async () => {
      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);
      expect(result.isValid).toBe(true);
    });
  });

  describe('execute', () => {
    it('should list all tasks when no filter is provided', async () => {
      const mockTasks: Partial<ITask>[] = [
        {
          id: 'task1',
          title: 'Test Task 1',
          description: 'Description 1',
          status: TaskStatus.PENDING
        },
        {
          id: 'task2',
          title: 'Test Task 2',
          description: 'Description 2',
          status: TaskStatus.IN_PROGRESS
        }
      ];

      (TaskManagementService.getInstance as jest.Mock).mockReturnValue({
        getPendingTasks: jest.fn().mockResolvedValue(mockTasks)
      });

      mockInteraction.options.getString.mockReturnValue(null);
      mockInteraction.options.getUser.mockReturnValue(null);

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            title: expect.stringContaining('Taken Overzicht'),
            fields: expect.arrayContaining([
              expect.objectContaining({
                name: expect.stringContaining('Test Task 1'),
                value: expect.stringContaining('Description 1')
              }),
              expect.objectContaining({
                name: expect.stringContaining('Test Task 2'),
                value: expect.stringContaining('Description 2')
              })
            ])
          })
        ]),
        ephemeral: true
      });
    });

    it('should filter tasks by status', async () => {
      const mockTasks: Partial<ITask>[] = [
        {
          id: 'task1',
          title: 'Test Task 1',
          description: 'Description 1',
          status: TaskStatus.COMPLETED
        }
      ];

      (TaskManagementService.getInstance as jest.Mock).mockReturnValue({
        getPendingTasks: jest.fn().mockResolvedValue(mockTasks)
      });

      mockInteraction.options.getString.mockReturnValue(TaskStatus.COMPLETED);
      mockInteraction.options.getUser.mockReturnValue(null);

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            title: expect.stringContaining('Taken Overzicht'),
            fields: expect.arrayContaining([
              expect.objectContaining({
                name: expect.stringContaining('Test Task 1'),
                value: expect.stringContaining('Description 1')
              })
            ])
          })
        ]),
        ephemeral: true
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      
      (TaskManagementService.getInstance as jest.Mock).mockReturnValue({
        getPendingTasks: jest.fn().mockRejectedValue(error)
      });

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Test error'),
        ephemeral: true
      });
    });
  });
});