import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  QrCode,
  Smartphone,
  Check,
  Copy,
  RefreshCw,
  PowerOff,
  ExternalLink,
  Download,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Bell,
  Sparkles,
} from 'lucide-react';

export interface WhatsAppStatusData {
  status: 'disconnected' | 'connecting' | 'connected';
  qrCode: string | null;
  pairingCode: string | null;
  pairingMode?: 'qr' | 'code' | null;
  savedPhone?: string | null;
  user: {
    phone: string;
    name: string;
  } | null;
  messageCount: number;
}

interface WhatsAppConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: WhatsAppStatusData | null;
  onConnect: (phone?: string) => Promise<void>;
  onRequestPairingCode: (phone: string) => Promise<string | null>;
  onDisconnect: () => Promise<void>;
  onRefresh: () => Promise<void>;
  isGoogleConnected?: boolean;
  userEmail?: string | null;
  onConnectGoogle?: () => void;
}

export const WhatsAppConnectModal: React.FC<WhatsAppConnectModalProps> = ({
  isOpen,
  onClose,
  status,
  onConnect,
  onRequestPairingCode,
  onDisconnect,
  onRefresh,
  isGoogleConnected = false,
  userEmail = null,
  onConnectGoogle,
}) => {
  const [tab, setTab] = useState<'code' | 'qr'>('code');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [localPairingCode, setLocalPairingCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const getApiUrl = (endpoint: string) => {
    if (window.location.hostname.includes('vercel.app')) {
      return `https://implementing-prairie-realtor-farm.trycloudflare.com${endpoint}`;
    }
    return endpoint;
  };

  // Load saved phone if any exists in profile
  useEffect(() => {
    if (isOpen) {
      fetch(getApiUrl('/api/whatsapp/saved-phone'), {
        headers: { 'x-user-email': userEmail || '' },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.phone) {
            const clean = data.phone.replace(/^91/, '');
            setPhoneNumber(clean);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, userEmail]);

  // Sync pairing code from status
  useEffect(() => {
    if (status?.pairingCode) {
      setLocalPairingCode(status.pairingCode);
    }
    if (status?.status === 'connected') {
      setLocalPairingCode(null);
    }
  }, [status?.pairingCode, status?.status]);

  // When switching to QR tab, generate QR code if not present
  useEffect(() => {
    if (isOpen && tab === 'qr' && status?.status !== 'connected' && !status?.qrCode && !isSubmitting) {
      handleStartQR();
    }
  }, [isOpen, tab, status?.qrCode, status?.status]);

  // Polling for live status while modal is open
  useEffect(() => {
    let interval: any;
    if (isOpen && status?.status !== 'connected') {
      interval = setInterval(() => {
        onRefresh();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isOpen, status?.status, onRefresh]);

  if (!isOpen) return null;

  const isConnected = status?.status === 'connected';
  const activePairingCode = localPairingCode || status?.pairingCode;

  // Handle Start QR Code
  const handleStartQR = async () => {
    setErrorMessage(null);
    setIsRateLimited(false);
    setIsSubmitting(true);
    try {
      await onConnect();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start QR generation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Get Pairing Code
  const handleGetPairingCode = async () => {
    const clean = phoneNumber.trim().replace(/[^0-9]/g, '');
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    setErrorMessage(null);
    setIsRateLimited(false);
    setIsSubmitting(true);
    try {
      // Save phone number first
      fetch(getApiUrl('/api/whatsapp/saved-phone'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail || '',
        },
        body: JSON.stringify({ phone: clean }),
      }).catch(() => {});

      const code = await onRequestPairingCode(clean);
      if (code) {
        setLocalPairingCode(code);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to request pairing code';
      setErrorMessage(msg);
      if (msg.includes('rate-limit') || msg.includes('429')) {
        setIsRateLimited(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    const raw = code.replace(/[^A-Za-z0-9]/g, '');
    navigator.clipboard.writeText(raw);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isAndroid) {
      window.location.href =
        'intent://#Intent;package=com.whatsapp;scheme=whatsapp;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.whatsapp;end;';
      return;
    }

    if (isIOS) {
      window.location.href = 'whatsapp://app';
      setTimeout(() => {
        if (document.hasFocus()) {
          window.location.href = 'https://apps.apple.com/app/whatsapp-messenger/id310633997';
        }
      }, 1500);
      return;
    }

    // Desktop
    window.location.href = 'whatsapp://';
    setTimeout(() => {
      if (document.hasFocus()) {
        window.open('https://web.whatsapp.com', '_blank');
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#0d0f17] border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Connect WhatsApp</h3>
              <p className="text-xs text-slate-400">
                {userEmail ? `Workspace: ${userEmail}` : 'Multi-Device Companion Mode'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator Bar */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <div>
                <p className="text-sm font-medium text-white">
                  {isConnected ? 'WhatsApp Linked & Active' : 'Not Connected'}
                </p>
                <p className="text-xs text-slate-400">
                  {isConnected
                    ? `Linked: +${status?.user?.phone}`
                    : 'Pair your device using Code or QR'}
                </p>
              </div>
            </div>

            {isConnected ? (
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                onClick={onRefresh}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-rose-300 text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
            {isRateLimited && (
              <button
                type="button"
                onClick={() => {
                  setTab('qr');
                  setErrorMessage(null);
                  setIsRateLimited(false);
                }}
                className="w-full mt-2 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Switch to QR Code Tab (Instant Connect)</span>
              </button>
            )}
          </div>
        )}

        {/* CONNECTED STATE VIEW */}
        {isConnected ? (
          <div className="mt-6 text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Device Successfully Paired!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Aura is actively monitoring your WhatsApp for action items, meeting requests, and urgent tasks.
              </p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 max-w-xs mx-auto text-xs text-slate-300">
              <p>
                Connected Phone:{' '}
                <span className="font-mono text-emerald-400 font-semibold">
                  +{status?.user?.phone}
                </span>
              </p>
              <p className="mt-1 text-slate-400">Total Synced Messages: {status?.messageCount || 0}</p>
            </div>
            <button
              onClick={onDisconnect}
              className="w-full py-2.5 px-4 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <PowerOff className="w-4 h-4" />
              <span>Disconnect WhatsApp Companion</span>
            </button>
          </div>
        ) : (
          /* NOT CONNECTED: PAIRING INTERFACE */
          <div className="mt-4 space-y-4">
            {/* Tab Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTab('code');
                  setErrorMessage(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tab === 'code'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>8-Digit Code</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('qr');
                  setErrorMessage(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tab === 'qr'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan QR Code</span>
              </button>
            </div>

            {/* TAB 1: 8-DIGIT PAIRING CODE */}
            {tab === 'code' && (
              <div className="space-y-4 animate-fade-in">
                {activePairingCode ? (
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-4 animate-fade-in">
                    <div className="text-center space-y-1">
                      <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                        Your 8-Digit Pairing Code
                      </span>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <div className="px-4 py-2.5 bg-slate-950 border-2 border-emerald-500/50 rounded-xl font-mono text-2xl font-bold tracking-[0.25em] text-white shadow-inner">
                          {activePairingCode}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(activePairingCode)}
                          className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all cursor-pointer"
                          title="Copy Code"
                        >
                          {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                      {copiedCode && (
                        <p className="text-[10px] text-emerald-400 font-medium">Copied to clipboard!</p>
                      )}
                    </div>

                    {/* Push Notification Callout */}
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 space-y-1.5">
                      <p className="font-semibold flex items-center gap-1.5 text-indigo-300">
                        <Bell className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>WhatsApp Notification Sent</span>
                      </p>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        A notification should appear on your phone: <strong className="text-white">"Enter code to link new device"</strong>. Tap it and enter this code.
                      </p>
                    </div>

                    {/* Manual Instructions */}
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                      <p className="font-semibold text-white">If no notification showed on phone:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                        <li>Open <strong>WhatsApp</strong> on your phone</li>
                        <li>Tap <strong>Settings ⚙️</strong> (iPhone) or <strong>⋮ Menu</strong> (Android)</li>
                        <li>Tap <strong>Linked Devices</strong> → <strong>Link a Device</strong></li>
                        <li>At the bottom, tap <strong className="text-emerald-400">"Link with phone number instead"</strong></li>
                        <li>Enter this 8-digit code: <strong className="font-mono text-white">{activePairingCode}</strong></li>
                      </ol>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Open WhatsApp on Phone</span>
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-amber-400/90 pt-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>Awaiting code entry on phone... Linking is automatic.</span>
                    </div>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleGetPairingCode}
                        className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Request New Code
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Your WhatsApp Mobile Number
                      </label>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl focus-within:border-emerald-500 overflow-hidden">
                        <span className="px-3 py-2 text-xs font-mono font-semibold text-emerald-400 bg-slate-900/90 border-r border-slate-800 select-none">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={10}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="Enter 10-digit mobile number"
                          className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Sends an 8-digit linking code directly to your phone. Works across any Google account.
                    </p>

                    <button
                      type="button"
                      disabled={phoneNumber.replace(/[^0-9]/g, '').length < 10 || isSubmitting}
                      onClick={handleGetPairingCode}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating Pairing Code...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          <span>Get 8-Digit Pairing Code</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: QR CODE */}
            {tab === 'qr' && (
              <div className="space-y-4 animate-fade-in">
                {status?.qrCode ? (
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-4 text-center animate-fade-in">
                    <div className="p-3 bg-white rounded-2xl shadow-xl inline-block mx-auto border-4 border-white">
                      <img
                        src={status.qrCode}
                        alt="WhatsApp QR Code"
                        className="w-52 h-52 rounded-lg select-none mx-auto block"
                      />
                    </div>

                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-left text-xs text-emerald-200 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5 text-emerald-300">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>Scan With WhatsApp Camera</span>
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                        <li>Open <strong>WhatsApp</strong> on your phone</li>
                        <li>Tap <strong>Settings ⚙️</strong> (iPhone) or <strong>⋮ Menu</strong> (Android)</li>
                        <li>Tap <strong>Linked Devices</strong> → <strong>Link a Device</strong></li>
                        <li>Point your phone camera at this QR code</li>
                      </ol>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = status.qrCode!;
                          link.download = `whatsapp-qr-aura.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save QR Image</span>
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleStartQR}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                        <span>Refresh QR</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-amber-400/90 pt-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>Ready to scan. WhatsApp links automatically upon scanning.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Generate WhatsApp QR Code</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        Generates an instant QR code. No phone number required — simply point and scan from WhatsApp Linked Devices.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleStartQR}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating QR Code...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          <span>Generate QR Code</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
