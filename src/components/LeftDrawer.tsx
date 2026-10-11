import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Plus,
  Trash2,
  Download,
  Shield,
  MessageCircle,
  Sliders,
  Sparkles,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  LogOut,
  ChevronRight,
  Heart,
  Volume2,
} from 'lucide-react';
import { WhatsAppStatusData } from './WhatsAppConnectModal';

export interface ChatSessionMeta {
  id: string;
  title: string;
  preview?: string;
  updatedAt: string;
}

interface LeftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSessionMeta[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onOpenWhatsApp: () => void;
  whatsappStatus: WhatsAppStatusData | null;
  onOpenGoogle: () => void;
  googleConnected: boolean;
  currentUserEmail: string | null;
  onSignOut: () => void;
  onOpenAdmin: () => void;
  installPrompt: any;
  onTriggerInstall: () => void;
}

export const LeftDrawer: React.FC<LeftDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onOpenWhatsApp,
  whatsappStatus,
  onOpenGoogle,
  googleConnected,
  currentUserEmail,
  onSignOut,
  onOpenAdmin,
  installPrompt,
  onTriggerInstall,
}) => {
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);

  if (!isOpen) return null;

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-[85%] max-w-xs bg-[#090b12] border-r border-slate-800/80 h-full flex flex-col justify-between p-4 z-10 shadow-2xl select-none animate-slide-right">
        {/* Top Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">A U R A</h2>
                <p className="text-[10px] text-slate-400">Personal Chief of Staff</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          {/* Sessions List */}
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1 font-semibold">
              Recent Conversations
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 no-scrollbar pr-0.5">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400 italic px-2 py-2">No past chats yet</p>
              ) : (
                sessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  return (
                    <div
                      key={sess.id}
                      className={`group flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-slate-800/90 text-indigo-300 font-medium'
                          : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <button
                        onClick={() => {
                          onSelectSession(sess.id);
                          onClose();
                        }}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left truncate"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-indigo-400" />
                        <span className="truncate">{sess.title || 'Conversation'}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(sess.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Connectors Quick-Access Section */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1 font-semibold">
              Connected Channels
            </p>

            {/* WhatsApp Row */}
            <button
              onClick={() => {
                onOpenWhatsApp();
                onClose();
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors text-xs"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-200">WhatsApp</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  whatsappStatus?.status === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {whatsappStatus?.status === 'connected' ? 'Linked' : 'Pair'}
              </span>
            </button>

            {/* Google Workspace Row */}
            <button
              onClick={() => {
                onOpenGoogle();
                onClose();
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors text-xs"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-200">Google Workspace</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  googleConnected
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {googleConnected ? 'Active' : 'Connect'}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Section: Mobile Download Button & User Sign Out */}
        <div className="space-y-2 pt-3 border-t border-slate-800/80">
          {/* PWA Install Button */}
          <button
            onClick={() => {
              if (installPrompt) {
                onTriggerInstall();
              } else if (isIos) {
                setShowIosInstallModal(true);
              } else {
                alert('Aura is already running or ready to add via browser menu (Install app / Add to Home screen).');
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Install Aura on Phone</span>
          </button>

          {/* Admin / Engine settings button */}
          <button
            onClick={() => {
              onOpenAdmin();
              onClose();
            }}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/40 text-slate-400 hover:text-white text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>Engine Settings</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          </button>

          {/* User Email & Sign Out */}
          {currentUserEmail && (
            <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-slate-400">
              <span className="truncate max-w-[170px]">{currentUserEmail}</span>
              <button
                onClick={onSignOut}
                className="text-rose-400 hover:text-rose-300 p-1 flex items-center gap-1 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* iOS Install Guidance Modal */}
      {showIosInstallModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-xs w-full text-center space-y-3">
            <Smartphone className="w-8 h-8 text-indigo-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Install on iPhone / iPad</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              1. Tap the <strong className="text-white">Share</strong> button (box with arrow) at the bottom of Safari.
              <br />
              2. Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong>.
            </p>
            <button
              onClick={() => setShowIosInstallModal(false)}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
