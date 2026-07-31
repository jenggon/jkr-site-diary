# UI-301 - Form

| Document ID | UI-301 |
|-------------|---------|
| Title | Form |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Data Entry Foundation |
| Component Tier | Tier-1 |
| Template | UI-199C Extended Component Specification |
| Depends On | UI-300 |
| Last Updated | 31 July 2026 |

---

# 1. Purpose

The Form component provides the primary container responsible for collecting, validating, and submitting user input.

Every user interaction involving structured data entry shall occur within a Form.

---

# 2. Objectives

The Form component shall:

- Organise related input fields.
- Coordinate validation.
- Manage submission.
- Improve usability.
- Maintain accessibility.
- Support reusable layouts.

---

# 3. Design Principles

## Logical Grouping

Related information shall be grouped together.

---

## Progressive Disclosure

Large forms shall be divided into logical sections.

---

## Clear Completion

Users shall always understand:

- current progress
- remaining work
- validation status

---

# 4. Anatomy

A Form consists of:

- Header
- Description (Optional)
- Sections
- Form Fields
- Action Area
- Validation Summary (Optional)

---

# 5. Form Structure

```
Form

├── Header

├── Section

│     ├── Form Field

│     ├── Form Field

│     └── Form Field

├── Section

└── Actions
```

---

# 6. Variants

Supported variants:

- Standard Form
- Wizard Form
- Dialog Form
- Drawer Form
- Inline Form
- Read Only Form

---

# 7. Behaviour

The Form shall manage:

- Initialisation
- Validation
- Submission
- Reset
- Draft Saving
- Read Only Mode

---

# 8. Accessibility

The Form shall:

- expose semantic form structure
- support keyboard navigation
- announce validation errors
- support assistive technologies

---

# 9. Related Documents

- UI-300
- UI-302
- UI-303
- UI-304

---

# 10. Version History

| Version | Description |
|----------|-------------|
|1.0.0|Initial Release|

---

# Document Status

LOCKED