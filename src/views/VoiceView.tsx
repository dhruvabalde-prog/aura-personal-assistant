import React, { useState } from 'react';
import { User, Music, Camera, FolderKanban, MessageSquare, Mic, MicOff, ExternalLink, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { VoiceSphere, AssistantState } from '../components/VoiceSphere';

interface VoiceViewProps {
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
  onOpenChatTab: () => void;
  onOpenAccountModal: () => void;
  artifacts?: Array<{ id: string; title: string; type: 'sheet' | 'doc' | 'task'; url?: string }>;
}

export const VoiceView: React.FC<VoiceViewProps> = ({
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
  onOpenChatTab,
  onOpenAccountModal,
  artifacts = [],
}) => {
  const [isArtifactsMenuOpen, setIsArtifactsMenuOpen] = useState(false);
  const [isMusicActive, setIsMusicActive] = useState(false);
  const [cameraFeedback, setCameraFeedback] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleCameraSnap = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCameraFeedback(`Captured: ${file.name.slice(0, 20)}... Uploading to chat`);
      setTimeout(() => {
        setCameraFeedback(null);
        onOpenChatTab();
      }, 1500);
    }
  };

  const handleToggleMusic = () => {
    setIsMusicActive(!isMusicActive);
  };

  return (
    <div className="relative flex flex-col items-center justify-between h-[calc(100vh-7.5rem)] p-4 max-w-md mx-auto select-none overflow-hidden">
      {/* Hidden File / Camera Capture Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileCapture}
        className="hidden"
      />

      {/* Top Subtle Status Dots (Zero Text Clutter) */}
      <header className="w-full flex items-center justify-between pt-1 px-2 shrink-0">
        <button
          onClick={onOpenAccountModal}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-300 hover:border-slate-700 transition-colors cursor-pointer"
        >
          <span className={`w-2 h-2 rounded-full ${googleConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <span>Google</span>
        </button>

        <button
          onClick={onOpenWhatsAppModal}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-300 hover:border-slate-700 transition-colors cursor-pointer"
        >
          <span className={`w-2 h-2 rounded-full ${whatsappConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <span>WhatsApp</span>
        </button>
      </header>

      {/* Center Interactive Circular Visual Sphere (Axel Style - Pure Visual, Zero Transcripts) */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto w-full">
        <div className="relative flex items-center justify-center">
          <VoiceSphere
            state={assistantState}
            volume={volume}
            onClick={onToggleRecording}
          />
        </div>

        {/* Minimal Subtle State Hint */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-sm font-semibold tracking-wide text-slate-200">
            {assistantState === 'listening' && 'Listening...'}
            {assistantState === 'thinking' && 'Processing...'}
            {assistantState === 'speaking' && 'Speaking (tap to interrupt)'}
            {assistantState === 'idle' && (isRecording ? 'Listening for your voice...' : 'Tap to converse')}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            {isRecording ? 'Real-time Gemini Live WebSocket' : 'Aura Personal Assistant'}
          </p>
        </div>

        {/* Temporary Camera / Audio Feedback Toast */}
        {cameraFeedback && (
          <div className="mt-3 px-3 py-1.5 rounded-full bg-indigo-600/90 text-white text-[11px] font-medium animate-fade-in shadow-lg">
            {cameraFeedback}
          </div>
        )}
      </div>

      {/* Axel Style: The 5 Dedicated Bottom Controls */}
      <div className="w-full pt-2 pb-1 shrink-0">
        <div className="flex items-center justify-between px-3 py-2 rounded-3xl bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl shadow-2xl">
          {/* 1. Account Button */}
          <button
            onClick={onOpenAccountModal}
            title="Account & Connections"
            className="flex flex-col items-center gap-1 p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-medium">Account</span>
          </button>

          {/* 2. Music Button */}
          <button
            onClick={handleToggleMusic}
            title="Focus Audio / Music"
            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer ${
              isMusicActive
                ? 'text-indigo-400 bg-indigo-500/10 shadow-inner'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Music className="w-5 h-5" />
            <span className="text-[9px] font-medium">Music</span>
          </button>

          {/* Center Mic Action: Big Prominent Toggle */}
          <button
            onClick={onToggleRecording}
            title={isRecording ? 'Finish Speaking' : 'Start Speaking'}
            className={`w-12 h-12 -mt-4 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
              isRecording
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/40 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40 hover:scale-105'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* 3. Camera / Vision Button */}
          <button
            onClick={handleCameraSnap}
            title="Camera & Vision"
            className="flex flex-col items-center gap-1 p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            <span className="text-[9px] font-medium">Camera</span>
          </button>

          {/* 4. Artifacts Menu Button */}
          <button
            onClick={() => setIsArtifactsMenuOpen(!isArtifactsMenuOpen)}
            title="User Artifacts & Sheets"
            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all cursor-pointer ${
              isArtifactsMenuOpen
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FolderKanban className="w-5 h-5" />
            <span className="text-[9px] font-medium">Artifacts</span>
          </button>

          {/* 5. Chat Switcher Button */}
          <button
            onClick={onOpenChatTab}
            title="Open Chat Tab"
            className="flex flex-col items-center gap-1 p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-medium">Chat</span>
          </button>
        </div>
      </div>

      {/* Artifacts Slide-Up Dropdown Drawer */}
      {isArtifactsMenuOpen && (
        <div className="absolute inset-x-4 bottom-20 z-40 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl animate-fade-in space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <FolderKanban className="w-4 h-4 text-emerald-400" />
              <span>Your Generated Artifacts</span>
            </h4>
            <button
              onClick={() => setIsArtifactsMenuOpen(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 no-scrollbar">
            {artifacts.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 space-y-1">
                <p>No Google Docs or Sheets created yet.</p>
                <p className="text-[10px] text-slate-400">Ask Aura in Voice or Chat to generate a spreadsheet or project goal.</p>
              </div>
            ) : (
              artifacts.map((art) => (
                <a
                  key={art.id}
                  href={art.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800/80 text-xs text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {art.type === 'sheet' ? (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : art.type === 'doc' ? (
                      <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    )}
                    <span className="font-semibold truncate">{art.title}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
