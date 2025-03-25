import { ChatInputCommandInteraction, PermissionsBitField, User, WebSocketManager } from 'discord.js';
import { TestCommand } from '../test';
import { PermissionError, RateLimitError } from '../../../../atoms/discord/types';
import { eventBus } from '../../../../../core/eventBus';

// Mock event bus
jest.mock('../../../../../core/eventBus', () => ({
  eventBus: {
    emit: jest.fn()
  }
}));

describe('TestCommand', () => {
  let command: TestCommand;
  let mockPermissions: PermissionsBitField;
  let mockInteraction: ChatInputCommandInteraction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh command instance
    command = new TestCommand();

    // Setup permissions
    mockPermissions = new PermissionsBitField();
    jest.spyOn(mockPermissions, 'has');

    // Create mock user
    const mockUser = {
      id: 'testUserId',
      username: 'testUser',
      discriminator: '1234',
      avatar: null,
      bot: false
    } as unknown as User;

    // Create mock websocket manager
    const mockWs = {
      ping: 50
    } as unknown as WebSocketManager;

    // Setup mock interaction
    mockInteraction = {
      reply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
      user: mockUser,
      guildId: 'testGuildId',
      memberPermissions: mockPermissions,
      client: {
        ws: mockWs
      },
      createdTimestamp: Date.now(),
      // Add required properties for ChatInputCommandInteraction
      commandId: 'testCommandId',
      commandName: 'test',
      deferred: false,
      replied: false,
      ephemeral: false,
      options: {
        data: [],
        getString: jest.fn(),
        getNumber: jest.fn(),
        getBoolean: jest.fn(),
        getUser: jest.fn(),
        getMember: jest.fn(),
        getChannel: jest.fn(),
        getRole: jest.fn(),
        getMentionable: jest.fn(),
        getInteger: jest.fn(),
        getAttachment: jest.fn()
      }
    } as unknown as ChatInputCommandInteraction;
  });

  describe('validate', () => {
    it('should pass validation when in a guild', async () => {
      const result = await command.validate(mockInteraction);
      expect(result.isValid).toBe(true);
    });

    it('should fail validation when not in a guild', async () => {
      const noGuildInteraction = {
        ...mockInteraction,
        guildId: null
      } as unknown as ChatInputCommandInteraction;

      const result = await command.validate(noGuildInteraction);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Dit command kan alleen in servers gebruikt worden');
    });
  });

  describe('execute', () => {
    it('should execute successfully with proper permissions', async () => {
      jest.spyOn(mockPermissions, 'has').mockReturnValue(true);
      
      await command.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Command systeem werkt! Alle validaties zijn geslaagd.',
        ephemeral: true
      });
    });

    it('should throw PermissionError when missing permissions', async () => {
      jest.spyOn(mockPermissions, 'has').mockReturnValue(false);

      await expect(command.execute(mockInteraction))
        .rejects.toThrow(PermissionError);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Je hebt de volgende permissie nodig:'),
        ephemeral: true
      });
      
      expect(eventBus.emit).toHaveBeenCalledWith('command.permission.denied', expect.any(Object));
    });

    it('should handle cooldown', async () => {
      jest.spyOn(mockPermissions, 'has').mockReturnValue(true);

      // Eerste uitvoering moet slagen
      await command.execute(mockInteraction);
      
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'Command systeem werkt! Alle validaties zijn geslaagd.',
        ephemeral: true
      });

      // Tweede uitvoering moet RateLimitError geven
      await expect(command.execute(mockInteraction))
        .rejects.toThrow(RateLimitError);
        
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Wacht nog'),
        ephemeral: true
      });
    });
  });
});