# UI-211 - Icon Button

| Document ID | UI-211 |
|-------------|---------|
| Title | Icon Button |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Base Component |
| Depends On | UI-210, UI-216 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Icon Button component provides compact user actions represented primarily by an icon.

It is intended for high-frequency actions where space is limited and the action is universally recognisable.

---

# 2. Objectives

The Icon Button component shall:

- Minimise visual footprint.
- Preserve accessibility.
- Support consistent interaction behaviour.
- Compose seamlessly with the Button and Icon components.

---

# 3. Usage

Use Icon Button for:

- Close
- Back
- Edit
- Delete
- Refresh
- Search
- Settings

Do NOT use Icon Button when the action is ambiguous or requires explanatory text.

---

# 4. Anatomy

Icon Button

├── Icon (Required)

└── Accessible Label (Required)

---

# 5. Variants

Primary

Secondary

Ghost

Danger

---

# 6. Sizes

Small

Medium

Large

---

# 7. Properties

Typical configurable properties include:

Icon

Variant

Size

Disabled

Loading

Tooltip

Accessibility Label

---

# 8. Events

Typical events include:

Activate

Focus

Blur

Hover

---

# 9. States

Default

Hover

Focused

Pressed

Loading

Disabled

---

# 10. Accessibility

Every Icon Button shall expose an accessible label.

An icon alone is not sufficient for assistive technologies.

---

# 11. Responsive Behaviour

The Icon Button shall maintain a minimum touch target across all supported devices.

---

# 12. AI Behaviour

Not Applicable.

---

# 13. Composition

Design Tokens

↓

Box

↓

Button

↓

Icon

↓

Icon Button

---

# 14. Dependency Tree

Design Tokens

↓

Box

↓

Button

↓

Icon

↓

Icon Button

---

# 15. Design Tokens

The Icon Button shall consume:

Colour Tokens

Spacing Tokens

Typography Tokens (where applicable)

Radius Tokens

Motion Tokens

---

# 16. Validation Rules

The Icon Button shall not be published without an accessible label.

---

# 17. Performance Considerations

The component shall remain lightweight and optimise icon rendering.

---

# 18. Examples

Correct

✓ Close Dialog

✓ Refresh List

✓ Open Search

Incorrect

✗ Unlabelled destructive action

✗ Multi-step workflow

---

# 19. Related Components

Button

Icon

Toolbar

Dialog

---

# 20. Related Patterns

CRUD Pattern

Workspace Pattern

---

# 21. Version History

| Version | Description |
|----------|-------------|
| 1.0.0 | Initial Release |

---

# Document Status

LOCKED

Version 1.0.0

END OF DOCUMENT