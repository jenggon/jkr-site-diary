# UI-002 - Layout Standard

| Document ID | UI-002 |
|-------------|---------|
| Title | Layout Standard |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | UI Foundation |
| Depends On | UI-000, UI-000A, UI-001 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

This document defines the structural layout system used throughout the JKR Site Diary Platform.

The objective is to ensure every page shares a common visual rhythm, predictable structure and consistent operational workflow.

Users should never need to relearn page layouts.

---

# 2. Layout Philosophy

The layout shall prioritise operational efficiency.

Every page shall:

- Preserve operational context.
- Reduce navigation effort.
- Maximise usable workspace.
- Present information hierarchically.
- Scale across all supported devices.

Layouts exist to support work.

Not decoration.

---

# 3. Layout Hierarchy

Every interface follows the same structural hierarchy.

Application

↓

Workspace

↓

Page

↓

Section

↓

Panel

↓

Component

↓

Content

Each level has a clearly defined responsibility.

---

# 4. Standard Page Structure

Every page shall follow this order.

Header

↓

Context Bar

↓

Primary Workspace

↓

Secondary Workspace (Optional)

↓

Action Layer

↓

Status Layer

↓

Footer (Optional)

---

## Header

Contains:

- Page Title
- Global Search
- Notifications
- User Menu

---

## Context Bar

Displays:

- Current Project
- Current Revision
- Current Module
- Date
- Operational Status

The Context Bar shall remain visible during navigation.

---

## Primary Workspace

The Primary Workspace contains the main operational task.

Examples:

Activity List

Site Diary

Programme

Dashboard

Inspection

---

## Secondary Workspace

Contains supporting information.

Examples:

Statistics

Attachments

Recent Activity

Timeline

Photos

Approval Status

---

# 5. Workspace Rules

Only one Primary Workspace is permitted per page.

Supporting information shall never compete visually with the Primary Workspace.

Primary actions shall always remain visible.

---

# 6. Panel Standard

Panels are the fundamental building blocks of every page.

Panels shall:

- Group related information.
- Provide clear boundaries.
- Maintain consistent spacing.
- Preserve alignment.

Panels shall never exist solely for decoration.

---

# 7. Card Standard

Cards represent individual operational entities.

Examples:

Activity

Task

Inspection

Issue

Approval

Photo

Cards shall:

- Present concise information.
- Highlight operational status.
- Support contextual actions.

---

# 8. Split Layout

Large desktop screens may use split layouts.

Example

Left

Project Tree

↓

Right

Operational Workspace

The split ratio should favour operational content.

---

# 9. Responsive Behaviour

Phone

Single column.

Tablet

Adaptive dual-column.

Desktop

Multi-panel workspace.

Wide Screen

Expanded operational dashboard.

Features shall remain functionally identical across all layouts.

---

# 10. Scrolling Rules

The page shall avoid nested scrolling whenever practical.

Primary content should own scrolling behaviour.

Sticky headers shall preserve operational awareness.

---

# 11. Empty States

An empty page shall explain:

Why no data exists.

What action should be taken.

How to continue.

Empty states shall never appear broken.

---

# 12. Loading States

Loading shall prioritise perceived performance.

Skeleton loading is preferred.

Critical operational context shall render before detailed content.

---

# 13. Error States

Errors shall communicate:

What happened.

Why.

Recommended action.

Technical messages shall be hidden unless required.

---

# 14. Future Expansion

Future layout patterns may include:

- Digital Twin Workspace
- BIM Workspace
- GIS Workspace
- AI Workspace

All future layouts shall remain compatible with this document.

---

# Related Documents

UI-000

UI-000A

UI-001

UI-003

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