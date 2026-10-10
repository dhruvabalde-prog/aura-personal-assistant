import { AppConnector, ConnectorToolDefinition } from '../services/pluginRegistry.js';
import { db } from '../storage/db.js';

export const notesConnector: AppConnector = {
  id: 'notes',
  name: 'Notes & Keep',
  description: 'Quick notes, thoughts, and ideas saved locally and ready to sync with Google Keep',
  category: 'productivity',
  isEnabled: () => true,
  getStatus: () => ({ connected: true, details: `${db.getNotes().length} notes active` }),
  getTools: (): ConnectorToolDefinition[] => [
    {
      name: 'save_note',
      description: 'Save a quick note, memo, or thought for the user',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Brief title for the note' },
          content: { type: 'string', description: 'The text content or thought to save' },
          tags: { type: 'string', description: 'Comma separated tags (e.g. personal, idea, urgent)' },
        },
        required: ['title', 'content'],
      },
    },
    {
      name: 'list_notes',
      description: 'Fetch all current notes or search for a specific thought',
      parameters: {
        type: 'object',
        properties: {
          searchQuery: { type: 'string', description: 'Optional keyword to search notes' },
        },
      },
    },
  ],
  executeTool: async (toolName: string, args: Record<string, any>) => {
    if (toolName === 'save_note') {
      const tags = typeof args.tags === 'string' ? args.tags.split(',').map((t: string) => t.trim()) : [];
      const note = db.addNote({
        title: args.title,
        content: args.content,
        tags,
      });
      return { success: true, message: `Note "${note.title}" saved.`, note };
    }

    if (toolName === 'list_notes') {
      const notes = db.getNotes();
      if (args.searchQuery) {
        const query = args.searchQuery.toLowerCase();
        const filtered = notes.filter(
          (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
        );
        return { notes: filtered };
      }
      return { notes };
    }

    throw new Error(`Unknown tool: ${toolName}`);
  },
};
