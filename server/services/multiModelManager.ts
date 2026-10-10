import { GoogleGenAI } from '@google/genai';
import { db } from '../storage/db.js';

export interface ModelProviderResponse {
  text?: string;
  functionCalls?: Array<{ name: string; args: any }>;
}

export class MultiModelManager {
  // Execute LLM inference across Gemini, Anthropic, or OpenAI
  static async generate(params: {
    systemPrompt: string;
    userInput: string;
    toolDeclarations?: any[];
  }): Promise<ModelProviderResponse> {
    const settings = db.getAdminSettings();
    const provider = settings.activeProvider || 'gemini';

    if (provider === 'gemini') {
      const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      const model = settings.selectedModel || 'gemini-3.8-flash';

      const toolsConfig = params.toolDeclarations && params.toolDeclarations.length > 0
        ? [{ functionDeclarations: params.toolDeclarations }]
        : undefined;

      const res = await ai.models.generateContent({
        model,
        contents: params.userInput,
        config: {
          systemInstruction: params.systemPrompt,
          tools: toolsConfig as any,
        },
      });

      return {
        text: res.text,
        functionCalls: res.functionCalls?.map((fc) => ({ name: fc.name || '', args: fc.args || {} })),
      };
    }

    if (provider === 'anthropic') {
      const apiKey = settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic API key is not configured in Admin Settings.');
      }

      // Convert tool declarations to Anthropic tools schema
      const tools = params.toolDeclarations?.map((td) => ({
        name: td.name,
        description: td.description,
        input_schema: td.parameters,
      }));

      const payload: any = {
        model: settings.selectedModel.startsWith('claude') ? settings.selectedModel : 'claude-3-7-sonnet-20250219',
        max_tokens: 1024,
        system: params.systemPrompt,
        messages: [{ role: 'user', content: params.userInput }],
      };
      if (tools && tools.length > 0) {
        payload.tools = tools;
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const textBlock = data.content?.find((c: any) => c.type === 'text');
      const toolBlocks = data.content?.filter((c: any) => c.type === 'tool_use') || [];

      return {
        text: textBlock?.text,
        functionCalls: toolBlocks.map((tb: any) => ({ name: tb.name, args: tb.input })),
      };
    }

    if (provider === 'openai') {
      const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured in Admin Settings.');
      }

      const tools = params.toolDeclarations?.map((td) => ({
        type: 'function',
        function: {
          name: td.name,
          description: td.description,
          parameters: td.parameters,
        },
      }));

      const payload: any = {
        model: settings.selectedModel.startsWith('gpt') ? settings.selectedModel : 'gpt-4o',
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userInput },
        ],
      };
      if (tools && tools.length > 0) {
        payload.tools = tools;
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      const functionCalls = choice?.tool_calls?.map((tc: any) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
      }));

      return {
        text: choice?.content,
        functionCalls,
      };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }
}
