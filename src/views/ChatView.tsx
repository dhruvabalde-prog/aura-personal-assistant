import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Bot, User, Check, Wrench } from 'lucide-react';

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mediaType?: 'text' | 'voice';
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
    result?: any;
  }>;
}

interface ChatViewProps {
  messages: ChatMessageItem[];
  onSendMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
  isLoading: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  isLoading,
}) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await onSendMessage(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-md mx-auto select-text">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-[#08090d]/80 backdrop-blur-md">
        <div>
          <h2 className="text-sm font-semibold text-white">Conversation History</h2>
          <p className="text-[11px] text-slate-400">All voice & text turns saved</p>
        </div>
        <button
          onClick={onClearChat}
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Clear chat history"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>

                {/* Tool calls execution badge */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                    {m.toolCalls.map((tc, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                        <Wrench className="w-3 h-3" />
                        <span className="font-mono">Executed: {tc.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {m.mediaType === 'voice' && <span className="text-[9px] uppercase tracking-wider text-indigo-400">(voice)</span>}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl max-w-[70%]">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-xs text-slate-400">Aura is thinking...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Composer */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800/80 bg-[#090b12]/90 backdrop-blur-md">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-1.5 focus-within:border-indigo-500 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your thought or command..."
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none py-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-1.5 rounded-xl bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
