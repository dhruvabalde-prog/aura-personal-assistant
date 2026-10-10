-- ==============================================================================
-- Aura AI: Multi-Tenant Supabase Database Schema
-- Provides complete data isolation per user based on Google Account (user_email)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users & Workspaces Table
CREATE TABLE IF NOT EXISTS public.user_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT 'You',
    assistant_name TEXT DEFAULT 'Aura',
    preferred_voice TEXT DEFAULT 'female',
    preferred_language TEXT DEFAULT 'English',
    emotional_context JSONB DEFAULT '{"lastMood":"Calm & Focused","stressLevel":"low","energyLevel":"moderate","notes":[],"updatedAt":""}'::jsonb,
    habits JSONB DEFAULT '[]'::jsonb,
    key_people JSONB DEFAULT '[]'::jsonb,
    daily_priorities JSONB DEFAULT '[]'::jsonb,
    google_tokens JSONB DEFAULT NULL,
    saved_whatsapp_phone TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on email for fast tenant lookups
CREATE INDEX IF NOT EXISTS idx_user_workspaces_email ON public.user_workspaces(email);

-- 3. Tasks Table (Extracted from WhatsApp, Gmail, Voice, Notes)
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES public.user_workspaces(email) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('whatsapp', 'email', 'voice', 'notes')),
    sender TEXT,
    deadline TEXT,
    urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('high', 'medium', 'low')),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_email ON public.tasks(user_email);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed);

-- 4. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES public.user_workspaces(email) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    pinned BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_email ON public.notes(user_email);

-- 5. WhatsApp Messages Table (Synced via Baileys Engine)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES public.user_workspaces(email) ON DELETE CASCADE,
    from_jid TEXT NOT NULL,
    from_name TEXT NOT NULL,
    text TEXT NOT NULL,
    is_group BOOLEAN DEFAULT FALSE,
    group_name TEXT,
    from_me BOOLEAN DEFAULT FALSE,
    extracted_task TEXT,
    user_phone TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_email ON public.whatsapp_messages(user_email);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);

-- 6. Chat Messages Table (Voice & Text Conversations)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES public.user_workspaces(email) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'voice')),
    tool_calls JSONB DEFAULT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_email ON public.chat_messages(user_email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON public.chat_messages(timestamp DESC);

-- 7. Notifications & Queue Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES public.user_workspaces(email) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'working', 'alert')),
    read BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'completed' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON public.notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- 8. Enable Row-Level Security (RLS) on all tables
ALTER TABLE public.user_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Service Role Policies (Full access for backend service)
CREATE POLICY service_all_user_workspaces ON public.user_workspaces FOR ALL USING (true);
CREATE POLICY service_all_tasks ON public.tasks FOR ALL USING (true);
CREATE POLICY service_all_notes ON public.notes FOR ALL USING (true);
CREATE POLICY service_all_whatsapp_messages ON public.whatsapp_messages FOR ALL USING (true);
CREATE POLICY service_all_chat_messages ON public.chat_messages FOR ALL USING (true);
CREATE POLICY service_all_notifications ON public.notifications FOR ALL USING (true);
