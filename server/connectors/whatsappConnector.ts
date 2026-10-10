import { AppConnector, ConnectorToolDefinition } from '../services/pluginRegistry.js';
import { whatsappService } from '../services/whatsappService.js';
import { db } from '../storage/db.js';

export const whatsappConnector: AppConnector = {
  id: 'whatsapp',
  name: 'WhatsApp Multi-Device',
  description: 'Multi-device WhatsApp engine for checking updates, summarizing messages, and drafting replies',
  category: 'communication',
  isEnabled: () => true,
  getStatus: () => {
    const s = whatsappService.getStatus();
    if (s.status === 'connected') {
      return { connected: true, details: `Connected as ${s.user?.phone || 'Linked Device'}` };
    }
    return { connected: false, details: 'Pairing required (QR or 8-Digit code)' };
  },
  getTools: (): ConnectorToolDefinition[] => [
    {
      name: 'get_whatsapp_updates',
      description: 'Fetch and summarize recent WhatsApp messages, unread updates, and clerical action items in simple language',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'send_whatsapp_message',
      description: 'Send a WhatsApp message to a contact or phone number',
      parameters: {
        type: 'object',
        properties: {
          recipient: { type: 'string', description: 'Phone number with country code (e.g. 15551234567) or contact name' },
          message: { type: 'string', description: 'The text message to send' },
        },
        required: ['recipient', 'message'],
      },
    },
    {
      name: 'search_whatsapp_chats',
      description: 'Search WhatsApp messages from a specific person or with a specific keyword',
      parameters: {
        type: 'object',
        properties: {
          contactName: { type: 'string', description: 'Optional name of the contact' },
          keyword: { type: 'string', description: 'Keyword to search for in messages' },
        },
      },
    },
  ],
  executeTool: async (toolName: string, args: Record<string, any>) => {
    if (toolName === 'get_whatsapp_updates') {
      const summary = await whatsappService.getUpdatesSummary();
      return { summary };
    }

    if (toolName === 'send_whatsapp_message') {
      const result = await whatsappService.sendMessage(args.recipient, args.message);
      return { success: true, message: `WhatsApp message sent to ${args.recipient}.`, details: result };
    }

    if (toolName === 'search_whatsapp_chats') {
      const messages = db.getWhatsAppMessages();
      const filtered = messages.filter((m) => {
        const matchesContact = args.contactName
          ? m.fromName.toLowerCase().includes(args.contactName.toLowerCase()) || m.from.includes(args.contactName)
          : true;
        const matchesKeyword = args.keyword
          ? m.text.toLowerCase().includes(args.keyword.toLowerCase())
          : true;
        return matchesContact && matchesKeyword;
      }).slice(0, 10);

      return {
        count: filtered.length,
        messages: filtered.map((m) => ({ from: m.fromName, text: m.text, time: m.timestamp })),
      };
    }

    throw new Error(`Unknown tool: ${toolName}`);
  },
};
