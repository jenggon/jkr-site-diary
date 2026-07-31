# UI-205 - Spacer

| Document ID | UI-205 |
|-------------|---------|
| Title | Spacer |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Primitive Component |
| Depends On | UI-199, UI-199A, UI-199B |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Spacer component introduces intentional empty space between interface elements using Design Tokens instead of arbitrary values.

---

# 2. Objectives

The Spacer component shall:

- Standardise spacing.
- Improve layout consistency.
- Eliminate hardcoded spacing.
- Simplify responsive layouts.

---

# 3. Usage

Use Spacer:

- Between components.
- Between content sections.
- Between groups of controls.

Do NOT use Spacer:

- To compensate for poor layout design.
- As a replacement for Stack or Grid.

---

# 4. Anatomy

Spacer

(No child elements)

---

# 5. Variants

Fixed Spacer

Flexible Spacer

Responsive Spacer

---

# 6. Properties

Typical configurable properties include:

Size

Orientation

Responsive Behaviour

Visibility

---

# 7. Events

Not Applicable.

---

# 8. States

Visible

Hidden

---

# 9. Accessibility

Spacer shall not interfere with accessibility or keyboard navigation.

---

# 10. Responsive Behaviour

Spacing values shall adapt according to Design Tokens.

---

# 11. AI Behaviour

Not Applicable.

---

# 12. Composition

Design Tokens

↓

Spacer

↓

Layout

---

# 13. Dependency Tree

Design Tokens

↓

Spacer

---

# 14. Design Tokens

Spacer shall consume:

Spacing Tokens

Breakpoint Tokens

---

# 15. Validation Rules

Not Applicable.

---

# 16. Performance Considerations

Spacer shall have negligible rendering overhead.

---

# 17. Examples

Correct

✓ Content Separation

✓ Layout Rhythm

Incorrect

✗ Large Layout Corrections

✗ Manual Positioning

---

# 18. Related Components

Box

Stack

Grid

Divider

---

# 19. Related Patterns

Layout Standard

Workspace Pattern

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