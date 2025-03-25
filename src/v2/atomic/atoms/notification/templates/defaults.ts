import { NotificationType } from '../types/enums';

/**
 * Default notification templates for each notification type
 */
export const defaultTemplates: Record<NotificationType, string> = {
  // Legacy templates
  [NotificationType.REMINDER]: 
    '🔔 Reminder voor taak "{task.title}"\n\nDeadline: {task.deadline}\nStatus: {task.status}',
  
  [NotificationType.TASK_CREATED]:
    '📝 Nieuwe taak aangemaakt: "{task.title}"\n\nBeschrijving: {task.description}\nToegewezen aan: {task.assignee}',
  
  [NotificationType.TASK_UPDATED]:
    '✏️ Taak bijgewerkt: "{task.title}"\n\nAangepaste velden: {changes}',
  
  // V2 templates
  [NotificationType.TASK_REMINDER]: 
    '🔔 Reminder voor taak "{task.title}"\n\nDeadline: {task.deadline}\nStatus: {task.status}',
  
  [NotificationType.TASK_DUE]:
    '⏰ Taak deadline nadert: "{task.title}"\n\nDeadline: {task.deadline}\nStatus: {task.status}',
  
  [NotificationType.TASK_OVERDUE]:
    '⚠️ Taak over tijd: "{task.title}"\n\nDeadline was: {task.deadline}',
  
  [NotificationType.TASK_ASSIGNED]:
    '👤 Taak toegewezen: "{task.title}"\n\nToegewezen aan: {task.assignee}\nDeadline: {task.deadline}',
  
  [NotificationType.TASK_COMPLETED]:
    '✅ Taak voltooid: "{task.title}"\n\nVoltooid door: {completedBy}',
  
  [NotificationType.SYSTEM_ALERT]:
    '🔧 Systeem melding\n\n{message}'
};