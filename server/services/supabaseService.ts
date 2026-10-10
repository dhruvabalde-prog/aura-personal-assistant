import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserWorkspace } from '../storage/db.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hbnsrblknhmxdaogjjeb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

class SupabaseService {
  private client: SupabaseClient;
  private userCache: Map<string, string> = new Map(); // email -> supabase user_id

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    console.log(`[Supabase] Service initialized for project: ${SUPABASE_URL}`);
  }

  /**
   * Resolve or provision a unique Supabase User ID for the given email
   */
  async getOrCreateUserId(email: string): Promise<string | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || cleanEmail === 'guest') return null;

    if (this.userCache.has(cleanEmail)) {
      return this.userCache.get(cleanEmail)!;
    }

    try {
      // 1. Search existing users
      const { data, error } = await this.client.auth.admin.listUsers();
      if (!error && data?.users) {
        const found = data.users.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (found) {
          this.userCache.set(cleanEmail, found.id);
          return found.id;
        }
      }

      // 2. Create if not found
      const createRes = await this.client.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
      });

      if (createRes.data?.user?.id) {
        const id = createRes.data.user.id;
        this.userCache.set(cleanEmail, id);

        // Also record in aura_profiles
        try {
          await this.client.from('aura_profiles').upsert({
            id,
            email: cleanEmail,
            last_seen: new Date().toISOString(),
          });
        } catch (e) {}

        console.log(`[Supabase] Created new cloud user profile for: ${cleanEmail} (ID: ${id})`);
        return id;
      }
    } catch (err: any) {
      console.error(`[Supabase] Error resolving user ID for ${cleanEmail}:`, err?.message || err);
    }
    return null;
  }

  /**
   * Persist a user's entire isolated workspace to Supabase
   */
  async syncWorkspace(email: string, workspace: UserWorkspace): Promise<boolean> {
    const userId = await this.getOrCreateUserId(email);
    if (!userId) return false;

    try {
      const payload = {
        email: workspace.email,
        profile: workspace.profile,
        tasks: workspace.tasks,
        notes: workspace.notes,
        savedWhatsAppPhone: workspace.savedWhatsAppPhone,
        whatsappMessages: (workspace.whatsappMessages || []).slice(0, 100), // persist top 100 recent
        notifications: (workspace.notifications || []).slice(0, 50),
        messages: (workspace.messages || []).slice(-100),
        connectors: workspace.connectors,
        syncedAt: new Date().toISOString(),
      };

      const { error } = await this.client.from('aura_user_state').upsert({
        user_id: userId,
        key: 'workspace',
        value: payload,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.warn(`[Supabase] Failed to sync workspace for ${email}:`, error.message);
        return false;
      }

      return true;
    } catch (err: any) {
      console.error(`[Supabase] Error saving workspace for ${email}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Fetch a user's persisted workspace from Supabase
   */
  async loadWorkspace(email: string): Promise<Partial<UserWorkspace> | null> {
    const userId = await this.getOrCreateUserId(email);
    if (!userId) return null;

    try {
      const { data, error } = await this.client
        .from('aura_user_state')
        .select('value')
        .eq('user_id', userId)
        .eq('key', 'workspace')
        .single();

      if (error || !data?.value) {
        return null;
      }

      console.log(`[Supabase] Successfully loaded cloud workspace for ${email}`);
      return data.value as Partial<UserWorkspace>;
    } catch (err: any) {
      console.warn(`[Supabase] No previous cloud workspace found for ${email}:`, err?.message || err);
      return null;
    }
  }

  /**
   * Audit log an agent tool or user action in Supabase
   */
  async logAction(email: string, intent: string, message: string, ok: boolean = true, ms: number = 0) {
    try {
      const userId = await this.getOrCreateUserId(email);
      await this.client.from('aura_agent_logs').insert({
        user_id: userId || null,
        intent,
        message,
        ok,
        ms,
        created_at: new Date().toISOString(),
      });
    } catch (e) {}
  }
}

export const supabaseService = new SupabaseService();
