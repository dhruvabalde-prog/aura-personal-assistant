# AURA ROADMAP & PHASE TRACKER

---

## Phase Status Summary

| Phase | Milestone | Scope | Status |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Blueprint & Safety | Architecture, Workflows, Undo protocols, 4-Tab Specification | **Completed** |
| **Phase 1A**| Navigation & Left Drawer | 4 Locked Tabs (`Aura`, `Actions`, `My Day`, `Comms`), Left Sliding Drawer, PWA Install button | **In Progress** |
| **Phase 1B**| Aura Tab (Input Hub) | Voice $\leftrightarrow$ Chat Segment Switcher + ChatGPT/Claude rich chat micro-features (copy, retry, edit, collapsible pills) | **Next** |
| **Phase 1C**| Actions Tab (Output Hub)| Stories Radar with Story timer, Queue, and Updates sub-tabs | **Next** |
| **Phase 1D**| My Day Tab (Clerical Hub)| Tasks, Checklists, Calendar, Notes, and Playable Routines Player | **Next** |
| **Phase 1E**| Comms Tab (Channels Hub)| WhatsApp 1-to-1 status, Gmail, Contacts sync, and progressive trackers | **Next** |
| **Phase 2** | Backend Smart Routing | 10-10-10 multi-key pool across Gemini, OpenAI, and Claude with auto-failover | **Planned** |

---

## Active Phase Details: Phase 1A (Navigation & Mobile Shell)
- **Goal**: Lock bottom navigation to 4 items: `Aura`, `Actions`, `My Day`, `Comms`.
- **Slide Drawer**: Implement sliding left drawer for session history, integrations status, PWA install prompt, and preferences.
- **Mobile First**: Add iOS safe area padding (`pb-safe`) and remove screen overflowing elements.
