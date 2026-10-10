import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, ShieldCheck, Mail, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface GoogleConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  oauthDetails: {
    connected: boolean;
    userEmail: string | null;
    redirectUri: string;
    origins: string[];
  } | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const GoogleConnectModal: React.FC<GoogleConnectModalProps> = ({
  isOpen,
  onClose,
  oauthDetails,
  onConnect,
  onDisconnect,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const redirectUri = oauthDetails?.redirectUri || 'https://aura-personal-ai-tau.vercel.app/api/auth/google/callback';
  const origins = oauthDetails?.origins || ['https://aura-personal-ai-tau.vercel.app', 'https://localhost:3000', 'https://localhost:5000'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#0d0f17] border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Google Workspace</h3>
              <p className="text-xs text-slate-400">Official OAuth 2.0 Integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Status */}
        <div className="mt-5 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  oauthDetails?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <div>
                <p className="text-sm font-medium text-white">
                  {oauthDetails?.connected ? 'Connected & Authorized' : 'Ready to Connect'}
                </p>
                <p className="text-xs text-slate-400">
                  {oauthDetails?.userEmail
                    ? oauthDetails.userEmail
                    : 'Authorize Aura to manage your clerical tasks'}
                </p>
              </div>
            </div>

            {oauthDetails?.connected ? (
              <button
                onClick={onDisconnect}
                className="px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={onConnect}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span>Connect Google</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* The 3 HTTPS Links to Put in Google Cloud Console */}
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Google Cloud Console Links (All HTTPS)
          </h4>

          {/* Authorized Origins */}
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Authorized JavaScript Origins
            </span>
            <div className="space-y-1.5">
              {origins.map((origin, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300"
                >
                  <span>{origin}</span>
                  <button
                    onClick={() => copyToClipboard(origin, `origin-${idx}`)}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Origin"
                  >
                    {copiedField === `origin-${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Authorized Redirect URI */}
          <div>
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Authorized Redirect URI
            </span>
            <div className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
              <span className="truncate">{redirectUri}</span>
              <button
                onClick={() => copyToClipboard(redirectUri, 'redirectUri')}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Copy Redirect URI"
              >
                {copiedField === 'redirectUri' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Workspace capabilities */}
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <Mail className="w-4 h-4 text-blue-400" />
              <span>Gmail Inbox & Drafts</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Google Meet & Calendar</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Tasks & Deadlines</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Drive, Docs & Sheets</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
