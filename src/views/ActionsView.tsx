import React, { useState } from 'react';
import { Sparkles, CheckSquare, Bell, Clock, RefreshCw } from 'lucide-react';
import { StoriesView, ActionableStoryCard } from './StoriesView';
import { NotificationItem } from '../components/NotificationsDrawer';

interface ActionsViewProps {
  onInstructAura: (instruction: string) => Promise<void>;
  isRecording: boolean;
  onToggleRecording: () => void;
  isLoading: boolean;
  notifications: NotificationItem[];
  onDismissNotification?: (id: string) => void;
}

export const ActionsView: React.FC<ActionsViewProps> = ({
  onInstructAura,
  isRecording,
  onToggleRecording,
  isLoading,
  notifications,
  onDismissNotification,
}) => {
  const [subTab, setSubTab] = useState<'stories' | 'queue' | 'updates'>('stories');

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-md mx-auto select-none">
      {/* Sub-tab Pill Switcher */}
      <div className="flex items-center justify-center pt-1 pb-2 px-4 shrink-0">
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl shadow-inner">
          <button
            onClick={() => setSubTab('stories')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'stories'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Radar Stories</span>
          </button>
          <button
            onClick={() => setSubTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'queue'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Action Queue</span>
          </button>
          <button
            onClick={() => setSubTab('updates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'updates'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Updates</span>
            {notifications.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center ml-0.5">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sub-tab Content */}
      <div className="flex-1 overflow-hidden">
        {subTab === 'stories' && (
          <StoriesView
            onInstructAura={onInstructAura}
            isRecording={isRecording}
            onToggleRecording={onToggleRecording}
            isLoading={isLoading}
          />
        )}

        {subTab === 'queue' && (
          <div className="p-4 h-full overflow-y-auto space-y-3 no-scrollbar select-text">
            <div>
              <h3 className="text-sm font-bold text-white">Action Triage Queue</h3>
              <p className="text-xs text-slate-400">
                Extracted commitments waiting for execution
              </p>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2 my-auto">
              <CheckSquare className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-200">Queue is Clear</h4>
              <p className="text-[11px] text-slate-400">
                Any action cards or draft replies waiting for approval will appear here.
              </p>
            </div>
          </div>
        )}

        {subTab === 'updates' && (
          <div className="p-4 h-full overflow-y-auto space-y-2.5 no-scrollbar select-text">
            <div>
              <h3 className="text-sm font-bold text-white">System Updates & Activity</h3>
              <p className="text-xs text-slate-400">
                Background execution logs and connector notifications
              </p>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">
                No recent notifications. Everything is running smoothly.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-white">{n.title}</p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{n.message}</p>
                    <span className="text-[9px] font-mono text-slate-500">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {onDismissNotification && (
                    <button
                      onClick={() => onDismissNotification(n.id)}
                      className="text-slate-500 hover:text-slate-300 text-xs shrink-0 p-1"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
