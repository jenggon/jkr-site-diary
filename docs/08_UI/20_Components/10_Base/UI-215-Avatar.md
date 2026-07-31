# UI-215 - Avatar

| Document ID | UI-215 |
|-------------|---------|
| Title | Avatar |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Base Component |
| Depends On | UI-199, UI-199A, UI-199B |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Avatar component visually represents a person, organisation, team, or system entity throughout the JKR Site Diary Platform.

It provides immediate visual identification while maintaining consistent appearance across modules.

---

# 2. Objectives

The Avatar component shall:

- Represent users and entities consistently.
- Support image and non-image representations.
- Maintain recognisable sizing.
- Support accessibility.
- Integrate seamlessly with other components.

---

# 3. Usage

Use Avatar for:

- User profiles
- Engineers
- Contractors
- Approvers
- Teams
- Organisations

Do NOT use Avatar:

- As decorative artwork.
- As a replacement for logos.
- As a navigation control.

---

# 4. Anatomy

Avatar

├── Image (Optional)

├── Initials (Fallback)

├── Icon (Fallback)

└── Status Indicator (Optional)

---

# 5. Variants

Image

Initials

Icon

Group Avatar

---

# 6. Sizes

Extra Small

Small

Medium

Large

Extra Large

---

# 7. Properties

Typical configurable properties include:

Image

Initials

Fallback Icon

Shape

Size

Status Indicator

Accessibility Label

---

# 8. Events

Typical events include:

Focus

Hover

Activate (Optional)

---

# 9. States

Default

Loading

Unavailable

Disabled

Online

Offline

Busy

---

# 10. Accessibility

Avatars shall expose meaningful accessible names.

Decorative avatars shall be ignored by assistive technologies.

---

# 11. Responsive Behaviour

Avatar sizing shall follow Design Tokens.

---

# 12. AI Behaviour

Not Applicable.

---

# 13. Composition

Design Tokens

↓

Avatar

↓

User Card

↓

Approval Panel

↓

Comments

---

# 14. Dependency Tree

Design Tokens

↓

Avatar

---

# 15. Design Tokens

Avatar shall consume:

Colour Tokens

Typography Tokens

Spacing Tokens

Radius Tokens

Sizing Tokens

---

# 16. Validation Rules

When no image exists, a fallback representation shall be displayed.

---

# 17. Performance Considerations

Large avatar collections should support efficient rendering.

---

# 18. Examples

Correct

✓ Site Engineer

✓ Resident Engineer

✓ Contractor

Incorrect

✗ Company Logo

✗ Decorative Image

---

# 19. Related Components

Badge

Card

Comment

User Profile

---

# 20. Related Patterns

Approval Pattern

Workspace Pattern

Communication Pattern

---

# 21. Architecture Decisions

ADR-001

Decision

Every Avatar shall provide a fallback representation.

Reason

Guarantees visual consistency regardless of image availability.

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