# UI-106 - Notification Pattern

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-106 |
|-------------|---------|
| Title | Notification Pattern |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | User Pattern |
| Depends On | UI-004, UI-005, UI-006 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

Defines how operational notifications are presented across the platform.

Notifications communicate events requiring user awareness or action.

---

# 2. Objectives

The Notification Pattern shall:

- Surface important information promptly.
- Minimise unnecessary interruptions.
- Differentiate informational and actionable events.
- Maintain auditability where required.

---

# 3. Notification Types

- Information
- Success
- Warning
- Error
- Action Required

---

# 4. Priority Levels

- Critical
- High
- Normal
- Low

Critical notifications shall receive visual priority.

---

# 5. Behaviour

Notifications may appear as:

- Toast
- Banner
- Inbox Item
- Badge
- Modal (critical only)

---

# 6. Lifecycle

Created

↓

Displayed

↓

Acknowledged

↓

Archived

---

# 7. User Actions

Users may:

- Open
- Dismiss
- Snooze (future)
- Mark as Read

---

# 8. Mobile Behaviour

Notifications shall remain concise and touch-friendly.

---

# 9. AI Notifications

Future AI may notify:

- Schedule risks
- Approval anomalies
- Progress deviations

---

# Related Documents

UI-004

UI-005

UI-006

---

# Document Status

LOCKED

END OF DOCUMENT
