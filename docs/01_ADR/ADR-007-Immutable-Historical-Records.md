# ADR-007: Immutable Historical Records

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

**Status:** Locked

**Date:** 2026-07-22

**Decision Type:** Architecture

---

# Context

The JKR Site Diary Platform serves as the official digital record of project execution.

Historical operational records may become contractual evidence, audit evidence and legal references.

To preserve trust in the platform, historical information must remain immutable after it has been officially recorded.

---

# Decision

Historical operational records shall be immutable.

Once an operational record has entered historical status, it shall never be modified, overwritten or deleted.

Corrections shall always be recorded as new records that reference the original historical record.

---

# Motivation

This decision ensures:

- Audit integrity.
- Legal defensibility.
- Complete traceability.
- Reliable reporting.
- Preservation of project history.

---

# Architectural Rules

The following rules are established.

- Historical records are read-only.
- Delete operations are prohibited.
- Update operations are prohibited.
- Corrections are recorded as new linked entries.
- Every historical record retains its original creation metadata.

---

# Historical Scope

Historical records include, but are not limited to:

- Site Diary
- Activities
- Progress Records
- Workforce Records
- Approval Records
- Programme Revisions
- Audit Logs

---

# Consequences

## Positive

- Complete audit trail.
- Reliable historical reporting.
- Strong legal evidence.
- Increased stakeholder confidence.

## Negative

- Storage requirements increase over time.
- Correction process requires additional linked records instead of direct editing.

---

# Alternatives Considered

## Editable Historical Records

Rejected.

Reason:

Compromises audit integrity and historical accuracy.

---

## Physical Deletion

Rejected.

Reason:

Removes evidence required for governance and compliance.

---

# Impact

This decision affects:

- Site Diary
- Activity Engine
- Progress Engine
- Approval Engine
- Audit Engine
- Reporting
- Database Design

---

# Related Documents

- PROJECT-CONSTITUTION.md
- ADR-001-Separate-Bounded-Contexts.md
- ADR-002-Program-Kerja-Boundary.md
- ADR-003-No-Migration-Between-Revisions.md
- ADR-004-Programme-Revision-Lifecycle.md
- ADR-005-HQ-Compliance-Requirements.md
- ADR-006-Program-Kerja-Single-Source-of-Truth.md
