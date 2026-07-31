# UI-212 - Link

| Document ID | UI-212 |
|-------------|---------|
| Title | Link |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Base Component |
| Depends On | UI-199, UI-199A, UI-199B, UI-201 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Link component provides navigational interaction between application resources or external destinations.

Unlike the Button component, a Link represents navigation rather than execution of business actions.

---

# 2. Objectives

The Link component shall:

- Provide consistent navigation.
- Clearly communicate clickable destinations.
- Support accessibility.
- Differentiate navigation from actions.
- Maintain consistent visual behaviour.

---

# 3. Usage

Use Link for:

- Opening another page.
- Opening project details.
- Navigating to reports.
- Opening external websites.
- Opening supporting documents.

Do NOT use Link for:

- Save
- Delete
- Approve
- Submit
- Upload

Business actions shall use Button.

---

# 4. Anatomy

Link

├── Leading Icon (Optional)

├── Label (Required)

└── Trailing Icon (Optional)

---

# 5. Variants

Default

Primary

Secondary

Subtle

External

---

# 6. Sizes

Small

Medium

Large

---

# 7. Properties

Typical configurable properties include:

Label

Destination

Variant

Disabled

Leading Icon

Trailing Icon

External Indicator

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

Visited

Disabled

---

# 10. Accessibility

Links shall:

- Be keyboard accessible.
- Have visible focus indicators.
- Provide descriptive accessible names.
- Clearly indicate external destinations where appropriate.

---

# 11. Responsive Behaviour

Links shall adapt typography and spacing according to Design Tokens.

---

# 12. AI Behaviour

Not Applicable.

---

# 13. Composition

Design Tokens

↓

Box

↓

Link

↓

Navigation

↓

Application

---

# 14. Dependency Tree

Design Tokens

↓

Box

↓

Link

---

# 15. Design Tokens

Link shall consume:

Colour Tokens

Typography Tokens

Spacing Tokens

Motion Tokens

---

# 16. Validation Rules

Links shall always define a valid destination.

Disabled links shall not receive activation.

---

# 17. Performance Considerations

Links shall remain lightweight.

---

# 18. Examples

Correct

✓ View Site Diary

✓ Open Drawing

✓ Download Specification

Incorrect

✗ Save Changes

✗ Delete Record

✗ Approve Claim

---

# 19. Related Components

Button

Icon Button

Navigation Menu

Breadcrumb

---

# 20. Related Patterns

Navigation Pattern

Workspace Pattern

Dashboard Pattern

---

# 21. Architecture Decisions

ADR-001

Decision

Links perform navigation only.

Reason

Separates navigation from business actions.

ADR-002

Decision

Visited state remains optional depending on navigation context.

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