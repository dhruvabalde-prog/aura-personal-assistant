# AURA ARCHITECTURE & MULTI-REALM ALIGNMENT SPECIFICATION

## 1. System Vision & Persona
**Aura** is an empathetic, hyper-competent AI Chief of Staff and personal operating system.
- Operates 100% mobile-first for iOS and Android.
- Listens to messy, unstructured thoughts and extracts actionable clerical work without robotic friction.
- Operates under strict boundaries: **WhatsApp groups are strictly read-only; Aura never replies in groups**.

---

## 2. The 4 Locked Tabs (Information Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AURA 4 LOCKED MOBILE TABS                       │
└────────────────────────────────────────────────────────────────────────┘

 ┌── SLIM TOP BAR ───────────────────────────────────────────────────────┐
 │ [☰ Slide Drawer]   A U R A                ● Online    [📲 Install App]│
 └───────────────────────────────────────────────────────────────────────┘

 ┌── SLIDING DRAWER FROM LEFT (Triggered by ☰ or swipe from left) ──────┐
 │  • Chat Sessions History (New Chat, Switch Session, Rename, Delete)   │
 │  • User Profile & Context (Stored in backend)                         │
 │  • Connected Services (WhatsApp Multi-Device QR/code, Google OAuth)   │
 │  • Download / Add to Home Screen (iOS Safari & Android PWA)           │
 │  • App Settings & Quiet Hours                                         │
 └───────────────────────────────────────────────────────────────────────┘

 ┌── THE 4 LOCKED BOTTOM TABS ──────────────────────────────────────────┐
 │                                                                       │
 │  [ 1. AURA ]         [ 2. ACTIONS ]       [ 3. MY DAY ]   [ 4. COMMS ]│
 │   User Input          User Output          Clerical Hub    Channels   │
 └───────────────────────────────────────────────────────────────────────┘
```

### Detailed Tab Specifications:

### 1. `Aura` Tab (User Input Hub)
- **Voice $\leftrightarrow$ Chat Segment Switcher**: Fast toggle on top between `🎙️ Voice` and `💬 Chat`.
- **Voice Mode**:
  - Central reactive Glowing Voice Sphere.
  - Gemini Live bidirectional streaming with interruption.
  - Real-time minimal captions.
- **Chat Mode (Full AI Chat Feature Parity)**:
  - One-click message copying.
  - Retry / Regenerate response.
  - Edit user message and resubmit.
  - Thumbs Up / Thumbs Down feedback.
  - Collapsible tool execution pills (e.g. `▶ Executed: create_task`).
  - Formatted markdown & code blocks.

### 2. `Actions` Tab (User Output Hub)
- **Sub-Tabs**:
  - **Radar Stories**: Full-screen WhatsApp/Instagram-style story cards with auto-ticker, pause/play, 1-tap conversion to tasks or calendar events, and draft reply approvals.
  - **Queue**: Pending triage items extracted from communications.
  - **Updates / Notifications**: Background agent progress, task completions, and system chimes.

### 3. `My Day` Tab (Clerical & Daily Execution Hub)
- **Sub-Tabs**:
  - **To-Dos**: Priority filters (High, Medium, Low), inline add, complete.
  - **Checklists**: Nested checklists with sub-item toggle.
  - **Calendar**: Google Calendar-synced agenda events.
  - **Routines (Playable)**: Interactive Routine Player with step countdown timers, audio tick cues, progress ring, and streak logger.
  - **Notes**: Fast memo and thought capture.

### 4. `Comms` Tab (Channels & Trackers)
- **Channels**:
  - **WhatsApp**: Status, QR/pairing code, 1-to-1 Chief of Staff bridge.
  - **Gmail**: Unread triage & draft approvals.
  - **Google Chat & Contacts**: Synced contacts lookup for sender name resolution.
- **Dashboards & Trackers**:
  - Habits, focus streaks, communication meters that activate as the user uses the app.

---

## 3. Left Sliding Drawer (Drawer from Left)
- Houses all ancillary navigation:
  - **Chat Sessions**: List of historical threads with New Chat, Switch, Rename, and Delete.
  - **Integrations Quick-Check**: WhatsApp and Google status badges.
  - **Install App (PWA)**: Android native install prompt + iOS "Add to Home Screen" instructions.
  - **Settings & Preferences**: Voice tone, sound toggle, quiet hours.

---

## 4. Multi-Realm Safety & Rollback Contract
- **Zero Remote Push**: All developments remain strictly local until verified by the user.
- **Undo Protocol**:
  ```powershell
  git restore <file>     # Revert single file
  git restore .          # Revert all changes
  ```
- **Session Protection**: `storage/baileys_auth/` is strictly `.gitignore`d.
