# UI-226 - Description List

| Document ID | UI-226 |
|-------------|---------|
| Title | Description List |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Display Component |
| Component Tier | Tier-2 |
| Template | UI-199B Standard Component Specification |
| Depends On | UI-199, UI-199A, UI-199B, UI-200A, UI-201, UI-202, UI-220 |
| Last Updated | 31 July 2026 |

---

# 1. Purpose

The Description List component presents the attributes of a single business entity using clear label-value pairs.

Unlike a Table, which is optimised for comparing multiple records, a Description List focuses on understanding one record in detail.

It provides a structured, readable, and accessible presentation of business information.

---

# 2. Objectives

The Description List component shall:

- Present a single record consistently.
- Improve readability of business information.
- Support responsive layouts.
- Accommodate varying data types.
- Remain independent of business logic.
- Be reusable across all modules.

---

# 3. Design Principles

## Clarity

Each label shall clearly describe its associated value.

---

## Readability

Related information should be grouped logically.

Adequate spacing shall separate sections.

---

## Consistency

The same business attribute shall use the same label throughout the platform unless explicitly defined otherwise.

---

## Flexibility

The component shall support simple and complex values without changing its overall structure.

---

# 4. Usage

Typical usage includes:

- Project Details
- Contractor Details
- Site Diary Details
- Inspection Details
- Material Details
- Asset Details
- User Profile
- Approval Summary
- Variation Order Details
- Payment Certificate Details
- AI Recommendation Summary

---

## Do Not Use

The Description List component shall not replace:

- Tables containing multiple records.
- Editable forms.
- Dashboards.
- Navigation menus.

---

# 5. Variants

## Standard

Single-column label-value presentation.

---

## Two Column

Two groups of label-value pairs displayed side by side.

---

## Sectioned

Information organised into logical sections.

Examples:

Project Information

Contract Information

Financial Information

---

## Compact

Reduced spacing for high-density displays.

---

# 6. Anatomy

A Description List consists of:

- Section Title (Optional)
- Group Header (Optional)
- Label
- Value
- Supporting Content (Optional)
- Divider (Optional)

Each label shall correspond to exactly one value.

---

# 7. Supported Value Types

Values may include:

- Text
- Number
- Currency
- Percentage
- Boolean
- Date
- Date-Time
- Status Badge
- Hyperlink
- Avatar
- Icon
- Progress Indicator
- Composite Components

---

# 8. Content Guidelines

Labels shall:

- Be concise.
- Use sentence case where applicable.
- Avoid unexplained abbreviations.
- Remain consistent throughout the platform.

Values shall:

- Preserve original business meaning.
- Apply appropriate formatting.
- Avoid truncation where practical.

---

# 9. Responsive Behaviour

On larger screens:

Label and value may appear side by side.

On smaller screens:

Values shall stack beneath their corresponding labels.

Information hierarchy shall remain unchanged.

---

# 10. Accessibility

The Description List component shall:

- Support screen readers.
- Preserve logical reading order.
- Maintain sufficient colour contrast.
- Avoid conveying meaning through colour alone.
- Support keyboard navigation for interactive values.

---

# 11. Related Components

- Card
- Typography
- Badge
- Icon
- Avatar
- Divider
- Link

---

# 12. Version History

| Version | Description |
|----------|-------------|
|1.0.0|Initial Release|

---

# Document Status

Status

LOCKED

Version

1.0.0

Classification

Tier-2 Display Component

END OF DOCUMENT