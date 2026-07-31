# UI-228 - Progress Indicator

| Document ID | UI-228 |
|-------------|---------|
| Title | Progress Indicator |
| Version | 1.0.0 |
| Status | LOCKED |
| Category | Display Component |
| Component Tier | Tier-2 |
| Template | UI-199B Standard Component Specification |
| Depends On | UI-199, UI-199A, UI-199B, UI-200A, UI-201, UI-202, UI-216 |
| Last Updated | 31 July 2026 |

---

# 1. Purpose

The Progress Indicator component communicates the completion status of a task, process, activity, or workflow.

It enables users to understand progress at a glance without interpreting raw numerical values.

The component is intended for presentation only and shall not determine workflow state.

---

# 2. Objectives

The Progress Indicator component shall:

- Visualise completion status clearly.
- Improve understanding of workflow progression.
- Support multiple presentation styles.
- Remain reusable across all modules.
- Support accessibility.
- Remain independent of business logic.

---

# 3. Design Principles

## Clarity

Progress shall be understandable without requiring additional explanation.

---

## Accuracy

Displayed progress shall faithfully represent the value supplied by the business layer.

The component shall never estimate or calculate progress independently.

---

## Consistency

Progress values shall be presented consistently throughout the platform.

---

## Scalability

The same component shall support simple percentages as well as complex workflow states.

---

# 4. Usage

Typical usage includes:

- Physical Project Progress
- Financial Progress
- Site Diary Completion
- Inspection Completion
- Approval Workflow
- Document Upload Progress
- AI Processing Status
- Synchronisation Status
- Report Generation

---

## Do Not Use

The Progress Indicator shall not replace:

- Gantt Charts
- Schedules
- Timelines
- Dashboards containing analytical trends

---

# 5. Variants

## Linear Progress

Horizontal bar.

Suitable for continuous completion.

---

## Circular Progress

Circular representation.

Suitable for compact layouts.

---

## Step Progress

Displays progression through sequential stages.

---

## Indeterminate Progress

Used when duration is unknown.

Examples:

Loading

Synchronising

Processing

---

## Segmented Progress

Displays completion across multiple sections.

---

# 6. Anatomy

A Progress Indicator may contain:

- Track
- Progress Fill
- Label
- Percentage
- Status Icon (Optional)
- Supporting Text (Optional)

---

# 7. Supported Values

The component may display:

- Percentage
- Fraction
- Current Step
- Completed Steps
- Status
- Remaining Work
- Estimated Completion

---

# 8. Content Guidelines

Labels shall describe what the progress represents.

Examples:

Project Completion

Inspection Progress

Upload Status

Approval Progress

Supporting text shall remain concise.

---

# 9. Responsive Behaviour

Large screens:

Display labels and supporting text.

Small screens:

Prioritise the progress indicator and primary value.

---

# 10. Accessibility

The Progress Indicator shall:

- Support screen readers.
- Expose progress values programmatically.
- Preserve sufficient colour contrast.
- Avoid conveying progress through colour alone.
- Support reduced-motion preferences where animation is used.

---

# 11. Related Components

- Statistic
- Badge
- Card
- Icon
- Timeline
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