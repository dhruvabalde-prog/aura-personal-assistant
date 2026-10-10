import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';

interface VoiceSelectorProps {
  currentVoice: 'female' | 'male';
  onChange: (voice: 'female' | 'male') => void;
  disabled?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ currentVoice, onChange, disabled }) => {
  return (
    <div className="inline-flex items-center p-1 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-800 text-xs shadow-inner">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('female')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 font-medium ${
          currentVoice === 'female'
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
            : 'text-slate-400 hover:text-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Female (Aoede)</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('male')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 font-medium ${
          currentVoice === 'male'
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
            : 'text-slate-400 hover:text-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Volume2 className="w-3.5 h-3.5" />
        <span>Male (Puck)</span>
      </button>
    </div>
  );
};
