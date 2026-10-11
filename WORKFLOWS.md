# AURA WORKFLOWS & PERMISSIONS SPECIFICATION

## 1. Permission Matrix & Boundary Gates

Unlike standard consumer apps, Aura operates with heightened authority across personal communication channels (WhatsApp, Gmail, Calendar, Audio hardware). These boundaries are strictly enforced.

| Permission / Realm | Access Level | Boundary Rules | Failure Mode / Fallback |
| :--- | :--- | :--- | :--- |
| **WhatsApp Multi-Device** | Session socket (Baileys) | • Private 1-to-1 reply ONLY.<br>• Groups are READ-ONLY.<br>• Never auto-reply to third parties. | Falls back to Web Dashboard clerical cards. |
| **Google Workspace** | OAuth 2.0 (offline tokens) | • Scoped to Calendar, Gmail, Tasks, Contacts.<br>• Per-user token storage. | Read cached state; prompt user to reconnect. |
| **Microphone & Audio** | Browser MediaDevices API | • Explicit user permission on first Orb tap.<br>• Audio streaming active only during active session. | Switch to Chat mode in UI. |
| **Supabase Cloud Sync** | Row-Level Security (RLS) | • User data scoped strictly to `user_id` / email.<br>• No cross-user leakage. | Local SQLite / in-memory fallback. |

---

## 2. Safe Local Development Workflows

### 2.1 Starting the System
1. **Server (Express + WebSocket + Baileys + Gemini Live):**
   ```bash
   npm run server
   ```
   Runs on `http://localhost:3000` (or `https` with local self-signed certs).
2. **Client (Vite React UI):**
   ```bash
   npm run client
   ```
   Runs on `http://localhost:5173`.

### 2.2 Reversible Code Verification (The Undo Safety Net)
Before any code modification:
1. **Status check**: `git status`
2. **Review diff**: `git diff`
3. **If rollback is needed**:
   - Undo specific file changes:
     ```powershell
     git restore <filename>
     ```
   - Undo all local changes safely:
     ```powershell
     git restore .
     ```
   - No changes will ever be pushed to the remote branch without explicit review.

---

## 3. Data Storage & Credential Isolation

- **Local Baileys Session**: `storage/baileys_auth/`
  - Kept strictly out of git (`.gitignore`).
  - Contains active encryption keys for WhatsApp multi-device sync.
- **Local SQLite DB**: `storage/local_aura.db`
  - Stores local profiles, messages, tasks, and notifications.
- **Supabase Cloud Tables**:
  - `user_state`, `aura_agent_logs`, `whatsapp_messages`, `tasks`.
