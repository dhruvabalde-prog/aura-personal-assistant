import React, { useState } from 'react';
import { X, Cpu, Key, Sliders, Volume2, Check, ShieldAlert } from 'lucide-react';

export interface AdminSettingsData {
  activeProvider: 'gemini' | 'anthropic' | 'openai';
  geminiApiKey: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  selectedModel: string;
  soundEnabled: boolean;
}

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AdminSettingsData | null;
  onSave: (updates: Partial<AdminSettingsData>) => Promise<void>;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [provider, setProvider] = useState<'gemini' | 'anthropic' | 'openai'>(
    settings?.activeProvider || 'gemini'
  );
  const [geminiKey, setGeminiKey] = useState(settings?.geminiApiKey || '');
  const [anthropicKey, setAnthropicKey] = useState(settings?.anthropicApiKey || '');
  const [openaiKey, setOpenaiKey] = useState(settings?.openaiApiKey || '');
  const [model, setModel] = useState(settings?.selectedModel || 'gemini-3.8-flash');
  const [sound, setSound] = useState(settings?.soundEnabled ?? true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      activeProvider: provider,
      geminiApiKey: geminiKey,
      anthropicApiKey: anthropicKey,
      openaiApiKey: openaiKey,
      selectedModel: model,
      soundEnabled: sound,
    });
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#0d0f17] border border-slate-800 rounded-2xl p-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Modular Admin Panel</h3>
              <p className="text-[11px] text-slate-400">Multi-Model AI Engine & Keys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveAll} className="mt-4 space-y-4">
          {/* Active Model Provider Switch */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Active Intelligence Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'gemini', label: 'Google Gemini' },
                { id: 'anthropic', label: 'Anthropic Claude' },
                { id: 'openai', label: 'OpenAI GPT' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProvider(p.id as any);
                    if (p.id === 'gemini') setModel('gemini-3.8-flash');
                    if (p.id === 'anthropic') setModel('claude-3-7-sonnet-20250219');
                    if (p.id === 'openai') setModel('gpt-4o');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    provider === p.id
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Engine Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              placeholder="e.g. gemini-3.8-flash, claude-3-7-sonnet-20250219, gpt-4o"
            />
          </div>

          {/* API Keys Configuration */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3 h-3 text-purple-400" />
              <span>Provider API Credentials</span>
            </h4>

            {/* Gemini Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-300">Google Gemini API Key</span>
                {provider === 'gemini' && (
                  <span className="text-[10px] text-emerald-400 font-mono">Active</span>
                )}
              </div>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy... or AQ.Ab8..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Anthropic Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-300">Anthropic Claude API Key</span>
                {provider === 'anthropic' && (
                  <span className="text-[10px] text-emerald-400 font-mono">Active</span>
                )}
              </div>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* OpenAI Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-300">OpenAI API Key</span>
                {provider === 'openai' && (
                  <span className="text-[10px] text-emerald-400 font-mono">Active</span>
                )}
              </div>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Sound & Chimes Toggle */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-xs font-medium text-white">Ding Notification Sound</p>
                <p className="text-[10px] text-slate-400">Pleasant chime when tasks complete</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSound(!sound)}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                sound ? 'bg-purple-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  sound ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Save Button */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            {savedSuccess ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>Saved & Applied Live!</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Live configuration</span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Apply Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
