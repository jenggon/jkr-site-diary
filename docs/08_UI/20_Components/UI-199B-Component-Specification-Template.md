# UI-199B - Component Specification Template

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-199B |
|-------------|----------|
| Title | Component Specification Template |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Components |
| Depends On | UI-199, UI-199A |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

This document defines the mandatory specification template for every reusable UI component within the JKR Site Diary Platform.

The objective is to ensure every component is documented consistently regardless of complexity, author or implementation timeline.

No reusable component shall be published without conforming to this specification.

---

# 2. Scope

This template applies to:

- Primitive Components
- Base Components
- Complex Components
- Business Components
- AI Components

---

# 3. Standard Document Structure

Every component specification shall contain the following sections.

---

## Document Information

Document ID

Title

Version

Status

Category

Depends On

Last Updated

---

## 1. Purpose

Describe the role of the component.

State the problem solved.

---

## 2. Objectives

List the primary objectives.

Examples:

Consistency

Accessibility

Reusability

Responsiveness

---

## 3. Usage

Describe when the component should be used.

Describe when it should not be used.

Provide usage guidance.

---

## 4. Variants

List every supported variant.

Example:

Primary

Secondary

Danger

Ghost

Outline

Future variants shall be added through version updates.

---

## 5. Anatomy

Describe the structural elements.

Example:

Container

Leading Icon

Label

Trailing Icon

Badge

Supporting Text

---

## 6. Properties

Document every configurable property.

Each property should include:

Name

Purpose

Type

Required

Default Behaviour

Remarks

---

## 7. Events

Document every event emitted by the component.

Each event should include:

Name

Trigger

Expected Behaviour

Consumer Responsibility

---

## 8. States

Describe every supported visual and interaction state.

Examples:

Default

Hover

Focused

Pressed

Loading

Disabled

Error

Selected

Read Only

---

## 9. Accessibility

Document:

Keyboard Behaviour

Focus Behaviour

Screen Reader Notes

Semantic Roles

ARIA Requirements

Accessibility exceptions (if any)

---

## 10. Responsive Behaviour

Describe behaviour across:

Desktop

Tablet

Mobile

Specify any layout adaptations.

---

## 11. AI Behaviour

Where applicable, describe:

AI recommendations

AI generated content

AI interaction

AI restrictions

Components without AI behaviour shall explicitly state:

Not Applicable.

---

## 12. Composition

Describe how the component composes or depends on other components.

Example:

Card

↓

Button

↓

Badge

↓

Avatar

Avoid duplicated functionality.

---

## 13. Design Tokens

List applicable design token categories.

Examples:

Colour

Typography

Spacing

Border Radius

Shadow

Animation

Components shall reference tokens instead of hardcoded values.

---

## 14. Validation Rules

Where applicable, describe:

Input validation

Visual validation

Error presentation

Recovery behaviour

If validation does not apply, state:

Not Applicable.

---

## 15. Performance Considerations

Document known performance considerations.

Examples:

Virtualisation

Lazy Loading

Memoisation

Large Dataset Handling

If none exist, state:

No special considerations.

---

## 16. Examples

Provide representative examples illustrating correct usage.

Examples should remain implementation-independent.

Framework-specific code shall not appear in UI specifications.

---

## 17. Related Components

List components commonly used together.

Example:

Button

Icon

Tooltip

Dialog

---

## 18. Related Patterns

Reference applicable User Pattern documents.

Example:

CRUD Pattern

Search Pattern

Approval Pattern

---

## 19. Version History

Document significant specification changes.

Example:

| Version | Description |
|----------|-------------|
| 1.0.0 | Initial Release |

---

## Document Status

Status

LOCKED

Version

1.0.0

END OF DOCUMENT
