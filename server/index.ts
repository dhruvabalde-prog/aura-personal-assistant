import 'dotenv/config';
import express, { Request, Response } from 'express';
import https from 'https';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { db } from './storage/db.js';
import { googleAuth } from './services/googleAuthService.js';
import { geminiLive } from './services/geminiLiveService.js';
import { orchestrator } from './services/agentOrchestrator.js';
import { pluginRegistry } from './services/pluginRegistry.js';
import { notesConnector } from './connectors/notesConnector.js';
import { tasksConnector } from './connectors/tasksConnector.js';
import { knowledgeConnector } from './connectors/knowledgeConnector.js';
import { whatsappConnector } from './connectors/whatsappConnector.js';
import { googleWorkspaceConnector } from './connectors/googleWorkspaceConnector.js';
import { whatsappService } from './services/whatsappService.js';
import { supabaseService } from './services/supabaseService.js';
import { getOrCreateCert } from './certs/certHelper.js';

// Register initial connectors
pluginRegistry.register(notesConnector);
pluginRegistry.register(tasksConnector);
pluginRegistry.register(knowledgeConnector);
pluginRegistry.register(whatsappConnector);
pluginRegistry.register(googleWorkspaceConnector);

const app = express();

const PORT = 5000;
const CLIENT_ORIGIN = 'https://localhost:3000';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

function getUserEmail(req: Request): string {
  const header = req.headers['x-user-email'];
  if (header && typeof header === 'string' && header.trim() && header !== 'null' && header !== 'undefined') {
    return header.trim().toLowerCase();
  }
  const query = req.query.userEmail;
  if (query && typeof query === 'string' && query.trim() && query !== 'null' && query !== 'undefined') {
    return query.trim().toLowerCase();
  }
  const body = req.body?.userEmail;
  if (body && typeof body === 'string' && body.trim() && body !== 'null' && body !== 'undefined') {
    return body.trim().toLowerCase();
  }
  return 'guest';
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    name: 'Aura Voice AI Assistant',
    version: '1.0.0',
    userEmail: email !== 'guest' ? email : null,
    googleConnected: googleAuth.isAuthenticated(email),
  });
});

// User Profile & Emotional Context
app.get('/api/user/profile', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  res.json(db.getProfile(email));
});

app.post('/api/user/profile', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  const updated = db.updateProfile(email, req.body);
  res.json(updated);
});

// Chats
app.get('/api/chats', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  res.json(db.getMessages(email));
});

app.post('/api/chats', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  const { content, role, mediaType } = req.body;
  const msg = db.addMessage(email, { content, role: role || 'user', mediaType: mediaType || 'text' });
  res.json(msg);
});

app.delete('/api/chats', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  db.clearMessages(email);
  res.json({ success: true });
});

// Tasks
app.get('/api/tasks', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  res.json(db.getTasks(email));
});

app.post('/api/tasks', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  const task = db.addTask(email, req.body);
  res.json(task);
});

app.patch('/api/tasks/:id', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  db.updateTask(email, req.params.id as string, req.body);
  res.json({ success: true });
});

app.delete('/api/tasks', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  db.clearTasks(email);
  res.json({ success: true, message: 'Tasks cleared' });
});

// Notes
app.get('/api/notes', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  res.json(db.getNotes(email));
});

app.post('/api/notes', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  const note = db.addNote(email, req.body);
  res.json(note);
});

// Connectors / Plugins
app.get('/api/plugins', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  const list = pluginRegistry.getStatusList().map((item) => {
    const userConnector = db.getConnectors(email).find((c) => c.id === item.id);
    return userConnector ? { ...item, enabled: userConnector.enabled } : item;
  });
  res.json(list);
});

app.post('/api/plugins/toggle', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  const { id, enabled } = req.body;
  db.toggleConnector(email, id, enabled);
  res.json({ success: true });
});

import { insightsService } from './services/insightsService.js';

// Actionable Stories Feed (WhatsApp Stories style cards)
app.get('/api/stories', async (req: Request, res: Response) => {
  try {
    const stories = await insightsService.getActionableStories();
    res.json(stories);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch stories' });
  }
});

// Direct Orchestration Chat
app.post('/api/agent/chat', async (req: Request, res: Response) => {
  const { message, mode } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }
  try {
    const result = await orchestrator.processRawInput(message, mode || 'text');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// Google OAuth Endpoints
app.get('/api/auth/google/details', (req: Request, res: Response) => {
  const host = req.headers.host || '';
  const email = getUserEmail(req);
  res.json(googleAuth.getOAuthDetails(host, email));
});

app.get('/api/auth/google/url', (req: Request, res: Response) => {
  // Canonical production redirect URI requested by user
  const redirectUri = 'https://aura-personal-ai-tau.vercel.app/api/auth/google/callback';
  const url = googleAuth.getAuthUrl(redirectUri);
  res.json({ url, redirectUri });
});

app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const redirectUri = 'https://aura-personal-ai-tau.vercel.app/api/auth/google/callback';
  const returnOrigin = 'https://aura-personal-ai-tau.vercel.app';

  if (!code) {
    res.redirect(`${returnOrigin}/?auth=error&reason=no_code`);
    return;
  }

  const result = await googleAuth.handleCallback(code, redirectUri);
  if (result.success && result.email) {
    try {
      await supabaseService.getOrCreateUserId(result.email);
      await db.hydrateUserFromSupabase(result.email);
    } catch (err) {
      console.warn('[Auth] Supabase cloud hydration warning:', err);
    }
    res.redirect(`${returnOrigin}/?auth=success&email=${encodeURIComponent(result.email)}`);
  } else {
    res.redirect(`${returnOrigin}/?auth=error&reason=${encodeURIComponent(result.error || 'unknown')}`);
  }
});

app.post('/api/auth/google/disconnect', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  googleAuth.disconnect(email);
  res.json({ success: true, message: 'Google account disconnected' });
});

// WhatsApp Multi-Device Endpoints
app.get('/api/whatsapp/saved-phone', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  if (email === 'guest') {
    res.json({ phone: null });
    return;
  }
  res.json({ phone: db.getSavedWhatsAppPhone(email) || null });
});

app.post('/api/whatsapp/saved-phone', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  if (email === 'guest') {
    res.status(400).json({ error: 'Please sign in with Google first to save your phone number.' });
    return;
  }
  const { phone } = req.body || {};
  if (!phone || phone.replace(/[^0-9]/g, '').length < 10) {
    res.status(400).json({ error: 'Please provide a valid 10-digit mobile number' });
    return;
  }
  db.saveWhatsAppPhone(email, phone);
  res.json({ success: true, phone: db.getSavedWhatsAppPhone(email) });
});

app.get('/api/whatsapp/status', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  res.json(whatsappService.getStatus(email));
});

app.post('/api/whatsapp/connect', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    if (email === 'guest') {
      res.status(400).json({ error: 'Please sign in with Google first before connecting WhatsApp.' });
      return;
    }
    const { phoneNumber } = req.body || {};
    await whatsappService.connect(phoneNumber, email);
    res.json({ success: true, status: whatsappService.getStatus(email) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/pairing-code', async (req: Request, res: Response) => {
  const email = getUserEmail(req);
  if (email === 'guest') {
    res.status(400).json({ error: 'Please sign in with Google first before requesting a pairing code.' });
    return;
  }
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    res.status(400).json({ error: 'phoneNumber is required (e.g. 15551234567)' });
    return;
  }
  try {
    const code = await whatsappService.requestPairingCode(phoneNumber, email);
    res.json({ success: true, pairingCode: code });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to request pairing code' });
  }
});

app.post('/api/whatsapp/disconnect', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  whatsappService.disconnect(email);
  res.json({ success: true, message: 'WhatsApp session disconnected' });
});

app.get('/api/whatsapp/messages', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  const currentPhone = whatsappService.getStatus(email).user?.phone || whatsappService.getStatus(email).savedPhone || undefined;
  res.json(db.getWhatsAppMessages(email, currentPhone));
});

app.delete('/api/whatsapp/messages', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  db.clearWhatsAppMessages(email);
  res.json({ success: true, message: 'WhatsApp messages cleared' });
});

app.get('/api/whatsapp/summary', async (req: Request, res: Response) => {
  const email = getUserEmail(req);
  try {
    const summary = await whatsappService.getUpdatesSummary(email);
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/send', async (req: Request, res: Response) => {
  const { to, message } = req.body;
  if (!to || !message) {
    res.status(400).json({ error: 'to and message are required' });
    return;
  }
  try {
    const result = await whatsappService.sendMessage(to, message);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications & Queue Endpoints
app.get('/api/notifications', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  res.json(db.getNotifications(email));
});

app.post('/api/notifications/read', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  db.markAllNotificationsRead(email);
  res.json({ success: true });
});

app.delete('/api/notifications', (req: Request, res: Response) => {
  const email = getUserEmail(req);
  db.clearNotifications(email);
  res.json({ success: true, message: 'Notifications cleared' });
});

// Modular Admin Settings Endpoints
app.get('/api/admin/settings', (req: Request, res: Response) => {
  res.json(db.getAdminSettings());
});

app.post('/api/admin/settings', (req: Request, res: Response) => {
  const updated = db.updateAdminSettings(req.body);
  res.json({ success: true, settings: updated });
});

// Static files from built client
const DIST_DIR = path.resolve(process.cwd(), 'dist');
app.use(express.static(DIST_DIR));

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return;
  }
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

async function startServer() {
  const ssl = await getOrCreateCert();

  // Create HTTPS Server on port 5000
  const httpsServer = https.createServer({ key: ssl.key, cert: ssl.cert }, app);

  // WebSocket Server for Gemini Live Real-time Audio Streaming attached to HTTPS server
  const wss = new WebSocketServer({ server: httpsServer, path: '/ws/live' });

  // Also create HTTP server on port 5001 for tunnels (Cloudflare tunnel / Tunnelmole / etc)
  const HTTP_PORT = 5001;
  const httpServer = http.createServer(app);
  const httpWss = new WebSocketServer({ server: httpServer, path: '/ws/live' });

  function setupWsHandling(serverInstance: WebSocketServer, label: string) {
    serverInstance.on('connection', (ws: WebSocket) => {
      console.log(`[WebSocket] Client connected to /ws/live (${label})`);
      let activeLiveSession: any = null;

      ws.on('message', async (data: Buffer | string) => {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'start') {
            const voiceGender = msg.voice === 'male' ? 'male' : 'female';
            console.log(`[WebSocket] Starting Gemini Live with voice gender: ${voiceGender}`);

            if (activeLiveSession) {
              activeLiveSession.close();
              activeLiveSession = null;
            }

            activeLiveSession = await geminiLive.createLiveSession({
              voice: voiceGender,
              voiceName: msg.voiceName,
              onAudioChunk: (base64Audio) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'audio', data: base64Audio }));
                }
              },
              onTranscription: (role, text) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'transcription', role, text }));
                }
              },
              onInterrupted: () => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'interrupted' }));
                }
              },
              onError: (err) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'error', error: err?.message || 'Live session error' }));
                }
              },
              onClose: () => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'closed' }));
                }
                activeLiveSession = null;
              },
            });

            ws.send(JSON.stringify({ type: 'ready', voice: voiceGender }));
          } else if (msg.type === 'audio' && activeLiveSession) {
            activeLiveSession.sendAudioChunk(msg.data);
          } else if (msg.type === 'audio_end' && activeLiveSession) {
            activeLiveSession.sendAudioEnd();
          } else if (msg.type === 'text' && activeLiveSession) {
            activeLiveSession.sendText(msg.text);
          } else if (msg.type === 'stop' && activeLiveSession) {
            activeLiveSession.close();
            activeLiveSession = null;
            ws.send(JSON.stringify({ type: 'stopped' }));
          }
        } catch (err: any) {
          console.error(`[WebSocket] Message handling error (${label}):`, err);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', error: err.message }));
          }
        }
      });

      ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected (${label})`);
        if (activeLiveSession) {
          activeLiveSession.close();
          activeLiveSession = null;
        }
      });

      ws.on('error', (err) => {
        console.error(`[WebSocket] Socket error (${label}):`, err);
      });
    });
  }

  setupWsHandling(wss, 'HTTPS/WSS');
  setupWsHandling(httpWss, 'HTTP/WS');

  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(` Aura AI Tunnel Port (HTTP):  http://localhost:${HTTP_PORT}`);
  });

  httpsServer.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` Aura AI Server (HTTPS):      https://localhost:${PORT}`);
    console.log(` Network Phone Access:        https://192.168.1.11:${PORT}`);
    console.log(` WebSocket Live (WSS):        wss://localhost:${PORT}/ws/live`);
    console.log(` Google OAuth Redirect URI:   https://localhost:${PORT}/api/auth/google/callback`);
    console.log(` Authorized JavaScript Origin: https://localhost:3000, https://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
});
