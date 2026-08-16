# DM-005 — Activity

**Version:** 1.1.0  
**Project:** JKR Site Diary Platform

## Status

Locked — amended under F1 Product Owner authorization on 2026-08-16.

---

# Purpose

Activity represents the smallest executable unit of work recorded in the Site Diary.

An Activity is created from exactly one registered operational source:

- an MSP Task from the active Programme Revision; or
- a VO Item registered for operational Site Diary use.

Activity is the operational record of what actually happened. It does not rewrite planning data and it does not rewrite historical source identity.

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
- Bind Activity to exactly one operational source
- Update Activity without changing source identity
- Resume Activity
- Complete Activity
- Carry Forward unfinished Activity within the active Programme Revision
- Query Outstanding Activities

---

# Operational Source Invariant

Every Activity has exactly one operational source.

```text
Activity
├── source_type = MSP
│   ├── task_id    REQUIRED
│   └── vo_item_id NULL
│
└── source_type = VO
    ├── task_id    NULL
    └── vo_item_id REQUIRED
```

The source relationship is exclusive:

```text
(task_id IS NOT NULL) XOR (vo_item_id IS NOT NULL)
```

An Activity shall never reference both an MSP Task and a VO Item.

An Activity shall never exist with neither source.

Programme and Programme Revision ownership remain mandatory regardless of source.

Historical source identity is immutable. A VO-sourced Activity remains VO-sourced even if the authorised scope is later incorporated into a subsequent MSP / Programme Revision.

---

# Business Rules

- Every Activity belongs to exactly one operational source: MSP Task OR VO Item, never both.
- Every Activity belongs to exactly one Programme and one Programme Revision.
- Programme and Revision ownership are mandatory for both MSP-sourced and VO-sourced Activities.
- Source identity cannot be changed after Activity creation.
- A later Programme Revision must not rewrite historical Activity source identity.
- Completed Activities are immutable except through approved correction workflows.
- Only Activities with status other than `Completed` are considered Outstanding.
- Outstanding Activities may be resumed on subsequent Site Diary entries only while their Programme Revision remains the active authorised operational revision.
- Authorisation of a new Programme Revision starts a new operational cycle; prior Activities remain historical and are not silently migrated.

---

# Relationships

```text
Programme
    ↓
Programme Revision
    ↓
Activity ── exactly one ──► MSP Task
    │
    └──── exactly one ────► VO Item
```

The diagram denotes an exclusive source relationship: an individual Activity uses one branch only.

---

# Amendment Authority

This amendment resolves the legacy assumption that every Activity must originate from an MSP Task. It implements the locked Product Owner decision:

> Activity has exactly one operational source. It shall reference either one MSP Task or one VO Item, never both. Programme and Programme Revision ownership remain mandatory regardless of source. Historical source identity is immutable.
