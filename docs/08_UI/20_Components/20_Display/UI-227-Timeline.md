# UI-227 - Timeline

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-227 |
|-------------|---------|
| Title | Timeline |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Display Component |
| Component Tier | Tier-2 |
| Template | UI-199B Standard Component Specification |
| Depends On | UI-199, UI-199A, UI-199B, UI-200A, UI-201, UI-202, UI-216, UI-220 |
| Last Updated | 31 July 2026 |

---

# 1. Purpose

The Timeline component presents events in chronological order, enabling users to understand the sequence, progression, and history of business activities.

It provides a clear visual representation of temporal relationships without modifying underlying business data.

---

# 2. Objectives

The Timeline component shall:

- Present chronological information consistently.
- Improve understanding of historical events.
- Support auditability.
- Highlight key milestones.
- Remain reusable across all modules.
- Remain independent of business logic.

---

# 3. Design Principles

## Chronological Order

Events shall be presented in a clearly defined chronological sequence.

The ordering strategy shall be configurable as ascending or descending.

---

## Readability

Users shall easily distinguish:

- Event
- Time
- Actor
- Description

---

## Context

Each event shall provide sufficient information for users to understand what occurred without requiring unnecessary navigation.

---

## Consistency

Timeline presentation shall remain visually consistent throughout the platform.

---

# 4. Usage

Typical usage includes:

- Site Diary History
- Project Milestones
- Approval Timeline
- Inspection History
- Material Delivery History
- Audit Trail
- User Activity History
- AI Recommendation History
- Variation Order History
- Payment History

---

## Do Not Use

The Timeline component shall not replace:

- Gantt Charts
- Calendars
- Tables requiring comparison
- Workflow editors

---

# 5. Variants

## Vertical Timeline

Default presentation.

---

## Horizontal Timeline

Suitable for milestone summaries.

---

## Compact Timeline

Reduced spacing for high-density information.

---

## Grouped Timeline

Events grouped by:

- Date
- Phase
- Category
- User

---

## Milestone Timeline

Highlights significant project events.

---

# 6. Anatomy

A Timeline consists of:

- Timeline Container
- Timeline Axis
- Timeline Marker
- Event Card
- Timestamp
- Event Title
- Supporting Description
- Metadata (Optional)

---

# 7. Timeline Event Structure

Each event may contain:

- Timestamp
- Title
- Description
- User
- Status
- Icon
- Attachment Indicator
- Related Entity Link

---

# 8. Content Guidelines

Titles shall be concise.

Descriptions shall explain what occurred.

Timestamps shall use platform-standard date and time formatting.

Events shall avoid ambiguous wording.

---

# 9. Responsive Behaviour

Large screens:

Events may display additional metadata.

Small screens:

Events shall stack vertically while preserving chronological order.

---

# 10. Accessibility

The Timeline component shall:

- Support screen readers.
- Preserve chronological reading order.
- Maintain sufficient colour contrast.
- Support keyboard navigation for interactive events.
- Avoid conveying meaning through colour alone.

---

# 11. Related Components

- Card
- Icon
- Badge
- Avatar
- Link
- Divider
- Description List

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
