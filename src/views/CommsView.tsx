import React, { useState } from 'react';
import {
  MessageCircle,
  Mail,
  Users,
  Shield,
  Search,
} from 'lucide-react';
import { WhatsAppStatusData } from '../components/WhatsAppConnectModal';

interface CommsViewProps {
  whatsappStatus: WhatsAppStatusData | null;
  onOpenWhatsAppModal: () => void;
  googleConnected: boolean;
  onOpenGoogleModal: () => void;
  currentUserEmail: string | null;
}

export const CommsView: React.FC<CommsViewProps> = ({
  whatsappStatus,
  onOpenWhatsAppModal,
  googleConnected,
  onOpenGoogleModal,
  currentUserEmail,
}) => {
  const [subTab, setSubTab] = useState<'channels' | 'contacts'>('channels');
  const [contactsSearch, setContactsSearch] = useState('');

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-md mx-auto select-none">
      {/* Subtab Pill Switcher */}
      <div className="flex items-center justify-center pt-1 pb-2 px-4 shrink-0">
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl shadow-inner">
          <button
            onClick={() => setSubTab('channels')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'channels'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Channels</span>
          </button>
          <button
            onClick={() => setSubTab('contacts')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'contacts'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Contacts</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar select-text">
        {/* SUBTAB 1: CHANNELS */}
        {subTab === 'channels' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-white">Active Communication Hub</h3>
              <p className="text-xs text-slate-400">
                Aura bridges your personal inboxes without intruding on group chats
              </p>
            </div>

            {/* WhatsApp Card */}
            <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">WhatsApp Multi-Device</h4>
                    <p className="text-[10px] text-slate-400">
                      {whatsappStatus?.status === 'connected'
                        ? `Linked to +${whatsappStatus.user?.phone || whatsappStatus.savedPhone || 'User'}`
                        : 'Pair via QR code or 8-digit code'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onOpenWhatsAppModal}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    whatsappStatus?.status === 'connected'
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
                      : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-500 shadow-md shadow-emerald-600/30'
                  }`}
                >
                  {whatsappStatus?.status === 'connected' ? 'Manage' : 'Connect'}
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Strict boundary: 1-to-1 Chief of Staff only. Groups are read-only.</span>
              </div>
            </div>

            {/* Google Workspace Suite Card */}
            <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Google Workspace</h4>
                    <p className="text-[10px] text-slate-400">
                      {googleConnected && currentUserEmail
                        ? `Linked: ${currentUserEmail}`
                        : 'Gmail, Calendar & Tasks OAuth'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onOpenGoogleModal}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    googleConnected
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/30'
                      : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-500 shadow-md shadow-indigo-600/30'
                  }`}
                >
                  {googleConnected ? 'Manage' : 'Connect'}
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Drafts client emails, reads calendar commitments, and resolves Google Contacts.
              </p>
            </div>
          </div>
        )}

        {/* SUBTAB 2: CONTACTS */}
        {subTab === 'contacts' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Google Contacts Resolver</h3>
                <p className="text-xs text-slate-400">Resolves raw phone numbers to contact names</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search synced contacts..."
                value={contactsSearch}
                onChange={(e) => setContactsSearch(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
              <Users className="w-8 h-8 text-indigo-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-200">Contacts Auto-Synced</h4>
              <p className="text-[11px] text-slate-400">
                {googleConnected
                  ? 'Active contact resolution is enabled for your linked Google Account.'
                  : 'Connect Google Workspace to auto-resolve contacts and sender names.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
