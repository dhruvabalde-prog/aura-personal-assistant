import React from 'react';
import { Mic, MessageSquare, CheckSquare, PlugZap, BrainCircuit, Sparkles } from 'lucide-react';

export type ActiveTab = 'voice' | 'stories' | 'chat' | 'clerical' | 'connectors' | 'memory';

interface NavigationProps {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  openTaskCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onChange, openTaskCount = 0 }) => {
  const tabs: Array<{ id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'stories', label: 'Stories', icon: Sparkles },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'clerical', label: 'Clerical', icon: CheckSquare },
    { id: 'connectors', label: 'Plugins', icon: PlugZap },
    { id: 'memory', label: 'Memory', icon: BrainCircuit },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090b12]/95 backdrop-blur-xl border-t border-slate-800/80 px-3 py-2 pb-safe max-w-md mx-auto">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-indigo-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {tab.id === 'clerical' && openTaskCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-indigo-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                    {openTaskCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
