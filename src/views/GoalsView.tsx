import React, { useState } from 'react';
import { Target, Calendar, Plus, ExternalLink, CheckCircle2, Circle, Sparkles, Trash2, ChevronRight, FileSpreadsheet } from 'lucide-react';

export interface GoalMilestone {
  id: string;
  title: string;
  targetDate: string;
  completed: boolean;
  northStarTask: string;
}

export interface GoalItem {
  id: string;
  outcome: string;
  targetDate: string;
  createdAt: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  milestoneFrequency: 'weekly' | 'biweekly' | 'monthly';
  googleSheetUrl?: string;
  googleSheetId?: string;
  milestones: GoalMilestone[];
  dailyNorthStar: string;
  googleTaskId?: string;
}

interface GoalsViewProps {
  goals: GoalItem[];
  onAddGoal: (outcome: string, targetDate: string, frequency: 'weekly' | 'biweekly' | 'monthly') => Promise<void>;
  onToggleMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  isLoading?: boolean;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  onAddGoal,
  onToggleMilestone,
  onDeleteGoal,
  isLoading = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome.trim() || !targetDate) return;
    setIsSubmitting(true);
    try {
      await onAddGoal(outcome.trim(), targetDate, frequency);
      setOutcome('');
      setTargetDate('');
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-md mx-auto select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1 pb-2 px-4 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Active Goals & Projects</span>
          </h2>
          <p className="text-[10px] text-slate-400">Reverse-engineered milestones in living Google Sheets</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Goals Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar select-text">
        {goals.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3 mt-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No Active Goals Logged</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Whenever you enter a goal with a target outcome and deadline, Aura reverse-engineers a project plan, builds a native Google Sheet, and schedules your Daily North Stars.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Define First Goal</span>
            </button>
          </div>
        ) : (
          goals.map((g) => {
            const completedCount = g.milestones.filter((m) => m.completed).length;
            const progressPct = g.milestones.length > 0 ? Math.round((completedCount / g.milestones.length) * 100) : 0;

            return (
              <div
                key={g.id}
                className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3.5 hover:border-slate-700 transition-colors"
              >
                {/* Header: Outcome, Deadline, Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Target: {g.targetDate}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {g.milestoneFrequency} milestones
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug">{g.outcome}</h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {g.googleSheetUrl && (
                      <a
                        href={g.googleSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Project Sheet"
                        className="p-1.5 rounded-xl bg-slate-800 text-emerald-400 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onDeleteGoal(g.id)}
                      title="Delete Goal"
                      className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Daily North Star Highlight */}
                {g.dailyNorthStar && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/30 border border-emerald-500/30 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase font-bold text-emerald-300 block">Today's North Star Task</span>
                      <p className="text-xs font-semibold text-white truncate">{g.dailyNorthStar}</p>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Progress ({completedCount}/{g.milestones.length} milestones)</span>
                    <span className="font-mono font-bold text-emerald-400">{progressPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Reverse-Engineered Milestones List */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                    Reverse-Engineered Milestone Roadmap
                  </span>
                  {g.milestones.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onToggleMilestone(g.id, m.id)}
                      className={`flex items-start gap-2 p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                        m.completed
                          ? 'bg-slate-900/40 text-slate-400 line-through'
                          : 'bg-slate-850 hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      {m.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{m.title}</span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">{m.targetDate}</span>
                        </div>
                        {m.northStarTask && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{m.northStarTask}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Define Project Goal</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Target Outcome
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Launch SaaS beta to 50 users"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Target Completion Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Milestone Cadence
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['weekly', 'biweekly', 'monthly'] as const).map((cadence) => (
                    <button
                      type="button"
                      key={cadence}
                      onClick={() => setFrequency(cadence)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                        frequency === cadence
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cadence}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                <span className="text-emerald-400 font-semibold">Native Google Integration:</span> Aura will automatically generate a living Google Sheet with formula tracking and assign today's North Star task into Google Tasks.
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !outcome.trim() || !targetDate}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Reverse-Engineering Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Goal & Sheet</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
