import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Copy,
  Check,
  RotateCw,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronRight,
  Wrench,
  Bot,
  User,
  Sparkles,
} from 'lucide-react';

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
  onEditMessage?: (id: string, newText: string) => void;
  onRetryMessage?: (id: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  isLoading,
  onEditMessage,
  onRetryMessage,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [collapsedTools, setCollapsedTools] = useState<Record<string, boolean>>({});

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

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEdit = (m: ChatMessageItem) => {
    setEditingId(m.id);
    setEditText(m.content);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    setEditingId(null);
    if (onEditMessage) {
      onEditMessage(id, editText.trim());
    } else {
      await onSendMessage(editText.trim());
    }
  };

  const toggleToolCollapse = (id: string) => {
    setCollapsedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedback((prev) => {
      const next = { ...prev };
      if (next[id] === type) {
        delete next[id];
      } else {
        next[id] = type;
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-md mx-auto select-text">
      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">How can Aura help you today?</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Send a quick text thought, paste an email to summarize, or ask about your schedule and tasks.
              </p>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            const isEditing = editingId === m.id;
            const isToolCollapsed = collapsedTools[m.id] ?? true;

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group animate-fade-in`}
              >
                {/* Bubble Container */}
                <div
                  className={`relative max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-xs'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-slate-950 border border-indigo-500 rounded-xl p-2 text-xs text-white focus:outline-none resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(m.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500 text-white text-[10px] font-bold"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}

                  {/* Collapsible Tool Calls Pill */}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => toggleToolCollapse(m.id)}
                        className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono hover:text-emerald-300 cursor-pointer"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Used {m.toolCalls.length} tool{m.toolCalls.length > 1 ? 's' : ''}</span>
                        {isToolCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {!isToolCollapsed && (
                        <div className="mt-1.5 space-y-1 pl-1">
                          {m.toolCalls.map((tc, idx) => (
                            <div key={idx} className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono">
                              <span className="text-emerald-400 font-semibold">{tc.name}</span>
                              {tc.args && (
                                <pre className="text-slate-400 text-[9px] mt-0.5 overflow-x-auto no-scrollbar">
                                  {JSON.stringify(tc.args, null, 1)}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Micro Actions Bar (Copy, Retry, Edit, Feedback) */}
                <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400">
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(m.id, m.content)}
                    className="hover:text-slate-200 transition-colors cursor-pointer"
                    title="Copy message"
                  >
                    {copiedId === m.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>

                  {/* User Edit Button */}
                  {isUser && !isEditing && (
                    <button
                      onClick={() => handleStartEdit(m)}
                      className="hover:text-slate-200 transition-colors cursor-pointer"
                      title="Edit message"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}

                  {/* Assistant Retry & Feedback */}
                  {!isUser && (
                    <>
                      {onRetryMessage && (
                        <button
                          onClick={() => onRetryMessage(m.id)}
                          className="hover:text-slate-200 transition-colors cursor-pointer"
                          title="Retry response"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleFeedback(m.id, 'up')}
                        className={`transition-colors cursor-pointer ${
                          feedback[m.id] === 'up' ? 'text-indigo-400' : 'hover:text-slate-200'
                        }`}
                        title="Good response"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleFeedback(m.id, 'down')}
                        className={`transition-colors cursor-pointer ${
                          feedback[m.id] === 'down' ? 'text-rose-400' : 'hover:text-slate-200'
                        }`}
                        title="Bad response"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl max-w-[70%]">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-xs text-slate-400">Aura is thinking...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Composer */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-slate-800/80 bg-[#090b12]/95 backdrop-blur-md">
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
