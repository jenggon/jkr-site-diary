# UI-201 - Box

| Document ID | UI-201 |
|-------------|---------|
| Title | Box |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Primitive Component |
| Depends On | UI-199, UI-199A, UI-199B |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Box component is the fundamental layout primitive of the JKR Site Diary Design System.

Every visible component shall ultimately render within one or more Box components.

The Box component provides structural layout without introducing business behaviour.

---

# 2. Objectives

The Box component shall:

- Provide a universal container.
- Support responsive layouts.
- Support spacing.
- Support sizing.
- Support positioning.
- Support theming.
- Support accessibility.

---

# 3. Usage

Use Box whenever a container is required.

Examples:

- Card Container
- Dialog Container
- Button Wrapper
- Sidebar Container
- Timeline Item
- Table Cell
- Dashboard Section

---

Do NOT use Box:

- as a replacement for semantic HTML
- for spacing where Stack is more appropriate
- to implement business logic

---

# 4. Anatomy

```

Box

├── Content

└── Children

```

---

# 5. Layout Behaviour

The Box component may support:

Width

Height

Minimum Width

Maximum Width

Minimum Height

Maximum Height

Padding

Margin

Overflow

Display

Position

Visibility

Flex Properties

Grid Properties

---

# 6. Variants

Standard

Outlined

Elevated

Transparent

Surface

Variants shall only affect presentation.

---

# 7. Properties

Typical configurable properties include:

Identifier

Dimensions

Spacing

Alignment

Display Behaviour

Elevation

Border

Radius

Background

Opacity

Visibility

Exact implementation properties are framework-dependent and shall remain outside this specification.

---

# 8. Events

Not Applicable.

The Box component shall not emit interaction events by itself.

---

# 9. States

Default

Hidden

Disabled (visual only)

Responsive

Loading Container (optional)

---

# 10. Accessibility

The Box component shall:

Support semantic roles where applicable.

Allow accessible labels when required.

Avoid interfering with keyboard navigation.

Remain transparent to assistive technologies unless explicitly assigned a semantic role.

---

# 11. Responsive Behaviour

The Box component shall support responsive adaptation across:

Desktop

Tablet

Mobile

Layout adjustments shall rely on Design Tokens rather than hardcoded values.

---

# 12. AI Behaviour

Not Applicable.

The Box component contains no AI-specific behaviour.

---

# 13. Composition

The Box component serves as the foundation for nearly every visual component.

Typical compositions include:

Box
↓

Card

↓

Dialog

↓

Drawer

↓

Sidebar

↓

Toast

↓

Timeline

---

# 14. Dependency Tree

```

Design Tokens

↓

Box

```

---

# 15. Design Tokens

The Box component shall consume:

Spacing Tokens

Border Tokens

Radius Tokens

Colour Tokens

Elevation Tokens

Animation Tokens

Hardcoded values are prohibited.

---

# 16. Validation Rules

Not Applicable.

---

# 17. Performance Considerations

The Box component should remain lightweight.

Avoid unnecessary nested containers.

Avoid redundant wrappers.

Prefer composition over deep nesting.

---

# 18. Examples

Correct Usage

✓ Layout Container

✓ Card Wrapper

✓ Dialog Surface

Incorrect Usage

✗ Business Logic

✗ Workflow State

✗ Data Processing

---

# 19. Related Components

Stack

Grid

Divider

Spacer

Card

Dialog

Drawer

---

# 20. Related Patterns

Layout Standard

Dashboard Pattern

CRUD Pattern

Timeline Pattern

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