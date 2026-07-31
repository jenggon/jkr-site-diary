# UI-221 - Statistic

| Document ID | UI-221 |
|-------------|---------|
| Title | Statistic |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Display Component |
| Depends On | UI-220, UI-216 |
| Last Updated | 30 July 2026 |

---

# 1. Purpose

The Statistic component presents a single key metric together with its supporting context.

Statistics are intended to provide users with an immediate understanding of operational performance.

---

# 2. Objectives

The Statistic component shall:

- Present KPIs clearly.
- Support trend visualisation.
- Maintain numerical consistency.
- Enable dashboard composition.

---

# 3. Usage

Use Statistic for:

- Progress Percentage
- Budget Utilisation
- Delay Days
- Open Activities
- Completed Tasks
- Workforce Counts

Do NOT use Statistic for:

- Long descriptive content.
- Transactional records.
- Multi-row datasets.

---

# 4. Anatomy

Statistic

├── Label

├── Value

├── Unit (Optional)

├── Trend (Optional)

└── Supporting Description (Optional)

---

# 5. Variants

Standard

Trend

Compact

Emphasised

---

# 6. Sizes

Small

Medium

Large

---

# 7–22

Follow the standard component specification template established in UI-199B, including Properties, Events, States, Accessibility, Responsive Behaviour, AI Behaviour, Composition, Dependency Tree, Design Tokens, Validation Rules, Performance Considerations, Examples, Related Components, Related Patterns, Architecture Decisions, Version History, and Document Status.