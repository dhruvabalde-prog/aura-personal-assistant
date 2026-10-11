import { GoogleGenAI } from '@google/genai';
import { WebSocket } from 'ws';
import { db } from '../storage/db.js';
import { pluginRegistry } from './pluginRegistry.js';
import '../connectors/index.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export interface LiveSessionOptions {
  voice: 'female' | 'male';
  voiceName?: string;
  onAudioChunk: (base64Audio: string) => void;
  onTranscription: (role: 'user' | 'assistant', text: string) => void;
  onInterrupted: () => void;
  onError: (err: any) => void;
  onClose: () => void;
}

export class GeminiLiveService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  getVoiceName(gender: 'female' | 'male', override?: string): string {
    if (override) return override;
    return gender === 'male' ? 'Puck' : 'Aoede';
  }

  async createLiveSession(options: LiveSessionOptions) {
    const profile = db.getProfile();
    const voiceName = this.getVoiceName(options.voice, options.voiceName);

    const systemInstructionText = `
You are Aura, an empathetic, hyper-competent, voice-first personal AI assistant.
Your personality:
- Extremely concise, clear, and calm. You speak simply and naturally, like a trusted right-hand partner.
- You never waste the user's time with fluff, filler intros, or corporate jargon.
- You take raw, messy human spoken input and immediately understand what needs to be done.
- You handle all trivial, clerical, and administrative tasks: WhatsApp messages, emails, scheduling, Google Workspace documents, sheets, slides, forms, tasks, and research.
- High empathy: You acknowledge when the user is tired, rushed, or stressed, and prioritize making their life effortless.

Current User Context:
- User Name: ${profile.name}
- Emotional State: ${profile.emotionalContext.lastMood} (Stress: ${profile.emotionalContext.stressLevel}, Energy: ${profile.emotionalContext.energyLevel})
- Today's Priorities: ${profile.dailyPriorities.join(', ')}
- Habits & Rhythms: ${profile.habits.join(', ')}

When speaking, be conversational, direct, and action-oriented.
`;

    const allRegistered = pluginRegistry.getAllTools();
    const toolDeclarations = allRegistered.map(({ tool }) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    const toolsConfig = toolDeclarations.length > 0
      ? [{ functionDeclarations: toolDeclarations }]
      : undefined;

    try {
      let activeSession: any = null;

      const session = await this.ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: ['audio' as any],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
          tools: toolsConfig as any,
        },
        callbacks: {
          onopen: () => {
            console.log(`[Gemini Live] Session opened with voice: ${voiceName}`);
          },
          onmessage: async (msg: any) => {
            const serverContent = msg?.serverContent;

            // Handle Tool Call from Live API
            if (msg?.toolCall?.functionCalls) {
              const functionResponses: any[] = [];
              for (const call of msg.toolCall.functionCalls) {
                console.log(`[Gemini Live] Tool call: ${call.name}`, call.args);
                try {
                  const result = await pluginRegistry.execute(call.name, (call.args || {}) as Record<string, any>);
                  functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: { output: result },
                  });
                } catch (err: any) {
                  console.error(`[Gemini Live] Tool execution error for ${call.name}:`, err);
                  functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: { error: err.message },
                  });
                }
              }

              if (activeSession && functionResponses.length > 0) {
                activeSession.sendRealtimeInput({
                  toolResponse: {
                    functionResponses,
                  },
                });
              }
              return;
            }

            if (!serverContent) return;

            // Handle user transcription
            if (serverContent.inputTranscription?.text) {
              const text = serverContent.inputTranscription.text;
              options.onTranscription('user', text);
              db.addMessage({ role: 'user', content: text, mediaType: 'voice' });
            }

            // Handle model speech chunks
            if (serverContent.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  options.onAudioChunk(part.inlineData.data);
                }
              }
            }

            // Handle assistant transcription
            if (serverContent.outputTranscription?.text) {
              const text = serverContent.outputTranscription.text;
              options.onTranscription('assistant', text);
              db.addMessage({ role: 'assistant', content: text, mediaType: 'voice' });
            }

            // Handle interruption
            if (serverContent.interrupted) {
              console.log('[Gemini Live] Interruption signal received');
              options.onInterrupted();
            }
          },
          onerror: (err: any) => {
            console.error('[Gemini Live] Error in live connection:', err);
            options.onError(err);
          },
          onclose: () => {
            console.log('[Gemini Live] Live session closed');
            options.onClose();
          },
        },
      });

      activeSession = session;

      return {
        session,
        sendAudioChunk: (base64Pcm16k: string) => {
          session.sendRealtimeInput({
            audio: {
              data: base64Pcm16k,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        },
        sendAudioEnd: () => {
          session.sendRealtimeInput({ audioStreamEnd: true });
        },
        sendText: (text: string) => {
          session.sendRealtimeInput({ text });
          db.addMessage({ role: 'user', content: text, mediaType: 'text' });
        },
        close: () => {
          try {
            session.close();
          } catch (e) {
            // ignore
          }
        },
      };
    } catch (err) {
      console.error('[Gemini Live] Failed to connect live session:', err);
      throw err;
    }
  }

  // Fallback / Text Orchestrator for rich complex queries & tool calling
  async processTextWithAgent(prompt: string, context?: string): Promise<string> {
    const profile = db.getProfile();
    const systemInstruction = `
You are Aura, an empathetic, hyper-competent personal AI assistant.
User context: ${profile.name}, mood: ${profile.emotionalContext.lastMood}.
Speak simply, clearly, and directly without wasting words.
${context ? `Additional context: ${context}` : ''}
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || "I've handled that for you.";
    db.addMessage({ role: 'user', content: prompt, mediaType: 'text' });
    db.addMessage({ role: 'assistant', content: reply, mediaType: 'text' });
    return reply;
  }
}

export const geminiLive = new GeminiLiveService();
