# UI-214 - Chip

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-214 |
|-------------|---------|
| Title | Chip |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Base Component |
| Depends On | UI-199, UI-199A, UI-199B |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Chip component represents a compact, interactive or removable item used for selection, filtering, categorisation, or displaying lightweight entities.

---

# 2. Objectives

The Chip component shall:

- Present compact selectable items.
- Support filtering.
- Support removable selections.
- Maintain visual consistency.

---

# 3. Usage

Use Chip for:

- Filters
- Assigned Users
- Selected Tags
- Categories
- Labels

Do NOT use Chip:

- As a Button replacement.
- For navigation.
- For long-form content.

---

# 4. Anatomy

Chip

├── Leading Icon (Optional)

├── Label

└── Remove Action (Optional)

---

# 5. Variants

Assist

Filter

Input

Suggestion

Choice

---

# 6. Sizes

Small

Medium

Large

---

# 7. Properties

Typical configurable properties include:

Label

Variant

Selected

Removable

Icon

Disabled

---

# 8. Events

Typical events include:

Select

Remove

Focus

Blur

---

# 9. States

Default

Selected

Focused

Disabled

Removed

---

# 10. Accessibility

Interactive Chips shall be keyboard accessible and expose appropriate roles.

---

# 11. Responsive Behaviour

Chip layout shall adapt using spacing tokens.

---

# 12. AI Behaviour

Not Applicable.

---

# 13. Composition

Filter Panel

↓

Chip

↓

Search

---

# 14. Dependency Tree

Design Tokens

↓

Chip

---

# 15. Design Tokens

Chip shall consume:

Colour Tokens

Typography Tokens

Spacing Tokens

Radius Tokens

Motion Tokens

---

# 16. Validation Rules

Chip labels shall remain concise.

---

# 17. Performance Considerations

Large chip collections should support efficient rendering.

---

# 18. Examples

Correct

✓ Discipline Filter

✓ Contractor Filter

✓ Assigned Engineer

Incorrect

✗ Paragraphs

✗ Navigation Menus

---

# 19. Related Components

Badge

Button

Search

Filter Panel

---

# 20. Related Patterns

Search Pattern

Workspace Pattern

---

# 21. Architecture Decisions

ADR-001

Decision

Chips may be interactive.

Reason

Supports filtering and lightweight user selections.

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
