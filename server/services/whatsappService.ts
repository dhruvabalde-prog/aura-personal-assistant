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
  private activeAuthDir: string = path.resolve(process.cwd(), 'storage', 'baileys_auth', 'session');
  private currentActiveUserEmail: string = 'guest';

  constructor() {
    // Session initializes on demand
  }

  private getAuthDir(_userEmail?: string): string {
    return path.resolve(process.cwd(), 'storage', 'baileys_auth', 'session');
  }

  getStatus(userEmail?: string): WhatsAppStatus {
    const norm = db.normalizeEmail(userEmail);
    const savedPhone = norm !== 'guest' ? (db.getSavedWhatsAppPhone(norm) || null) : null;
    const msgCount = norm !== 'guest' ? db.getWhatsAppMessages(norm).length : 0;
    const isThisUser = this.currentActiveUserEmail === norm;

    return {
      status: isThisUser ? this.status : 'disconnected',
      qrCode: isThisUser ? this.currentQrCode : null,
      pairingCode: isThisUser ? this.currentPairingCode : null,
      pairingMode: isThisUser ? this.pairingMode : null,
      savedPhone,
      user: (isThisUser && this.status === 'connected') ? {
        phone: this.userPhone || savedPhone || 'WhatsApp User',
        name: this.userName || 'You',
      } : null,
      messageCount: msgCount,
      targetPhone: isThisUser ? this.userPhone : null,
    };
  }

  private attachMessageHandlers(sock: WASocket) {
    const handleHistorySync = async ({ messages }: any) => {
      const count = messages?.length || 0;
      console.log(`[WhatsApp] History sync event received: ${count} messages`);

      if (!Array.isArray(messages) || messages.length === 0) return;

      let importedCount = 0;
      const batch: WhatsAppMessage[] = [];

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
          const resolvedContact = db.resolveContactName(rawPhone, this.currentActiveUserEmail);
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

          batch.push(storedMsg);
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

      if (batch.length > 0) {
        db.addWhatsAppMessagesBatch(this.currentActiveUserEmail, batch);
      }

      console.log(`[WhatsApp] Successfully synced and stored ${importedCount} existing messages for user ${this.currentActiveUserEmail} (${this.userPhone})`);
      if (this.currentActiveUserEmail !== 'guest') {
        db.addNotification(this.currentActiveUserEmail, {
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
          const resolvedContact = db.resolveContactName(rawPhone, this.currentActiveUserEmail);
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

          db.addWhatsAppMessage(this.currentActiveUserEmail, storedMsg);

          // STRICT BOUNDARY: Groups are 100% READ-ONLY. Aura NEVER replies in groups!
          if (isGroup) {
            // Only passively extract tasks if someone assigns an action item in the group
            if (!fromMe) {
              this.detectAndAddTaskFromMessage(storedMsg);
            }
            continue;
          }

          // DEDICATED 1-TO-1 CHATBOX:
          // If the message is a direct 1-to-1 message to Aura from the user (or in self-chat)
          const isUserChatWithAura = fromMe || (this.userPhone && rawPhone === this.userPhone);
          if (isUserChatWithAura && text.trim()) {
            // Avoid infinite self-echo loops: check if message was sent by bot itself
            if (msg.key.id?.startsWith('aura-reply-')) {
              continue;
            }

            console.log(`[WhatsApp 1-to-1] User chatted with Aura: "${text.trim()}"`);
            // Run through AgentOrchestrator asynchronously
            (async () => {
              try {
                const { orchestrator } = await import('./agentOrchestrator.js');
                const result = await orchestrator.processRawInput(text.trim(), 'text', this.currentActiveUserEmail);
                if (result?.reply && sock) {
                  // Reply back directly into the 1-to-1 thread
                  await sock.sendMessage(fromJid, {
                    text: result.reply,
                  });
                  console.log(`[WhatsApp 1-to-1] Aura replied: "${result.reply}"`);
                }
              } catch (orchErr: any) {
                console.error('[WhatsApp 1-to-1] Error responding:', orchErr.message);
              }
            })();
          } else if (!fromMe) {
            // Direct message from a third party: passively detect tasks for user's clerical board
            this.detectAndAddTaskFromMessage(storedMsg);
          }
        } catch (msgErr) {
          console.error('[WhatsApp] Error processing message:', msgErr);
        }
      }
    });
  }

  async connect(phoneNumber?: string, userEmail?: string): Promise<void> {
    const norm = db.normalizeEmail(userEmail);
    this.currentActiveUserEmail = norm;
    this.activeAuthDir = this.getAuthDir(norm);

    if (this.status === 'connected' && this.sock) {
      return;
    }

    const targetPhone = phoneNumber || (norm !== 'guest' ? db.getSavedWhatsAppPhone(norm) : undefined);
    if (targetPhone) {
      let clean = targetPhone.replace(/[^0-9]/g, '');
      if (clean.length === 10) clean = `91${clean}`;
      this.userPhone = clean;
      if (norm !== 'guest') db.saveWhatsAppPhone(norm, clean);
    }

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

      // If previous session had an unverified me.id without registration, clear it so QR connects cleanly
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
          this.userPhone = currentPhone;

          if (this.currentActiveUserEmail !== 'guest') {
            db.saveWhatsAppPhone(this.currentActiveUserEmail, currentPhone);
            db.toggleConnector(this.currentActiveUserEmail, 'whatsapp', true);
            db.addNotification(this.currentActiveUserEmail, {
              title: 'WhatsApp Connected',
              message: `Linked to +${this.userPhone}. All messages and priorities are actively syncing.`,
              type: 'success',
              status: 'completed',
            });
          }
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
            // Handshake complete or restart required: RECONNECT IMMEDIATELY WITHOUT WIPING CREDS
            console.log('[WhatsApp] Restart required (515). Reconnecting immediately with saved credentials...');
            setTimeout(() => {
              this.isInitializing = false;
              this.connect(this.userPhone || undefined, this.currentActiveUserEmail).catch((e) => {
                console.warn('[WhatsApp] Reconnect 515 warning:', e.message);
              });
            }, 1000);
          } else if (this.pairingMode === 'qr') {
            console.log(`[WhatsApp] QR awaiting scan; refreshing connection (code ${statusCode})...`);
            this.status = 'connecting';
            setTimeout(() => {
              this.isInitializing = false;
              this.connect(this.userPhone || undefined, this.currentActiveUserEmail).catch((e) => {
                console.warn('[WhatsApp] QR timeout refresh warning:', e.message);
              });
            }, 1200);
          } else if (state.creds.registered) {
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
    const norm = db.normalizeEmail(userEmail);
    this.currentActiveUserEmail = norm;
    this.activeAuthDir = this.getAuthDir(norm);

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
    if (norm !== 'guest') db.saveWhatsAppPhone(norm, cleanNumber);

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

    if (state.creds.registered) {
      console.log('[WhatsApp] Session is already registered. Connecting directly...');
      await this.connect(cleanNumber, this.currentActiveUserEmail);
      return 'CONNECTED';
    }

    // Wipe any unverified state so handshake is 100% clean
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
        console.log('[WhatsApp] Multi-Device connection established via Pairing Code!');
        this.status = 'connected';
        this.currentQrCode = null;
        this.currentPairingCode = null;
        this.pairingMode = null;

        const userJid = this.sock?.user?.id || '';
        this.userPhone = userJid.split(':')[0] || userJid.split('@')[0];
        this.userName = this.sock?.user?.name || 'WhatsApp User';

        if (this.currentActiveUserEmail !== 'guest') {
          db.saveWhatsAppPhone(this.currentActiveUserEmail, this.userPhone);
          db.toggleConnector(this.currentActiveUserEmail, 'whatsapp', true);
          db.addNotification(this.currentActiveUserEmail, {
            title: 'WhatsApp Connected',
            message: `Linked to +${this.userPhone}. All messages and clerical tasks are actively syncing.`,
            type: 'success',
            status: 'completed',
          });
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        console.log(`[WhatsApp] Pairing connection closed. Status Code: ${statusCode}`);
        if (statusCode === 515 || statusCode === DisconnectReason.restartRequired) {
          // Handshake confirmed by phone! Reconnect using connect() so it connects with verified keys!
          console.log('[WhatsApp] Handshake confirmed by phone (515)! Finalizing connection...');
          setTimeout(() => {
            this.connect(cleanNumber, this.currentActiveUserEmail).catch((e) => {
              console.warn('[WhatsApp] Post-pairing 515 connect warning:', e.message);
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

    // Give socket 2.5 seconds to establish WebSocket Noise handshake
    await new Promise((r) => setTimeout(r, 2500));

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

  // AI Task Detection from WhatsApp messages (Strict Anti-Clutter & Recency Gate)
  private async detectAndAddTaskFromMessage(msg: WhatsAppMessage) {
    // 1. Recency filter: skip messages older than 24 hours
    const msgTime = new Date(msg.timestamp).getTime();
    if (Date.now() - msgTime > 24 * 60 * 60 * 1000) return;

    // 2. Length & Noise Filter: skip short acknowledgments
    const textTrim = msg.text.trim();
    if (textTrim.length < 8) return;
    const noiseTokens = ['ok', 'k', 'cool', 'thanks', 'thank you', 'sure', 'done', 'yes', 'no', 'gm', 'gn', 'tc', 'hru', 'wbu'];
    if (noiseTokens.includes(textTrim.toLowerCase())) return;

    // 3. Skip automated OTPs, promos, delivery tracking
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

    // Resolve sender contact name from Google Contacts if available
    const rawPhone = msg.from.split('@')[0];
    const resolvedContact = db.resolveContactName(rawPhone, this.currentActiveUserEmail) ||
                            db.resolveContactName(msg.userPhone, this.currentActiveUserEmail);
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
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(res.text || '{}');
      if (parsed.hasTask && parsed.title) {
        db.addTask(this.currentActiveUserEmail, {
          title: `[WhatsApp: ${senderName}] ${parsed.title}`,
          deadline: parsed.deadline || undefined,
          urgency: parsed.urgency || 'medium',
          source: 'whatsapp',
          sender: senderName,
          completed: false,
        });
        console.log(`[WhatsApp] Action item detected from ${senderName} and added to tasks: "${parsed.title}"`);
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
You are Aura, an empathetic personal AI assistant.
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
    if (norm !== 'guest') {
      db.saveWhatsAppPhone(norm, '');
      db.toggleConnector(norm, 'whatsapp', false);
    }
    this.currentActiveUserEmail = 'guest';
  }

  public transferGuestSessionToUser(userEmail: string) {
    const norm = db.normalizeEmail(userEmail);
    if (norm === 'guest') return;

    if (this.currentActiveUserEmail === 'guest' && this.status === 'connected') {
      console.log(`[WhatsApp] Migrating active WhatsApp session from guest to authenticated user: ${norm}`);
      this.currentActiveUserEmail = norm;
      if (this.userPhone) {
        db.saveWhatsAppPhone(norm, this.userPhone);
        db.toggleConnector(norm, 'whatsapp', true);
      }
      const guestMsgs = db.getWhatsAppMessages('guest');
      const userMsgs = db.getWhatsAppMessages(norm);
      if (userMsgs.length === 0 && guestMsgs.length > 0) {
        db.addWhatsAppMessagesBatch(norm, guestMsgs);
      }
    }
  }

  private clearAuth() {
    if (fs.existsSync(this.activeAuthDir)) {
      try {
        const files = fs.readdirSync(this.activeAuthDir);
        for (const file of files) {
          try {
            fs.rmSync(path.join(this.activeAuthDir, file), { recursive: true, force: true });
          } catch (e) {}
        }
      } catch (e) {
        console.error('[WhatsApp] Error clearing auth directory:', e);
      }
    }
  }
}

export const whatsappService = new WhatsAppService();
