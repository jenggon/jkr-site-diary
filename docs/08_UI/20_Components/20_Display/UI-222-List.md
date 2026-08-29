# UI-222 - List

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-222 |
|-------------|---------|
| Title | List |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Display Component |
| Depends On | UI-199, UI-199A, UI-199B, UI-202, UI-223 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The List component presents a structured collection of related items in a predictable vertical arrangement.

The List component provides the foundation for record browsing, activity feeds, navigation groups, and other ordered collections.

---

# 2. Objectives

The List component shall:

- Present collections consistently.
- Support scalable rendering.
- Maintain readability.
- Enable composition with List Item.
- Support responsive layouts.

---

# 3. Usage

Use List for:

- Site diary entries.
- Inspection records.
- Approval queues.
- Notifications.
- Activity history.
- Search results.

Do NOT use List for:

- Tabular datasets requiring multiple aligned columns.
- Dashboard layouts.
- Form layouts.

---

# 4. Anatomy

List

├── Header (Optional)

├── List Item

├── List Item

├── List Item

└── Footer (Optional)

---

# 5. Variants

Standard

Bordered

Compact

Grouped

Interactive

---

# 6. Sizes

Compact

Standard

Comfortable

---

# 7. Properties

Typical configurable properties include:

Header

Footer

Density

Dividers

Selectable

Scrollable

Empty State

Loading

---

# 8. Events

Typical events include:

Scroll

Select

Focus

Expand (where applicable)

---

# 9. States

Default

Loading

Empty

Disabled

Selected

Focused

---

# 10. Accessibility

Lists shall expose semantic list structures.

Interactive lists shall support keyboard navigation.

---

# 11. Responsive Behaviour

Lists shall adapt spacing and density using Design Tokens.

---

# 12. AI Behaviour

Not Applicable.

---

# 13. Composition

Design Tokens

↓

Stack

↓

List

↓

List Item

↓

Application

---

# 14. Dependency Tree

Design Tokens

↓

Stack

↓

List Item

↓

List

---

# 15. Design Tokens

List shall consume:

Spacing Tokens

Typography Tokens

Border Tokens

Colour Tokens

---

# 16. Validation Rules

A List shall contain one or more List Items.

Empty collections shall present an Empty State.

---

# 17. Performance Considerations

Large datasets should support virtual scrolling or pagination.

---

# 18. Examples

Correct

✓ Activity Feed

✓ Approval Queue

✓ Notifications

Incorrect

✗ Spreadsheet

✗ Dashboard Grid

---

# 19. Related Components

List Item

Card

Table

Empty State

---

# 20. Related Patterns

Search Pattern

Dashboard Pattern

Approval Pattern

---

# 21. Architecture Decisions

ADR-001

Decision

Lists contain List Items only.

Reason

Keeps hierarchy predictable.

ADR-002

Decision

Large Lists should support virtualization.

Reason

Improves scalability.

---

# 22. Version History

| Version | Description |
|----------|-------------|
|1.0.0|Initial Release|

---

# Document Status

LOCKED

Version 1.0.0

END OF DOCUMENT
