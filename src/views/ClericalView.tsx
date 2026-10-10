import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, FileText, CheckSquare, Tag } from 'lucide-react';

export interface TaskItem {
  id: string;
  title: string;
  source: 'whatsapp' | 'email' | 'voice' | 'notes';
  deadline?: string;
  urgency: 'high' | 'medium' | 'low';
  completed: boolean;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned?: boolean;
  updatedAt: string;
}

interface ClericalViewProps {
  tasks: TaskItem[];
  notes: NoteItem[];
  onToggleTask: (taskId: string, completed: boolean) => void;
  onAddTask: (title: string, deadline?: string) => void;
  onAddNote: (title: string, content: string) => void;
}

export const ClericalView: React.FC<ClericalViewProps> = ({
  tasks,
  notes,
  onToggleTask,
  onAddTask,
  onAddNote,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'notes'>('tasks');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

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

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-md mx-auto p-4 select-text">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-4 text-xs">
        <button
          onClick={() => setActiveSubTab('tasks')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all font-medium cursor-pointer ${
            activeSubTab === 'tasks'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Tasks ({pendingTasks.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('notes')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all font-medium cursor-pointer ${
            activeSubTab === 'notes'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Notes ({notes.length})</span>
        </button>
      </div>

      {activeSubTab === 'tasks' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Add Task input */}
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
                placeholder="Deadline (e.g. today 5pm)"
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

          {/* Pending Tasks */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Pending Actions
            </h3>
            {pendingTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1 py-4 text-center">
                All clear! No pending tasks right now.
              </p>
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

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                Completed
              </h3>
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

      {activeSubTab === 'notes' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Add Note form */}
          <form onSubmit={handleCreateNote} className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-2">
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Note Title / Topic"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Thought, checklist, or memo..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
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

          {/* Notes List */}
          <div className="space-y-2.5">
            {notes.length === 0 ? (
              <p className="text-xs text-slate-400 italic px-1 py-4 text-center">
                No notes saved yet. Tell Aura "Take a note..." anytime.
              </p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <h4 className="text-xs font-semibold text-white">{n.title}</h4>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                    {n.tags.length > 0 && (
                      <div className="flex gap-1">
                        {n.tags.map((tag, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
