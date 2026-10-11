import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  MessageCircle, 
  Mail, 
  Calendar, 
  CheckSquare, 
  ChevronRight, 
  ChevronLeft,
  ArrowRight,
  Flame,
  Clock,
  ExternalLink
} from 'lucide-react';

export interface ActionableStoryCard {
  id: string;
  source: 'gmail' | 'whatsapp' | 'calendar' | 'drive' | 'system';
  sourceTitle: string;
  badge: string;
  badgeColor: string;
  sender: string;
  timestamp: string;
  headline: string;
  actionRequirement: string;
  urgency: 'high' | 'medium' | 'low';
  suggestedAction: string;
  draftReply?: string;
  senderContact?: string;
}

interface StoriesViewProps {
  onInstructAura: (instruction: string) => Promise<void>;
  isRecording: boolean;
  onToggleRecording: () => void;
  isLoading: boolean;
}

export const StoriesView: React.FC<StoriesViewProps> = ({
  onInstructAura,
  isRecording,
  onToggleRecording,
  isLoading,
}) => {
  const [stories, setStories] = useState<ActionableStoryCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inputInstruction, setInputInstruction] = useState('');
  const [isFetching, setIsFetching] = useState(true);

  const fetchStories = async () => {
    try {
      const email = localStorage.getItem('aura_user_email') || '';
      const customBackend = localStorage.getItem('aura_backend_url');
      const targetUrl = customBackend ? `${customBackend.replace(/\/$/, '')}/api/stories` : '/api/stories';
      const res = await fetch(targetUrl, {
        headers: email ? { 'x-user-email': email } : {},
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setStories(data);
      }
    } catch (e) {
      console.error('[StoriesView] Failed to fetch stories:', e);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const currentStory = stories[activeIndex] || null;

  const handleNext = () => {
    if (activeIndex < stories.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      setActiveIndex(0); // loop
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    } else {
      setActiveIndex(stories.length - 1);
    }
  };

  const handleSubmitInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputInstruction.trim() || isLoading) return;
    const text = inputInstruction.trim();
    setInputInstruction('');
    await onInstructAura(text);
  };

  const handleApplySuggested = (action: string) => {
    setInputInstruction(action);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'gmail':
        return <Mail className="w-4 h-4 text-rose-400" />;
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-emerald-400" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-amber-400" />;
      default:
        return <CheckSquare className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-md mx-auto p-4 select-none justify-between">
      {/* Top Header & Story Progress Bars (WhatsApp Stories Style) */}
      <div className="space-y-3">
        {/* Story Progress Indicators */}
        <div className="flex items-center gap-1.5 w-full px-1">
          {stories.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className="flex-1 h-1 rounded-full cursor-pointer overflow-hidden bg-slate-800 transition-all"
            >
              <div
                className={`h-full transition-all duration-300 ${
                  idx === activeIndex
                    ? 'bg-indigo-400 w-full'
                    : idx < activeIndex
                    ? 'bg-slate-500 w-full'
                    : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Stories Header */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Actionable Stories</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {stories.length > 0 ? `Story ${activeIndex + 1} of ${stories.length}` : 'Scanning apps...'}
            </p>
          </div>

          <button
            onClick={fetchStories}
            className="text-[11px] text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Center WhatsApp-Stories Card Container */}
      <div className="relative my-auto w-full">
        {isFetching ? (
          <div className="h-72 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <p className="text-xs text-slate-400">Aura is reading Gmail & WhatsApp for actionable items...</p>
          </div>
        ) : currentStory ? (
          <div className="relative rounded-3xl p-6 bg-gradient-to-b from-[#131726] to-[#0c0e17] border border-indigo-500/30 shadow-2xl space-y-4 min-h-[300px] flex flex-col justify-between">
            {/* Card Top Meta */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    {getSourceIcon(currentStory.source)}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      {currentStory.sourceTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                      {currentStory.sender}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    currentStory.urgency === 'high'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  {currentStory.badge}
                </span>
              </div>

              {/* 1-2 Line Headline */}
              <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
                {currentStory.headline}
              </h3>

              {/* 1-2 Line Action Requirement */}
              <p className="text-xs text-slate-300 mt-2 leading-relaxed line-clamp-3">
                {currentStory.actionRequirement}
              </p>

              {/* Draft Reply & Approval Section */}
              {currentStory.draftReply && (
                <div className="mt-3 p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                      Draft Reply Prepared:
                    </span>
                    <span className="text-[10px] font-medium text-amber-400">Waiting for your approval</span>
                  </div>
                  <p className="text-xs text-slate-200 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    "{currentStory.draftReply}"
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const instruction = currentStory.source === 'gmail'
                          ? `Send this approved email to ${currentStory.senderContact || currentStory.sender}: "${currentStory.draftReply}"`
                          : `Send this approved WhatsApp message to ${currentStory.senderContact || currentStory.sender}: "${currentStory.draftReply}"`;
                        onInstructAura(instruction);
                      }}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/30 transition-all cursor-pointer text-center"
                    >
                      ✓ Approve & Send
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputInstruction(`Edit the draft reply to: `);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                    >
                      Edit Draft
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick 1-Tap Suggested Instruction Pill */}
            {currentStory.suggestedAction && !currentStory.draftReply && (
              <div className="pt-2">
                <p className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5">
                  Suggested Action:
                </p>
                <button
                  type="button"
                  onClick={() => handleApplySuggested(currentStory.suggestedAction)}
                  className="w-full text-left p-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-800/40 text-xs text-indigo-200 flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <span className="truncate pr-2">{currentStory.suggestedAction}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
              </div>
            )}

            {/* Tap Navigation Overlays (Left 25% = Prev, Right 25% = Next) */}
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Previous Story"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Next Story"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="h-64 rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <CheckSquare className="w-8 h-8 text-emerald-400 mb-2" />
            <p className="text-xs">No pending action items found. Everything is calm!</p>
          </div>
        )}
      </div>

      {/* Bottom Minimal Instruction Bar with Text & Mic Button */}
      <form onSubmit={handleSubmitInstruction} className="mt-4 pt-2">
        <div className="flex items-center gap-2 bg-[#0d0f1a] border border-slate-800 rounded-2xl px-3 py-1.5 focus-within:border-indigo-500 shadow-xl transition-colors">
          <input
            type="text"
            value={inputInstruction}
            onChange={(e) => setInputInstruction(e.target.value)}
            placeholder="Instruct Aura what to do with this..."
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none py-1.5"
          />

          {/* Voice Mic Button */}
          <button
            type="button"
            onClick={onToggleRecording}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800'
            }`}
            title={isRecording ? 'Stop Voice Input' : 'Speak Instruction to Aura'}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputInstruction.trim() || isLoading}
            className="p-2 rounded-xl bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors cursor-pointer"
            title="Send Instruction"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
