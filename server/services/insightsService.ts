import { GoogleGenAI } from '@google/genai';
import { db } from '../storage/db.js';
import { GoogleWorkspaceService } from './googleWorkspaceService.js';
import { whatsappService } from './whatsappService.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export interface ActionableStoryCard {
  id: string;
  source: 'gmail' | 'whatsapp' | 'calendar' | 'drive' | 'system';
  sourceTitle: string;
  badge: string;
  badgeColor: string;
  sender: string;
  senderContact?: string;
  timestamp: string;
  headline: string; // 1-line catchy summary
  actionRequirement: string; // What needs to be done (1-2 lines)
  urgency: 'high' | 'medium' | 'low';
  suggestedAction: string; // Pre-filled instruction user can tap or speak
  draftReply?: string; // Pre-written draft reply ready for user 1-tap approval
  needsApproval?: boolean; // True if waiting for user approval to execute
}

export class InsightsService {
  private workspace = new GoogleWorkspaceService();

  async getActionableStories(): Promise<ActionableStoryCard[]> {
    const stories: ActionableStoryCard[] = [];

    // 1. Gather recent emails from Gmail
    try {
      const emails = await this.workspace.getRecentEmails(6);
      for (const email of emails) {
        const text = `${email.subject} ${email.snippet}`.toLowerCase();
        const isUrgent = text.includes('failed') || text.includes('urgent') || text.includes('action required') || text.includes('deadline');
        const senderClean = email.from.split('<')[0].trim() || email.from;
        const senderEmailMatch = email.from.match(/<([^>]+)>/);
        const senderEmail = senderEmailMatch ? senderEmailMatch[1] : email.from;

        const draft = `Hi ${senderClean}, thanks for reaching out. I received your update regarding "${email.subject}" and am looking into it right away.`;

        stories.push({
          id: `gmail-${email.id}`,
          source: 'gmail',
          sourceTitle: 'Gmail Inbox',
          badge: isUrgent ? 'Action Needed' : 'Email Insight',
          badgeColor: isUrgent ? 'rose' : 'indigo',
          sender: senderClean,
          senderContact: senderEmail,
          timestamp: email.date || new Date().toISOString(),
          headline: email.subject,
          actionRequirement: email.snippet ? email.snippet.slice(0, 140) + '...' : 'Review this incoming message and reply if required.',
          urgency: isUrgent ? 'high' : 'medium',
          suggestedAction: `Send approved draft reply to ${senderClean}`,
          draftReply: draft,
          needsApproval: true,
        });
      }
    } catch (e) {
      // Gmail not authenticated or error
    }

    // 2. Gather upcoming Calendar events
    try {
      const events = await this.workspace.getUpcomingEvents(4);
      for (const evt of events) {
        stories.push({
          id: `cal-${evt.id}`,
          source: 'calendar',
          sourceTitle: 'Google Calendar',
          badge: 'Upcoming Schedule',
          badgeColor: 'amber',
          sender: 'Schedule',
          timestamp: evt.start,
          headline: evt.summary,
          actionRequirement: evt.meetLink ? `Scheduled call with Google Meet ready: ${evt.meetLink}` : `Event starts at ${new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          urgency: 'medium',
          suggestedAction: `Brief me on ${evt.summary} and my notes for it`,
        });
      }
    } catch (e) {
      // Calendar error
    }

    // 3. Gather WhatsApp Messages from DB & Service
    try {
      const currentPhone = whatsappService.getStatus().user?.phone || whatsappService.getStatus().savedPhone || undefined;
      const waMsgs = db.getWhatsAppMessages(currentPhone).slice(0, 8);
      for (const msg of waMsgs) {
        if (msg.fromMe) continue;
        const draft = `Hi ${msg.fromName}, got your message: "${msg.text.slice(0, 50)}...". Looking into it right now!`;

        stories.push({
          id: `wa-${msg.id}`,
          source: 'whatsapp',
          sourceTitle: 'WhatsApp',
          badge: 'Chat Update',
          badgeColor: 'emerald',
          sender: msg.fromName || msg.from,
          senderContact: msg.from,
          timestamp: msg.timestamp,
          headline: `Message from ${msg.fromName}`,
          actionRequirement: msg.text.slice(0, 140),
          urgency: msg.text.toLowerCase().includes('urgent') || msg.text.toLowerCase().includes('need') ? 'high' : 'low',
          suggestedAction: `Send WhatsApp approved reply to ${msg.fromName}`,
          draftReply: draft,
          needsApproval: true,
        });
      }
    } catch (e) {
      // WhatsApp not active
    }

    // 4. Pending clerical tasks
    const tasks = db.getTasks().filter((t) => !t.completed).slice(0, 5);
    for (const t of tasks) {
      stories.push({
        id: `task-${t.id}`,
        source: 'system',
        sourceTitle: 'Aura Task Tracker',
        badge: 'Priority Task',
        badgeColor: t.urgency === 'high' ? 'rose' : 'indigo',
        sender: t.source || 'Aura',
        timestamp: t.createdAt,
        headline: t.title,
        actionRequirement: t.deadline ? `Due: ${t.deadline}` : 'Pending clerical item to complete today.',
        urgency: t.urgency,
        suggestedAction: `Mark "${t.title}" as completed`,
      });
    }

    // Fallback card if empty
    if (stories.length === 0) {
      stories.push({
        id: 'story-welcome',
        source: 'system',
        sourceTitle: 'Aura Chief of Staff',
        badge: 'Daily Briefing',
        badgeColor: 'indigo',
        sender: 'Aura',
        timestamp: new Date().toISOString(),
        headline: 'Everything is up to date',
        actionRequirement: 'No unread urgent emails or pending tasks found right now. You are all caught up!',
        urgency: 'low',
        suggestedAction: 'Give me a 1-minute daily briefing',
      });
    }

    return stories;
  }
}

export const insightsService = new InsightsService();
