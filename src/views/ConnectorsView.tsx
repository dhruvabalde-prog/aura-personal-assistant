import React from 'react';
import { MessageCircle, Shield, Globe, Settings, ExternalLink, Check, AlertCircle } from 'lucide-react';

export interface PluginItem {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  status: { connected: boolean; details?: string };
  toolsCount: number;
}

interface ConnectorsViewProps {
  plugins: PluginItem[];
  onTogglePlugin: (id: string, enabled: boolean) => void;
  onOpenGoogleModal: () => void;
  onOpenWhatsAppModal: () => void;
  whatsappConnected: boolean;
}

export const ConnectorsView: React.FC<ConnectorsViewProps> = ({
  plugins,
  onTogglePlugin,
  onOpenGoogleModal,
  onOpenWhatsAppModal,
  whatsappConnected,
}) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'whatsapp':
        return MessageCircle;
      case 'gmail':
      case 'calendar':
      case 'drive':
      case 'tasks':
      case 'notes':
        return Shield;
      case 'web_search':
      default:
        return Globe;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-md mx-auto p-4 select-text overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">App Connectors & Plugins</h2>
        <p className="text-xs text-slate-400">
          Aura plugs into your apps to take care of trivial clerical work
        </p>
      </div>

      {/* Primary Highlights: WhatsApp & Google Workspace */}
      <div className="space-y-3 mb-6">
        {/* Google Workspace Master Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">Google Workspace Suite</h3>
                <p className="text-[11px] text-slate-400">Gmail, Calendar, Drive, Docs, Sheets, Slides, Forms</p>
              </div>
            </div>
            <button
              onClick={onOpenGoogleModal}
              className="px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl transition-colors cursor-pointer"
            >
              Configure
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Real OAuth 2.0 integration allowing Aura to draft emails, schedule Meet events, create Docs, Sheets, and Forms.
          </p>
        </div>

        {/* WhatsApp Multi-Device Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">WhatsApp Multi-Device</h3>
                <p className="text-[11px] text-slate-400">Baileys Engine (QR / 8-Digit Pairing Code)</p>
              </div>
            </div>
            <button
              onClick={onOpenWhatsAppModal}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors cursor-pointer border ${
                whatsappConnected
                  ? 'text-emerald-300 bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30'
                  : 'text-emerald-300 bg-emerald-600/30 hover:bg-emerald-600/40 border-emerald-500/40'
              }`}
            >
              {whatsappConnected ? 'Manage' : 'Link Device'}
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Connects directly to your WhatsApp to summarize unread messages and extract action items without any Meta Cloud API fees.
          </p>
        </div>
      </div>

      {/* Active Connectors List */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Registered Connectors ({plugins.length})
        </h3>
        {plugins.map((plugin) => {
          const Icon = getIcon(plugin.id);
          return (
            <div
              key={plugin.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-slate-400" />
                <div>
                  <h4 className="text-xs font-medium text-slate-200">{plugin.name}</h4>
                  <p className="text-[10px] text-slate-400">{plugin.status.details || plugin.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">{plugin.toolsCount} skills</span>
                <input
                  type="checkbox"
                  checked={plugin.enabled}
                  onChange={(e) => onTogglePlugin(plugin.id, e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
