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
  Save,
  Edit2,
  Bell,
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
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [localPairingCode, setLocalPairingCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const getApiUrl = (endpoint: string) => {
    if (window.location.hostname.includes('vercel.app')) {
      return `https://commitment-prerequisite-cage-snowboard.trycloudflare.com${endpoint}`;
    }
    return endpoint;
  };

  // Load saved phone on open
  useEffect(() => {
    if (!isGoogleConnected || !userEmail) {
      setSavedPhone(null);
      setPhoneNumber('');
      setIsEditingPhone(true);
      setLocalPairingCode(null);
      return;
    }
    if (isOpen) {
      fetch(getApiUrl('/api/whatsapp/saved-phone'), {
        headers: { 'x-user-email': userEmail || '' },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.phone) {
            const clean = data.phone.replace(/^91/, '');
            setSavedPhone(data.phone);
            setPhoneNumber(clean);
            setIsEditingPhone(false);
          } else {
            setSavedPhone(null);
            setPhoneNumber('');
            setIsEditingPhone(true);
          }
        })
        .catch(() => {
          setSavedPhone(null);
          setPhoneNumber('');
          setIsEditingPhone(true);
        });
    }
  }, [isOpen, userEmail, isGoogleConnected]);

  // Sync savedPhone from status if available
  useEffect(() => {
    if (!isGoogleConnected || !userEmail) return;
    if (status?.savedPhone && !savedPhone) {
      const clean = status.savedPhone.replace(/^91/, '');
      setSavedPhone(status.savedPhone);
      setPhoneNumber(clean);
      setIsEditingPhone(false);
    }
    if (status?.pairingCode) {
      setLocalPairingCode(status.pairingCode);
    }
  }, [status?.savedPhone, status?.pairingCode, savedPhone, isGoogleConnected, userEmail]);

  // Polling for live status
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
  const effectivePhone = savedPhone || (phoneNumber.length >= 10 ? `91${phoneNumber}` : null);
  const hasPhoneSaved = !!savedPhone && !isEditingPhone;

  // Handle Save Number
  const handleSaveNumber = async () => {
    const clean = phoneNumber.trim().replace(/[^0-9]/g, '');
    if (clean.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    setErrorMessage(null);
    setIsSavingPhone(true);
    try {
      const res = await fetch(getApiUrl('/api/whatsapp/saved-phone'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail || '',
        },
        body: JSON.stringify({ phone: clean }),
      });
      const data = await res.json();
      if (data.success && data.phone) {
        setSavedPhone(data.phone);
        setIsEditingPhone(false);
      } else {
        setErrorMessage(data.error || 'Failed to save phone number');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving phone number');
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Handle Start QR Code
  const handleStartQR = async () => {
    if (!effectivePhone) {
      setErrorMessage('Please save your 10-digit mobile number first.');
      return;
    }
    setErrorMessage(null);
    setIsRateLimited(false);
    setIsSubmitting(true);
    try {
      await onConnect(effectivePhone);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start QR generation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Get Pairing Code
  const handleGetPairingCode = async () => {
    if (!effectivePhone) {
      setErrorMessage('Please save your 10-digit mobile number first.');
      return;
    }
    setErrorMessage(null);
    setIsRateLimited(false);
    setIsSubmitting(true);
    try {
      const code = await onRequestPairingCode(effectivePhone);
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
      const androidIntentUrl =
        'intent://#Intent;package=com.whatsapp;scheme=whatsapp;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.whatsapp;end;';
      window.location.href = androidIntentUrl;
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
        {/* Header workspace label */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Connect WhatsApp</h3>
              <p className="text-xs text-slate-400">
                {isGoogleConnected && userEmail ? `Workspace: ${userEmail}` : 'Private Multi-Device Session'}
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

        {/* Step 1 Required Gate if Google Workspace is not connected */}
        {!isGoogleConnected ? (
          <div className="my-6 py-6 px-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Connect Google Workspace First</h4>
              <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
                To guarantee complete privacy, your phone number, pairing codes, and WhatsApp messages are securely partitioned under your Google account.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                if (onConnectGoogle) onConnectGoogle();
              }}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Sign in with Google First
            </button>
            <p className="text-[11px] text-slate-400">
              Step 1 of 2 • Then enter your phone number to pair WhatsApp
            </p>
          </div>
        ) : (
          <>
            {/* Status Banner */}
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
                  {isConnected ? 'WhatsApp Linked' : 'Connect Your WhatsApp'}
                </p>
                <p className="text-xs text-slate-400">
                  {isConnected
                    ? `Active Session: +${status?.user?.phone}`
                    : hasPhoneSaved
                    ? `Saved Phone: +${savedPhone}`
                    : 'Save your number to persist session'}
                </p>
              </div>
            </div>

            {isConnected ? (
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
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
                  handleStartQR();
                }}
                className="w-full mt-2 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Switch to QR Code Tab (Works Instantly)</span>
              </button>
            )}
          </div>
        )}

        {/* CONNECTED STATE */}
        {isConnected ? (
          <div className="mt-6 text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Device Successfully Paired!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Aura is actively listening for your high-priority chats, tasks, and calendar events.
              </p>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 max-w-xs mx-auto text-xs text-slate-300">
              <p>User: <span className="font-mono text-emerald-400 font-semibold">+{status?.user?.phone}</span></p>
              <p className="mt-1 text-slate-400">Total Synced Messages: {status?.messageCount || 0}</p>
            </div>
          </div>
        ) : (
          /* NOT CONNECTED WORKFLOW */
          <div className="mt-4 space-y-4">
            {/* STEP 1: PERSISTENT PHONE NUMBER ENTRY & SAVE */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>WhatsApp Mobile Number (Persistent)</span>
                </span>
                {hasPhoneSaved && (
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(true)}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                )}
              </div>

              {hasPhoneSaved ? (
                /* Saved State Banner */
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="font-mono font-bold text-white">+{savedPhone}</p>
                      <p className="text-[10px] text-emerald-400/80">Saved & Isolated. Persists across restarts.</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit / Input State */
                <div className="space-y-2">
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
                  <button
                    type="button"
                    disabled={phoneNumber.replace(/[^0-9]/g, '').length < 10 || isSavingPhone}
                    onClick={handleSaveNumber}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSavingPhone ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Number...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Number</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Your number must be saved first to keep your session private and persistent.
                  </p>
                </div>
              )}
            </div>

            {/* STEP 2: CONNECTION TABS (UNLOCKED ONCE PHONE IS SAVED) */}
            <div className={`space-y-3 transition-opacity ${hasPhoneSaved ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Choose Connection Method</span>
                </span>
                {!hasPhoneSaved && (
                  <span className="text-[11px] text-amber-400 font-medium">Save number above first</span>
                )}
              </div>

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
                    if (!status?.qrCode) {
                      handleStartQR();
                    }
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
                          <span>WhatsApp Push Notification Sent</span>
                        </p>
                        <p className="text-[11px] leading-relaxed text-slate-300">
                          A notification may appear on your phone: <strong className="text-white">"WhatsApp: Enter code to link new device"</strong>. Tap it and enter the 8-digit code.
                        </p>
                      </div>

                      {/* Fallback Manual Instructions */}
                      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                        <p className="font-semibold text-white">If notification didn't show:</p>
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
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                      <p className="text-xs text-slate-300">
                        Generates an 8-digit code and triggers a WhatsApp push notification on your phone.
                      </p>
                      <button
                        type="button"
                        disabled={!hasPhoneSaved || isSubmitting}
                        onClick={handleGetPairingCode}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Requesting Code from WhatsApp...</span>
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

                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left text-xs text-amber-200 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5 text-amber-300">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Scan From Inside WhatsApp</span>
                        </p>
                        <p className="text-[11px] leading-relaxed text-slate-300">
                          Do <strong>NOT</strong> use your phone's normal camera app. Open{' '}
                          <strong>WhatsApp → Settings ⚙️ → Linked Devices → Link a Device</strong> and point the camera at this QR code.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = status.qrCode!;
                            link.download = `whatsapp-qr-${savedPhone || 'aura'}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Save to Gallery</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenWhatsApp}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Open WhatsApp</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        QR code refreshes automatically for security.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                      <p className="text-xs text-slate-300">
                        Generates a private, high-resolution QR code for your saved number.
                      </p>
                      <button
                        type="button"
                        disabled={!hasPhoneSaved || isSubmitting}
                        onClick={handleStartQR}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Generating QR Code...</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4" />
                            <span>Generate My QR Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )}

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
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
