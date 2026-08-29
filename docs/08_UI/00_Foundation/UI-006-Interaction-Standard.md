# UI-006 - Interaction Standard

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-006 |
|-------------|---------|
| Title | Interaction Standard |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | UI Foundation |
| Depends On | UI-000, UI-001, UI-002, UI-003, UI-004, UI-005 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

This document defines how users interact with the JKR Site Diary Platform.

Interaction standards ensure predictable behaviour across all pages and components.

Users should never need to relearn interactions when moving between modules.

---

# 2. Objectives

The Interaction Standard shall:

- Ensure consistency.
- Minimise user effort.
- Reduce cognitive load.
- Improve operational efficiency.
- Support desktop and mobile workflows.

---

# 3. Interaction Principles

Every interaction shall be:

Predictable

Consistent

Responsive

Recoverable

Accessible

Auditable

---

# 4. Feedback Rules

Every user action shall provide feedback.

Examples:

Loading

Success

Warning

Error

Information

Long-running operations shall indicate progress.

---

# 5. Confirmation Rules

Confirmation shall only be required for actions that:

Delete data

Submit approvals

Reject approvals

Modify programme information

Overwrite existing records

Routine operational tasks shall not require unnecessary confirmations.

---

# 6. Undo Philosophy

Where practical, destructive actions should support Undo.

Where Undo is not possible, confirmation shall be required.

---

# 7. Keyboard Interaction

Desktop users shall support:

Tab

Shift + Tab

Enter

Escape

Arrow Keys

Ctrl + K (Command Palette)

Keyboard shortcuts shall remain consistent across modules.

---

# 8. Touch Interaction

Touch controls shall support:

Tap

Long Press

Swipe (where appropriate)

Drag

Pinch (future GIS/BIM modules)

Touch interactions shall not replace standard controls.

---

# 9. Loading Behaviour

Loading indicators shall appear whenever users wait for data.

Loading shall never block unrelated operations where asynchronous behaviour is possible.

Skeleton loading is preferred over empty screens.

---

# 10. Error Handling

Errors shall:

Explain the problem.

Provide corrective guidance.

Avoid technical terminology.

Preserve user-entered data whenever possible.

---

# 11. Empty States

Empty states shall explain:

Why nothing is displayed.

What the user can do next.

Empty states should encourage action.

---

# 12. State Preservation

The application should preserve:

Search filters

Scroll position

Workspace context

Draft forms

Navigation history

Where technically practical.

---

# 13. AI Interaction

AI-generated suggestions shall never automatically modify project data.

Users remain responsible for approving operational changes.

AI actions shall always be auditable.

---

# 14. Future Expansion

Future interaction methods may include:

Voice Commands

Gesture Navigation

AR Interaction

Digital Twin Interaction

Wearable Devices

---

# Related Documents

UI-000

UI-001

UI-002

UI-003

UI-004

UI-005

UI-007

---

# Document Status

Status

LOCKED

Version

1.0.0

Foundation Specification

---

END OF DOCUMENT
