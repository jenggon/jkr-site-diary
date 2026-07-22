# ADR-003: No Migration Between Programme Revisions

**Status:** Accepted

**Date:** 2026-07-22

**Decision Type:** Architecture

---

# Context

Programme revisions represent different approved planning baselines.

Operational records belong to the Programme Revision under which they were originally executed.

Migrating operational records into a new Programme Revision would compromise historical integrity and create ambiguity regarding actual site activities.

---

# Decision

Operational records shall never be migrated from one Programme Revision to another.

Each approved Programme Revision starts a new operational context.

Historical operational records remain permanently associated with their original Programme Revision.

---

# Motivation

This decision ensures:

- Historical accuracy.
- Traceability.
- Clear audit trails.
- Reliable reporting.
- Immutable project history.

---

# Architectural Rules

The following rules are established.

- No automatic migration.
- No manual migration.
- No data cloning between revisions.
- Historical records remain unchanged.

---

# Consequences

## Positive

- Preserves audit integrity.
- Eliminates migration conflicts.
- Simplifies operational logic.
- Supports legal and contractual evidence.

## Negative

- Users cannot continue unfinished operational records into a new revision.
- New operational cycle begins after every approved revision.

---

# Alternatives Considered

## Automatic Migration

Rejected.

Reason:

Introduces inconsistencies between planning revisions and historical execution.

---

## Manual Migration

Rejected.

Reason:

Creates opportunities for historical manipulation.

---

# Impact

This decision affects:

- Programme Revision
- Site Diary
- Progress Engine
- Approval Engine
- Audit Engine

---

# Related Documents

- PROJECT-CONSTITUTION.md
- ADR-001-Separate-Bounded-Contexts.md
- ADR-002-Program-Kerja-Boundary.md