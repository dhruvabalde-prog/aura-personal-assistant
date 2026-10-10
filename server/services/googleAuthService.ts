import { google } from 'googleapis';
import { db } from '../storage/db.js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://localhost:5000/api/auth/google/callback';

export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/forms.body',
];

export class GoogleAuthService {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    const existingTokens = db.getGoogleTokens();
    if (existingTokens) {
      this.oauth2Client.setCredentials({
        access_token: existingTokens.access_token,
        refresh_token: existingTokens.refresh_token,
        expiry_date: existingTokens.expiry_date,
        token_type: existingTokens.token_type,
        scope: existingTokens.scope,
      });
    }

    this.oauth2Client.on('tokens', (tokens: any) => {
      console.log('[Google Auth] New tokens received');
      const current = db.getGoogleTokens() || {};
      db.saveGoogleTokens({
        ...current,
        access_token: tokens.access_token || current.access_token,
        refresh_token: tokens.refresh_token || current.refresh_token,
        expiry_date: tokens.expiry_date || current.expiry_date,
        token_type: tokens.token_type || current.token_type,
        scope: tokens.scope || current.scope,
      });
    });
  }

  getOAuthDetails(host?: string) {
    const isCloudflare = host && host.includes('trycloudflare.com');
    const effectiveRedirectUri = isCloudflare
      ? `https://${host}/api/auth/google/callback`
      : REDIRECT_URI;

    return {
      connected: this.isAuthenticated(),
      userEmail: db.getGoogleTokens()?.userEmail || null,
      redirectUri: effectiveRedirectUri,
      origins: [
        'https://localhost:3000',
        'https://localhost:5000',
        ...(isCloudflare ? [`https://${host}`] : []),
      ],
    };
  }

  getAuthUrl(redirectUriOverride?: string): string {
    const client = redirectUriOverride
      ? new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUriOverride)
      : this.oauth2Client;

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: OAUTH_SCOPES,
    });
  }

  async handleCallback(code: string, redirectUriOverride?: string): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      const client = redirectUriOverride
        ? new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUriOverride)
        : this.oauth2Client;

      const { tokens } = await client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      let userEmail = 'Google Workspace User';
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        if (userInfo.data.email) {
          userEmail = userInfo.data.email;
        }
      } catch (err) {
        console.warn('[Google Auth] Could not fetch user email info:', err);
      }

      db.saveGoogleTokens({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type,
        scope: tokens.scope,
        userEmail,
      });

      console.log(`[Google Auth] Successfully linked Google Workspace account for: ${userEmail}`);
      return { success: true, email: userEmail };
    } catch (error: any) {
      console.error('[Google Auth] Failed to exchange code for tokens:', error);
      return { success: false, error: error.message || 'Authorization failed' };
    }
  }

  isAuthenticated(): boolean {
    const tokens = db.getGoogleTokens();
    return !!(tokens && (tokens.access_token || tokens.refresh_token));
  }

  getClient() {
    const tokens = db.getGoogleTokens();
    if (tokens && tokens.access_token) {
      this.oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type,
        scope: tokens.scope,
      });
    }
    return this.oauth2Client;
  }

  disconnect() {
    db.saveGoogleTokens(null);
    this.oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  }
}

export const googleAuth = new GoogleAuthService();
