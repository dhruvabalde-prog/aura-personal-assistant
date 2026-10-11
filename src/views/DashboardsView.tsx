import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  MessageCircle,
  Clock,
  Sparkles,
  ListTodo,
} from 'lucide-react';

interface DashboardsViewProps {
  tasksCount: number;
  completedTasksCount: number;
  whatsappMessageCount: number;
  streakDays?: number;
}

export const DashboardsView: React.FC<DashboardsViewProps> = ({
  tasksCount,
  completedTasksCount,
  whatsappMessageCount,
}) => {
  const [activeFilter, setActiveFilter] = useState<'weekly' | 'all'>('weekly');

  const totalTasks = tasksCount + completedTasksCount;
  const completionPct = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  const coreTrackers = [
    {
      id: 'completion',
      title: 'Task Completion Rate',
      value: `${completedTasksCount}/${totalTasks}`,
      pct: completionPct,
      description: totalTasks > 0 ? `${completionPct}% of clerical tasks marked completed` : 'No tasks recorded yet',
      icon: CheckCircle2,
      color: 'emerald',
    },
    {
      id: 'pending',
      title: 'Pending Action Items',
      value: `${tasksCount} Tasks`,
      pct: totalTasks > 0 ? Math.round((tasksCount / totalTasks) * 100) : 0,
      description: 'Tasks waiting on your clerical board',
      icon: ListTodo,
      color: 'amber',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Messages Synced',
      value: `${whatsappMessageCount} Messages`,
      pct: whatsappMessageCount > 0 ? 100 : 0,
      description: whatsappMessageCount > 0 ? 'Messages logged in your personal channel' : 'Connect WhatsApp in Comms to sync chats',
      icon: MessageCircle,
      color: 'indigo',
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-md mx-auto select-none">
      {/* Top Filter Chips */}
      <div className="flex items-center justify-between pt-1 pb-2 px-4 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Personal Metrics</span>
          </h2>
          <p className="text-[10px] text-slate-400">Real-time stats from your personal assistant activity</p>
        </div>

        <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-[10px]">
          {(['weekly', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-colors cursor-pointer ${
                activeFilter === filter
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Trackers Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar select-text">
        {/* Real Performance Card */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/30 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 font-bold">
                  Activity Overview
                </span>
                <h3 className="text-xl font-extrabold text-white leading-tight">
                  {totalTasks > 0 ? `${completionPct}% Completed` : 'Ready to Assist'}
                </h3>
              </div>
            </div>
            {totalTasks > 0 && (
              <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <TrendingUp className="w-3 h-3" />
                {completionPct}%
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {totalTasks > 0 || whatsappMessageCount > 0
              ? `You have ${tasksCount} active task(s) remaining and ${whatsappMessageCount} WhatsApp message(s) captured.`
              : 'Start speaking or chatting in the Aura tab, or link your channels in Comms to automatically track your daily productivity.'}
          </p>
        </div>

        {/* Core Tracker Metrics Grid */}
        <div className="grid grid-cols-1 gap-2.5">
          {coreTrackers.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{t.title}</h4>
                    <p className="text-[10px] text-slate-400 leading-tight truncate">{t.description}</p>
                    <div className="w-24 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-white font-mono block">{t.value}</span>
                  <span className="text-[9px] text-slate-400 font-mono font-semibold">Real-Time</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informational Callout */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-1">
          <p className="text-[11px] text-slate-300 font-medium">Automatic Activity Tracking</p>
          <p className="text-[10px] text-slate-500">
            Metrics update live as you complete tasks, sync calendar events, and receive messages.
          </p>
        </div>
      </div>
    </div>
  );
};
