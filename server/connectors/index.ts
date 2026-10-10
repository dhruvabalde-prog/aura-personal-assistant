import { pluginRegistry } from '../services/pluginRegistry.js';
import { notesConnector } from './notesConnector.js';
import { tasksConnector } from './tasksConnector.js';
import { knowledgeConnector } from './knowledgeConnector.js';
import { whatsappConnector } from './whatsappConnector.js';
import { googleWorkspaceConnector } from './googleWorkspaceConnector.js';

let initialized = false;

export function registerAllConnectors() {
  if (initialized) return;
  initialized = true;

  pluginRegistry.register(notesConnector);
  pluginRegistry.register(tasksConnector);
  pluginRegistry.register(knowledgeConnector);
  pluginRegistry.register(whatsappConnector);
  pluginRegistry.register(googleWorkspaceConnector);
}

// Auto-register upon import
registerAllConnectors();
