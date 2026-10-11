import React from 'react';
import { Sparkles, Radio, Calendar, MessageSquare, BarChart3 } from 'lucide-react';

export type ActiveTab = 'aura' | 'actions' | 'myday' | 'comms' | 'dashboards';

interface NavigationProps {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  actionsCount?: number;
  myDayCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChange,
  actionsCount = 0,
  myDayCount = 0,
}) => {
  const tabs: Array<{
    id: ActiveTab;
    label: string;
    sublabel: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    {
      id: 'aura',
      label: 'Aura',
      sublabel: 'Input',
      icon: Sparkles,
    },
    {
      id: 'actions',
      label: 'Actions',
      sublabel: 'Output',
      icon: Radio,
      badge: actionsCount,
    },
    {
      id: 'myday',
      label: 'My Day',
      sublabel: 'Clerical',
      icon: Calendar,
      badge: myDayCount,
    },
    {
      id: 'comms',
      label: 'Comms',
      sublabel: 'Channels',
      icon: MessageSquare,
    },
    {
      id: 'dashboards',
      label: 'Dashboards',
      sublabel: 'Metrics',
      icon: BarChart3,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#08090d]/95 backdrop-blur-2xl border-t border-slate-800/80 px-1 py-1.5 max-w-md mx-auto shadow-2xl safe-bottom select-none">
      <div className="grid grid-cols-5 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-indigo-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1 rounded-xl transition-all duration-200 ${
                    isActive ? 'bg-indigo-500/15 text-indigo-400 shadow-sm' : ''
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                </div>
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 bg-indigo-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center shadow-md">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate">{tab.label}</span>
              <span className="text-[8px] text-slate-500 leading-none">{tab.sublabel}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-5 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
