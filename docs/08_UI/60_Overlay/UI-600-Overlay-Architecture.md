# UI-600 - Overlay Architecture

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-600 |
|-------------|---------|
| Title | Overlay Architecture |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Overlay Foundation |
| Component Tier | Architecture |
| Depends On | UI-199, UI-300, UI-400 |
| Last Updated | 1 August 2026 |

---

# 1. Purpose

Defines the architecture governing all overlay components within the JKR Site Diary platform.

Overlay components temporarily appear above the current interface to request user interaction or present contextual information.

---

# 2. Objectives

The Overlay Architecture shall:

- Minimise workflow interruption.
- Maintain context.
- Prevent accidental dismissal.
- Support accessibility.
- Support keyboard navigation.
- Support responsive layouts.

---

# 3. Scope

This architecture governs:

- Modal
- Dialog
- Drawer
- Popover
- Tooltip
- Dropdown
- Context Overlay
- Command Palette

---

# 4. Design Principles

## Context Preservation

Users shall understand the relationship between the overlay and the underlying content.

---

## Minimal Interruption

Only overlays requiring immediate attention shall block interaction.

---

## Accessibility

All overlays shall support focus management and screen readers.

---

## Mobile First

Overlay behaviour shall adapt appropriately to mobile devices.

---

# 5. Accessibility

Overlay components shall:

- trap focus where required
- restore focus after closing
- support Escape key dismissal where appropriate
- expose semantic dialog roles

---

# 6. Related Documents

- UI-610 Modal
- UI-611 Dialog
- UI-612 Drawer
- UI-613 Popover

---

# Version History

| Version | Description |
|----------|-------------|
|1.0.0|Initial Release|

---

LOCKED
