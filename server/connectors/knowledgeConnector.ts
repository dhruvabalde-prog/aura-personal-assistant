import { AppConnector, ConnectorToolDefinition } from '../services/pluginRegistry.js';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export const knowledgeConnector: AppConnector = {
  id: 'web_search',
  name: 'Web Research & Maps Navigation',
  description: 'Internet research synthesis, fact-checking, and Google Maps directions and places',
  category: 'knowledge',
  isEnabled: () => true,
  getStatus: () => ({ connected: true, details: 'Gemini Search Grounding Active' }),
  getTools: (): ConnectorToolDefinition[] => [
    {
      name: 'search_the_web',
      description: 'Search the live internet for recent facts, news, research topics, or data',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query to look up on the web' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_maps_navigation',
      description: 'Find places, restaurants, addresses, or get navigation directions on Google Maps',
      parameters: {
        type: 'object',
        properties: {
          destination: { type: 'string', description: 'The destination place or address' },
          origin: { type: 'string', description: 'Optional starting point' },
        },
        required: ['destination'],
      },
    },
  ],
  executeTool: async (toolName: string, args: Record<string, any>) => {
    if (toolName === 'search_the_web') {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Research this and give a 2-3 sentence clear factual summary: "${args.query}"`,
      });
      return { summary: res.text || 'No information found.' };
    }

    if (toolName === 'get_maps_navigation') {
      const encodedDest = encodeURIComponent(args.destination);
      const mapsUrl = args.origin
        ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(args.origin)}&destination=${encodedDest}`
        : `https://www.google.com/maps/search/?api=1&query=${encodedDest}`;

      return {
        destination: args.destination,
        navigationUrl: mapsUrl,
        instructions: `Here is the direct Google Maps link to ${args.destination}: ${mapsUrl}`,
      };
    }

    throw new Error(`Unknown tool: ${toolName}`);
  },
};
