# UI-114 - Offline Pattern

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-114 |
|-------------|---------|
| Title | Offline Pattern |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | User Pattern |
| Depends On | UI-005, UI-006 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

Defines offline behaviour for field operations.

The platform shall remain operational during temporary loss of connectivity.

---

# 2. Objectives

The Offline Pattern shall:

- Maintain productivity.
- Prevent data loss.
- Synchronise automatically.
- Preserve auditability.

---

# 3. Offline Features

Create Records

Edit Drafts

Capture Photos

View Cached Data

Search Cached Records

---

# 4. Synchronisation

Queued

↓

Waiting

↓

Uploading

↓

Completed

↓

Conflict (if any)

---

# 5. Conflict Resolution

Newest data shall not automatically overwrite existing records.

Users shall review conflicts before submission.

---

# 6. Mobile Behaviour

Offline status shall always be visible.

Pending synchronisation shall be displayed.

---

# 7. AI Behaviour

Future AI may prioritise synchronisation.

Detect conflicting records.

Recommend merge actions.

---

# Related Documents

UI-110

UI-111

---

# Document Status

LOCKED

Version 1.0.0

END OF DOCUMENT
