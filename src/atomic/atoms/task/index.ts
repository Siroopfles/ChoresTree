// Re-export all task atoms
export * from './types';
export * from './status';
export * from './validation';

// Export all as namespaces for better organization
import * as TaskTypes from './types';
import * as TaskStatus from './status';
import * as TaskValidation from './validation';

export {
  TaskTypes,
  TaskStatus,
  TaskValidation,
};