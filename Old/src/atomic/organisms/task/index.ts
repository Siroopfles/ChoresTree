import { Task } from '@/atomic/atoms/database/entities/Task';
import { TaskProcessor } from './TaskProcessor';
import { TaskRepository } from '@/atomic/molecules/database/repositories/TaskRepository';
import { eventBus } from '@/core/eventBus';

// Singleton instance voor TaskProcessor
const taskRepository = new TaskRepository();
export const taskProcessor = TaskProcessor.getInstance(taskRepository, eventBus);

// Re-export de TaskProcessor class voor testing/mocking
export { TaskProcessor };

// Type exports voor externe gebruik
export type { Task };