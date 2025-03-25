import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { TaskStatusCommand } from '../status';
import { TaskManagementService } from '../../../../../molecules/task/services/TaskManagementService';
import { ITask, TaskStatus } from '@/atomic/atoms/database/interfaces/Task';

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

describe('TaskStatusCommand', () => {
  let command: TaskStatusCommand;
  let mockInteraction: MockInteraction;
  let mockTaskService: {
    getTaskById: jest.Mock;
    updateTaskStatus: jest.Mock;
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock task service with typed mocks
    mockTaskService = {
      getTaskById: jest.fn().mockResolvedValue(null),
      updateTaskStatus: jest.fn().mockResolvedValue(undefined)
    };

    (TaskManagementService.getInstance as jest.Mock).mockReturnValue(mockTaskService);

    // Setup command instance
    command = new TaskStatusCommand();

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
      title: 'Test Task',
      assigneeId: 'user123'
    };

    beforeEach(() => {
      mockTaskService.getTaskById.mockResolvedValue(mockTask);
      mockInteraction.options.getString.mockReturnValue('task123');
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

    it('should return invalid when user has no permission and is not assignee', async () => {
      mockInteraction.memberPermissions = new PermissionsBitField();
      mockTask.assigneeId = 'other-user';
      
      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Je hebt geen toestemming om de status van deze taak te wijzigen');
    });

    it('should return valid when user is task assignee', async () => {
      mockInteraction.memberPermissions = new PermissionsBitField();
      mockTask.assigneeId = 'user123';

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(true);
    });

    it('should return valid when user has manage messages permission', async () => {
      mockTask.assigneeId = 'other-user';
      mockInteraction.memberPermissions = new PermissionsBitField([PermissionsBitField.Flags.ManageMessages]);

      const result = await command.validate(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(result.isValid).toBe(true);
    });
  });

  describe('execute', () => {
    const mockTask: Partial<ITask> = {
      id: 'task123',
      title: 'Test Task',
      status: TaskStatus.PENDING
    };

    beforeEach(() => {
      mockTaskService.updateTaskStatus.mockResolvedValue(mockTask);
      mockInteraction.options.getString
        .mockImplementation((name) => {
          if (name === 'id') return 'task123';
          if (name === 'status') return TaskStatus.IN_PROGRESS;
          return null;
        });
    });

    it('should update task status successfully', async () => {
      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockTaskService.updateTaskStatus).toHaveBeenCalledWith(
        'task123',
        TaskStatus.IN_PROGRESS,
        '123456789',
        'user123'
      );

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('in_progress'),
        ephemeral: true
      });
    });

    it('should show completion emoji for completed tasks', async () => {
      mockTask.status = TaskStatus.COMPLETED;
      mockInteraction.options.getString
        .mockImplementation((name) => {
          if (name === 'id') return 'task123';
          if (name === 'status') return TaskStatus.COMPLETED;
          return null;
        });

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('✅'),
        ephemeral: true
      });
    });

    it('should handle general errors gracefully', async () => {
      const error = new Error('Test error');
      mockTaskService.updateTaskStatus.mockRejectedValue(error);

      await command.execute(mockInteraction as unknown as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Test error'),
        ephemeral: true
      });
    });
  });
});