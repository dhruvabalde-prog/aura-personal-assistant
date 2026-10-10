import { google } from 'googleapis';
import { googleAuth } from './googleAuthService.js';

export class GoogleWorkspaceService {
  private getAuthClient() {
    return googleAuth.getClient();
  }

  private ensureAuth() {
    if (!googleAuth.isAuthenticated()) {
      throw new Error('Google Workspace is not connected. Please authorize your Google account first.');
    }
    return this.getAuthClient();
  }

  // --- GMAIL ---
  async getRecentEmails(maxResults: number = 5): Promise<any[]> {
    const auth = this.ensureAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: 'category:primary',
    });

    const messages = listRes.data.messages || [];
    const emailSummaries = [];

    for (const msg of messages) {
      if (!msg.id) continue;
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = detail.data.payload?.headers || [];
      const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
      const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || 'Unknown Sender';
      const date = headers.find((h) => h.name?.toLowerCase() === 'date')?.value || '';
      const snippet = detail.data.snippet || '';

      emailSummaries.push({
        id: msg.id,
        from,
        subject,
        date,
        snippet,
      });
    }

    return emailSummaries;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; id?: string }> {
    const auth = this.ensureAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${to}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      body,
    ];
    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    return { success: true, id: res.data.id || undefined };
  }

  // --- GOOGLE CALENDAR & MEET ---
  async getUpcomingEvents(maxResults: number = 5): Promise<any[]> {
    const auth = this.ensureAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const items = res.data.items || [];
    return items.map((evt) => ({
      id: evt.id,
      summary: evt.summary || 'Untitled Event',
      start: evt.start?.dateTime || evt.start?.date,
      end: evt.end?.dateTime || evt.end?.date,
      meetLink: evt.hangoutLink || evt.conferenceData?.entryPoints?.[0]?.uri || null,
      location: evt.location || null,
    }));
  }

  async createCalendarEvent(
    summary: string,
    startTimeIso: string,
    endTimeIso: string,
    description?: string,
    createMeet: boolean = true
  ): Promise<any> {
    const auth = this.ensureAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const requestBody: any = {
      summary,
      description,
      start: { dateTime: startTimeIso },
      end: { dateTime: endTimeIso },
    };

    if (createMeet) {
      requestBody.conferenceData = {
        createRequest: {
          requestId: `aura-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const res = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: createMeet ? 1 : 0,
      requestBody,
    });

    return {
      id: res.data.id,
      summary: res.data.summary,
      start: res.data.start?.dateTime,
      meetLink: res.data.hangoutLink,
      htmlLink: res.data.htmlLink,
    };
  }

  // --- GOOGLE TASKS ---
  async getGoogleTasks(maxResults: number = 10): Promise<any[]> {
    const auth = this.ensureAuth();
    const tasks = google.tasks({ version: 'v1', auth });

    const res = await tasks.tasks.list({
      tasklist: '@default',
      maxResults,
      showCompleted: false,
    });

    const items = res.data.items || [];
    return items.map((t) => ({
      id: t.id,
      title: t.title,
      due: t.due,
      notes: t.notes,
    }));
  }

  async createGoogleTask(title: string, notes?: string, due?: string): Promise<any> {
    const auth = this.ensureAuth();
    const tasks = google.tasks({ version: 'v1', auth });

    const res = await tasks.tasks.insert({
      tasklist: '@default',
      requestBody: {
        title,
        notes,
        due,
      },
    });

    return res.data;
  }

  // --- GOOGLE DRIVE ---
  async listDriveFiles(query?: string, pageSize: number = 10): Promise<any[]> {
    const auth = this.ensureAuth();
    const drive = google.drive({ version: 'v3', auth });

    const q = query
      ? `name contains '${query}' and trashed = false`
      : 'trashed = false';

    const res = await drive.files.list({
      pageSize,
      q,
      fields: 'files(id, name, mimeType, webViewLink, modifiedTime, size)',
      orderBy: 'modifiedTime desc',
    });

    return res.data.files || [];
  }

  // --- GOOGLE DOCS ---
  async createDocument(title: string, content: string): Promise<any> {
    const auth = this.ensureAuth();
    const docs = google.docs({ version: 'v1', auth });

    // Step 1: Create empty document
    const createRes = await docs.documents.create({
      requestBody: { title },
    });
    const documentId = createRes.data.documentId!;

    // Step 2: Insert text content
    if (content.trim()) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content,
              },
            },
          ],
        },
      });
    }

    return {
      documentId,
      title,
      url: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  }

  // --- GOOGLE SHEETS ---
  async createSpreadsheet(title: string, rows: (string | number)[][]): Promise<any> {
    const auth = this.ensureAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
      },
    });
    const spreadsheetId = createRes.data.spreadsheetId!;

    if (rows && rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows,
        },
      });
    }

    return {
      spreadsheetId,
      title,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    };
  }

  // --- GOOGLE SLIDES ---
  async createPresentation(title: string, subtitle?: string): Promise<any> {
    const auth = this.ensureAuth();
    const slides = google.slides({ version: 'v1', auth });

    const createRes = await slides.presentations.create({
      requestBody: { title },
    });
    const presentationId = createRes.data.presentationId!;

    return {
      presentationId,
      title,
      url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
    };
  }

  // --- GOOGLE FORMS ---
  async createForm(title: string, description?: string): Promise<any> {
    const auth = this.ensureAuth();
    const forms = google.forms({ version: 'v1', auth });

    const createRes = await forms.forms.create({
      requestBody: {
        info: {
          title,
          documentTitle: title,
          description: description || 'Created by Aura Chief of Staff',
        },
      },
    });

    const formId = createRes.data.formId!;
    return {
      formId,
      title,
      editUrl: `https://docs.google.com/forms/d/${formId}/edit`,
      responderUrl: createRes.data.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`,
    };
  }
}

export const googleWorkspace = new GoogleWorkspaceService();
