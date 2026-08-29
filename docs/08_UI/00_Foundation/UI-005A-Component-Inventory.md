# UI-005A - Component Inventory

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

| Document ID | UI-005A |
|-------------|----------|
| Title | Component Inventory |
| Version | 1.0.0 |
| Status | LIVING DOCUMENT |
| Category | Components |
| Depends On | UI-005 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

This document serves as the authoritative catalogue of all reusable UI components within the JKR Site Diary Platform.

Every component introduced into the application shall be registered in this inventory.

---

# 2. Objectives

The Component Inventory exists to:

- Prevent duplicate components.
- Improve discoverability.
- Standardise ownership.
- Track component maturity.
- Support AI-assisted development.
- Improve long-term maintainability.

---

# 3. Component Lifecycle

Draft

↓

Experimental

↓

Stable

↓

Deprecated

↓

Retired

---

# 4. Inventory

| Component | Category | Status | Pattern | Used By |
|------------|----------|---------|----------|----------|
| ActivityCard | Display | Draft | Card | Site Diary |
| StatusBadge | Display | Draft | Badge | All Modules |
| SearchBox | Input | Draft | Search | Global |
| ProgressTimeline | Display | Draft | Timeline | Programme |
| ApprovalDrawer | Overlay | Draft | Drawer | Approval |

---

# 5. Ownership

Every component shall have:

- Component Name
- Owner
- Purpose
- Dependencies
- Related Pattern
- Related Tokens

---

# 6. Naming Rules

PascalCase.

Singular.

Descriptive.

Avoid abbreviations.

Examples

ActivityCard

WeatherWidget

PhotoGallery

ApprovalDrawer

---

# 7. Duplicate Policy

Before creating a component developers shall:

1. Search this inventory.
2. Search existing code.
3. Extend existing components whenever practical.

Creating duplicate components requires architectural approval.

---

# 8. Future Metadata

Future versions may include:

- Storybook URL
- Figma Reference
- Test Coverage
- Accessibility Score
- Performance Rating
- AI Compatibility Score

---

# Document Status

Status

LIVING DOCUMENT

Version

1.0.0

---

END OF DOCUMENT
