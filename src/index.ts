import { eventBus } from './core';

// Temporary test setup
async function main(): Promise<void> {
  // Subscribe to test event
  eventBus.on<string>('test', async (message) => {
    console.log(`Received test message: ${message}`);
  });

  // Emit test event
  await eventBus.emit('test', 'Hello ChoresTree!');
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
