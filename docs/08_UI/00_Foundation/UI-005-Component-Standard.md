# UI-005 - Component Standard

| Document ID | UI-005 |
|-------------|---------|
| Title | Component Standard |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | UI Foundation |
| Depends On | UI-000, UI-000A, UI-001, UI-002, UI-003, UI-004 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

This document defines the engineering standards for reusable UI components used throughout the JKR Site Diary Platform.

Components are the smallest reusable building blocks of the user interface.

Every page shall be composed from standard components.

No page-specific components shall be introduced unless approved through architectural review.

---

# 2. Objectives

The Component Standard shall:

- Maximise reusability.
- Ensure consistency.
- Reduce duplication.
- Improve maintainability.
- Simplify AI-assisted development.
- Support future scalability.

---

# 3. Component Philosophy

A component represents one responsibility.

A component should do one thing well.

Components shall not contain page-specific business logic.

Business logic belongs to the application layer.

Presentation belongs to the Design System.

---

# 4. Component Lifecycle

Every reusable component follows the lifecycle below.

Design

↓

Specification

↓

Development

↓

Testing

↓

Release

↓

Maintenance

↓

Deprecation

Components shall remain backward compatible whenever reasonably possible.

---

# 5. Component Categories

The platform defines the following component groups.

### Navigation

- Sidebar
- Navigation Rail
- Breadcrumb
- Tabs
- Command Palette

---

### Input

- Text Input
- Search
- Select
- Combobox
- Date Picker
- Time Picker
- Checkbox
- Radio
- Toggle

---

### Action

- Button
- Split Button
- Floating Action Button
- Quick Action
- Menu

---

### Feedback

- Toast
- Alert
- Snackbar
- Progress
- Skeleton
- Status Chip

---

### Display

- Card
- KPI Tile
- Timeline
- Table
- Chart
- Avatar
- Badge

---

### Overlay

- Dialog
- Drawer
- Popover
- Context Menu

---

### Media

- Photo Viewer
- Attachment Viewer
- Gallery
- Camera Preview

---

# 6. Component States

Every interactive component shall support:

Default

Hover

Pressed

Focused

Disabled

Loading

Error

Success

Read Only

Unavailable

---

# 7. Component Rules

Every component shall:

Use Design Tokens.

Support Dark Theme.

Support Light Theme.

Support keyboard navigation.

Support touch interaction.

Remain responsive.

Support accessibility.

Expose predictable behaviour.

---

# 8. Component API Principles

Each component shall expose:

Properties

Events

States

Slots

Accessibility attributes

Components should never expose implementation details.

---

# 9. Composition Rules

Pages compose components.

Components compose primitives.

Primitives consume Design Tokens.

No page shall bypass the component architecture.

---

# 10. Naming Convention

Component names shall use PascalCase.

Examples

ActivityCard

ProgressTimeline

ApprovalDrawer

WeatherWidget

PhotoGallery

SearchBox

StatusBadge

---

# 11. Future Expansion

Future components may include:

AI Suggestion Card

Digital Twin Viewer

BIM Viewer

GIS Viewer

AR Overlay

Voice Assistant

---

# Related Documents

UI-000

UI-000A

UI-001

UI-002

UI-003

UI-004

UI-006

---

# Document Status

Status

LOCKED

Version

1.0.0

Foundation Specification

---

END OF DOCUMENT