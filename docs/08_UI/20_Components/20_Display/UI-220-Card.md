# UI-220 - Card

| Document ID | UI-220 |
|-------------|---------|
| Title | Card |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Display Component |
| Depends On | UI-199, UI-199A, UI-199B, UI-201, UI-202, UI-216 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Card component groups related information and actions into a visually distinct container.

Cards provide a consistent presentation model throughout the JKR Site Diary Platform while remaining independent of business logic.

---

# 2. Objectives

The Card component shall:

- Organise related information.
- Improve visual hierarchy.
- Support reusable layouts.
- Enable responsive presentation.
- Maintain consistent spacing and elevation.

---

# 3. Usage

Use Card for:

- Dashboard widgets.
- Summary information.
- Project overview.
- Site diary entries.
- KPI panels.
- Approval summaries.

Do NOT use Card for:

- Individual buttons.
- Modal dialogs.
- Navigation menus.

---

# 4. Anatomy

Card

├── Header (Optional)

│     ├── Title

│     ├── Subtitle

│     └── Actions

├── Body (Required)

└── Footer (Optional)

---

# 5. Variants

Standard

Outlined

Elevated

Interactive

Compact

---

# 6. Sizes

Compact

Standard

Large

Fluid

---

# 7. Properties

Typical configurable properties include:

Title

Subtitle

Header Actions

Footer Actions

Padding

Elevation

Border

Clickable

Loading

---

# 8. Events

Typical events include:

Focus

Hover

Select

Activate (Interactive Variant)

Business processing remains external.

---

# 9. States

Default

Hover

Focused

Loading

Disabled

Selected

Expanded

Collapsed

---

# 10. Accessibility

Cards shall preserve accessibility of child components.

Interactive Cards shall expose keyboard navigation and focus indicators.

---

# 11. Responsive Behaviour

Cards shall:

Adapt width.

Adapt spacing.

Stack vertically when required.

Maintain readability across supported breakpoints.

---

# 12. AI Behaviour

Not Applicable.

AI-generated recommendations may be displayed inside Cards but shall not modify Card behaviour.

---

# 13. Composition

Design Tokens

↓

Box

↓

Stack

↓

Card

↓

Dashboard

↓

Application

---

# 14. Dependency Tree

Design Tokens

↓

Box

↓

Stack

↓

Icon

↓

Card

---

# 15. Design Tokens

Card shall consume:

Colour Tokens

Spacing Tokens

Radius Tokens

Elevation Tokens

Border Tokens

Motion Tokens

---

# 16. Validation Rules

Cards shall contain logically related content.

Nested Cards should be avoided unless explicitly justified.

Interactive Cards shall expose a clear interaction affordance.

---

# 17. Performance Considerations

Cards shall avoid unnecessary nested layouts.

Large Card collections should support virtual rendering where appropriate.

---

# 18. Examples

Correct

✓ Dashboard Widget

✓ Project Summary

✓ Inspection Summary

✓ Approval Summary

Incorrect

✗ Entire Application Layout

✗ Navigation Sidebar

✗ Floating Notification

---

# 19. Related Components

Box

Stack

Button

Badge

Avatar

Statistic

Table

---

# 20. Related Patterns

Dashboard Pattern

Workspace Pattern

Approval Pattern

Inspection Pattern

---

# 21. Architecture Decisions

ADR-001

Decision

Cards remain presentation containers only.

Reason

Business behaviour belongs to parent modules.

ADR-002

Decision

Interactive Cards are optional variants.

Reason

Most Cards present information rather than initiate actions.

ADR-003

Decision

Cards shall not dictate internal layouts.

Reason

Allows composition using Stack and Grid.

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