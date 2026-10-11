import React, { useState } from 'react';
import { Mic, MessageSquare } from 'lucide-react';
import { VoiceView } from './VoiceView';
import { ChatView, ChatMessageItem } from './ChatView';
import { AssistantState } from '../components/VoiceSphere';

interface AuraViewProps {
  // Voice Props
  assistantState: AssistantState;
  volume: number;
  isRecording: boolean;
  onToggleRecording: () => void;
  voiceGender: 'female' | 'male';
  onVoiceGenderChange: (voice: 'female' | 'male') => void;
  transcript: { user?: string; assistant?: string };
  onSendQuickPrompt: (prompt: string) => void;

  // Chat Props
  messages: ChatMessageItem[];
  onSendMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
  isChatLoading: boolean;
  onEditMessage?: (id: string, newText: string) => void;
  onRetryMessage?: (id: string) => void;
}

export const AuraView: React.FC<AuraViewProps> = ({
  assistantState,
  volume,
  isRecording,
  onToggleRecording,
  voiceGender,
  onVoiceGenderChange,
  transcript,
  onSendQuickPrompt,
  messages,
  onSendMessage,
  onClearChat,
  isChatLoading,
  onEditMessage,
  onRetryMessage,
}) => {
  const [auraMode, setAuraMode] = useState<'voice' | 'chat'>('voice');

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-md mx-auto select-none">
      {/* Top Voice / Chat Segment Switcher */}
      <div className="flex items-center justify-center pt-1 pb-2 px-4 shrink-0">
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl shadow-inner">
          <button
            onClick={() => setAuraMode('voice')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              auraMode === 'voice'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice</span>
          </button>
          <button
            onClick={() => setAuraMode('chat')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              auraMode === 'chat'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {auraMode === 'voice' ? (
          <VoiceView
            assistantState={assistantState}
            volume={volume}
            isRecording={isRecording}
            onToggleRecording={onToggleRecording}
            voiceGender={voiceGender}
            onVoiceGenderChange={onVoiceGenderChange}
            transcript={transcript}
            googleConnected={false}
            onOpenGoogleModal={() => {}}
            whatsappConnected={false}
            onOpenWhatsAppModal={() => {}}
            onSendQuickPrompt={onSendQuickPrompt}
          />
        ) : (
          <ChatView
            messages={messages}
            onSendMessage={onSendMessage}
            onClearChat={onClearChat}
            isLoading={isChatLoading}
            onEditMessage={onEditMessage}
            onRetryMessage={onRetryMessage}
          />
        )}
      </div>
    </div>
  );
};
