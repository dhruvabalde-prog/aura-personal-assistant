import fs from 'fs';
import path from 'path';
import pino from 'pino';
import qrcode from 'qrcode';
import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  WASocket,
} from '@whiskeysockets/baileys';
import { db, WhatsAppMessage } from '../storage/db.js';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const BASE_AUTH_DIR = path.resolve(process.cwd(), 'storage', 'baileys_auth');

export interface WhatsAppStatus {
  status: 'disconnected' | 'connecting' | 'connected';
  qrCode: string | null;
  pairingCode: string | null;
  pairingMode?: 'qr' | 'code' | null;
  savedPhone: string | null;
  user: {
    phone: string;
    name: string;
  } | null;
  messageCount: number;
  lastConnectedAt?: string;
  targetPhone?: string | null;
}

export class WhatsAppService {
  private sock: WASocket | null = null;
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private currentQrCode: string | null = null;
  private currentPairingCode: string | null = null;
  private pairingMode: 'qr' | 'code' | null = null;
  private userPhone: string | null = null;
  private userName: string | null = null;
  private isInitializing: boolean = false;
  private activeAuthDir: string = path.join(BASE_AUTH_DIR, 'default');
  private currentActiveUserEmail: string = 'default';

  constructor() {
    // Fresh session - do not auto-bind to unauthenticated callers
  }

  getStatus(userEmail?: string): WhatsAppStatus {
    const norm = db.normalizeEmail(userEmail);
    if (!norm || norm === 'guest') {
      return {
        status: 'disconnected',
        qrCode: null,
        pairingCode: null,
        pairingMode: null,
        savedPhone: null,
        user: null,
        messageCount: 0,
        targetPhone: null,
      };
    }

    // Only if the current live socket belongs to this specific user
    if (this.currentActiveUserEmail === norm) {
      return {
        status: this.status,
        qrCode: this.currentQrCode,
        pairingCode: this.currentPairingCode,
        pairingMode: this.pairingMode,
        savedPhone: db.getSavedWhatsAppPhone(norm) || this.userPhone || null,
        user: this.status === 'connected' ? {
          phone: this.userPhone || 'WhatsApp User',
          name: this.userName || 'You',
        } : null,
        messageCount: db.getWhatsAppMessages(norm).length,
        targetPhone: this.userPhone,
      };
    }

    // Otherwise, this user is not the active socket session
    return {
      status: 'disconnected',
      qrCode: null,
      pairingCode: null,
      pairingMode: null,
      savedPhone: db.getSavedWhatsAppPhone(norm) || null,
      user: null,
      messageCount: db.getWhatsAppMessages(norm).length,
      targetPhone: null,
    };
  }

  private attachMessageHandlers(sock: WASocket) {
    const handleHistorySync = async ({ messages }: any) => {
      const count = messages?.length || 0;
      console.log(`[WhatsApp] History sync event received: ${count} messages`);

      if (!Array.isArray(messages) || messages.length === 0) return;

      let importedCount = 0;
      let actionableFound = 0;

      for (const msg of messages) {
        try {
          if (!msg.message) continue;
          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            '';
          if (!text.trim()) continue;

          const fromJid = msg.key.remoteJid || '';
          const fromMe = !!msg.key.fromMe;
          const isGroup = fromJid.endsWith('@g.us');
          const fromName = msg.pushName || (isGroup ? 'Group Member' : fromJid.split('@')[0]);

          const storedMsg: WhatsAppMessage = {
            id: msg.key.id || `wa-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            from: fromJid,
            fromName,
            text: text.trim(),
            timestamp: new Date((Number(msg.messageTimestamp) || Date.now() / 1000) * 1000).toISOString(),
            isGroup,
            fromMe,
            userPhone: this.userPhone || undefined,
          };

          db.addWhatsAppMessage(this.currentActiveUserEmail, storedMsg);
          importedCount++;

          if (!fromMe) {
            // Asynchronously detect action items without blocking
            this.detectAndAddTaskFromMessage(storedMsg);
          }
        } catch (historyErr) {
          // ignore individual message parse errors
        }
      }

      console.log(`[WhatsApp] Successfully synced and stored ${importedCount} existing messages for user ${this.currentActiveUserEmail} (${this.userPhone})`);
      db.addNotification(this.currentActiveUserEmail, {
        title: 'WhatsApp Existing Chats Synced',
        message: `Synced ${importedCount} existing chats and actively extracted pending action items for your daily priorities.`,
        type: 'success',
        status: 'completed',
      });
    };

    // Listen to standard Baileys history sync event (both hyphenated and dot notation)
    (sock.ev as any).on('messaging-history.set', handleHistorySync);
    (sock.ev as any).on('messaging.history.set', handleHistorySync);

    // Handle incoming real-time messages
    sock.ev.on('messages.upsert', async ({ messages }: any) => {
      for (const msg of messages) {
        try {
          if (!msg.message) continue;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            '';

          if (!text.trim()) continue;

          const fromJid = msg.key.remoteJid || '';
          const fromMe = !!msg.key.fromMe;
          const isGroup = fromJid.endsWith('@g.us');
          const fromName = msg.pushName || (isGroup ? 'Group Member' : fromJid.split('@')[0]);

          const storedMsg: WhatsAppMessage = {
            id: msg.key.id || `wa-${Date.now()}`,
            from: fromJid,
            fromName,
            text: text.trim(),
            timestamp: new Date((Number(msg.messageTimestamp) || Date.now() / 1000) * 1000).toISOString(),
            isGroup,
            fromMe,
            userPhone: this.userPhone || undefined,
          };

          db.addWhatsAppMessage(this.currentActiveUserEmail, storedMsg);

          if (!fromMe) {
            this.detectAndAddTaskFromMessage(storedMsg);
          }
        } catch (msgErr) {
          console.error('[WhatsApp] Error processing message:', msgErr);
        }
      }
    });
  }

  async connect(phoneNumber?: string, userEmail?: string): Promise<void> {
    const emailToUse = userEmail || (this.currentActiveUserEmail !== 'guest' ? this.currentActiveUserEmail : undefined);
    const norm = db.normalizeEmail(emailToUse);
    if (!norm || norm === 'guest') {
      throw new Error('Please connect your Google Workspace account first to link WhatsApp to your profile.');
    }
    this.currentActiveUserEmail = norm;
    if (this.status === 'connected' && this.currentActiveUserEmail === norm) {
      return;
    }

    const targetPhone = phoneNumber || db.getSavedWhatsAppPhone(norm);
    if (targetPhone) {
      let clean = targetPhone.replace(/[^0-9]/g, '');
      if (clean.length === 10) clean = `91${clean}`;
      this.userPhone = clean;
      db.saveWhatsAppPhone(norm, clean);
    }

    const userFolder = norm.replace(/[^a-zA-Z0-9_-]/g, '_');
    this.activeAuthDir = path.join(BASE_AUTH_DIR, `user_${userFolder}`);

    this.pairingMode = 'qr';
    this.isInitializing = true;
    this.status = 'connecting';

    try {
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('creds.update');
          this.sock.end(undefined);
        } catch (e) {}
        this.sock = null;
      }

      if (!fs.existsSync(this.activeAuthDir)) {
        fs.mkdirSync(this.activeAuthDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.activeAuthDir);

      // If previous session had an unverified me.id from pairing code, clear it so QR connects cleanly without 401!
      if (!state.creds.registered && state.creds.me) {
        delete (state.creds as any).me;
        delete (state.creds as any).pairingCode;
        await saveCreds();
      }

      const { version } = await fetchLatestBaileysVersion();
      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: Browsers.windows('Chrome'),
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        retryRequestDelayMs: 3000,
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && this.pairingMode === 'qr') {
          console.log('[WhatsApp] New QR code generated');
          try {
            this.currentQrCode = await qrcode.toDataURL(qr, { margin: 3, scale: 8 });
            this.currentPairingCode = null;
            this.status = 'connecting';
          } catch (err) {
            console.error('[WhatsApp] QR generation error:', err);
          }
        }

        if (connection === 'open') {
          console.log('[WhatsApp] Multi-Device connection established successfully!');
          this.status = 'connected';
          this.currentQrCode = null;
          this.currentPairingCode = null;
          this.pairingMode = null;

          const userJid = this.sock?.user?.id || '';
          const currentPhone = userJid.split(':')[0] || userJid.split('@')[0];
          this.userName = this.sock?.user?.name || 'WhatsApp User';

          // Guarantee user isolation: wipe messages ONLY if switching to a different account!
          if (this.userPhone && this.userPhone !== currentPhone) {
            console.log(`[WhatsApp] Account changed from ${this.userPhone} to ${currentPhone}. Clearing previous messages.`);
            db.clearWhatsAppMessages(this.currentActiveUserEmail);
          }
          this.userPhone = currentPhone;

          db.toggleConnector(this.currentActiveUserEmail, 'whatsapp', true);

          db.addNotification(this.currentActiveUserEmail, {
            title: 'WhatsApp Connected',
            message: `Linked to +${this.userPhone}. All messages and priorities are actively syncing.`,
            type: 'success',
            status: 'completed',
          });
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          console.log(`[WhatsApp] Connection closed. Status Code: ${statusCode}`);
          this.status = 'disconnected';

          if (this.sock) {
            try {
              this.sock.ev.removeAllListeners('connection.update');
              this.sock.ev.removeAllListeners('messages.upsert');
              (this.sock.ev as any).removeAllListeners('messaging.history.set');
              this.sock.ev.removeAllListeners('creds.update');
            } catch (e) {}
          }

          if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
            if (state.creds.registered) {
              console.log('[WhatsApp] Logged out from WhatsApp, clearing auth credentials');
              this.clearAuth();
            } else {
              console.log('[WhatsApp] Unregistered attempt rejected with 401. Cleaning unverified creds and regenerating...');
              delete (state.creds as any).me;
              delete (state.creds as any).pairingCode;
              saveCreds();
              setTimeout(() => {
                this.isInitializing = false;
                this.connect(this.userPhone || undefined, this.currentActiveUserEmail).catch((e) => {
                  console.warn('[WhatsApp] Unregistered 401 retry warning:', e.message);
                });
              }, 1500);
            }
          } else if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
            // Restart required by WhatsApp handshake: MUST RECONNECT IMMEDIATELY WITHOUT WIPING CREDS
            console.log('[WhatsApp] Restart required (515). Reconnecting immediately without deleting credentials...');
            setTimeout(() => {
              this.isInitializing = false;
              this.connect(this.userPhone || undefined, this.currentActiveUserEmail).catch((e) => {
                console.warn('[WhatsApp] Reconnect 515 warning:', e.message);
              });
            }, 1000);
          } else if (this.pairingMode === 'qr' && statusCode === 408) {
            // QR timed out waiting for scan; regenerate fresh QR code cleanly
            console.log('[WhatsApp] QR scan timed out (408). Regenerating fresh QR code...');
            setTimeout(() => {
              this.isInitializing = false;
              this.connect(this.userPhone || undefined, this.currentActiveUserEmail).catch((e) => {
                console.warn('[WhatsApp] QR timeout refresh warning:', e.message);
              });
            }, 1500);
          } else if (state.creds.registered) {
            // Registered session disconnected; auto-reconnect
            console.log('[WhatsApp] Registered session disconnected. Reconnecting in 3s...');
            setTimeout(() => {
              this.isInitializing = false;
              this.connect(this.userPhone || undefined, this.currentActiveUserEmail).catch((e) => {
                console.warn('[WhatsApp] Registered auto-reconnect warning:', e.message);
              });
            }, 3000);
          }
        }
      });

      this.attachMessageHandlers(this.sock);
    } catch (err) {
      console.error('[WhatsApp] Connection error:', err);
      this.status = 'disconnected';
    } finally {
      this.isInitializing = false;
    }
  }

  async requestPairingCode(phoneNumber: string, userEmail?: string): Promise<string> {
    const emailToUse = userEmail || (this.currentActiveUserEmail !== 'guest' ? this.currentActiveUserEmail : undefined);
    const norm = db.normalizeEmail(emailToUse);
    if (!norm || norm === 'guest') {
      throw new Error('Please connect your Google Workspace account first to link WhatsApp to your profile.');
    }
    this.currentActiveUserEmail = norm;

    let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

    // Auto-normalize 10-digit mobile numbers
    if (cleanNumber.length === 10) {
      cleanNumber = `91${cleanNumber}`;
    } else if (cleanNumber.length === 11 && cleanNumber.startsWith('0')) {
      cleanNumber = `91${cleanNumber.slice(1)}`;
    }

    if (!cleanNumber || cleanNumber.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number');
    }

    this.pairingMode = 'code';
    this.userPhone = cleanNumber;
    db.saveWhatsAppPhone(norm, cleanNumber);
    const userFolder = norm.replace(/[^a-zA-Z0-9_-]/g, '_');
    this.activeAuthDir = path.join(BASE_AUTH_DIR, `user_${userFolder}`);

    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.end(undefined);
      } catch (e) {}
      this.sock = null;
    }

    this.isInitializing = false;
    this.status = 'connecting';
    this.currentQrCode = null;

    if (!fs.existsSync(this.activeAuthDir)) {
      fs.mkdirSync(this.activeAuthDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.activeAuthDir);

    // Wipe any unverified state so handshake is 100% clean
    if (!state.creds.registered) {
      delete (state.creds as any).me;
      delete (state.creds as any).pairingCode;
      await saveCreds();
    }

    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: 'silent' });

    this.sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 3000,
    });

    this.sock.ev.on('creds.update', saveCreds);

    let readyResolved = false;
    const socketReadyPromise = new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (!readyResolved) {
          readyResolved = true;
          console.log('[WhatsApp] Socket ready timeout reached, attempting pairing code...');
          resolve();
        }
      }, 6000);

      const updateListener = (update: any) => {
        if (update.qr) {
          if (!readyResolved) {
            readyResolved = true;
            clearTimeout(timeout);
            console.log('[WhatsApp] Socket handshake ready for pairing code exchange');
            resolve();
          }
        }
      };
      this.sock?.ev.on('connection.update', updateListener);
    });

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log('[WhatsApp] Multi-Device connection established via Pairing Code!');
        this.status = 'connected';
        this.currentQrCode = null;
        this.currentPairingCode = null;
        this.pairingMode = null;

        const userJid = this.sock?.user?.id || '';
        this.userPhone = userJid.split(':')[0] || userJid.split('@')[0];
        this.userName = this.sock?.user?.name || 'WhatsApp User';

        db.toggleConnector(this.currentActiveUserEmail, 'whatsapp', true);

        db.addNotification(this.currentActiveUserEmail, {
          title: 'WhatsApp Connected',
          message: `Linked to +${this.userPhone}. All messages and clerical tasks are actively syncing.`,
          type: 'success',
          status: 'completed',
        });
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        console.log(`[WhatsApp] Pairing connection closed. Status Code: ${statusCode}`);
        if (statusCode === 515 || statusCode === DisconnectReason.restartRequired) {
          console.log('[WhatsApp] 515 on pairing. Reconnecting immediately...');
          setTimeout(() => {
            this.requestPairingCode(cleanNumber, this.currentActiveUserEmail).catch((e) => {
              console.warn('[WhatsApp] Pairing 515 retry warning:', e.message);
            });
          }, 1000);
        } else if (state.creds.registered) {
          this.status = 'disconnected';
          setTimeout(() => {
            this.connect(this.userPhone || undefined, this.currentActiveUserEmail).catch((e) => {
              console.warn('[WhatsApp] Pairing registered auto-reconnect warning:', e.message);
            });
          }, 3000);
        } else {
          this.status = 'disconnected';
        }
      }
    });

    this.attachMessageHandlers(this.sock);

    // Wait until socket is open and ready to exchange link_code_companion_reg
    await socketReadyPromise;

    if (!this.sock) {
      throw new Error('WhatsApp engine failed to initialize');
    }

    try {
      console.log(`[WhatsApp] Requesting 8-digit pairing code for: ${cleanNumber}`);
      const code = await this.sock.requestPairingCode(cleanNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
      this.currentPairingCode = formattedCode;
      this.currentQrCode = null;
      return formattedCode;
    } catch (pairErr: any) {
      console.error('[WhatsApp] Pairing code error:', pairErr);
      const errMsg = pairErr?.message || '';
      if (errMsg.includes('rate-overlimit') || errMsg.includes('429')) {
        throw new Error(
          'WhatsApp has temporarily rate-limited pairing codes for this number due to multiple rapid attempts. Please switch to the "Scan QR Code" tab right now — QR code generation is not rate-limited and connects immediately!'
        );
      }
      throw new Error(errMsg || 'Failed to request pairing code from WhatsApp');
    }
  }

  // AI Task Detection from WhatsApp messages
  private async detectAndAddTaskFromMessage(msg: WhatsAppMessage) {
    const textLower = msg.text.toLowerCase();
    const taskIndicators = [
      'please', 'can you', 'could you', 'send me', 'remind', 'deadline',
      'meeting', 'by tomorrow', 'by 5', 'by 4', 'by 3', 'by 2', 'by 1', 'call me',
      'need this', 'invoice', 'report', 'slides', 'document', 'urgent',
      'share', 'update', 'status', 'karo', 'bhejo', 'call karna', 'batana', 'check', 'review', 'asap'
    ];

    const hasIndicator = taskIndicators.some((word) => textLower.includes(word));
    if (!hasIndicator) return;

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const prompt = `
Analyze this WhatsApp message from "${msg.fromName}":
"${msg.text}"

Does this message contain an actionable task, request, or commitment for the recipient?
If YES, respond ONLY with valid JSON:
{
  "hasTask": true,
  "title": "Clear 1-line task title",
  "deadline": "Extracted deadline or null",
  "urgency": "high" | "medium" | "low"
}
If NO, respond ONLY with:
{"hasTask": false}
`;

      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(res.text || '{}');
      if (parsed.hasTask && parsed.title) {
        db.addTask(this.currentActiveUserEmail, {
          title: `[WhatsApp: ${msg.fromName}] ${parsed.title}`,
          deadline: parsed.deadline || undefined,
          urgency: parsed.urgency || 'medium',
          source: 'whatsapp',
          sender: msg.fromName,
          completed: false,
        });
        console.log(`[WhatsApp] Action item detected and added to tasks for ${this.currentActiveUserEmail}: "${parsed.title}"`);
      }
    } catch (err) {
      // Non-blocking
    }
  }

  // Synthesize WhatsApp updates into simple layman spoken briefing
  async getUpdatesSummary(userEmail?: string): Promise<string> {
    const effectiveEmail = userEmail || this.currentActiveUserEmail;
    const messages = db.getWhatsAppMessages(effectiveEmail).slice(0, 20);
    if (messages.length === 0) {
      if (this.status !== 'connected') {
        return "Your WhatsApp isn't linked yet. You can enter your 8-digit code or scan the QR code to connect!";
      }
      return "You're all caught up on WhatsApp! There are no new messages right now.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const prompt = `
You are Aura, an empathetic Chief of Staff.
Summarize these recent WhatsApp messages for the user in 2 to 3 very simple, natural, spoken sentences.
Highlight who messaged and what they need, in calm everyday layman language:

Messages:
${JSON.stringify(messages.map((m) => ({ from: m.fromName, text: m.text, time: m.timestamp })))}
`;

      const res = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      return res.text || "You have a few recent messages on WhatsApp. Everything looks calm.";
    } catch (err: any) {
      return `You have ${messages.length} recent WhatsApp messages from your contacts.`;
    }
  }

  async sendMessage(to: string, text: string): Promise<{ success: boolean; messageId?: string }> {
    if (!this.sock || this.status !== 'connected') {
      throw new Error('WhatsApp is not connected. Please pair your device first.');
    }

    let jid = to.trim();
    if (!jid.includes('@')) {
      const cleanPhone = jid.replace(/[^0-9]/g, '');
      jid = `${cleanPhone}@s.whatsapp.net`;
    }

    const res = await this.sock.sendMessage(jid, { text });
    return { success: true, messageId: res?.key.id || undefined };
  }

  disconnect(userEmail?: string) {
    const norm = db.normalizeEmail(userEmail);
    if (this.sock) {
      try {
        this.sock.logout();
        this.sock.end(undefined);
      } catch (e) {
        // ignore
      }
      this.sock = null;
    }
    this.status = 'disconnected';
    this.currentQrCode = null;
    this.currentPairingCode = null;
    this.pairingMode = null;
    this.userPhone = null;
    this.userName = null;
    this.clearAuth();
    if (norm && norm !== 'guest') {
      db.saveWhatsAppPhone(norm, '');
      db.toggleConnector(norm, 'whatsapp', false);
    }
    this.currentActiveUserEmail = 'guest';
  }

  private clearAuth() {
    if (fs.existsSync(this.activeAuthDir)) {
      try {
        fs.rmSync(this.activeAuthDir, { recursive: true, force: true });
      } catch (e) {
        console.error('[WhatsApp] Error clearing auth directory:', e);
      }
    }
  }
}

export const whatsappService = new WhatsAppService();
