import React, { useState } from 'react';
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
  googleConnected: boolean;
  onOpenGoogleModal: () => void;
  whatsappConnected: boolean;
  onOpenWhatsAppModal: () => void;
  onOpenAccountModal: () => void;
  artifacts?: Array<{ id: string; title: string; type: 'sheet' | 'doc' | 'task'; url?: string }>;

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
  googleConnected,
  onOpenGoogleModal,
  whatsappConnected,
  onOpenWhatsAppModal,
  onOpenAccountModal,
  artifacts = [],
  messages,
  onSendMessage,
  onClearChat,
  isChatLoading,
  onEditMessage,
  onRetryMessage,
}) => {
  const [auraMode, setAuraMode] = useState<'voice' | 'chat'>('voice');

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-md mx-auto select-none overflow-hidden">
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
            googleConnected={googleConnected}
            onOpenGoogleModal={onOpenGoogleModal}
            whatsappConnected={whatsappConnected}
            onOpenWhatsAppModal={onOpenWhatsAppModal}
            onOpenChatTab={() => setAuraMode('chat')}
            onOpenAccountModal={onOpenAccountModal}
            artifacts={artifacts}
          />
        ) : (
          <div className="flex flex-col h-full">
            {/* Top Back to Voice Bar in Chat Mode */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 shrink-0">
              <span className="text-xs font-semibold text-slate-300">Aura Chat & Staged Actions</span>
              <button
                onClick={() => setAuraMode('voice')}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                ← Back to Voice
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatView
                messages={messages}
                onSendMessage={onSendMessage}
                onClearChat={onClearChat}
                isLoading={isChatLoading}
                onEditMessage={onEditMessage}
                onRetryMessage={onRetryMessage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
