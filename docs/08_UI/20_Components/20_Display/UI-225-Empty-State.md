# UI-225 - Empty State

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-225 |
|-------------|---------|
| Title | Empty State |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Display Component |
| Component Tier | Tier-2 |
| Template | UI-199B Standard Component Specification |
| Depends On | UI-199, UI-199A, UI-199B, UI-200A, UI-201, UI-202, UI-216 |
| Last Updated | 31 July 2026 |

---

# 1. Purpose

The Empty State component communicates that no content is currently available while providing meaningful context and, where appropriate, guidance on the next action.

An Empty State shall reduce uncertainty by explaining why information is absent and what the user can do next.

---

# 2. Objectives

The Empty State component shall:

- Clearly communicate the absence of content.
- Prevent users from assuming the application has failed.
- Encourage appropriate next actions.
- Maintain visual consistency across modules.
- Support accessibility requirements.
- Remain independent of business logic.

---

# 3. Design Principles

## Clarity

Users shall immediately understand why no information is displayed.

---

## Guidance

Where applicable, users should be guided towards a meaningful next action.

Examples:

- Create a new record.
- Adjust filters.
- Refresh data.
- Request access.

---

## Simplicity

The Empty State shall remain visually lightweight.

Decorative content shall not overshadow the primary message.

---

## Consistency

All Empty States shall follow a common visual structure and interaction pattern.

---

# 4. Usage

Typical usage includes:

- Empty search results.
- New projects with no records.
- No uploaded attachments.
- No inspection history.
- No approval requests.
- No AI recommendations.
- Empty dashboards.
- Cleared filters returning zero results.

---

## Do Not Use

The Empty State component shall not replace:

- Error messages.
- Loading indicators.
- Permission-denied screens.
- Maintenance pages.

---

# 5. Variants

The following variants are supported.

## Informational

Communicates that no data currently exists.

---

## Actionable

Provides a primary action.

Example:

"Create Site Diary Entry"

---

## Search Empty

Displayed when a search returns no matching results.

---

## Filter Empty

Displayed when filters exclude all available records.

---

## Permission Empty

Displayed when the user cannot access any records.

---

# 6. Anatomy

An Empty State may contain:

- Illustration or Icon (Optional)
- Title
- Supporting Description
- Primary Action (Optional)
- Secondary Action (Optional)
- Additional Help Link (Optional)

---

# 7. Content Guidelines

Titles shall be concise.

Descriptions shall explain the situation in plain language.

Action labels shall use verbs.

Examples:

✓ Create Record

✓ Upload Document

✓ Clear Filters

Avoid vague labels such as:

✗ Continue

✗ Click Here

✗ OK

---

# 8. Accessibility

Empty States shall:

- Remain readable using screen readers.
- Preserve sufficient colour contrast.
- Avoid communicating meaning through images alone.
- Support keyboard navigation where actions are provided.

---

# 9. Related Components

- Card
- Button
- Icon
- Illustration
- Link
- Typography

---

# 10. Version History

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
