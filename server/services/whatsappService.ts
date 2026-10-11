import fs from 'fs';
import path from 'path';
import pino from 'pino';
import qrcode from 'qrcode';
import crypto from 'crypto';
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
const BASE_AUTH_DIR = path.resolve(process.cwd(), 'storage', 'baileys_auth', 'users');

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

/**
 * Isolated WhatsApp Session Instance per User
 */
class UserWhatsAppSession {
  public email: string;
  public sock: WASocket | null = null;
  public status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  public currentQrCode: string | null = null;
  public currentPairingCode: string | null = null;
  public pairingMode: 'qr' | 'code' | null = null;
  public userPhone: string | null = null;
  public userName: string | null = null;
  public isInitializing: boolean = false;
  public qrAttempts: number = 0;
  private authDir: string;

  public isRegisteredOnDisk(): boolean {
    const credsPath = path.join(this.authDir, 'creds.json');
    if (!fs.existsSync(credsPath)) return false;
    try {
      const data = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
      return !!data.registered;
    } catch {
      return false;
    }
  }

  constructor(email: string) {
    this.email = db.normalizeEmail(email);
    // Sanitize user email to prevent path traversal
    const safeHash = crypto.createHash('sha256').update(this.email).digest('hex').slice(0, 16);
    const safeEmailPrefix = this.email.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    this.authDir = path.join(BASE_AUTH_DIR, `${safeEmailPrefix}_${safeHash}`);

    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }

    const savedPhone = this.email !== 'guest' ? db.getSavedWhatsAppPhone(this.email) : null;
    if (savedPhone) {
      this.userPhone = savedPhone;
    }
  }

  getStatus(): WhatsAppStatus {
    const savedPhone = this.email !== 'guest' ? (db.getSavedWhatsAppPhone(this.email) || null) : null;
    const msgCount = this.email !== 'guest' ? db.getWhatsAppMessages(this.email).length : 0;

    return {
      status: this.status,
      qrCode: this.currentQrCode,
      pairingCode: this.currentPairingCode,
      pairingMode: this.pairingMode,
      savedPhone: savedPhone || this.userPhone || null,
      user: this.status === 'connected' ? {
        phone: this.userPhone || savedPhone || 'WhatsApp User',
        name: this.userName || 'You',
      } : null,
      messageCount: msgCount,
      targetPhone: this.userPhone,
    };
  }

  private attachMessageHandlers(sock: WASocket) {
    const handleHistorySync = async ({ messages }: any) => {
      const count = messages?.length || 0;
      console.log(`[WhatsApp:${this.email}] History sync event received: ${count} messages`);

      if (!Array.isArray(messages) || messages.length === 0) return;

      let importedCount = 0;

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
          const rawPhone = fromJid.split('@')[0];
          const resolvedContact = db.resolveContactName(rawPhone, this.email);
          const fromName = resolvedContact || msg.pushName || (isGroup ? 'Group Member' : rawPhone);

          const msgTimestampMs = (Number(msg.messageTimestamp) || Date.now() / 1000) * 1000;
          const storedMsg: WhatsAppMessage = {
            id: msg.key.id || `wa-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            from: fromJid,
            fromName,
            text: text.trim(),
            timestamp: new Date(msgTimestampMs).toISOString(),
            isGroup,
            fromMe,
            userPhone: this.userPhone || undefined,
          };

          db.addWhatsAppMessage(this.email, storedMsg);
          importedCount++;

          // Anti-clutter: ONLY extract tasks from messages in the last 24 hours
          const isRecent = Date.now() - msgTimestampMs <= 24 * 60 * 60 * 1000;
          if (!fromMe && isRecent) {
            this.detectAndAddTaskFromMessage(storedMsg);
          }
        } catch (historyErr) {
          // ignore individual message parse errors
        }
      }

      console.log(`[WhatsApp:${this.email}] Synced & stored ${importedCount} existing messages (${this.userPhone})`);
      if (this.email !== 'guest') {
        db.addNotification(this.email, {
          title: 'WhatsApp Existing Chats Synced',
          message: `Synced ${importedCount} existing chats and actively extracted pending action items for your daily priorities.`,
          type: 'success',
          status: 'completed',
        });
      }
    };

    (sock.ev as any).on('messaging-history.set', handleHistorySync);
    (sock.ev as any).on('messaging.history.set', handleHistorySync);

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
          const rawPhone = fromJid.split('@')[0];
          const resolvedContact = db.resolveContactName(rawPhone, this.email);
          const fromName = resolvedContact || msg.pushName || (isGroup ? 'Group Member' : rawPhone);

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

          db.addWhatsAppMessage(this.email, storedMsg);

          // 1-to-1 conversation with Aura directly on WhatsApp (Pinned chat)
          if (!isGroup && fromMe && text.trim().toLowerCase().startsWith('@aura')) {
            const query = text.trim().slice(5).trim();
            console.log(`[WhatsApp 1-to-1:${this.email}] User tagged Aura: "${query}"`);
            (async () => {
              try {
                const { orchestrator } = await import('./agentOrchestrator.js');
                const result = await orchestrator.processRawInput(query, 'text', this.email);
                if (result?.reply && sock) {
                  await sock.sendMessage(fromJid, { text: result.reply });
                  console.log(`[WhatsApp 1-to-1:${this.email}] Aura replied: "${result.reply}"`);
                }
              } catch (orchErr: any) {
                console.error(`[WhatsApp 1-to-1:${this.email}] Error responding:`, orchErr.message);
              }
            })();
          } else if (!fromMe) {
            // Direct message from a third party: passively detect tasks for user's clerical board
            this.detectAndAddTaskFromMessage(storedMsg);
          }
        } catch (msgErr) {
          console.error(`[WhatsApp:${this.email}] Error processing message:`, msgErr);
        }
      }
    });
  }

  async connect(phoneNumber?: string): Promise<void> {
    if (this.status === 'connected' && this.sock) {
      return;
    }

    const targetPhone = phoneNumber || (this.email !== 'guest' ? db.getSavedWhatsAppPhone(this.email) : undefined);
    if (targetPhone) {
      let clean = targetPhone.replace(/[^0-9]/g, '');
      if (clean.length === 10) clean = `91${clean}`;
      this.userPhone = clean;
      if (this.email !== 'guest') db.saveWhatsAppPhone(this.email, clean);
    }

    this.pairingMode = 'qr';
    this.qrAttempts = 0;
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

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

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
        browser: Browsers.ubuntu('Chrome'),
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
          console.log(`[WhatsApp:${this.email}] New QR code generated`);
          try {
            this.currentQrCode = await qrcode.toDataURL(qr, { margin: 3, scale: 8 });
            this.currentPairingCode = null;
            this.status = 'connecting';
          } catch (err) {
            console.error(`[WhatsApp:${this.email}] QR generation error:`, err);
          }
        }

        if (connection === 'open') {
          console.log(`[WhatsApp:${this.email}] Multi-Device connection established successfully!`);
          this.status = 'connected';
          this.currentQrCode = null;
          this.currentPairingCode = null;
          this.pairingMode = null;

          const userJid = this.sock?.user?.id || '';
          const currentPhone = userJid.split(':')[0] || userJid.split('@')[0];
          this.userName = this.sock?.user?.name || 'WhatsApp User';
          this.userPhone = currentPhone;

          if (this.email !== 'guest') {
            db.saveWhatsAppPhone(this.email, currentPhone);
            db.toggleConnector(this.email, 'whatsapp', true);
            db.addNotification(this.email, {
              title: 'WhatsApp Connected',
              message: `Linked to +${this.userPhone}. All messages and priorities are actively syncing.`,
              type: 'success',
              status: 'completed',
            });
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          console.log(`[WhatsApp:${this.email}] Connection closed. Status Code: ${statusCode}`);
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
              console.log(`[WhatsApp:${this.email}] Logged out from WhatsApp, clearing auth credentials`);
              this.clearAuth();
            } else {
              delete (state.creds as any).me;
              delete (state.creds as any).pairingCode;
              await saveCreds();
              setTimeout(() => {
                this.connect(this.userPhone || undefined).catch(() => {});
              }, 2000);
            }
          } else if (
            statusCode === DisconnectReason.restartRequired ||
            statusCode === 515 ||
            statusCode === 428
          ) {
            console.log(`[WhatsApp:${this.email}] Transient disconnect (${statusCode}). Reconnecting in 2s...`);
            setTimeout(() => {
              this.connect(this.userPhone || undefined).catch(() => {});
            }, 2000);
          } else if (statusCode === 408) {
            this.qrAttempts++;
            if (this.pairingMode === 'qr' && this.qrAttempts <= 2) {
              console.log(`[WhatsApp:${this.email}] QR awaiting scan (attempt ${this.qrAttempts}/2); refreshing in 3s...`);
              setTimeout(() => {
                this.connect(this.userPhone || undefined).catch(() => {});
              }, 3000);
            } else {
              console.log(`[WhatsApp:${this.email}] QR scan idle or timed out. Stopping background QR refresh.`);
              this.status = 'disconnected';
              this.currentQrCode = null;
              this.pairingMode = null;
              this.qrAttempts = 0;
            }
          } else if (state.creds.registered) {
            console.log(`[WhatsApp:${this.email}] Registered session disconnected. Reconnecting in 3s...`);
            setTimeout(() => {
              this.connect(this.userPhone || undefined).catch(() => {});
            }, 3000);
          }
        }
      });

      this.attachMessageHandlers(this.sock);
    } catch (err: any) {
      console.error(`[WhatsApp:${this.email}] Failed to initialize socket:`, err);
      this.status = 'disconnected';
      this.isInitializing = false;
      throw err;
    }
  }

  async requestPairingCode(phoneNumber: string): Promise<string> {
    let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
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
    if (this.email !== 'guest') db.saveWhatsAppPhone(this.email, cleanNumber);

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

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    if (state.creds.registered) {
      console.log(`[WhatsApp:${this.email}] Session is already registered. Connecting directly...`);
      await this.connect(cleanNumber);
      return 'CONNECTED';
    }

    delete (state.creds as any).me;
    delete (state.creds as any).pairingCode;
    await saveCreds();

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

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log(`[WhatsApp:${this.email}] Multi-Device connection established via Pairing Code!`);
        this.status = 'connected';
        this.currentQrCode = null;
        this.currentPairingCode = null;
        this.pairingMode = null;

        const userJid = this.sock?.user?.id || '';
        this.userPhone = userJid.split(':')[0] || userJid.split('@')[0];
        this.userName = this.sock?.user?.name || 'WhatsApp User';

        if (this.email !== 'guest') {
          db.saveWhatsAppPhone(this.email, this.userPhone);
          db.toggleConnector(this.email, 'whatsapp', true);
          db.addNotification(this.email, {
            title: 'WhatsApp Connected',
            message: `Linked to +${this.userPhone}. All messages and clerical tasks are actively syncing.`,
            type: 'success',
            status: 'completed',
          });
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        console.log(`[WhatsApp:${this.email}] Pairing connection closed. Status Code: ${statusCode}`);
        if (statusCode === 515 || statusCode === DisconnectReason.restartRequired) {
          console.log(`[WhatsApp:${this.email}] Handshake confirmed by phone (515)! Finalizing connection...`);
          setTimeout(() => {
            this.connect(cleanNumber).catch((e) => {
              console.warn(`[WhatsApp:${this.email}] Post-pairing 515 connect warning:`, e.message);
            });
          }, 1000);
        } else if (state.creds.registered) {
          this.status = 'disconnected';
          setTimeout(() => {
            this.connect(this.userPhone || undefined).catch((e) => {
              console.warn(`[WhatsApp:${this.email}] Pairing registered auto-reconnect warning:`, e.message);
            });
          }, 3000);
        } else {
          this.status = 'disconnected';
        }
      }
    });

    this.attachMessageHandlers(this.sock);

    // Give socket 2.5 seconds to establish WebSocket Noise handshake
    await new Promise((r) => setTimeout(r, 2500));

    if (!this.sock) {
      throw new Error('WhatsApp engine failed to initialize');
    }

    try {
      console.log(`[WhatsApp:${this.email}] Requesting 8-digit pairing code for: ${cleanNumber}`);
      const code = await this.sock.requestPairingCode(cleanNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
      this.currentPairingCode = formattedCode;
      this.currentQrCode = null;
      return formattedCode;
    } catch (pairErr: any) {
      console.error(`[WhatsApp:${this.email}] Pairing code error:`, pairErr);
      const errMsg = pairErr?.message || '';
      if (errMsg.includes('rate-overlimit') || errMsg.includes('429')) {
        throw new Error(
          'WhatsApp has temporarily rate-limited pairing codes for this number due to multiple rapid attempts. Please switch to the "Scan QR Code" tab right now — QR code generation is not rate-limited and connects immediately!'
        );
      }
      throw new Error(errMsg || 'Failed to request pairing code from WhatsApp');
    }
  }

  private async detectAndAddTaskFromMessage(msg: WhatsAppMessage) {
    const msgTime = new Date(msg.timestamp).getTime();
    if (Date.now() - msgTime > 24 * 60 * 60 * 1000) return;

    const textTrim = msg.text.trim();
    if (textTrim.length < 8) return;

    const promoRegex = /\b(otp|verification code|coupon|discount|deal|tracking|shipped|delivered|unsubscribed?)\b/i;
    if (promoRegex.test(textTrim)) return;

    const taskIndicators = [
      'please', 'can you', 'could you', 'send me', 'remind', 'deadline',
      'meeting', 'by tomorrow', 'by 5', 'by 4', 'by 3', 'by 2', 'by 1', 'call me',
      'need this', 'invoice', 'report', 'slides', 'document', 'urgent',
      'share', 'update', 'status', 'karo', 'bhejo', 'call karna', 'batana', 'check', 'review', 'asap'
    ];

    const hasIndicator = taskIndicators.some((word) => textTrim.toLowerCase().includes(word));
    if (!hasIndicator) return;

    const rawPhone = msg.from.split('@')[0];
    const resolvedContact = db.resolveContactName(rawPhone, this.email) ||
                            db.resolveContactName(msg.userPhone, this.email);
    const senderName = resolvedContact || msg.fromName;

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const prompt = `
Analyze this WhatsApp message from "${senderName}":
"${msg.text}"

Does this message contain a genuine, high-priority actionable task, request, or commitment for the recipient?
Filter out casual chitchat, trivial confirmations, and vague mentions.
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
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(res.text || '{}');
      if (parsed.hasTask && parsed.title) {
        db.addTask(this.email, {
          title: `[WhatsApp: ${senderName}] ${parsed.title}`,
          deadline: parsed.deadline || undefined,
          urgency: parsed.urgency || 'medium',
          source: 'whatsapp',
          sender: senderName,
          completed: false,
        });
        console.log(`[WhatsApp:${this.email}] Action item detected from ${senderName} and added to tasks: "${parsed.title}"`);
      }
    } catch (err) {
      // Non-blocking
    }
  }

  async sendMessage(to: string, text: string): Promise<{ success: boolean; messageId?: string }> {
    if (!this.sock || this.status !== 'connected') {
      throw new Error('WhatsApp is not connected for this account. Please pair your device first.');
    }

    let jid = to.trim();
    if (!jid.includes('@')) {
      const cleanPhone = jid.replace(/[^0-9]/g, '');
      jid = `${cleanPhone}@s.whatsapp.net`;
    }

    const res = await this.sock.sendMessage(jid, { text });
    return { success: true, messageId: res?.key.id || undefined };
  }

  disconnect() {
    if (this.sock) {
      try {
        this.sock.logout();
        this.sock.end(undefined);
      } catch (e) {}
      this.sock = null;
    }
    this.status = 'disconnected';
    this.currentQrCode = null;
    this.currentPairingCode = null;
    this.pairingMode = null;
    this.userPhone = null;
    this.userName = null;
    this.clearAuth();
    if (this.email !== 'guest') {
      db.saveWhatsAppPhone(this.email, '');
      db.toggleConnector(this.email, 'whatsapp', false);
    }
  }

  private clearAuth() {
    if (fs.existsSync(this.authDir)) {
      try {
        const files = fs.readdirSync(this.authDir);
        for (const file of files) {
          try {
            fs.rmSync(path.join(this.authDir, file), { recursive: true, force: true });
          } catch (e) {}
        }
      } catch (e) {
        console.error(`[WhatsApp:${this.email}] Error clearing auth directory:`, e);
      }
    }
  }
}

/**
 * Multi-Tenant WhatsApp Session Manager
 * Orchestrates isolated UserWhatsAppSession instances per authenticated email
 */
export class WhatsAppSessionManager {
  private sessions: Map<string, UserWhatsAppSession> = new Map();

  private getSession(userEmail?: string): UserWhatsAppSession {
    const norm = db.normalizeEmail(userEmail);
    if (!this.sessions.has(norm)) {
      this.sessions.set(norm, new UserWhatsAppSession(norm));
    }
    return this.sessions.get(norm)!;
  }

  getStatus(userEmail?: string): WhatsAppStatus {
    return this.getSession(userEmail).getStatus();
  }

  async connect(phoneNumber?: string, userEmail?: string): Promise<void> {
    return this.getSession(userEmail).connect(phoneNumber);
  }

  async requestPairingCode(phoneNumber: string, userEmail?: string): Promise<string> {
    return this.getSession(userEmail).requestPairingCode(phoneNumber);
  }

  async sendMessage(to: string, text: string, userEmail?: string): Promise<{ success: boolean; messageId?: string }> {
    return this.getSession(userEmail).sendMessage(to, text);
  }

  async getUpdatesSummary(userEmail?: string): Promise<string> {
    const effectiveEmail = db.normalizeEmail(userEmail);
    const messages = db.getWhatsAppMessages(effectiveEmail).slice(0, 20);
    const status = this.getStatus(effectiveEmail);
    if (messages.length === 0) {
      if (status.status !== 'connected') {
        return "Your WhatsApp isn't linked yet. You can enter your 8-digit code or scan the QR code to connect!";
      }
      return "You're all caught up on WhatsApp! There are no new messages right now.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const prompt = `
You are Aura, an empathetic personal AI assistant.
Summarize these recent WhatsApp messages for the user in 2 to 3 very simple, natural, spoken sentences.
Highlight who messaged and what they need, in calm everyday layman language:

Messages:
${JSON.stringify(messages.map((m) => ({ from: m.fromName, text: m.text, time: m.timestamp })))}
`;

      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return res.text || "You have a few recent messages on WhatsApp. Everything looks calm.";
    } catch (err: any) {
      return `You have ${messages.length} recent WhatsApp messages from your contacts.`;
    }
  }

  disconnect(userEmail?: string): void {
    const norm = db.normalizeEmail(userEmail);
    if (this.sessions.has(norm)) {
      this.sessions.get(norm)!.disconnect();
      this.sessions.delete(norm);
    }
  }

  transferGuestSessionToUser(userEmail: string): void {
    // Multi-tenant architecture isolates sessions per email automatically
  }

  // Restore active sessions on boot
  async initAllSavedSessions(): Promise<void> {
    try {
      if (!fs.existsSync(BASE_AUTH_DIR)) {
        fs.mkdirSync(BASE_AUTH_DIR, { recursive: true });
      }

      const allUsers = Object.keys((db as any).data.users || {});
      for (const email of allUsers) {
        if (email !== 'guest') {
          const session = this.getSession(email);
          if (session.isRegisteredOnDisk()) {
            console.log(`[WhatsAppManager] Auto-reconnecting registered session for: ${email}`);
            session.connect().catch((err) => {
              console.warn(`[WhatsAppManager] Auto-reconnect notice for ${email}:`, err.message);
            });
          }
        }
      }
    } catch (e) {
      console.warn('[WhatsAppManager] Boot init notice:', e);
    }
  }
}

export const whatsappService = new WhatsAppSessionManager();
