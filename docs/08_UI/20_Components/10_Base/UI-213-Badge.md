# UI-213 - Badge

| Document ID | UI-213 |
|-------------|---------|
| Title | Badge |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Base Component |
| Depends On | UI-199, UI-199A, UI-199B |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Badge component presents compact, non-interactive status or quantitative information associated with another component.

---

# 2. Objectives

The Badge component shall:

- Highlight important information.
- Communicate status at a glance.
- Remain visually unobtrusive.
- Support consistent status representation.

---

# 3. Usage

Use Badge for:

- Status
- Count
- Notifications
- Priority
- Progress indicators

Do NOT use Badge:

- As a Button.
- As a navigation control.
- For long text.

---

# 4. Anatomy

Badge

├── Label

└── Optional Icon

---

# 5. Variants

Neutral

Info

Success

Warning

Danger

Primary

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

Icon

Maximum Count

Visibility

---

# 8. Events

Not Applicable.

---

# 9. States

Visible

Hidden

Disabled (Visual)

---

# 10. Accessibility

Badge information shall be available to assistive technologies where it conveys meaningful information.

---

# 11. Responsive Behaviour

Badge shall scale according to typography tokens.

---

# 12. AI Behaviour

Not Applicable.

---

# 13. Composition

Card

↓

Badge

↓

Status

---

# 14. Dependency Tree

Design Tokens

↓

Badge

---

# 15. Design Tokens

Badge shall consume:

Colour Tokens

Typography Tokens

Spacing Tokens

Radius Tokens

---

# 16. Validation Rules

Badge labels shall remain concise.

---

# 17. Performance Considerations

Badge rendering shall remain lightweight.

---

# 18. Examples

Correct

✓ Pending

✓ Approved

✓ 12 Notifications

Incorrect

✗ Multi-line descriptions

✗ Buttons

---

# 19. Related Components

Chip

Button

Card

Table

---

# 20. Related Patterns

Dashboard Pattern

Approval Pattern

---

# 21. Architecture Decisions

ADR-001

Decision

Badges remain non-interactive.

Reason

Preserves semantic distinction from Buttons and Chips.

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