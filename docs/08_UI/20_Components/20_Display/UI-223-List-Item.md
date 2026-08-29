# UI-223 - List Item

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-223 |
|-------------|---------|
| Title | List Item |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Display Component |
| Depends On | UI-202, UI-210, UI-213, UI-215, UI-216, UI-220 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The List Item component represents a single logical entry within a List.

It serves as a reusable presentation container capable of displaying content, metadata, status, and optional actions.

---

# 2. Objectives

The List Item component shall:

- Present a single record consistently.
- Support rich content composition.
- Enable optional interactions.
- Preserve accessibility.
- Remain independent of business logic.

---

# 3. Usage

Use List Item for:

- Site diary record.
- Inspection entry.
- Approval request.
- Notification.
- Comment.
- Search result.

Do NOT use List Item:

- Outside a List unless explicitly justified.
- As a Card replacement.
- For tabular layouts.

---

# 4. Anatomy

List Item

├── Leading Content
│     ├── Avatar (Optional)
│     └── Icon (Optional)

├── Primary Content
│     ├── Title
│     ├── Subtitle
│     └── Metadata

├── Supporting Content (Optional)

└── Trailing Actions (Optional)

---

# 5. Variants

Standard

Interactive

Selectable

Compact

Dense

---

# 6. Sizes

Compact

Standard

Comfortable

---

# 7. Properties

Typical configurable properties include:

Title

Subtitle

Metadata

Leading Content

Trailing Actions

Selected

Disabled

Divider

---

# 8. Events

Typical events include:

Select

Activate

Focus

Expand

Hover

---

# 9. States

Default

Hover

Focused

Selected

Expanded

Disabled

Loading

---

# 10. Accessibility

Interactive List Items shall support keyboard navigation and expose meaningful accessible names.

---

# 11. Responsive Behaviour

List Items shall stack secondary content appropriately on smaller screens while maintaining readability.

---

# 12. AI Behaviour

Not Applicable.

---

# 13. Composition

Design Tokens

↓

Stack

↓

Avatar / Icon

↓

Badge

↓

Button

↓

List Item

↓

List

---

# 14. Dependency Tree

Design Tokens

↓

Stack

↓

Avatar

↓

Icon

↓

Badge

↓

Button

↓

List Item

---

# 15. Design Tokens

List Item shall consume:

Spacing Tokens

Typography Tokens

Colour Tokens

Border Tokens

Motion Tokens

---

# 16. Validation Rules

Each List Item shall contain one primary content area.

Trailing actions shall not obscure primary information.

---

# 17. Performance Considerations

Support efficient rendering in long lists.

Avoid unnecessary nested layouts.

---

# 18. Examples

Correct

✓ Site Diary Entry

✓ Approval Record

✓ Notification

✓ Inspection Item

Incorrect

✗ Standalone Page Layout

✗ Spreadsheet Row

---

# 19. Related Components

List

Card

Avatar

Badge

Button

Icon

---

# 20. Related Patterns

Approval Pattern

Search Pattern

Workspace Pattern

---

# 21. Architecture Decisions

ADR-001

Decision

List Items remain presentation components.

Reason

Business workflows belong to parent modules.

ADR-002

Decision

Trailing actions are optional.

Reason

Many records are read-only.

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
