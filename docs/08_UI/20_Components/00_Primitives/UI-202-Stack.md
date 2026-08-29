# UI-202 - Stack

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-202 |
|-------------|---------|
| Title | Stack |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Primitive Component |
| Depends On | UI-201 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Stack component provides a standard mechanism for arranging child elements along a single axis.

It eliminates manual spacing and promotes consistent layouts.

---

# 2. Objectives

The Stack component shall:

- Standardise spacing.
- Simplify alignment.
- Improve consistency.
- Reduce layout duplication.
- Support responsive direction changes.

---

# 3. Usage

Use Stack for:

Forms

Lists

Cards

Toolbars

Dialogs

Sidebars

Dashboard Sections

Do NOT use Stack:

- for two-dimensional layouts
- when Grid is more appropriate
- to simulate margins

---

# 4. Anatomy

```

Stack

├── Child

├── Child

├── Child

└── Child

```

---

# 5. Layout Behaviour

Supported concepts include:

Direction

Spacing

Alignment

Justification

Wrapping

Reversed Order

Responsive Direction

Fill Behaviour

---

# 6. Variants

Vertical Stack

Horizontal Stack

Responsive Stack

Inline Stack

---

# 7. Properties

Typical configurable properties include:

Direction

Gap

Alignment

Justification

Wrap

Reverse

Visibility

Responsive Behaviour

Implementation-specific APIs shall remain outside this specification.

---

# 8. Events

Not Applicable.

---

# 9. States

Default

Responsive

Collapsed

Hidden

---

# 10. Accessibility

The Stack component shall not interfere with the accessibility of its children.

Keyboard focus order shall follow the rendered layout.

---

# 11. Responsive Behaviour

The Stack component may change direction according to viewport size.

Spacing shall scale using Design Tokens.

---

# 12. AI Behaviour

Not Applicable.

---

# 13. Composition

```

Box

↓

Stack

↓

Button

↓

Badge

↓

Avatar

```

The Stack component shall compose existing primitives rather than replacing them.

---

# 14. Dependency Tree

```

Design Tokens

↓

Box

↓

Stack

```

---

# 15. Design Tokens

The Stack component shall consume:

Spacing Tokens

Breakpoint Tokens

Sizing Tokens

Animation Tokens (where applicable)

---

# 16. Validation Rules

Not Applicable.

---

# 17. Performance Considerations

Avoid deeply nested stacks where simpler layouts are sufficient.

Prefer a single Stack over multiple nested containers when possible.

---

# 18. Examples

Correct Usage

✓ Vertical Form Layout

✓ Toolbar

✓ Navigation List

Incorrect Usage

✗ Complex Grid Layout

✗ Business Workflow

✗ Data Processing

---

# 19. Related Components

Box

Grid

Divider

Spacer

Button

Card

---

# 20. Related Patterns

Layout Standard

Dashboard Pattern

Workspace Pattern

---

# 21. Version History

| Version | Description |
|----------|-------------|
|1.0.0|Initial Release|

---

# Document Status

LOCKED

Version 1.0.0

END OF DOCUMENT
