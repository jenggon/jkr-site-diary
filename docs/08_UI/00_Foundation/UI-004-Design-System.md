# UI-004 - Design System

| Document ID | UI-004 |
|-------------|---------|
| Title | Design System |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | UI Foundation |
| Depends On | UI-000, UI-000A, UI-001, UI-002, UI-003 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

This document defines the Design System of the JKR Site Diary Platform.

The Design System transforms the principles defined in the Construction Operations Experience (COX) into reusable interface building blocks.

It ensures every screen shares the same visual language, behaviour and operational consistency.

---

# 2. Objectives

The Design System shall:

- Ensure visual consistency.
- Improve development speed.
- Promote component reuse.
- Reduce design duplication.
- Improve maintainability.
- Support AI-assisted interface generation.

---

# 3. Design System Hierarchy

Construction Operations Experience

↓

Design Tokens

↓

Design System

↓

Components

↓

Pages

↓

Application

---

# 4. Design Principles

Every component shall follow these principles.

## Operational First

Support construction workflows before aesthetics.

---

## Consistency

Equivalent actions shall always look and behave consistently.

---

## Predictability

Users should recognise interactions immediately.

---

## Clarity

Reduce ambiguity.

Increase confidence.

---

## Simplicity

Prefer fewer controls with clearer purpose.

---

# 5. Component Categories

The Design System consists of the following categories.

### Foundation

- Colours
- Typography
- Spacing
- Elevation
- Radius
- Motion

---

### Inputs

- Text Input
- Search
- Combobox
- Select
- Checkbox
- Radio
- Date Picker
- Time Picker

---

### Navigation

- Sidebar
- Breadcrumb
- Tabs
- Command Palette
- Navigation Rail

---

### Feedback

- Toast
- Alert
- Progress
- Loading
- Skeleton
- Badge

---

### Display

- Card
- Table
- Timeline
- Chart
- KPI Tile
- Avatar
- Status Indicator

---

### Overlay

- Dialog
- Drawer
- Popover
- Context Menu

---

# 6. Component Rules

Every component shall:

- Have a single responsibility.
- Support keyboard navigation.
- Support touch interaction.
- Be responsive.
- Follow Design Tokens.
- Support dark and light themes.

---

# 7. Composition Rules

Pages shall be composed from components.

Components shall not contain page-specific logic.

Business rules belong to application logic.

Visual rules belong to the Design System.

---

# 8. Theming

The platform supports:

- Dark Theme (Primary)
- Light Theme
- Future High Contrast Theme

Theme changes shall not alter component behaviour.

Only presentation.

---

# 9. Accessibility

Every component shall support:

- Keyboard navigation.
- Screen reader compatibility.
- Visible focus state.
- Minimum touch target.
- Colour-independent status indication.

Detailed requirements are specified in UI-007.

---

# 10. AI Compatibility

Components shall expose predictable interfaces suitable for AI interaction.

AI-generated actions shall:

- Use standard components.
- Respect operational context.
- Preserve auditability.

---

# 11. Future Expansion

Future component groups may include:

- BIM Viewer
- GIS Viewer
- Digital Twin Panel
- AI Workspace
- AR Overlay

---

# Related Documents

UI-000

UI-000A

UI-001

UI-002

UI-003

UI-005

UI-006

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