import { db } from '../storage/db.js';

export interface ConnectorToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: any;
    }>;
    required?: string[];
  };
}

export interface AppConnector {
  id: string;
  name: string;
  description: string;
  category: 'communication' | 'google_workspace' | 'knowledge' | 'productivity' | 'custom';
  isEnabled: (userEmail?: string) => boolean;
  getStatus: (userEmail?: string) => { connected: boolean; details?: string };
  getTools: () => ConnectorToolDefinition[];
  executeTool: (toolName: string, args: Record<string, any>, userEmail?: string) => Promise<any>;
}

class PluginRegistry {
  private connectors: Map<string, AppConnector> = new Map();

  register(connector: AppConnector) {
    this.connectors.set(connector.id, connector);
    console.log(`[Plugin Registry] Registered connector: ${connector.name} (${connector.id})`);
  }

  get(id: string): AppConnector | undefined {
    return this.connectors.get(id);
  }

  getAll(): AppConnector[] {
    return Array.from(this.connectors.values());
  }

  getAllTools(userEmail?: string): Array<{ connectorId: string; tool: ConnectorToolDefinition }> {
    const list: Array<{ connectorId: string; tool: ConnectorToolDefinition }> = [];
    for (const connector of this.connectors.values()) {
      if (connector.isEnabled(userEmail)) {
        for (const tool of connector.getTools()) {
          list.push({ connectorId: connector.id, tool });
        }
      }
    }
    return list;
  }

  async execute(toolName: string, args: Record<string, any>, userEmail?: string): Promise<any> {
    for (const connector of this.connectors.values()) {
      if (connector.isEnabled(userEmail)) {
        const hasTool = connector.getTools().some((t) => t.name === toolName);
        if (hasTool) {
          console.log(`[Plugin Registry] Executing ${toolName} on connector ${connector.name} for ${userEmail || 'guest'}`);
          return await connector.executeTool(toolName, args, userEmail);
        }
      }
    }
    throw new Error(`Tool "${toolName}" not found in any enabled connector.`);
  }

  getStatusList(userEmail?: string) {
    return Array.from(this.connectors.values()).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      enabled: c.isEnabled(userEmail),
      status: c.getStatus(userEmail),
      toolsCount: c.getTools().length,
    }));
  }
}

export const pluginRegistry = new PluginRegistry();

