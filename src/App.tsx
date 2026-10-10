import React, { useState, useEffect, useRef } from 'react';
import { Navigation, ActiveTab } from './components/Navigation';
import { VoiceView } from './views/VoiceView';
import { StoriesView } from './views/StoriesView';
import { ChatView, ChatMessageItem } from './views/ChatView';
import { ClericalView, TaskItem, NoteItem } from './views/ClericalView';
import { ConnectorsView, PluginItem } from './views/ConnectorsView';
import { MemoryView, UserProfileData } from './views/MemoryView';
import { GoogleConnectModal } from './components/GoogleConnectModal';
import { WhatsAppConnectModal, WhatsAppStatusData } from './components/WhatsAppConnectModal';
import { NotificationsDrawer, NotificationItem } from './components/NotificationsDrawer';
import { AdminPanelModal, AdminSettingsData } from './components/AdminPanelModal';
import { AudioProcessor } from './audio/audioProcessor';
import { AssistantState, VoiceSphere } from './components/VoiceSphere';
import { DraggableAuraOrb } from './components/DraggableAuraOrb';
import { chimeAudio } from './audio/chimeAudio';
import { Bell, Sliders, Shield, MessageCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('voice');
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [transcript, setTranscript] = useState<{ user?: string; assistant?: string }>({});

  // Data states
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Notifications & Activity Queue
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const lastCompletedNotifIdRef = useRef<string | null>(null);

  // Admin Panel
  const [adminSettings, setAdminSettings] = useState<AdminSettingsData | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Google OAuth state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [oauthDetails, setOauthDetails] = useState<{
    connected: boolean;
    userEmail: string | null;
    redirectUri: string;
    origins: string[];
  } | null>(null);

  // WhatsApp state
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatusData | null>(null);

  // Refs
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial & Recurring Data Fetch
  const fetchData = async () => {
    try {
      const [chatsRes, tasksRes, notesRes, pluginsRes, profileRes, oauthRes, waRes, notifRes, adminRes] = await Promise.all([
        fetch('/api/chats').then((r) => r.json()),
        fetch('/api/tasks').then((r) => r.json()),
        fetch('/api/notes').then((r) => r.json()),
        fetch('/api/plugins').then((r) => r.json()),
        fetch('/api/user/profile').then((r) => r.json()),
        fetch('/api/auth/google/details').then((r) => r.json()),
        fetch('/api/whatsapp/status').then((r) => r.json()),
        fetch('/api/notifications').then((r) => r.json()),
        fetch('/api/admin/settings').then((r) => r.json()),
      ]);

      setMessages(chatsRes);
      setTasks(tasksRes);
      setNotes(notesRes);
      setPlugins(pluginsRes);
      setProfile(profileRes);
      setOauthDetails(oauthRes);
      setWhatsappStatus(waRes);
      setAdminSettings(adminRes);

      if (Array.isArray(notifRes)) {
        setNotifications(notifRes);
        // Detect new completed notifications and play pleasant ding chime
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

    // Regular light poll for notifications and background queue
    const pollInterval = setInterval(() => {
      fetch('/api/notifications')
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

    // Check for auth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      chimeAudio.playDing();
      alert(`Google Workspace authorized successfully for ${urlParams.get('email') || 'your account'}!`);
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchData();
    } else if (urlParams.get('auth') === 'error') {
      alert(`Google authorization failed: ${urlParams.get('reason') || 'unknown'}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => clearInterval(pollInterval);
  }, []);

  // WebSocket Live Audio setup
  const initWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live`;
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
          // Assistant is speaking!
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
          fetchData(); // Sync chat list
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

  // Toggle voice recording
  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setAssistantState('thinking');
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stopRecording();
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'audio_end' }));
      }
      setTimeout(() => {
        setAssistantState((prev) => (prev === 'speaking' ? 'speaking' : 'idle'));
      }, 1500);
    } else {
      // Start recording
      try {
        const ws = initWebSocket();
        if (!audioProcessorRef.current) {
          audioProcessorRef.current = new AudioProcessor();
        }

        audioProcessorRef.current.onAudioData = (base64PCM16k) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'audio', data: base64PCM16k }));
          }
        };

        audioProcessorRef.current.onVolumeChange = (vol) => {
          setVolume(vol);
        };

        // When user speaks, interrupt any previous assistant playback
        audioProcessorRef.current.stopPlayback();

        await audioProcessorRef.current.startRecording();
        setIsRecording(true);
        setAssistantState('listening');
      } catch (err: any) {
        console.error('[App] Failed to start microphone:', err);
        alert('Microphone access is required for voice conversation: ' + err.message);
        setIsRecording(false);
        setAssistantState('idle');
      }
    }
  };

  const handleVoiceGenderChange = (voice: 'female' | 'male') => {
    setVoiceGender(voice);
    if (profile) {
      handleUpdateProfile({ preferredVoice: voice });
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start', voice }));
    }
  };

  // Chat message sending (Text or Quick prompt)
  const handleSendMessage = async (text: string) => {
    setIsChatLoading(true);
    setTranscript({ user: text });
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: 'text' }),
      });
      const data = await res.json();
      setTranscript((prev) => ({ ...prev, assistant: data.reply }));
      fetchData();
    } catch (err) {
      console.error('[App] Failed to send chat message:', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (confirm('Clear all conversation history?')) {
      await fetch('/api/chats', { method: 'DELETE' });
      setMessages([]);
      setTranscript({});
    }
  };

  // Tasks actions
  const handleToggleTask = async (taskId: string, completed: boolean) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed } : t)));
  };

  const handleAddTask = async (title: string, deadline?: string) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, deadline, urgency: 'medium', source: 'voice', completed: false }),
    });
    const task = await res.json();
    setTasks((prev) => [task, ...prev]);
  };

  // Notes actions
  const handleAddNote = async (title: string, content: string) => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, tags: ['quick-note'] }),
    });
    const note = await res.json();
    setNotes((prev) => [note, ...prev]);
  };

  // Plugins toggle
  const handleTogglePlugin = async (id: string, enabled: boolean) => {
    await fetch('/api/plugins/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
    setPlugins((prev) => prev.map((p) => (p.id === id ? { ...p, enabled } : p)));
  };

  // Profile update
  const handleUpdateProfile = async (updates: Partial<UserProfileData>) => {
    const res = await fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    setProfile(data);
  };

  // Google OAuth flow
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google/url').then((r) => r.json());
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      console.error('[App] Failed to get Google auth URL:', err);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (confirm('Disconnect Google Workspace account?')) {
      await fetch('/api/auth/google/disconnect', { method: 'POST' });
      fetchData();
    }
  };

  const handleConnectWhatsApp = async (phone?: string) => {
    await fetch('/api/whatsapp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone }),
    });
    const status = await fetch('/api/whatsapp/status').then((r) => r.json());
    setWhatsappStatus(status);
  };

  const handleRequestWhatsAppPairingCode = async (phone: string) => {
    const res = await fetch('/api/whatsapp/pairing-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone }),
    });
    const data = await res.json();
    const status = await fetch('/api/whatsapp/status').then((r) => r.json());
    setWhatsappStatus(status);
    return data.pairingCode || null;
  };

  const handleDisconnectWhatsApp = async () => {
    if (confirm('Disconnect WhatsApp device?')) {
      await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      const status = await fetch('/api/whatsapp/status').then((r) => r.json());
      setWhatsappStatus(status);
    }
  };

  const handleRefreshWhatsApp = async () => {
    const status = await fetch('/api/whatsapp/status').then((r) => r.json());
    setWhatsappStatus(status);
  };

  const openTaskCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col justify-between max-w-md mx-auto relative shadow-2xl overflow-hidden pb-16">
      {/* Top Header Bar (Notifications, Admin & Connector Quick Icons) */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-900 bg-[#08090d]/90 backdrop-blur-md z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">Aura</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* WhatsApp status icon button */}
          <button
            onClick={() => setIsWhatsAppModalOpen(true)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              whatsappStatus?.status === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="WhatsApp Status"
          >
            <MessageCircle className="w-4 h-4" />
          </button>

          {/* Google Workspace status icon button */}
          <button
            onClick={() => setIsGoogleModalOpen(true)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              oauthDetails?.connected
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Google Workspace Status"
          >
            <Shield className="w-4 h-4" />
          </button>

          {/* Notifications Drawer Toggle */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Activity & Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.filter((n) => !n.read && n.status !== 'in_progress').length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                {notifications.filter((n) => !n.read && n.status !== 'in_progress').length}
              </span>
            )}
            {notifications.some((n) => n.status === 'in_progress') && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            )}
          </button>

          {/* Admin Panel Toggle */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-indigo-400 transition-colors cursor-pointer"
            title="Admin & Model Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content by Tab */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'voice' && (
          <VoiceView
            assistantState={assistantState}
            volume={volume}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            voiceGender={voiceGender}
            onVoiceGenderChange={handleVoiceGenderChange}
            transcript={transcript}
            googleConnected={!!oauthDetails?.connected}
            onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
            whatsappConnected={whatsappStatus?.status === 'connected'}
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
            onSendQuickPrompt={handleSendMessage}
          />
        )}

        {activeTab === 'stories' && (
          <StoriesView
            onInstructAura={handleSendMessage}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            isLoading={isChatLoading}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            isLoading={isChatLoading}
          />
        )}

        {activeTab === 'clerical' && (
          <ClericalView
            tasks={tasks}
            notes={notes}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onAddNote={handleAddNote}
          />
        )}

        {activeTab === 'connectors' && (
          <ConnectorsView
            plugins={plugins}
            onTogglePlugin={handleTogglePlugin}
            onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
            whatsappConnected={whatsappStatus?.status === 'connected'}
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
          />
        )}

        {activeTab === 'memory' && profile && (
          <MemoryView
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </main>

      {/* Omnipresent Floating Draggable Aura Logo on Non-Voice Tabs */}
      {activeTab !== 'voice' && (
        <DraggableAuraOrb
          state={assistantState}
          volume={volume}
          isRecording={isRecording}
          onToggleRecording={handleToggleRecording}
          onOpenVoiceView={() => setActiveTab('voice')}
        />
      )}

      {/* Bottom Mobile Tab Bar */}
      <Navigation
        activeTab={activeTab}
        onChange={setActiveTab}
        openTaskCount={openTaskCount}
      />

      {/* Notifications & Live Queue Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={async (id) => {
          await fetch('/api/notifications/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          setNotifications((prev) =>
            id ? prev.map((n) => (n.id === id ? { ...n, read: true } : n)) : prev.map((n) => ({ ...n, read: true }))
          );
        }}
      />

      {/* Admin Panel Modal (Modular Model Switching & API Keys) */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        settings={adminSettings}
        onSaveSettings={async (newSettings) => {
          const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings),
          });
          const updated = await res.json();
          setAdminSettings(updated);
          chimeAudio.playDing();
        }}
      />

      {/* Google Workspace Setup Modal */}
      <GoogleConnectModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        oauthDetails={oauthDetails}
        onConnect={handleConnectGoogle}
        onDisconnect={handleDisconnectGoogle}
      />

      {/* WhatsApp Multi-Device Modal */}
      <WhatsAppConnectModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        status={whatsappStatus}
        onConnect={handleConnectWhatsApp}
        onRequestPairingCode={handleRequestWhatsAppPairingCode}
        onDisconnect={handleDisconnectWhatsApp}
        onRefresh={handleRefreshWhatsApp}
      />
    </div>
  );
};
export default App;
