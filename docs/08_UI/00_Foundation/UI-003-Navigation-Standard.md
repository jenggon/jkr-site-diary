# UI-003 - Navigation Standard

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-003 |
|-------------|---------|
| Title | Navigation Standard |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | UI Foundation |
| Depends On | UI-000, UI-001, UI-002 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

This document defines the navigation architecture of the JKR Site Diary Platform.

Navigation shall minimise cognitive effort while preserving operational context.

Users should always know:

- Where they are.
- What they are working on.
- What they can do next.

---

# 2. Navigation Philosophy

Navigation exists to support operational workflows.

Users navigate to complete work.

Not to explore software.

The platform shall prioritise:

- Search
- Context
- Quick Actions
- Workflow Continuity

over deep menu structures.

---

# 3. Navigation Hierarchy

Application

↓

Project

↓

Module

↓

Workspace

↓

Task

↓

Activity

Navigation shall follow this hierarchy.

---

# 4. Global Navigation

Global Navigation provides access to platform-wide capabilities.

Examples

Dashboard

Projects

Search

Notifications

Settings

Profile

Global Navigation shall remain consistent across the platform.

---

# 5. Context Navigation

Context Navigation changes according to the user's operational context.

Examples

Current Project

Programme Revision

Current Task

Current Activity

Inspection

Context Navigation shall never remove awareness of the current project.

---

# 6. Search First Navigation

Searching shall always be faster than browsing.

Every operational entity shall be searchable.

Examples

Project

Revision

Task

Activity

Site Diary

Workforce

Material

Equipment

Approval

Photo

Search shall provide instant results.

---

# 7. Quick Actions

Frequently used actions shall remain immediately accessible.

Examples

New Activity

Update Progress

Capture Photo

Approve

Reject

Add Workforce

Actions should require minimal interaction.

---

# 8. Breadcrumb

Breadcrumbs communicate operational location.

Example

Project

>

Revision

>

Programme

>

Activity

Breadcrumbs are informational.

Not the primary navigation method.

---

# 9. Mobile Navigation

Mobile Navigation prioritises one-handed operation.

Primary actions shall remain reachable.

Navigation depth shall be minimised.

---

# 10. Desktop Navigation

Desktop layouts may expose multiple navigation layers simultaneously.

Examples

Sidebar

Tree

Split Workspace

Command Palette

---

# 11. Keyboard Navigation

Desktop users shall support:

Search shortcut.

Command Palette.

Arrow navigation.

Escape.

Enter.

Power users should complete common operations without using the mouse.

---

# 12. Navigation Rules

Users shall never lose project context.

Navigation shall never unexpectedly reset filters.

Search state shall be preserved.

Scroll position should be preserved where appropriate.

---

# 13. Future Expansion

Future navigation patterns may include:

Voice Navigation

AI Navigation

Command Interface

Gesture Navigation

Digital Twin Navigation

---

# Related Documents

UI-000

UI-001

UI-002

UI-004

---

# Document Status

Status

LOCKED

Version

1.0.0

Foundation Specification

---

END OF DOCUMENT
