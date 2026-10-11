import React, { useState } from 'react';
import {
  CheckSquare,
  ListChecks,
  Calendar as CalendarIcon,
  Repeat,
  FileText,
  Play,
  Flame,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  Layers,
} from 'lucide-react';
import { TaskItem, NoteItem } from './ClericalView';

export interface RoutineStep {
  id: string;
  title: string;
  durationSeconds: number;
}

export interface RoutineItem {
  id: string;
  title: string;
  frequency: 'daily' | 'weekdays' | 'weekly';
  streak: number;
  completedToday: boolean;
  steps: RoutineStep[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  syncedGoogle?: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  items: Array<{ id: string; text: string; completed: boolean }>;
}

interface MyDayViewProps {
  tasks: TaskItem[];
  notes: NoteItem[];
  onToggleTask: (taskId: string, completed: boolean) => void;
  onAddTask: (title: string, deadline?: string) => void;
  onAddNote: (title: string, content: string) => void;
  onPlayRoutine: (routine: RoutineItem) => void;
}

export const MyDayView: React.FC<MyDayViewProps> = ({
  tasks,
  notes,
  onToggleTask,
  onAddTask,
  onAddNote,
  onPlayRoutine,
}) => {
  const [subTab, setSubTab] = useState<'tasks' | 'calendar' | 'routines' | 'checklists' | 'notes'>('tasks');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Clean initial states without fake placeholders
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);

  // Modals / forms for user-created routines and checklists
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  const toggleSubItem = (chkId: string, subId: string) => {
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === chkId
          ? {
              ...c,
              items: c.items.map((i) => (i.id === subId ? { ...i, completed: !i.completed } : i)),
            }
          : c
      )
    );
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle.trim(), newTaskDeadline.trim() || undefined);
    setNewTaskTitle('');
    setNewTaskDeadline('');
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    onAddNote(newNoteTitle.trim(), newNoteContent.trim());
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  const handleCreateRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;
    const newRoutine: RoutineItem = {
      id: `rt-${Date.now()}`,
      title: newRoutineTitle.trim(),
      frequency: 'daily',
      streak: 0,
      completedToday: false,
      steps: [
        { id: `s-${Date.now()}-1`, title: 'Focus & Review', durationSeconds: 60 },
        { id: `s-${Date.now()}-2`, title: 'Execute Key Item', durationSeconds: 120 },
      ],
    };
    setRoutines((prev) => [newRoutine, ...prev]);
    setNewRoutineTitle('');
    setShowAddRoutine(false);
  };

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    const newChecklist: ChecklistItem = {
      id: `chk-${Date.now()}`,
      title: newChecklistTitle.trim(),
      items: [
        { id: `sub-${Date.now()}-1`, text: 'Step 1', completed: false },
        { id: `sub-${Date.now()}-2`, text: 'Step 2', completed: false },
      ],
    };
    setChecklists((prev) => [newChecklist, ...prev]);
    setNewChecklistTitle('');
    setShowAddChecklist(false);
  };

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-md mx-auto select-text">
      {/* Sub-tab Pill Switcher */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 pb-2 px-3 shrink-0">
        <button
          onClick={() => setSubTab('tasks')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            subTab === 'tasks'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Tasks ({pendingTasks.length})</span>
        </button>

        <button
          onClick={() => setSubTab('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            subTab === 'calendar'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => setSubTab('routines')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            subTab === 'routines'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Routines ({routines.length})</span>
        </button>

        <button
          onClick={() => setSubTab('checklists')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            subTab === 'checklists'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ListChecks className="w-3.5 h-3.5" />
          <span>Checklists ({checklists.length})</span>
        </button>

        <button
          onClick={() => setSubTab('notes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            subTab === 'notes'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Notes ({notes.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 no-scrollbar">
        {/* SUBTAB 1: TASKS */}
        {subTab === 'tasks' && (
          <div className="space-y-3">
            <form onSubmit={handleCreateTask} className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="What clerical work needs to be done?"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  placeholder="Deadline (optional)"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>

            <div className="space-y-1.5">
              {pendingTasks.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center space-y-1">
                  <p className="text-xs font-medium text-slate-300">All clear! No pending tasks.</p>
                  <p className="text-[10px] text-slate-500">Tasks added via voice, chat, or WhatsApp sync will appear here.</p>
                </div>
              ) : (
                pendingTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onToggleTask(t.id, true)}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 cursor-pointer transition-colors"
                  >
                    <Circle className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        {t.deadline && <span className="text-amber-400">Due: {t.deadline}</span>}
                        <span className="capitalize text-slate-400 font-mono">[{t.source}]</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {completedTasks.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <h4 className="text-[10px] font-mono uppercase text-slate-400 px-1 font-semibold">Completed</h4>
                {completedTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onToggleTask(t.id, false)}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/40 border border-slate-900 opacity-60 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs line-through text-slate-400 truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: CALENDAR */}
        {subTab === 'calendar' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-white">Upcoming Events</h3>
              <span className="text-[10px] text-slate-400 font-mono">Google Calendar</span>
            </div>

            {calendarEvents.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center space-y-1">
                <p className="text-xs font-medium text-slate-300">No upcoming events scheduled</p>
                <p className="text-[10px] text-slate-500">
                  Connect Google Workspace in the Comms tab to sync your upcoming meetings and calendar events.
                </p>
              </div>
            ) : (
              calendarEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-indigo-950 text-indigo-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{evt.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {evt.startTime} - {evt.endTime}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">
                    Google Meet
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUBTAB 3: PLAYABLE ROUTINES */}
        {subTab === 'routines' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-xs font-semibold text-white">Daily Routines & Habits</h3>
                <p className="text-[10px] text-slate-400">Step timers for your morning and evening habits</p>
              </div>
              <button
                onClick={() => setShowAddRoutine(!showAddRoutine)}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/80 text-white text-[11px] font-medium rounded-xl hover:bg-indigo-600 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {showAddRoutine && (
              <form onSubmit={handleCreateRoutine} className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
                <input
                  type="text"
                  value={newRoutineTitle}
                  onChange={(e) => setNewRoutineTitle(e.target.value)}
                  placeholder="Routine name (e.g. Morning Focus Routine)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  Save Routine
                </button>
              </form>
            )}

            {routines.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center space-y-1">
                <p className="text-xs font-medium text-slate-300">No routines created yet</p>
                <p className="text-[10px] text-slate-500">
                  Tap "New" to create an interactive timer routine for your daily execution.
                </p>
              </div>
            ) : (
              routines.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{r.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="text-amber-400 flex items-center gap-0.5 font-bold">
                        <Flame className="w-3 h-3 fill-amber-400" />
                        {r.streak} day streak
                      </span>
                      <span>·</span>
                      <span>{r.steps.length} steps</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onPlayRoutine(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Play</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUBTAB 4: CHECKLISTS */}
        {subTab === 'checklists' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-xs font-semibold text-white">Custom Checklists</h3>
                <p className="text-[10px] text-slate-400">Recurring check-off lists</p>
              </div>
              <button
                onClick={() => setShowAddChecklist(!showAddChecklist)}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/80 text-white text-[11px] font-medium rounded-xl hover:bg-indigo-600 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {showAddChecklist && (
              <form onSubmit={handleCreateChecklist} className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder="Checklist title (e.g. Weekly Review)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  Save Checklist
                </button>
              </form>
            )}

            {checklists.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center space-y-1">
                <p className="text-xs font-medium text-slate-300">No checklists created yet</p>
                <p className="text-[10px] text-slate-500">
                  Tap "New" to create a structured recurring checklist.
                </p>
              </div>
            ) : (
              checklists.map((chk) => (
                <div key={chk.id} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-white">{chk.title}</h4>
                  <div className="space-y-1.5">
                    {chk.items.map((i) => (
                      <div
                        key={i.id}
                        onClick={() => toggleSubItem(chk.id, i.id)}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/40 cursor-pointer"
                      >
                        {i.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span
                          className={`text-xs ${
                            i.completed ? 'line-through text-slate-500' : 'text-slate-300'
                          }`}
                        >
                          {i.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUBTAB 5: NOTES */}
        {subTab === 'notes' && (
          <div className="space-y-3">
            <form onSubmit={handleCreateNote} className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Note title"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Thoughts, quick meeting memos, ideas..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Note</span>
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {notes.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center space-y-1">
                  <p className="text-xs font-medium text-slate-300">No notes saved yet</p>
                  <p className="text-[10px] text-slate-500">
                    Write quick memos or ask Aura to jot down notes from your conversations.
                  </p>
                </div>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white">{n.title}</h4>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(n.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{n.content}</p>
                    {n.tags && n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {n.tags.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[9px] text-indigo-300 font-mono"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
