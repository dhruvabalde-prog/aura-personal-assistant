import React from 'react';
import { Bell, CheckCircle2, Loader2, AlertCircle, Info, X } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'working' | 'alert';
  timestamp: string;
  read: boolean;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
}

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  const queuedOrWorking = notifications.filter((n) => n.status === 'in_progress' || n.status === 'queued');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-[#0d0f17] border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Activity & Queue</h3>
              <p className="text-[11px] text-slate-400">Live clerical tasks & updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Mark read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Working in Queue Bar */}
        {queuedOrWorking.length > 0 && (
          <div className="mt-3 p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Working in Queue ({queuedOrWorking.length})</span>
            </div>
            <div className="space-y-1.5">
              {queuedOrWorking.map((item) => (
                <div key={item.id} className="text-xs text-slate-300 flex items-center justify-between">
                  <span className="truncate">{item.title}</span>
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="mt-3 overflow-y-auto flex-1 space-y-2 pr-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No recent notifications yet. Everything is quiet.
            </div>
          ) : (
            notifications.map((notif) => {
              const isWorking = notif.status === 'in_progress' || notif.status === 'queued';
              const isSuccess = notif.type === 'success' || notif.status === 'completed';
              const isAlert = notif.type === 'alert' || notif.status === 'failed';

              return (
                <div
                  key={notif.id}
                  className={`p-3 rounded-xl border transition-all ${
                    !notif.read ? 'bg-slate-900/90 border-slate-700/80' : 'bg-slate-950/60 border-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {isWorking && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                      {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {isAlert && <AlertCircle className="w-4 h-4 text-rose-400" />}
                      {!isWorking && !isSuccess && !isAlert && <Info className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-white truncate">{notif.title}</p>
                        <span className="text-[10px] text-slate-500">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
