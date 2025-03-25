// Re-export all type definitions
export * from './validation';
export * from './assignment';
export * from './status';
export * from './events';
export * from './history';

// Type namespaces for better organization
import * as ValidationTypes from './validation';
import * as AssignmentTypes from './assignment';
import * as StatusTypes from './status';
import * as EventTypes from './events';
import * as HistoryTypes from './history';

export {
  ValidationTypes,
  AssignmentTypes,
  StatusTypes,
  EventTypes,
  HistoryTypes,
};