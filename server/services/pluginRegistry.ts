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
  isEnabled: () => boolean;
  getStatus: () => { connected: boolean; details?: string };
  getTools: () => ConnectorToolDefinition[];
  executeTool: (toolName: string, args: Record<string, any>) => Promise<any>;
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

  getAllTools(): Array<{ connectorId: string; tool: ConnectorToolDefinition }> {
    const list: Array<{ connectorId: string; tool: ConnectorToolDefinition }> = [];
    for (const connector of this.connectors.values()) {
      if (connector.isEnabled()) {
        for (const tool of connector.getTools()) {
          list.push({ connectorId: connector.id, tool });
        }
      }
    }
    return list;
  }

  async execute(toolName: string, args: Record<string, any>): Promise<any> {
    for (const connector of this.connectors.values()) {
      if (connector.isEnabled()) {
        const hasTool = connector.getTools().some((t) => t.name === toolName);
        if (hasTool) {
          console.log(`[Plugin Registry] Executing ${toolName} on connector ${connector.name}`);
          return await connector.executeTool(toolName, args);
        }
      }
    }
    throw new Error(`Tool "${toolName}" not found in any enabled connector.`);
  }

  getStatusList() {
    return Array.from(this.connectors.values()).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      enabled: c.isEnabled(),
      status: c.getStatus(),
      toolsCount: c.getTools().length,
    }));
  }
}

export const pluginRegistry = new PluginRegistry();
