# UI-210 - Button

| Document ID | UI-210 |
|-------------|---------|
| Title | Button |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Base Component |
| Depends On | UI-199, UI-199A, UI-199B, UI-201 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Button component provides the primary mechanism for initiating user actions throughout the JKR Site Diary Platform.

Buttons shall represent intentional user actions and remain visually consistent across all modules.

The Button component shall never contain business logic.

---

# 2. Objectives

The Button component shall:

- Provide a consistent interaction model.
- Clearly communicate available actions.
- Support accessibility.
- Support responsive interfaces.
- Support loading and disabled states.
- Support composition with other components.

---

# 3. Usage

Use Button for:

- Save
- Submit
- Cancel
- Approve
- Reject
- Upload
- Search
- Download
- Navigation actions

Do NOT use Button for:

- Static labels
- Hyperlinks to external resources (use Link)
- Decorative elements

---

# 4. Anatomy

Button

├── Leading Icon (Optional)

├── Label (Required)

├── Trailing Icon (Optional)

└── Loading Indicator (Optional)

---

# 5. Variants

Primary

Secondary

Outline

Ghost

Danger

Success

Text

Variants shall communicate visual emphasis only.

---

# 6. Sizes

Extra Small

Small

Medium (Default)

Large

Extra Large

Sizing shall follow Design Tokens.

---

# 7. Properties

Typical configurable properties include:

Label

Variant

Size

Disabled

Loading

Full Width

Leading Icon

Trailing Icon

Tooltip

Accessibility Label

Framework-specific APIs are outside the scope of this specification.

---

# 8. Events

Typical events include:

Activate

Focus

Blur

Hover

Events represent user intent only.

Business processing remains external.

---

# 9. States

Default

Hover

Focused

Pressed

Loading

Disabled

Success (Optional)

Error (Optional)

---

# 10. Accessibility

The Button component shall:

- Be keyboard accessible.
- Display a visible focus indicator.
- Support accessible names.
- Support screen readers.
- Meet minimum touch target requirements.

Colour alone shall never indicate state.

---

# 11. Responsive Behaviour

Buttons may:

Expand to full width.

Collapse into icon-only presentations where appropriate.

Adapt spacing using Design Tokens.

---

# 12. AI Behaviour

Not Applicable.

AI may recommend actions but shall not automatically activate buttons.

---

# 13. Composition

Design Tokens

↓

Box

↓

Button

↓

Dialog

↓

Approval Panel

↓

Workflow

---

# 14. Dependency Tree

Design Tokens

↓

Box

↓

Button

---

# 15. Design Tokens

Button shall consume:

Colour Tokens

Typography Tokens

Spacing Tokens

Radius Tokens

Elevation Tokens

Motion Tokens

Hardcoded values are prohibited.

---

# 16. Validation Rules

Loading state shall prevent repeated activation.

Disabled buttons shall not respond to interaction.

---

# 17. Performance Considerations

Buttons shall remain lightweight.

Rendering overhead shall be minimal.

Visual transitions shall remain performant.

---

# 18. Examples

Correct

✓ Save

✓ Submit

✓ Approve

✓ Upload

Incorrect

✗ Paragraph text

✗ Navigation menu item

✗ Static badge

---

# 19. Related Components

Icon Button

Link

Badge

Dialog

Toolbar

Card

---

# 20. Related Patterns

CRUD Pattern

Approval Pattern

Dashboard Pattern

Workspace Pattern

---

# 21. Architecture Decisions

ADR-001

Decision

Buttons remain generic.

Reason

Business-specific buttons create duplication.

ADR-002

Decision

Loading state blocks repeated activation.

Reason

Prevents duplicate submissions.

ADR-003

Decision

Variants communicate emphasis only.

Reason

Business meaning belongs outside the component.

---

# 22. Version History

| Version | Description |
|----------|-------------|
| 1.0.0 | Initial Release |

---

# Document Status

LOCKED

Version 1.0.0

END OF DOCUMENT