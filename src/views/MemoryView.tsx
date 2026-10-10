import React, { useState } from 'react';
import { Brain, Heart, Sparkles, User, Save } from 'lucide-react';

export interface UserProfileData {
  name: string;
  assistantName: string;
  preferredVoice: 'female' | 'male';
  preferredLanguage: string;
  emotionalContext: {
    lastMood: string;
    stressLevel: 'low' | 'moderate' | 'high';
    energyLevel: 'low' | 'moderate' | 'high';
    notes: string[];
    updatedAt: string;
  };
  habits: string[];
  keyPeople: { name: string; relation: string; notes?: string }[];
  dailyPriorities: string[];
}

interface MemoryViewProps {
  profile: UserProfileData;
  onUpdateProfile: (updated: Partial<UserProfileData>) => Promise<void>;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ profile, onUpdateProfile }) => {
  const [name, setName] = useState(profile.name);
  const [lastMood, setLastMood] = useState(profile.emotionalContext.lastMood);
  const [stressLevel, setStressLevel] = useState(profile.emotionalContext.stressLevel);
  const [prioritiesInput, setPrioritiesInput] = useState(profile.dailyPriorities.join(', '));
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile({
      name,
      dailyPriorities: prioritiesInput.split(',').map((p) => p.trim()).filter(Boolean),
      emotionalContext: {
        ...profile.emotionalContext,
        lastMood,
        stressLevel,
        updatedAt: new Date().toISOString(),
      },
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-md mx-auto p-4 select-text overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Emotional & Context Memory</h2>
        <p className="text-xs text-slate-400">
          Aura learns your rhythms, habits, and stress to assist you with high empathy
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Emotional State Card */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <Heart className="w-4 h-4" />
            <span>Emotional Snapshot</span>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Current Mood / Mindset</label>
            <input
              type="text"
              value={lastMood}
              onChange={(e) => setLastMood(e.target.value)}
              placeholder="e.g. Calm & Focused, Busy, Tired"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Stress Level</label>
            <div className="flex gap-2">
              {(['low', 'moderate', 'high'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setStressLevel(lvl)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium capitalize border transition-all cursor-pointer ${
                    stressLevel === lvl
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Identity & Priorities */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <User className="w-4 h-4" />
            <span>User Profile</span>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Today's Key Priorities</label>
            <textarea
              rows={2}
              value={prioritiesInput}
              onChange={(e) => setPrioritiesInput(e.target.value)}
              placeholder="Comma-separated priorities..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Context Updated!' : 'Save Memory'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
