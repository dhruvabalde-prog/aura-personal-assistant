import { MultiModelManager } from './multiModelManager.js';
import { db } from '../storage/db.js';
import { pluginRegistry } from './pluginRegistry.js';
import '../connectors/index.js';

export class AgentOrchestrator {
  async processRawInput(input: string, mode: 'voice' | 'text' = 'text'): Promise<{
    reply: string;
    toolExecutions: Array<{ name: string; args: any; result: any }>;
  }> {
    const profile = db.getProfile();
    const tasks = db.getTasks().filter((t) => !t.completed).slice(0, 5);

    // Collect available tools from enabled connectors
    const allRegistered = pluginRegistry.getAllTools();
    const toolDeclarations = allRegistered.map(({ tool }) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    const systemInstruction = `
You are Aura, an empathetic, hyper-competent AI Chief of Staff.
Your guiding principles:
1. Speak simply, clearly, and concisely. No fluff, no unsolicited advice, no robotic preamble like "Sure, I can help with that".
2. Understand raw, messy, unstructured human speech. The user might speak fragments, rambles, or emotional thoughts—extract the intent and take care of the clerical work.
3. High empathy: recognize stress, hurry, or fatigue. Be reassuring, calm, and dependable.
4. When executing clerical work (calendar, emails, documents, WhatsApp summaries, tasks, notes), do the work and give a 1-sentence confirmation.

User Information:
- Name: ${profile.name}
- Emotional State: ${profile.emotionalContext.lastMood}
- Current Pending Tasks: ${tasks.map((t) => t.title).join('; ') || 'None'}
- Recent Priorities: ${profile.dailyPriorities.join(', ')}
`;

    try {
      const response = await MultiModelManager.generate({
        systemPrompt: systemInstruction,
        userInput: input,
        toolDeclarations,
      });

      const toolExecutions: Array<{ name: string; args: any; result: any }> = [];

      // Check for function calls
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          // Add working notification in queue
          const notif = db.addNotification({
            title: `Working: ${call.name.replace(/_/g, ' ')}`,
            message: 'Executing task in background...',
            type: 'working',
            status: 'in_progress',
          });

          try {
            console.log(`[Orchestrator] Function call: ${call.name}`, call.args);
            const result = await pluginRegistry.execute(call.name, (call.args || {}) as Record<string, any>);
            toolExecutions.push({ name: call.name, args: call.args, result });

            db.updateNotification(notif.id, {
              title: `Completed: ${call.name.replace(/_/g, ' ')}`,
              message: 'Task completed successfully.',
              type: 'success',
              status: 'completed',
            });
          } catch (toolErr: any) {
            console.error(`[Orchestrator] Error executing ${call.name}:`, toolErr);
            toolExecutions.push({ name: call.name, args: call.args, result: { error: toolErr.message } });

            db.updateNotification(notif.id, {
              title: `Failed: ${call.name.replace(/_/g, ' ')}`,
              message: toolErr.message || 'Task encountered an error.',
              type: 'alert',
              status: 'failed',
            });
          }
        }

        // Generate final empathetic response incorporating tool results
        const followUp = await MultiModelManager.generate({
          systemPrompt: 'Respond directly and clearly in simple conversational language. Do not explain the code or internal steps. Keep response to 1-2 sentences.',
          userInput: `User asked: "${input}".\nTool execution completed: ${JSON.stringify(toolExecutions)}.\nGive a simple, concise 1-2 sentence response to the user.`,
        });

        const reply = followUp.text || "I've taken care of that for you.";
        db.addMessage({ role: 'user', content: input, mediaType: mode });
        db.addMessage({
          role: 'assistant',
          content: reply,
          mediaType: mode,
          toolCalls: toolExecutions,
        });

        return { reply, toolExecutions };
      }

      const reply = response.text || "Got it. I'm on it.";
      db.addMessage({ role: 'user', content: input, mediaType: mode });
      db.addMessage({ role: 'assistant', content: reply, mediaType: mode });

      return { reply, toolExecutions };
    } catch (err: any) {
      console.error('[Orchestrator] Error generating content:', err);
      const fallbackReply = "I heard you, but hit a brief hitch. Could you repeat that or let me know what you'd like me to do?";
      return { reply: fallbackReply, toolExecutions: [] };
    }
  }
}

export const orchestrator = new AgentOrchestrator();
