import { google } from 'googleapis';
import { db } from '../storage/db.js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://aura-personal-ai-tau.vercel.app/api/auth/google/callback';

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
  'https://www.googleapis.com/auth/contacts.readonly',
];

export class GoogleAuthService {
  constructor() {
    // Dynamic per-user credentials
  }

  getOAuthDetails(host?: string, userEmail?: string) {
    const isCloudflare = host && host.includes('trycloudflare.com');
    const effectiveRedirectUri = REDIRECT_URI;

    const isAuth = this.isAuthenticated(userEmail);
    const tokens = isAuth ? db.getGoogleTokens(userEmail) : null;
    return {
      connected: isAuth,
      userEmail: isAuth ? (tokens?.userEmail || (userEmail && userEmail !== 'guest' ? userEmail : null)) : null,
      redirectUri: effectiveRedirectUri,
      origins: [
        'https://aura-personal-ai-tau.vercel.app',
        'https://localhost:3000',
        'https://localhost:5000',
        ...(isCloudflare ? [`https://${host}`] : []),
      ],
    };
  }

  getAuthUrl(redirectUriOverride?: string): string {
    const client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      redirectUriOverride || REDIRECT_URI
    );

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: OAUTH_SCOPES,
    });
  }

  async handleCallback(code: string, redirectUriOverride?: string): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      const client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        redirectUriOverride || REDIRECT_URI
      );

      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      let userEmail = 'Google Workspace User';
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: client });
        const userInfo = await oauth2.userinfo.get();
        if (userInfo.data.email) {
          userEmail = userInfo.data.email.trim().toLowerCase();
        }
      } catch (err) {
        console.warn('[Google Auth] Could not fetch user email info:', err);
      }

      db.saveGoogleTokens(userEmail, {
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

  isAuthenticated(userEmail?: string): boolean {
    const tokens = db.getGoogleTokens(userEmail);
    return !!(tokens && (tokens.access_token || tokens.refresh_token));
  }

  getClient(userEmail?: string) {
    const norm = db.normalizeEmail(userEmail);
    const tokens = db.getGoogleTokens(norm);
    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      throw new Error(`Google Workspace is not connected for ${norm}. Please authorize your Google account first.`);
    }

    const client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    client.setCredentials({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
      token_type: tokens.token_type || undefined,
      scope: tokens.scope || undefined,
    });

    client.on('tokens', (newTokens: any) => {
      console.log(`[Google Auth] Tokens refreshed for user: ${norm}`);
      const current = db.getGoogleTokens(norm) || {};
      db.saveGoogleTokens(norm, {
        ...current,
        access_token: newTokens.access_token || current.access_token,
        refresh_token: newTokens.refresh_token || current.refresh_token,
        expiry_date: newTokens.expiry_date || current.expiry_date,
        token_type: newTokens.token_type || current.token_type,
        scope: newTokens.scope || current.scope,
        userEmail: norm,
      });
    });

    return client;
  }

  disconnect(userEmail?: string) {
    const norm = db.normalizeEmail(userEmail);
    db.saveGoogleTokens(norm, null);
  }
}

export const googleAuth = new GoogleAuthService();
