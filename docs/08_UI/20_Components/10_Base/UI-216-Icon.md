# UI-216 - Icon

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-216 |
|-------------|---------|
| Title | Icon |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Base Component |
| Depends On | UI-199, UI-199A, UI-199B |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Icon component provides a standardised visual symbol used to communicate actions, status, navigation, entities, and contextual information.

Icons supplement content but shall not replace meaningful text unless universally understood.

---

# 2. Objectives

The Icon component shall:

- Standardise iconography.
- Improve visual recognition.
- Support accessibility.
- Maintain consistency across modules.
- Integrate with all interactive components.

---

# 3. Usage

Use Icon for:

- Buttons
- Navigation
- Status indicators
- Alerts
- File types
- User actions
- System feedback

Do NOT use Icon:

- As decoration without meaning.
- As the sole communication of critical information.
- As a replacement for descriptive labels where clarity is required.

---

# 4. Anatomy

Icon

(Optional Accessibility Label)

---

# 5. Variants

Filled

Outlined

Rounded

Two-Tone

Custom (Approved Only)

All icons within a screen shall use the same visual family unless an approved exception exists.

---

# 6. Sizes

Extra Small

Small

Medium

Large

Extra Large

Sizing shall be token-driven.

---

# 7. Properties

Typical configurable properties include:

Icon Name

Size

Colour

Rotation

Accessibility Label

Decorative

---

# 8. Events

Not Applicable.

Interactive behaviour shall be provided by the parent component.

---

# 9. States

Default

Disabled

Highlighted

Active

---

# 10. Accessibility

Decorative icons shall be hidden from assistive technologies.

Meaningful icons shall expose an accessible label or be accompanied by descriptive text.

---

# 11. Responsive Behaviour

Icons shall scale according to Design Tokens without losing legibility.

---

# 12. AI Behaviour

Not Applicable.

---

# 13. Composition

Design Tokens

↓

Icon

↓

Button

↓

Toolbar

↓

Navigation

↓

Application

---

# 14. Dependency Tree

Design Tokens

↓

Icon

---

# 15. Design Tokens

Icon shall consume:

Colour Tokens

Sizing Tokens

Motion Tokens

---

# 16. Validation Rules

Icons shall belong to the approved icon library.

Custom icons require design review and approval.

---

# 17. Performance Considerations

Vector-based rendering shall be preferred.

Duplicate icon assets shall be avoided.

---

# 18. Examples

Correct

✓ Save

✓ Search

✓ Delete

✓ Settings

Incorrect

✗ Mixed icon families

✗ Decorative overuse

---

# 19. Related Components

Button

Icon Button

Link

Avatar

Badge

Chip

Navigation

---

# 20. Related Patterns

Navigation Pattern

CRUD Pattern

Workspace Pattern

---

# 21. Architecture Decisions

ADR-001

Decision

A single approved icon family shall be used throughout the platform.

Reason

Ensures visual consistency and reduces maintenance complexity.

ADR-002

Decision

Icons shall complement, not replace, meaningful text unless the meaning is universally recognised.

Reason

Improves accessibility and usability.

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
