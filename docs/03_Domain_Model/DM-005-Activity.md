# DM-005 — Activity

## Status

Approved

---

# Purpose

Activity represents the smallest executable unit of work recorded in the Site Diary.

Activities are created from registered Tasks and become the operational record for daily construction progress.

---

# Ownership

Activity Engine

---

# Lifecycle

```text
Created
    │
    ▼
In Progress
    │
    ├─────────────► Resume
    │
    ▼
Completed
```

---

# Core Responsibilities

- Create Activity
- Update Activity
- Resume Activity
- Complete Activity
- Carry Forward unfinished Activity
- Query Outstanding Activities

---

# Business Rules

- Every Activity belongs to exactly one Task.
- An Activity cannot exist without a Task.
- Completed Activities are immutable except through approved correction workflows.
- Only Activities with status other than "Completed" are considered Outstanding.
- Outstanding Activities may be resumed on subsequent Site Diary entries.

---

# Relationships

Programme
    ↓
Program Kerja
    ↓
Task
    ↓
Activity