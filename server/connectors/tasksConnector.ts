import { AppConnector, ConnectorToolDefinition } from '../services/pluginRegistry.js';
import { db } from '../storage/db.js';

export const tasksConnector: AppConnector = {
  id: 'tasks',
  name: 'Tasks & To-Dos',
  description: 'Clerical to-do and priority tracker synced with Google Tasks and communications',
  category: 'productivity',
  isEnabled: () => true,
  getStatus: () => ({
    connected: true,
    details: `${db.getTasks().filter((t) => !t.completed).length} open tasks`,
  }),
  getTools: (): ConnectorToolDefinition[] => [
    {
      name: 'create_task',
      description: 'Add a new clerical task or to-do item for the user',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'What needs to be done' },
          deadline: { type: 'string', description: 'When it is due, e.g. "by 5 PM", "tomorrow", "Friday"' },
          urgency: { type: 'string', description: 'Urgency level', enum: ['high', 'medium', 'low'] },
        },
        required: ['title'],
      },
    },
    {
      name: 'list_pending_tasks',
      description: 'Get all active or pending tasks for the user',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'mark_task_completed',
      description: 'Mark a task as completed once finished',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The ID of the task to mark completed' },
        },
        required: ['taskId'],
      },
    },
  ],
  executeTool: async (toolName: string, args: Record<string, any>, userEmail?: string) => {
    if (toolName === 'create_task') {
      const task = db.addTask(userEmail || 'guest', {
        title: args.title,
        deadline: args.deadline,
        urgency: args.urgency || 'medium',
        source: 'voice',
        completed: false,
      });
      return { success: true, message: `Task "${task.title}" added to your list.`, task };
    }

    if (toolName === 'list_pending_tasks') {
      const tasks = db.getTasks(userEmail).filter((t) => !t.completed);
      return { tasks };
    }

    if (toolName === 'mark_task_completed') {
      db.updateTask(userEmail || 'guest', args.taskId, { completed: true });
      return { success: true, message: 'Task marked as completed.' };
    }

    throw new Error(`Unknown tool: ${toolName}`);
  },
};
