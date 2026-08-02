# UI-204 - Divider

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-204 |
|-------------|---------|
| Title | Divider |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Primitive Component |
| Depends On | UI-199, UI-199A, UI-199B |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Divider component visually separates related content into logical groups while maintaining readability and information hierarchy.

---

# 2. Objectives

The Divider component shall:

- Improve visual organisation.
- Separate related content.
- Reinforce information hierarchy.
- Reduce visual clutter.

---

# 3. Usage

Use Divider:

- Between form sections.
- Between cards.
- Between navigation items.
- Inside menus.
- Inside dialogs.

Do NOT use Divider:

- Solely for decorative purposes.
- As a spacing mechanism.

---

# 4. Anatomy

Divider

Optional Label

Optional Inset

---

# 5. Variants

Horizontal

Vertical

Inset

Labelled

---

# 6. Properties

Typical configurable properties include:

Orientation

Inset

Thickness

Visibility

Decorative Label

---

# 7. Events

Not Applicable.

---

# 8. States

Visible

Hidden

Disabled (Visual)

---

# 9. Accessibility

Decorative dividers shall be ignored by assistive technologies.

Labelled dividers shall expose meaningful semantics where appropriate.

---

# 10. Responsive Behaviour

Divider orientation may change according to layout.

---

# 11. AI Behaviour

Not Applicable.

---

# 12. Composition

Box

↓

Divider

↓

Content

---

# 13. Dependency Tree

Design Tokens

↓

Divider

---

# 14. Design Tokens

Divider shall consume:

Border Tokens

Spacing Tokens

Colour Tokens

---

# 15. Validation Rules

Not Applicable.

---

# 16. Performance Considerations

Divider shall remain lightweight.

---

# 17. Examples

Correct

✓ Section Separation

✓ Menu Separation

✓ Form Groups

Incorrect

✗ Decorative Lines

✗ Manual Layout Control

---

# 18. Related Components

Box

Stack

Grid

Card

---

# 19. Related Patterns

CRUD Pattern

Dashboard Pattern

---

# 20. Version History

| Version | Description |
|----------|-------------|
|1.0.0|Initial Release|

---

# Document Status

LOCKED

Version 1.0.0

END OF DOCUMENT
