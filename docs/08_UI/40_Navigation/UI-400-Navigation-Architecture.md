# UI-400 - Navigation Architecture

| Document ID | UI-400 |
|-------------|---------|
| Title | Navigation Architecture |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Navigation Foundation |
| Component Tier | Architecture |
| Template | Enterprise Architecture Specification |
| Depends On | UI-199, UI-200, UI-300 |
| Last Updated | 1 August 2026 |

---

# 1. Purpose

This document defines the navigation architecture for the JKR Site Diary platform.

It establishes a unified navigation system that enables users to move efficiently between modules while maintaining consistency, accessibility and scalability across desktop, tablet and mobile devices.

All navigation components shall comply with this architecture.

---

# 2. Objectives

The Navigation Architecture shall:

- Provide consistent navigation patterns.
- Minimise navigation complexity.
- Reduce user cognitive load.
- Support responsive layouts.
- Support role-based navigation.
- Maintain accessibility compliance.
- Support future module expansion.

---

# 3. Scope

This architecture governs:

- Primary Navigation
- Secondary Navigation
- Side Navigation
- Top Navigation
- Bottom Navigation
- Breadcrumb
- Tabs
- Pagination
- Command Navigation

---

# 4. Design Principles

## Consistency

Navigation shall remain predictable throughout the application.

---

## Discoverability

Users shall always know:

- where they are
- where they can go
- how to return

---

## Simplicity

Navigation depth shall be minimised.

Avoid unnecessary nesting.

---

## Progressive Disclosure

Only relevant navigation options shall be displayed.

---

## Mobile First

Navigation shall function effectively on mobile before desktop enhancements.

---

# 5. Navigation Hierarchy

```
Application

↓

Primary Navigation

↓

Module

↓

Workspace

↓

Page

↓

Action
```

---

# 6. Navigation Types

Supported navigation includes:

- Side Navigation
- Top Navigation
- Bottom Navigation
- Breadcrumb
- Tabs
- Pagination
- Command Palette

---

# 7. Standard Behaviour

Navigation components shall support:

- Current Location
- Active State
- Hover State
- Keyboard Navigation
- Deep Linking
- History Navigation
- Responsive Collapse

---

# 8. Accessibility

Navigation shall:

- support keyboard navigation
- expose semantic landmarks
- maintain visible focus
- support screen readers
- avoid keyboard traps

---

# 9. Role-Based Navigation

Navigation visibility shall support permission-based rendering.

Examples:

- Administrator
- Project Director
- Resident Engineer
- Clerk of Works
- Contractor
- Read Only User

Navigation permissions shall remain independent from visual rendering.

---

# 10. Performance

Navigation shall:

- load rapidly
- avoid unnecessary rendering
- support lazy-loaded modules
- preserve navigation state

---

# 11. Related Documents

- UI-401 Navigation Bar
- UI-402 Side Navigation
- UI-403 Top Navigation
- UI-404 Bottom Navigation
- UI-405 Breadcrumb
- UI-406 Tabs

---

# 12. Version History

| Version | Description |
|----------|-------------|
|1.0.0|Initial Release|

---

# Document Status

Status

LOCKED

Version

1.0.0

Classification

Architecture Foundation

END OF DOCUMENT