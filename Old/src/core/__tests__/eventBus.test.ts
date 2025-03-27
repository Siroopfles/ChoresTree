import { eventBus, type EventHandler } from '../eventBus';

describe('EventBus', () => {
  beforeEach(() => {
    // Reset event handlers between tests
    const handlers = (eventBus as any).handlers;
    handlers.clear();
  });

  it('should register and trigger event handlers', async () => {
    const mockHandler = jest.fn();
    const testData = { message: 'test' };

    eventBus.on('test', mockHandler);
    await eventBus.emit('test', testData);

    expect(mockHandler).toHaveBeenCalledWith(testData);
  });

  it('should handle multiple handlers for same event', async () => {
    const mockHandler1 = jest.fn();
    const mockHandler2 = jest.fn();
    const testData = { message: 'test' };

    eventBus.on('test', mockHandler1);
    eventBus.on('test', mockHandler2);
    await eventBus.emit('test', testData);

    expect(mockHandler1).toHaveBeenCalledWith(testData);
    expect(mockHandler2).toHaveBeenCalledWith(testData);
  });

  it('should remove event handler', async () => {
    const mockHandler = jest.fn();
    const testData = { message: 'test' };

    eventBus.on('test', mockHandler);
    eventBus.off('test', mockHandler);
    await eventBus.emit('test', testData);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should handle async event handlers', async () => {
    const mockHandler: EventHandler<string> = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    eventBus.on('asyncTest', mockHandler);
    const startTime = Date.now();
    await eventBus.emit('asyncTest', 'test');
    const endTime = Date.now();

    expect(mockHandler).toHaveBeenCalledWith('test');
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });
});
