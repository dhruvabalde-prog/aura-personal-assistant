import { AppConnector, ConnectorToolDefinition } from '../services/pluginRegistry.js';
import { googleWorkspace } from '../services/googleWorkspaceService.js';
import { googleAuth } from '../services/googleAuthService.js';

export const googleWorkspaceConnector: AppConnector = {
  id: 'google_workspace',
  name: 'Google Workspace Suite',
  description: 'Gmail, Calendar, Google Meet, Tasks, Drive, Docs, Sheets, Slides, and Forms',
  category: 'google_workspace',
  isEnabled: (userEmail?: string) => googleAuth.isAuthenticated(userEmail),
  getStatus: (userEmail?: string) => {
    const isAuth = googleAuth.isAuthenticated(userEmail);
    return {
      connected: isAuth,
      details: isAuth ? 'Google Account Connected' : 'Google Account Not Connected',
    };
  },
  getTools: (): ConnectorToolDefinition[] => [
    // --- GMAIL ---
    {
      name: 'get_recent_emails',
      description: 'Fetch recent emails from Gmail inbox with subject, sender, and snippet',
      parameters: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Number of emails to fetch (default 5)' },
        },
      },
    },
    {
      name: 'send_email',
      description: 'Send an email via Gmail',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Body text of the email' },
        },
        required: ['to', 'subject', 'body'],
      },
    },

    // --- CALENDAR & MEET ---
    {
      name: 'get_upcoming_calendar_events',
      description: 'Check upcoming meetings, appointments, and Google Meet events on Google Calendar',
      parameters: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Max events to retrieve (default 5)' },
        },
      },
    },
    {
      name: 'create_calendar_event',
      description: 'Schedule a meeting or calendar event with a Google Meet link',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Title or purpose of the meeting/event' },
          startTimeIso: { type: 'string', description: 'Start time in ISO format (e.g. 2026-10-11T10:00:00Z)' },
          endTimeIso: { type: 'string', description: 'End time in ISO format (e.g. 2026-10-11T10:30:00Z)' },
          description: { type: 'string', description: 'Optional details/agenda' },
        },
        required: ['summary', 'startTimeIso', 'endTimeIso'],
      },
    },

    // --- DRIVE & DOCS ---
    {
      name: 'list_google_drive_files',
      description: 'List or search files stored in Google Drive',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Optional file name or keyword to search' },
        },
      },
    },
    {
      name: 'create_google_doc',
      description: 'Create a new Google Document with formatted title and content',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Document title' },
          content: { type: 'string', description: 'Text content to put into the document' },
        },
        required: ['title', 'content'],
      },
    },

    // --- SHEETS ---
    {
      name: 'create_google_sheet',
      description: 'Create a new Google Spreadsheet with rows and columns of data',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Spreadsheet title' },
          rows: {
            type: 'array',
            items: { type: 'array', items: { type: 'string' } },
            description: '2D array of rows and cells, e.g. [["Item", "Price"], ["Laptop", "1000"]]',
          },
        },
        required: ['title', 'rows'],
      },
    },

    // --- SLIDES ---
    {
      name: 'create_google_presentation',
      description: 'Create a new Google Slides presentation',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Presentation title' },
          subtitle: { type: 'string', description: 'Optional subtitle' },
        },
        required: ['title'],
      },
    },

    // --- FORMS ---
    {
      name: 'create_google_form',
      description: 'Create a new Google Form survey or questionnaire',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Form title' },
          description: { type: 'string', description: 'Optional form description' },
        },
        required: ['title'],
      },
    },
  ],
  executeTool: async (toolName: string, args: Record<string, any>, userEmail?: string) => {
    switch (toolName) {
      case 'get_recent_emails': {
        const emails = await googleWorkspace.getRecentEmails(args.maxResults || 5, userEmail);
        return { count: emails.length, emails };
      }
      case 'send_email': {
        const res = await googleWorkspace.sendEmail(args.to, args.subject, args.body, userEmail);
        return { success: true, message: `Email sent to ${args.to}.`, details: res };
      }
      case 'get_upcoming_calendar_events': {
        const events = await googleWorkspace.getUpcomingEvents(args.maxResults || 5, userEmail);
        return { count: events.length, events };
      }
      case 'create_calendar_event': {
        const event = await googleWorkspace.createCalendarEvent(
          args.summary,
          args.startTimeIso,
          args.endTimeIso,
          args.description,
          true,
          userEmail
        );
        return {
          success: true,
          message: `Scheduled "${event.summary}" with Google Meet link: ${event.meetLink || event.htmlLink}`,
          event,
        };
      }
      case 'list_google_drive_files': {
        const files = await googleWorkspace.listDriveFiles(args.query, 10, userEmail);
        return { count: files.length, files };
      }
      case 'create_google_doc': {
        const doc = await googleWorkspace.createDocument(args.title, args.content, userEmail);
        return { success: true, message: `Created Google Doc "${args.title}".`, link: doc.url, doc };
      }
      case 'create_google_sheet': {
        const sheet = await googleWorkspace.createSpreadsheet(args.title, args.rows, userEmail);
        return { success: true, message: `Created Google Sheet "${args.title}".`, link: sheet.url, sheet };
      }
      case 'create_google_presentation': {
        const slide = await googleWorkspace.createPresentation(args.title, args.subtitle, userEmail);
        return { success: true, message: `Created Google Slides "${args.title}".`, link: slide.url, slide };
      }
      case 'create_google_form': {
        const form = await googleWorkspace.createForm(args.title, args.description, userEmail);
        return {
          success: true,
          message: `Created Google Form "${args.title}".`,
          editLink: form.editUrl,
          shareLink: form.responderUrl,
        };
      }
      default:
        throw new Error(`Unknown Google Workspace tool: ${toolName}`);
    }
  },
};
