# UI-199 - Component Architecture

| Document ID | UI-199 |
|-------------|---------|
| Title | Component Architecture |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Components |
| Depends On | UI-000A, UI-004, UI-005, UI-005A, UI-006 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

This document defines the architectural principles governing all reusable UI components within the JKR Site Diary Platform.

Every component shall conform to this architecture before implementation.

The objective is to ensure a scalable, maintainable and predictable component ecosystem.

---

# 2. Objectives

The Component Architecture shall:

- Standardise component design.
- Promote composition over duplication.
- Encourage reuse.
- Simplify maintenance.
- Support AI-assisted development.
- Support future scalability.

---

# 3. Architecture Hierarchy

Every UI element belongs to one of the following layers.

```

Design Tokens

↓

Primitive Components

↓

Base Components

↓

Complex Components

↓

Business Components

↓

Pages

```

No layer may bypass the layer beneath it.

---

# 4. Component Categories

## 4.1 Primitive Components

Primitive components provide layout only.

Examples:

Box

Stack

Grid

Spacer

Divider

Primitives shall contain no business logic.

---

## 4.2 Base Components

Base components provide fundamental UI interactions.

Examples:

Button

Badge

Chip

Avatar

Icon

Link

Base components shall remain generic.

---

## 4.3 Complex Components

Complex components combine multiple base components.

Examples:

Table

Search Box

Timeline

Dialog

Drawer

Form

Calendar

Map

Complex components may manage presentation state but shall not contain business rules.

---

## 4.4 Business Components

Business components represent reusable operational concepts.

Examples:

Activity Card

Approval Panel

Weather Widget

Progress Summary

Attachment Viewer

Site Diary Entry

Business components may compose multiple complex components.

Business components shall remain reusable across modules.

---

# 5. Composition Principle

Components shall be composed.

Components shall not be duplicated.

Example

Activity Card

=

Card

+

Status Badge

+

Timeline

+

Action Buttons

+

Avatar

rather than implementing custom layouts repeatedly.

---

# 6. Business Logic

Business logic shall never reside inside UI components.

Components receive data.

Components emit events.

Application services process business logic.

---

# 7. State Ownership

Component state shall remain minimal.

Examples:

Expanded

Collapsed

Selected

Hovered

Focused

Loading

Business state belongs to application stores.

---

# 8. Standard Properties

All interactive components should support where applicable:

variant

size

disabled

loading

readonly

required

error

className

id

style

aria-label

Additional properties shall be documented individually.

---

# 9. Standard Events

Events shall use predictable naming.

Examples:

onClick

onChange

onSelect

onSubmit

onCancel

onOpen

onClose

onDelete

Custom event names should be avoided unless domain-specific.

---

# 10. Accessibility

Every component shall:

Support keyboard navigation.

Expose semantic roles.

Provide accessible labels.

Respect focus management.

Follow UI-007 Accessibility Standard.

---

# 11. Responsiveness

Components shall adapt to:

Desktop

Tablet

Mobile

Responsive behaviour shall be intrinsic to the component.

Pages should not implement device-specific logic where avoidable.

---

# 12. Theming

Every component shall consume Design Tokens.

Components shall never hardcode:

Colours

Spacing

Typography

Border Radius

Elevation

Animations

---

# 13. Folder Structure

```

components/

00-primitives/

10-base/

20-display/

30-data-entry/

40-overlay/

50-feedback/

60-navigation/

70-business/

80-ai/

```

Component naming shall follow PascalCase.

---

# 14. Testing

Every reusable component should support:

Unit Tests

Accessibility Tests

Visual Regression

Interaction Tests

Future automated testing should reference component IDs.

---

# 15. Documentation

Every reusable component shall include:

Purpose

Properties

Events

States

Accessibility Notes

Usage Examples

Related Components

Version History

---

# 16. AI Compatibility

Components shall expose predictable interfaces suitable for AI-assisted interaction.

AI-generated UI shall compose existing components.

AI shall never generate undocumented component behaviour.

---

# 17. Future Expansion

Future component categories may include:

BIM Viewer

Digital Twin Components

GIS Components

AR Components

Voice Components

---

# Related Documents

UI-004

UI-005

UI-005A

UI-006

UI-200+

---

# Document Status

Status

LOCKED

Version

1.0.0

Component Architecture Specification

---

END OF DOCUMENT