# ADR-009
# Programme First Principle

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

Status
Locked

Date
2026-07-26

---

## Context

The platform manages construction projects throughout their lifecycle.

Examples include:

- Programme Planning
- Programme Revisions
- Site Diary
- Activities
- Progress
- Workforce
- Approvals
- Audit
- Reports

Every operational record must belong to a single construction programme.

Without clear ownership, the system becomes difficult to secure, audit, archive, partition and scale.

A single ownership model is therefore required.

---

## Decision

Programme is the root aggregate of the entire platform.

Every operational entity SHALL belong to exactly one Programme.

No operational entity may exist independently from a Programme.

Examples:

Programme
└── Programme Revision
    ├── Tasks
    ├── Activities
    ├── Site Diary
    ├── Progress
    ├── Workforce
    ├── Approvals
    └── Audit References

Programme becomes the ownership boundary for:

- Security
- Authorization
- Reporting
- Backup
- Archiving
- Data partitioning
- AI analysis

---

## Consequences

### Positive

- Clear ownership for every record.

- Easier permission model.

- Easier project archival.

- Cleaner audit trail.

- Simpler database partitioning.

- Supports multiple concurrent projects.

- Prevents orphan records.

- Enables programme-level analytics.

---

### Negative

- Every operational table requires Programme reference.

- Queries may require additional joins.

- Import utilities must always identify the owning Programme.

These trade-offs are accepted.

---

## Alternatives Considered

### User-owned data

Rejected.

Users may participate in multiple programmes.

Ownership should not depend on people.

---

### Site Diary as root

Rejected.

Site Diary is only one operational module.

It cannot own planning data.

---

### Activity as root

Rejected.

Activities exist only because a Programme exists.

Activities are not independent business entities.

---

## Implementation Rules

Every operational table SHALL contain:

- programme_id

or have an indirect ownership path leading to programme_id.

Deleting a Programme SHALL NOT physically remove operational history.

Programmes are archived instead.

---

## Related ADR

ADR-002 Programme Boundary

ADR-004 Programme Revision Lifecycle

ADR-006 Programme Kerja Single Source of Truth

ADR-008 Architecture Governance
