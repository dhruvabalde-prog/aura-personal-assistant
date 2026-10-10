import React from 'react';
import { Mic, MicOff, Sparkles, Shield, MessageCircle } from 'lucide-react';
import { VoiceSphere, AssistantState } from '../components/VoiceSphere';
import { VoiceSelector } from '../components/VoiceSelector';

interface VoiceViewProps {
  assistantState: AssistantState;
  volume: number;
  isRecording: boolean;
  onToggleRecording: () => void;
  voiceGender: 'female' | 'male';
  onVoiceGenderChange: (voice: 'female' | 'male') => void;
  transcript: { user?: string; assistant?: string };
  googleConnected: boolean;
  onOpenGoogleModal: () => void;
  whatsappConnected: boolean;
  onOpenWhatsAppModal: () => void;
  onSendQuickPrompt: (prompt: string) => void;
}

export const VoiceView: React.FC<VoiceViewProps> = ({
  assistantState,
  volume,
  isRecording,
  onToggleRecording,
  voiceGender,
  onVoiceGenderChange,
  transcript,
  googleConnected,
  onOpenGoogleModal,
  whatsappConnected,
  onOpenWhatsAppModal,
  onSendQuickPrompt,
}) => {
  const quickPrompts = [
    "What did I miss on WhatsApp?",
    "Check my priority tasks",
    "What's on my schedule today?",
    "Take a quick note for me",
  ];

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-5rem)] p-4 max-w-md mx-auto select-none">
      {/* Top Header: Voice Selection & Status */}
      <header className="w-full flex items-center justify-between pt-2">
        <VoiceSelector
          currentVoice={voiceGender}
          onChange={onVoiceGenderChange}
          disabled={isRecording}
        />

        <div className="flex items-center gap-1.5">
          {/* WhatsApp status indicator */}
          <button
            onClick={onOpenWhatsAppModal}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer ${
              whatsappConnected
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <MessageCircle className="w-3 h-3" />
            <span>WhatsApp</span>
          </button>

          {/* Google Workspace status indicator */}
          <button
            onClick={onOpenGoogleModal}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer ${
              googleConnected
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>Google</span>
          </button>
        </div>
      </header>

      {/* Center Hero: Reactive Glowing Voice Sphere */}
      <div className="flex flex-col items-center justify-center my-auto w-full">
        <VoiceSphere
          state={assistantState}
          volume={volume}
          onClick={onToggleRecording}
        />

        {/* Minimal State Label */}
        <div className="mt-4 text-center">
          <p className="text-sm font-medium tracking-wide text-slate-300">
            {assistantState === 'listening' && 'Listening to you...'}
            {assistantState === 'thinking' && 'Processing your request...'}
            {assistantState === 'speaking' && 'Speaking... (tap to interrupt)'}
            {assistantState === 'idle' && (isRecording ? 'Listening for your voice...' : 'Tap to start speaking')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isRecording ? 'Raw spoken thoughts welcome' : 'Minimal, zero-clutter Chief of Staff'}
          </p>
        </div>

        {/* Live Dynamic Transcription (clean minimal cards) */}
        {(transcript.user || transcript.assistant) && (
          <div className="w-full mt-6 space-y-2.5 max-h-48 overflow-y-auto px-1 animate-fade-in">
            {transcript.user && (
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200">
                <span className="text-[10px] uppercase font-semibold text-indigo-400 block mb-0.5">You</span>
                <p className="leading-relaxed">{transcript.user}</p>
              </div>
            )}
            {transcript.assistant && (
              <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-900/50 text-xs text-indigo-100">
                <span className="text-[10px] uppercase font-semibold text-emerald-400 block mb-0.5">Aura</span>
                <p className="leading-relaxed">{transcript.assistant}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Quick Suggestion Chips & Voice Control */}
      <div className="w-full flex flex-col items-center gap-4 pb-4">
        {/* Quick prompt chips */}
        <div className="flex flex-wrap justify-center gap-1.5 w-full">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSendQuickPrompt(p)}
              className="text-[11px] text-slate-400 bg-slate-900/70 hover:bg-slate-800/90 hover:text-slate-200 border border-slate-800/80 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Big Tap-To-Talk Button */}
        <button
          onClick={onToggleRecording}
          className={`flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all duration-300 shadow-xl cursor-pointer ${
            isRecording
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-4 h-4 animate-pulse" />
              <span>Tap to Finish Speaking</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              <span>Tap to Speak</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
