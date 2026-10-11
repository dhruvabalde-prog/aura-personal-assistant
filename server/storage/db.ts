import fs from 'fs';
import path from 'path';
import { supabaseService } from '../services/supabaseService.js';

export interface UserProfile {
  name: string;
  assistantName: string;
  preferredVoice: 'female' | 'male'; // female = Aoede, male = Puck
  preferredLanguage: string;
  emotionalContext: {
    lastMood: string;
    stressLevel: 'low' | 'moderate' | 'high';
    energyLevel: 'low' | 'moderate' | 'high';
    notes: string[];
    updatedAt: string;
  };
  habits: string[];
  keyPeople: { name: string; relation: string; notes?: string }[];
  dailyPriorities: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mediaType?: 'text' | 'voice';
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
    result?: any;
  }>;
}

export interface GoogleTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
  userEmail?: string | null;
}

export interface ExtractedTask {
  id: string;
  source: 'whatsapp' | 'email' | 'voice' | 'notes';
  title: string;
  sender?: string;
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

export interface WhatsAppMessage {
  id: string;
  from: string;
  fromName: string;
  text: string;
  timestamp: string;
  isGroup: boolean;
  groupName?: string;
  fromMe: boolean;
  extractedTask?: string;
  userPhone?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'working' | 'alert';
  timestamp: string;
  read: boolean;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
}

export interface AdminSettings {
  activeProvider: 'gemini' | 'anthropic' | 'openai';
  geminiApiKey: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  selectedModel: string;
  customSystemPrompt?: string;
  soundEnabled: boolean;
}

export interface ConnectorItem {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface ContactPerson {
  resourceName?: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
  organization?: string;
}

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

export interface UserWorkspace {
  email: string;
  profile: UserProfile;
  messages: ChatMessage[];
  googleTokens: GoogleTokens | null;
  tasks: ExtractedTask[];
  notes: NoteItem[];
  goals?: GoalItem[];
  whatsappMessages: WhatsAppMessage[];
  notifications: NotificationItem[];
  savedWhatsAppPhone?: string;
  contacts?: ContactPerson[];
  connectors: ConnectorItem[];
  createdAt: string;
}

export interface AppDatabase {
  users: Record<string, UserWorkspace>;
  activeUserEmail?: string;
  adminSettings: AdminSettings;
  customRedirectUri?: string;
}

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const DB_FILE = path.join(STORAGE_DIR, 'aura_db.json');

const DEFAULT_CONNECTORS: ConnectorItem[] = [
  { id: 'whatsapp', name: 'WhatsApp Multi-Device', category: 'communication', enabled: false, config: {} },
  { id: 'gmail', name: 'Gmail Inbox', category: 'google_workspace', enabled: false, config: {} },
  { id: 'calendar', name: 'Google Calendar & Meet', category: 'google_workspace', enabled: false, config: {} },
  { id: 'tasks', name: 'Google Tasks', category: 'google_workspace', enabled: false, config: {} },
  { id: 'drive', name: 'Google Drive & Docs', category: 'google_workspace', enabled: false, config: {} },
  { id: 'sheets', name: 'Google Sheets', category: 'google_workspace', enabled: false, config: {} },
  { id: 'slides', name: 'Google Slides', category: 'google_workspace', enabled: false, config: {} },
  { id: 'forms', name: 'Google Forms', category: 'google_workspace', enabled: false, config: {} },
  { id: 'notes', name: 'Google Keep / Quick Notes', category: 'google_workspace', enabled: true, config: {} },
  { id: 'web_search', name: 'Web Research & Maps', category: 'knowledge', enabled: true, config: {} },
];

function createInitialWorkspace(email: string): UserWorkspace {
  return {
    email,
    profile: {
      name: 'You',
      assistantName: 'Aura',
      preferredVoice: 'female',
      preferredLanguage: 'English',
      emotionalContext: {
        lastMood: 'Calm',
        stressLevel: 'low',
        energyLevel: 'moderate',
        notes: [],
        updatedAt: new Date().toISOString(),
      },
      habits: [],
      keyPeople: [],
      dailyPriorities: [],
    },
    messages: [
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: "Hello! I am Aura, your personal AI assistant. How can I help you today?",
        timestamp: new Date().toISOString(),
        mediaType: 'text',
      },
    ],
    googleTokens: null,
    tasks: [],
    notes: [],
    whatsappMessages: [],
    notifications: [
      {
        id: `notif-welcome-${Date.now()}`,
        title: 'Aura Online',
        message: 'Your personal workspace is ready.',
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false,
        status: 'completed',
      },
    ],
    connectors: JSON.parse(JSON.stringify(DEFAULT_CONNECTORS)),
    createdAt: new Date().toISOString(),
  };
}

class Database {
  private data: AppDatabase;

  constructor() {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    const defaultAdminSettings: AdminSettings = {
      activeProvider: 'gemini',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      selectedModel: 'gemini-3.8-flash',
      soundEnabled: true,
    };

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        // Check if legacy flat database format -> migrate to multi-tenant users map
        if (!parsed.users && (parsed.profile || parsed.messages || parsed.tasks)) {
          console.log('[DB] Migrating legacy single-tenant DB to multi-tenant user schema...');
          const existingEmail = parsed.googleTokens?.userEmail || 'default';
          const migratedWorkspace: UserWorkspace = {
            email: existingEmail,
            profile: parsed.profile || createInitialWorkspace(existingEmail).profile,
            messages: parsed.messages || [],
            googleTokens: parsed.googleTokens || null,
            tasks: parsed.tasks || [],
            notes: parsed.notes || [],
            whatsappMessages: parsed.whatsappMessages || [],
            notifications: parsed.notifications || [],
            savedWhatsAppPhone: parsed.savedWhatsAppPhone,
            connectors: parsed.connectors || DEFAULT_CONNECTORS,
            createdAt: new Date().toISOString(),
          };

          this.data = {
            users: {
              [this.normalizeEmail(existingEmail)]: migratedWorkspace,
            },
            activeUserEmail: existingEmail,
            adminSettings: parsed.adminSettings || defaultAdminSettings,
            customRedirectUri: parsed.customRedirectUri,
          };
          this.save();
        } else {
          this.data = {
            users: parsed.users || {},
            adminSettings: parsed.adminSettings || defaultAdminSettings,
            customRedirectUri: parsed.customRedirectUri,
          };
        }
      } catch (err) {
        console.error('[DB] Failed to parse db file, initializing fresh', err);
        this.data = {
          users: {},
          adminSettings: defaultAdminSettings,
        };
        this.save();
      }
    } else {
      this.data = {
        users: {},
        adminSettings: defaultAdminSettings,
      };
      this.flushSave();
    }
  }

  private saveTimeout: NodeJS.Timeout | null = null;
  private pendingSyncEmails: Set<string> = new Set();

  public save(emailToSync?: string) {
    if (emailToSync) {
      this.pendingSyncEmails.add(emailToSync);
    }

    if (this.saveTimeout) {
      return;
    }

    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.flushSave();
    }, 150);
  }

  public flushSave() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error persisting database:', err);
    }

    const emails = Array.from(this.pendingSyncEmails);
    this.pendingSyncEmails.clear();
    for (const email of emails) {
      const norm = this.normalizeEmail(email);
      if (norm !== 'guest' && norm !== 'default' && this.data.users[norm]) {
        supabaseService.syncWorkspace(norm, this.data.users[norm]).catch((err) => {
          console.warn('[DB] Supabase async sync warning:', err?.message || err);
        });
      }
    }
  }

  public normalizeEmail(email?: string | null): string {
    if (!email || typeof email !== 'string' || !email.trim() || email === 'undefined' || email === 'null' || email === 'guest') {
      return 'guest';
    }
    return email.trim().toLowerCase();
  }

  public getActiveUserEmail(): string | undefined {
    return undefined;
  }

  public setActiveUserEmail(email: string) {
    const norm = this.normalizeEmail(email);
    if (norm !== 'guest' && !this.data.users[norm]) {
      this.data.users[norm] = createInitialWorkspace(norm);
      this.save(norm);
    }
  }

  public getUserWorkspace(email?: string): UserWorkspace {
    const norm = this.normalizeEmail(email);
    if (!this.data.users[norm]) {
      this.data.users[norm] = createInitialWorkspace(norm);
      this.save(norm);

      // Hydrate from Supabase cloud asynchronously if previously saved
      if (norm !== 'guest' && norm !== 'default') {
        supabaseService.loadWorkspace(norm).then((cloudWs) => {
          if (cloudWs) {
            this.data.users[norm] = {
              ...this.data.users[norm],
              ...cloudWs,
              email: norm,
            };
            this.save();
          }
        }).catch(() => {});
      }
    }
    return this.data.users[norm];
  }

  public async hydrateUserFromSupabase(email: string): Promise<UserWorkspace> {
    const norm = this.normalizeEmail(email);
    const ws = this.getUserWorkspace(norm);
    try {
      const cloudWs = await supabaseService.loadWorkspace(norm);
      if (cloudWs) {
        this.data.users[norm] = {
          ...ws,
          ...cloudWs,
          email: norm,
        };
        this.save();
      }
    } catch (e) {}
    return this.data.users[norm];
  }

  // --- Profile Methods ---
  getProfile(email?: string): UserProfile {
    return this.getUserWorkspace(email).profile;
  }

  updateProfile(arg1?: string | Partial<UserProfile>, arg2?: Partial<UserProfile>): UserProfile {
    let email: string | undefined;
    let partial: Partial<UserProfile>;
    if (typeof arg1 === 'string') {
      email = arg1;
      partial = arg2 || {};
    } else {
      partial = arg1 || {};
    }
    const ws = this.getUserWorkspace(email);
    ws.profile = { ...ws.profile, ...partial };
    this.save(email);
    return ws.profile;
  }

  updateEmotionalContext(arg1?: string | Partial<UserProfile['emotionalContext']>, arg2?: Partial<UserProfile['emotionalContext']>) {
    let email: string | undefined;
    let update: Partial<UserProfile['emotionalContext']>;
    if (typeof arg1 === 'string') {
      email = arg1;
      update = arg2 || {};
    } else {
      update = arg1 || {};
    }
    const ws = this.getUserWorkspace(email);
    ws.profile.emotionalContext = {
      ...ws.profile.emotionalContext,
      ...update,
      updatedAt: new Date().toISOString(),
    };
    this.save(email);
  }

  // --- Messages Methods ---
  getMessages(email?: string): ChatMessage[] {
    return this.getUserWorkspace(email).messages;
  }

  addMessage(arg1: string | Omit<ChatMessage, 'id' | 'timestamp'>, arg2?: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    let email: string | undefined;
    let msg: Omit<ChatMessage, 'id' | 'timestamp'>;
    if (typeof arg1 === 'string') {
      email = arg1;
      msg = arg2!;
    } else {
      msg = arg1;
    }
    const ws = this.getUserWorkspace(email);
    const fullMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...msg,
    };
    ws.messages.push(fullMsg);
    if (ws.messages.length > 300) {
      ws.messages = ws.messages.slice(-300);
    }
    this.save(email);
    return fullMsg;
  }

  clearMessages(email?: string) {
    const ws = this.getUserWorkspace(email);
    ws.messages = [];
    this.save(email);
  }

  // --- Google Tokens Methods ---
  getGoogleTokens(email?: string): GoogleTokens | null {
    const norm = this.normalizeEmail(email);
    if (norm === 'guest') return null;
    return this.getUserWorkspace(norm).googleTokens;
  }

  saveGoogleTokens(arg1?: string | GoogleTokens | null, arg2?: GoogleTokens | null) {
    let email: string | undefined;
    let tokens: GoogleTokens | null;
    if (typeof arg1 === 'string') {
      email = arg1;
      tokens = arg2 ?? null;
    } else {
      tokens = arg1 ?? null;
      email = tokens?.userEmail || undefined;
    }

    const norm = this.normalizeEmail(email);
    if (norm === 'guest') return;

    const ws = this.getUserWorkspace(norm);
    ws.googleTokens = tokens;
    if (tokens?.access_token || tokens?.refresh_token) {
      ws.connectors.forEach((c) => {
        if (c.category === 'google_workspace') c.enabled = true;
      });
    }
    this.save(norm);
  }

  // --- WhatsApp Phone & Settings Methods ---
  getSavedWhatsAppPhone(email?: string): string | undefined {
    const norm = this.normalizeEmail(email);
    return this.getUserWorkspace(norm).savedWhatsAppPhone;
  }

  saveWhatsAppPhone(arg1: string, arg2?: string) {
    let email: string | undefined;
    let phone: string;
    if (arg2 !== undefined) {
      email = arg1;
      phone = arg2;
    } else {
      phone = arg1;
    }
    const norm = this.normalizeEmail(email);
    let clean = phone ? phone.replace(/[^0-9]/g, '') : '';
    if (clean.length === 10) clean = `91${clean}`;
    const ws = this.getUserWorkspace(norm);
    ws.savedWhatsAppPhone = clean || undefined;
    this.save(norm);
  }

  // --- Google Contacts Methods ---
  getContacts(email?: string): ContactPerson[] {
    const ws = this.getUserWorkspace(email);
    return ws.contacts || [];
  }

  saveContacts(email: string | undefined, contacts: ContactPerson[]) {
    const ws = this.getUserWorkspace(email);
    ws.contacts = contacts;
    if (!ws.profile.keyPeople) ws.profile.keyPeople = [];
    const existingKeyNames = new Set(ws.profile.keyPeople.map((k) => k.name.toLowerCase()));
    for (const c of contacts) {
      if (!existingKeyNames.has(c.name.toLowerCase()) && c.name && c.name !== 'Unknown Contact') {
        ws.profile.keyPeople.push({
          name: c.name,
          relation: c.organization || 'Google Contact',
          notes: c.phoneNumbers[0] ? `Mobile: +${c.phoneNumbers[0]}` : (c.emails[0] ? `Email: ${c.emails[0]}` : undefined),
        });
        existingKeyNames.add(c.name.toLowerCase());
        if (ws.profile.keyPeople.length >= 35) break;
      }
    }
    this.save(email);
  }

  resolveContactName(phoneOrEmail?: string, email?: string): string | null {
    if (!phoneOrEmail) return null;
    const clean = phoneOrEmail.replace(/[^0-9]/g, '');
    const cleanNorm = clean.length === 10 ? `91${clean}` : clean;
    const emailLower = phoneOrEmail.toLowerCase().trim();

    const contacts = this.getContacts(email);
    for (const c of contacts) {
      if (cleanNorm && c.phoneNumbers && c.phoneNumbers.some((p) => p === cleanNorm || p.endsWith(cleanNorm) || cleanNorm.endsWith(p))) {
        return c.name;
      }
      if (emailLower && c.emails && c.emails.some((e) => e === emailLower)) {
        return c.name;
      }
    }
    return null;
  }

  // --- Tasks Methods ---
  getTasks(email?: string): ExtractedTask[] {
    return this.getUserWorkspace(email).tasks;
  }

  addTask(arg1: string | Omit<ExtractedTask, 'id' | 'createdAt'>, arg2?: Omit<ExtractedTask, 'id' | 'createdAt'>): ExtractedTask {
    let email: string | undefined;
    let task: Omit<ExtractedTask, 'id' | 'createdAt'>;
    if (typeof arg1 === 'string') {
      email = arg1;
      task = arg2!;
    } else {
      task = arg1;
    }
    const ws = this.getUserWorkspace(email);
    const newTask: ExtractedTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      ...task,
    };
    ws.tasks.unshift(newTask);
    this.save(email);
    return newTask;
  }

  updateTask(arg1: string, arg2: string | Partial<ExtractedTask>, arg3?: Partial<ExtractedTask>) {
    let email: string | undefined;
    let taskId: string;
    let updates: Partial<ExtractedTask>;
    if (arg3 !== undefined) {
      email = arg1;
      taskId = arg2 as string;
      updates = arg3;
    } else {
      taskId = arg1;
      updates = arg2 as Partial<ExtractedTask>;
    }
    const ws = this.getUserWorkspace(email);
    const idx = ws.tasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      ws.tasks[idx] = { ...ws.tasks[idx], ...updates };
      this.save(email);
    }
  }

  clearTasks(email?: string) {
    const ws = this.getUserWorkspace(email);
    ws.tasks = [];
    this.save(email);
  }

  // --- Goals Methods ---
  getGoals(email?: string): GoalItem[] {
    const ws = this.getUserWorkspace(email);
    return ws.goals || [];
  }

  addGoal(arg1: string | Omit<GoalItem, 'id' | 'createdAt'>, arg2?: Omit<GoalItem, 'id' | 'createdAt'>): GoalItem {
    let email: string | undefined;
    let goal: Omit<GoalItem, 'id' | 'createdAt'>;
    if (typeof arg1 === 'string') {
      email = arg1;
      goal = arg2!;
    } else {
      goal = arg1;
    }
    const ws = this.getUserWorkspace(email);
    if (!ws.goals) ws.goals = [];
    const newGoal: GoalItem = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      ...goal,
    };
    ws.goals.unshift(newGoal);
    this.save(email);
    return newGoal;
  }

  updateGoal(arg1: string, arg2: string | Partial<GoalItem>, arg3?: Partial<GoalItem>) {
    let email: string | undefined;
    let goalId: string;
    let updates: Partial<GoalItem>;
    if (arg3 !== undefined) {
      email = arg1;
      goalId = arg2 as string;
      updates = arg3;
    } else {
      goalId = arg1;
      updates = arg2 as Partial<GoalItem>;
    }
    const ws = this.getUserWorkspace(email);
    if (!ws.goals) ws.goals = [];
    const idx = ws.goals.findIndex((g) => g.id === goalId);
    if (idx !== -1) {
      ws.goals[idx] = { ...ws.goals[idx], ...updates };
      this.save(email);
    }
  }

  deleteGoal(arg1: string, arg2?: string) {
    let email: string | undefined;
    let goalId: string;
    if (arg2 !== undefined) {
      email = arg1;
      goalId = arg2;
    } else {
      goalId = arg1;
    }
    const ws = this.getUserWorkspace(email);
    if (!ws.goals) return;
    ws.goals = ws.goals.filter((g) => g.id !== goalId);
    this.save(email);
  }

  // --- Notes Methods ---
  getNotes(email?: string): NoteItem[] {
    return this.getUserWorkspace(email).notes;
  }

  addNote(arg1: string | Omit<NoteItem, 'id' | 'updatedAt'>, arg2?: Omit<NoteItem, 'id' | 'updatedAt'>): NoteItem {
    let email: string | undefined;
    let note: Omit<NoteItem, 'id' | 'updatedAt'>;
    if (typeof arg1 === 'string') {
      email = arg1;
      note = arg2!;
    } else {
      note = arg1;
    }
    const ws = this.getUserWorkspace(email);
    const newNote: NoteItem = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: new Date().toISOString(),
      ...note,
    };
    ws.notes.unshift(newNote);
    this.save(email);
    return newNote;
  }

  // --- WhatsApp Messages Methods ---
  getWhatsAppMessages(email?: string, phone?: string): WhatsAppMessage[] {
    const ws = this.getUserWorkspace(email);
    const msgs = ws.whatsappMessages || [];
    if (phone) {
      const clean = phone.replace(/[^0-9]/g, '');
      return msgs.filter((m) => !m.userPhone || m.userPhone === clean);
    }
    return msgs;
  }

  addWhatsAppMessage(arg1: string | WhatsAppMessage, arg2?: WhatsAppMessage) {
    let email: string | undefined;
    let msg: WhatsAppMessage;
    if (typeof arg1 === 'string') {
      email = arg1;
      msg = arg2!;
    } else {
      msg = arg1;
    }
    const ws = this.getUserWorkspace(email);
    if (!ws.whatsappMessages) ws.whatsappMessages = [];
    ws.whatsappMessages.unshift(msg);
    if (ws.whatsappMessages.length > 200) {
      ws.whatsappMessages = ws.whatsappMessages.slice(0, 200);
    }
    this.save(email);
  }

  addWhatsAppMessagesBatch(email: string, messages: WhatsAppMessage[]) {
    if (!messages || messages.length === 0) return;
    const ws = this.getUserWorkspace(email);
    if (!ws.whatsappMessages) ws.whatsappMessages = [];
    ws.whatsappMessages.unshift(...messages);
    if (ws.whatsappMessages.length > 250) {
      ws.whatsappMessages = ws.whatsappMessages.slice(0, 250);
    }
    this.save(email);
  }

  clearWhatsAppMessages(email?: string) {
    const ws = this.getUserWorkspace(email);
    ws.whatsappMessages = [];
    this.save(email);
  }

  // --- Notifications Methods ---
  getNotifications(email?: string): NotificationItem[] {
    return this.getUserWorkspace(email).notifications || [];
  }

  addNotification(arg1: string | Omit<NotificationItem, 'id' | 'timestamp' | 'read'>, arg2?: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): NotificationItem {
    let email: string | undefined;
    let notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>;
    if (typeof arg1 === 'string') {
      email = arg1;
      notif = arg2!;
    } else {
      notif = arg1;
    }
    const ws = this.getUserWorkspace(email);
    if (!ws.notifications) ws.notifications = [];
    const item: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notif,
    };
    ws.notifications.unshift(item);
    if (ws.notifications.length > 50) {
      ws.notifications = ws.notifications.slice(0, 50);
    }
    this.save(email);
    return item;
  }

  updateNotification(arg1: string, arg2: string | Partial<NotificationItem>, arg3?: Partial<NotificationItem>) {
    let email: string | undefined;
    let notifId: string;
    let updates: Partial<NotificationItem>;
    if (arg3 !== undefined) {
      email = arg1;
      notifId = arg2 as string;
      updates = arg3;
    } else {
      notifId = arg1;
      updates = arg2 as Partial<NotificationItem>;
    }
    const ws = this.getUserWorkspace(email);
    if (!ws.notifications) return;
    const idx = ws.notifications.findIndex((n) => n.id === notifId);
    if (idx !== -1) {
      ws.notifications[idx] = { ...ws.notifications[idx], ...updates };
      this.save(email);
    }
  }

  markAllNotificationsRead(email?: string) {
    const ws = this.getUserWorkspace(email);
    if (!ws.notifications) return;
    ws.notifications.forEach((n) => { n.read = true; });
    this.save(email);
  }

  clearNotifications(email?: string) {
    const ws = this.getUserWorkspace(email);
    ws.notifications = [];
    this.save(email);
  }

  // --- Connectors Methods ---
  getConnectors(email?: string) {
    return this.getUserWorkspace(email).connectors;
  }

  toggleConnector(arg1: string, arg2: string | boolean, arg3?: boolean) {
    let email: string | undefined;
    let id: string;
    let enabled: boolean;
    if (arg3 !== undefined) {
      email = arg1;
      id = arg2 as string;
      enabled = arg3;
    } else {
      id = arg1;
      enabled = arg2 as boolean;
    }
    const ws = this.getUserWorkspace(email);
    const c = ws.connectors.find((item) => item.id === id);
    if (c) {
      c.enabled = enabled;
      this.save(email);
    }
  }

  // --- Admin Settings Methods ---
  getAdminSettings(): AdminSettings {
    return this.data.adminSettings || {
      activeProvider: 'gemini',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      selectedModel: 'gemini-3.8-flash',
      soundEnabled: true,
    };
  }

  updateAdminSettings(updates: Partial<AdminSettings>): AdminSettings {
    this.data.adminSettings = { ...this.getAdminSettings(), ...updates };
    this.save();
    return this.data.adminSettings;
  }

  getCustomRedirectUri(): string | undefined {
    return this.data.customRedirectUri;
  }

  setCustomRedirectUri(uri: string) {
    this.data.customRedirectUri = uri;
    this.save();
  }
}

export const db = new Database();
