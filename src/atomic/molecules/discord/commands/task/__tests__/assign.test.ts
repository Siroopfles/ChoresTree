import { ChatInputCommandInteraction, PermissionsBitField, User } from 'discord.js';
import { TaskAssignCommand } from '../assign';
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

describe('TaskAssignCommand', () => {
  let command: TaskAssignCommand;
  let mockInteraction: MockInteraction;
  let mockTaskService: {
    getTaskById: jest.Mock;
    assignTask: jest.Mock;
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock task service with typed mocks
    mockTaskService = {
      getTaskById: jest.fn().mockResolvedValue(null),
      assignTask: jest.fn().mockResolvedValue(undefined)
    };

    (TaskManagementService.getInstance as jest.Mock).mockReturnValue(mockTaskService);

    // Setup command instance
    command = new TaskAssignCommand();

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

    it('should return invalid when task does not exist', async () => {
      mockInteraction.options.getString.mockReturnValue('nonexistent-task');
      mockTaskService.getTaskById.mockResolvedValue(null);

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Taak niet gevonden');
    });

    it('should return valid when task exists', async () => {
      const mockTask: Partial<ITask> = {
        id: 'task123',
        title: 'Test Task'
      };

      mockInteraction.options.getString.mockReturnValue('task123');
      mockTaskService.getTaskById.mockResolvedValue(mockTask);

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(true);
    });
  });

  describe('execute', () => {
    it('should assign task successfully', async () => {
      const mockAssignee = {
        id: 'assignee123',
        username: 'TestUser'
      } as User;

      const mockTask: Partial<ITask> = {
        id: 'task123',
        title: 'Test Task',
        assigneeId: mockAssignee.id
      };

      mockInteraction.options.getString.mockReturnValue('task123');
      mockInteraction.options.getUser.mockReturnValue(mockAssignee);
      mockTaskService.assignTask.mockResolvedValue(mockTask);

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockTaskService.assignTask).toHaveBeenCalledWith(
        'task123',
        'assignee123',
        '123456789'
      );
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('TestUser'),
        ephemeral: true
      });
    });

    it('should handle missing assignee error', async () => {
      mockInteraction.options.getString.mockReturnValue('task123');
      mockInteraction.options.getUser.mockReturnValue(null);

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('fout'),
        ephemeral: true
      });
    });

    it('should handle general errors gracefully', async () => {
      const error = new Error('Test error');
      const mockAssignee = { id: 'assignee123', username: 'TestUser' } as User;

      mockInteraction.options.getString.mockReturnValue('task123');
      mockInteraction.options.getUser.mockReturnValue(mockAssignee);
      mockTaskService.assignTask.mockRejectedValue(error);

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Test error'),
        ephemeral: true
      });
    });
  });
});