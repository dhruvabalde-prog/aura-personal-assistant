import React, { useState, useEffect, useRef } from 'react';
import { Navigation, ActiveTab } from './components/Navigation';
import { AuraView } from './views/AuraView';
import { ActionsView } from './views/ActionsView';
import { MyDayView, RoutineItem } from './views/MyDayView';
import { CommsView } from './views/CommsView';
import { DashboardsView } from './views/DashboardsView';
import { GoalItem } from './views/GoalsView';
import { LeftDrawer, ChatSessionMeta } from './components/LeftDrawer';
import { GoogleConnectModal } from './components/GoogleConnectModal';
import { WhatsAppConnectModal, WhatsAppStatusData } from './components/WhatsAppConnectModal';
import { RoutinePlayerModal } from './components/RoutinePlayerModal';
import { AdminPanelModal, AdminSettingsData } from './components/AdminPanelModal';
import { AudioProcessor } from './audio/audioProcessor';
import { AssistantState } from './components/VoiceSphere';
import { DraggableAuraOrb } from './components/DraggableAuraOrb';
import { chimeAudio } from './audio/chimeAudio';
import { ChatMessageItem } from './views/ChatView';
import { TaskItem, NoteItem } from './views/ClericalView';
import { UserProfileData } from './views/MemoryView';
import { NotificationItem } from './components/NotificationsDrawer';
import { Menu, Sparkles, Download, Shield, MessageCircle } from 'lucide-react';

export const App: React.FC = () => {
  // 4 Locked Bottom Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('aura');

  // Left Drawer state
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);

  // Assistant & Voice states
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [transcript, setTranscript] = useState<{ user?: string; assistant?: string }>({});

  // Chat sessions & history
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([
    { id: 'sess-1', title: 'Aura Assistant', updatedAt: new Date().toISOString() },
  ]);
  const [activeSessionId, setActiveSessionId] = useState('sess-1');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Tasks & Clerical Data
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [profile, setProfile] = useState<UserProfileData | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const lastCompletedNotifIdRef = useRef<string | null>(null);

  // Playable Routine Modal
  const [activeRoutineForPlayer, setActiveRoutineForPlayer] = useState<RoutineItem | null>(null);

  // Modals
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminSettings, setAdminSettings] = useState<AdminSettingsData | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [oauthDetails, setOauthDetails] = useState<{
    connected: boolean;
    userEmail: string | null;
    redirectUri: string;
    origins: string[];
  } | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatusData | null>(null);

  // PWA Install prompt state
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Active User Email State
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('aura_user_email') || null;
  });

  // Authenticated fetch wrapper
  const authFetch = (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    const email = currentUserEmail || localStorage.getItem('aura_user_email');
    if (email) {
      headers.set('x-user-email', email);
    }
    let targetUrl = url;
    if (url.startsWith('/api') && window.location.hostname.includes('vercel.app')) {
      targetUrl = `https://implementing-prairie-realtor-farm.trycloudflare.com${url}`;
    }
    return fetch(targetUrl, { ...options, headers });
  };

  // Refs
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial & Recurring Data Fetch
  const fetchData = async () => {
    try {
      const [chatsRes, tasksRes, notesRes, goalsRes, profileRes, oauthRes, waRes, notifRes, adminRes] = await Promise.all([
        authFetch('/api/chats').then((r) => r.json()),
        authFetch('/api/tasks').then((r) => r.json()),
        authFetch('/api/notes').then((r) => r.json()),
        authFetch('/api/goals').then((r) => r.json()).catch(() => []),
        authFetch('/api/user/profile').then((r) => r.json()),
        authFetch('/api/auth/google/details').then((r) => r.json()),
        authFetch('/api/whatsapp/status').then((r) => r.json()),
        authFetch('/api/notifications').then((r) => r.json()),
        authFetch('/api/admin/settings').then((r) => r.json()),
      ]);

      setMessages(chatsRes);
      setTasks(tasksRes);
      setNotes(notesRes);
      if (Array.isArray(goalsRes)) setGoals(goalsRes);
      setProfile(profileRes);
      setOauthDetails(oauthRes);
      setWhatsappStatus(waRes);
      setAdminSettings(adminRes);

      if (oauthRes?.connected && oauthRes?.userEmail) {
        if (!currentUserEmail || currentUserEmail !== oauthRes.userEmail) {
          localStorage.setItem('aura_user_email', oauthRes.userEmail);
          setCurrentUserEmail(oauthRes.userEmail);
        }
      } else {
        localStorage.removeItem('aura_user_email');
        setCurrentUserEmail(null);
      }

      if (Array.isArray(notifRes)) {
        setNotifications(notifRes);
        const latestCompleted = notifRes.find((n: NotificationItem) => n.status === 'completed' || n.type === 'success');
        if (latestCompleted && latestCompleted.id !== lastCompletedNotifIdRef.current) {
          if (lastCompletedNotifIdRef.current !== null && adminRes?.soundEnabled !== false) {
            chimeAudio.playDing();
          }
          lastCompletedNotifIdRef.current = latestCompleted.id;
        }
      }

      if (profileRes?.preferredVoice) {
        setVoiceGender(profileRes.preferredVoice);
      }
    } catch (err) {
      console.error('[App] Failed to fetch initial data:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Catch PWA beforeinstallprompt event
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Regular light poll for notifications and background queue
    const pollInterval = setInterval(() => {
      authFetch('/api/notifications')
        .then((r) => r.json())
        .then((notifs: NotificationItem[]) => {
          if (Array.isArray(notifs)) {
            setNotifications(notifs);
            const latestCompleted = notifs.find((n) => n.status === 'completed' || n.type === 'success');
            if (latestCompleted && latestCompleted.id !== lastCompletedNotifIdRef.current) {
              if (lastCompletedNotifIdRef.current !== null) {
                chimeAudio.playDing();
              }
              lastCompletedNotifIdRef.current = latestCompleted.id;
            }
          }
        })
        .catch(() => {});
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [currentUserEmail]);

  // WebSocket Live Audio setup
  const initWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    const isVercel = window.location.hostname.includes('vercel.app');
    const wsHost = isVercel ? 'implementing-prairie-realtor-farm.trycloudflare.com' : window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${wsHost}/ws/live`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[Live WS] Connected to backend');
      ws.send(JSON.stringify({ type: 'start', voice: voiceGender }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ready') {
          console.log('[Live WS] Gemini Live session is ready');
        } else if (msg.type === 'audio') {
          setAssistantState('speaking');
          if (audioProcessorRef.current) {
            audioProcessorRef.current.playAudioChunk(msg.data);
          }
        } else if (msg.type === 'transcription') {
          if (msg.role === 'user') {
            setTranscript((prev) => ({ ...prev, user: msg.text }));
          } else {
            setTranscript((prev) => ({ ...prev, assistant: msg.text }));
            setAssistantState('speaking');
          }
          fetchData();
        } else if (msg.type === 'interrupted') {
          console.log('[Live WS] Interruption detected');
          if (audioProcessorRef.current) {
            audioProcessorRef.current.stopPlayback();
          }
          setAssistantState('listening');
        } else if (msg.type === 'error') {
          console.error('[Live WS] Error from server:', msg.error);
          setAssistantState('idle');
        }
      } catch (err) {
        console.error('[Live WS] Message parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[Live WS] Connection closed');
      wsRef.current = null;
    };

    wsRef.current = ws;
    return ws;
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setAssistantState('thinking');
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stopRecording();
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'audio_end' }));
      }
      setTimeout(() => {
        if (assistantState !== 'speaking') {
          setAssistantState('idle');
        }
      }, 2000);
    } else {
      try {
        const ws = initWebSocket();
        if (!audioProcessorRef.current) {
          audioProcessorRef.current = new AudioProcessor();
          audioProcessorRef.current.onAudioData = (base64Data: string) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'audio_chunk', data: base64Data }));
            }
          };
          audioProcessorRef.current.onVolumeChange = (vol: number) => {
            setVolume(vol);
          };
        }
        await audioProcessorRef.current.startRecording();
        setIsRecording(true);
        setAssistantState('listening');
      } catch (err: any) {
        console.error('[Voice] Failed to start microphone:', err);
        alert('Microphone access was denied or not supported.');
        setAssistantState('idle');
      }
    }
  };

  const handleVoiceGenderChange = (voice: 'female' | 'male') => {
    setVoiceGender(voice);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start', voice }));
    }
  };

  const handleSendMessage = async (text: string) => {
    setIsChatLoading(true);
    const userMsg: ChatMessageItem = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      mediaType: 'text',
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await authFetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessageItem = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        toolCalls: data.toolExecutions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      fetchData();
    } catch (err) {
      console.error('[Chat] Error sending message:', err);
      const errorMsg: ChatMessageItem = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: "I'm having a brief issue processing that request. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (confirm('Clear chat history?')) {
      await authFetch('/api/chats/clear', { method: 'POST' });
      setMessages([]);
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed } : t)));
    await authFetch('/api/tasks/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, completed }),
    });
  };

  const handleAddTask = async (title: string, deadline?: string) => {
    const res = await authFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, deadline }),
    });
    const task = await res.json();
    setTasks((prev) => [task, ...prev]);
  };

  const handleAddNote = async (title: string, content: string) => {
    const res = await authFetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    const note = await res.json();
    setNotes((prev) => [note, ...prev]);
  };

  const handleTriggerInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    }
  };

  const handleSignOut = async () => {
    if (confirm('Sign out of Aura and disconnect account?')) {
      const emailToDisconnect = currentUserEmail;
      localStorage.removeItem('aura_user_email');
      localStorage.clear();
      setCurrentUserEmail(null);
      setOauthDetails(null);
      setWhatsappStatus(null);
      if (emailToDisconnect) {
        try {
          await authFetch('/api/auth/google/disconnect', {
            method: 'POST',
            headers: { 'x-user-email': emailToDisconnect },
          });
        } catch (e) {}
      }
      window.location.href = '/';
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await authFetch('/api/auth/google/url');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert('Could not start Google sign-in: ' + (err.message || err));
    }
  };

  const handleConnectWhatsApp = async (phone?: string) => {
    const res = await authFetch('/api/whatsapp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start WhatsApp connection');
    const status = await authFetch('/api/whatsapp/status').then((r) => r.json());
    setWhatsappStatus(status);
  };

  const handleRequestWhatsAppPairingCode = async (phone: string) => {
    const res = await authFetch('/api/whatsapp/pairing-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to request pairing code');
    const status = await authFetch('/api/whatsapp/status').then((r) => r.json());
    setWhatsappStatus(status);
    return data.pairingCode || null;
  };

  const handleDisconnectWhatsApp = async () => {
    if (confirm('Disconnect WhatsApp device?')) {
      await authFetch('/api/whatsapp/disconnect', { method: 'POST' });
      const status = await authFetch('/api/whatsapp/status').then((r) => r.json());
      setWhatsappStatus(status);
    }
  };

  const handleRefreshWhatsApp = async () => {
    const status = await authFetch('/api/whatsapp/status').then((r) => r.json());
    setWhatsappStatus(status);
  };

  const handleAddGoal = async (outcome: string, targetDate: string, frequency: 'weekly' | 'biweekly' | 'monthly') => {
    const res = await authFetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome, targetDate, milestoneFrequency: frequency }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create goal');
    }
    const newGoal = await res.json();
    setGoals((prev) => [newGoal, ...prev]);
    // Refresh tasks to pick up the newly scheduled Daily North Star
    authFetch('/api/tasks').then((r) => r.json()).then(setTasks).catch(() => {});
  };

  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const updatedMilestones = goal.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, milestones: updatedMilestones } : g))
    );
    await authFetch(`/api/goals/${goalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestones: updatedMilestones }),
    });
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('Delete this goal and project sheet link?')) {
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      await authFetch(`/api/goals/${goalId}`, { method: 'DELETE' });
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col justify-between max-w-md mx-auto relative shadow-2xl overflow-hidden pb-16">
      {/* 1. Slim Top Bar with Left Drawer Menu & PWA Install */}
      <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-900 bg-[#08090d]/90 backdrop-blur-md z-30 sticky top-0">
        <div className="flex items-center gap-2">
          {/* Menu Icon Trigger for Left Sliding Drawer */}
          <button
            onClick={() => setIsLeftDrawerOpen(true)}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Open Conversations & Settings"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold tracking-widest text-slate-200 uppercase font-mono">AURA</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Right header actions: Install App & Active Identity */}
        <div className="flex items-center gap-1.5">
          {installPrompt && (
            <button
              onClick={handleTriggerInstall}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-600/30 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Install</span>
            </button>
          )}

          {oauthDetails?.connected ? (
            <button
              onClick={() => setIsLeftDrawerOpen(true)}
              className="text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-full truncate max-w-[100px]"
              title={currentUserEmail || ''}
            >
              {currentUserEmail?.split('@')[0]}
            </button>
          ) : (
            <button
              onClick={handleConnectGoogle}
              className="text-[10px] text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Content for the 4 Locked Tabs */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'aura' && (
          <AuraView
            assistantState={assistantState}
            volume={volume}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            voiceGender={voiceGender}
            onVoiceGenderChange={handleVoiceGenderChange}
            googleConnected={!!oauthDetails?.connected}
            onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
            whatsappConnected={whatsappStatus?.status === 'connected'}
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
            onOpenAccountModal={() => setIsGoogleModalOpen(true)}
            artifacts={goals.map((g) => ({
              id: g.id,
              title: g.outcome,
              type: 'sheet' as const,
              url: g.googleSheetUrl,
            }))}
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            isChatLoading={isChatLoading}
            onEditMessage={(id, text) => handleSendMessage(text)}
            onRetryMessage={() => {
              const lastUser = [...messages].reverse().find((m) => m.role === 'user');
              if (lastUser) handleSendMessage(lastUser.content);
            }}
          />
        )}

        {activeTab === 'actions' && (
          <ActionsView
            onInstructAura={handleSendMessage}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            isLoading={isChatLoading}
            notifications={notifications}
            onDismissNotification={(id) => {
              setNotifications((prev) => prev.filter((n) => n.id !== id));
            }}
          />
        )}

        {activeTab === 'myday' && (
          <MyDayView
            tasks={tasks}
            notes={notes}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onAddNote={handleAddNote}
            onPlayRoutine={(routine) => setActiveRoutineForPlayer(routine)}
          />
        )}

        {activeTab === 'comms' && (
          <CommsView
            whatsappStatus={whatsappStatus}
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
            googleConnected={!!oauthDetails?.connected}
            onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
            currentUserEmail={currentUserEmail}
          />
        )}

        {activeTab === 'dashboards' && (
          <DashboardsView
            tasksCount={tasks.filter((t) => !t.completed).length}
            completedTasksCount={tasks.filter((t) => t.completed).length}
            whatsappMessageCount={whatsappStatus?.messageCount || 0}
          />
        )}
      </main>

      {/* 3. Omnipresent Floating Draggable Aura Logo on Non-Aura Tabs */}
      {activeTab !== 'aura' && (
        <DraggableAuraOrb
          state={assistantState}
          volume={volume}
          isRecording={isRecording}
          onToggleRecording={handleToggleRecording}
          onOpenVoiceView={() => setActiveTab('aura')}
        />
      )}

      {/* 4. The 4 Locked Bottom Tabs */}
      <Navigation
        activeTab={activeTab}
        onChange={setActiveTab}
        actionsCount={notifications.length}
        myDayCount={tasks.filter((t) => !t.completed).length}
      />

      {/* 5. Left Sliding Drawer */}
      <LeftDrawer
        isOpen={isLeftDrawerOpen}
        onClose={() => setIsLeftDrawerOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewSession={() => {
          const newId = `sess-${Date.now()}`;
          const newSess: ChatSessionMeta = {
            id: newId,
            title: `Session ${sessions.length + 1}`,
            updatedAt: new Date().toISOString(),
          };
          setSessions((prev) => [newSess, ...prev]);
          setActiveSessionId(newId);
          setMessages([]);
        }}
        onDeleteSession={(id) => {
          setSessions((prev) => prev.filter((s) => s.id !== id));
        }}
        onOpenWhatsApp={() => setIsWhatsAppModalOpen(true)}
        whatsappStatus={whatsappStatus}
        onOpenGoogle={() => setIsGoogleModalOpen(true)}
        googleConnected={!!oauthDetails?.connected}
        currentUserEmail={currentUserEmail}
        onSignOut={handleSignOut}
        onOpenAdmin={() => setIsAdminOpen(true)}
        installPrompt={installPrompt}
        onTriggerInstall={handleTriggerInstall}
      />

      {/* 6. Routine Player Modal */}
      {activeRoutineForPlayer && (
        <RoutinePlayerModal
          routine={activeRoutineForPlayer}
          onClose={() => setActiveRoutineForPlayer(null)}
          onComplete={() => {
            setActiveRoutineForPlayer(null);
            chimeAudio.playDing();
            alert('Routine completed! Streak logged.');
          }}
        />
      )}

      {/* 7. Admin & Model Settings Modal */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        settings={adminSettings}
        onSave={async (newSettings: Partial<AdminSettingsData>) => {
          const res = await authFetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings),
          });
          const updated = await res.json();
          setAdminSettings(updated);
          chimeAudio.playDing();
        }}
      />

      {/* 8. Google Workspace Setup Modal */}
      <GoogleConnectModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        oauthDetails={oauthDetails}
        onConnect={handleConnectGoogle}
        onDisconnect={handleSignOut}
      />

      {/* 9. WhatsApp Multi-Device Modal */}
      <WhatsAppConnectModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        status={whatsappStatus}
        onConnect={handleConnectWhatsApp}
        onRequestPairingCode={handleRequestWhatsAppPairingCode}
        onDisconnect={handleDisconnectWhatsApp}
        onRefresh={handleRefreshWhatsApp}
        isGoogleConnected={!!oauthDetails?.connected}
        userEmail={oauthDetails?.userEmail || currentUserEmail}
        onConnectGoogle={handleConnectGoogle}
      />
    </div>
  );
};

export default App;
