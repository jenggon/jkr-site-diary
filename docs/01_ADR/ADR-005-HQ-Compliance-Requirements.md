# ADR-005: HQ Compliance Requirements

**Project:** JKR Site Diary Platform
**Version:** 1.0.0

**Status:** Locked

**Date:** 2026-07-22

**Decision Type:** Architecture

---

# Context

The JKR Site Diary Platform shall preserve architectural integrity through formal governance.

Architecture reviews conducted by HQ establish mandatory requirements that become part of the project's official architecture.

Implementation teams must ensure these requirements are fully traceable and verifiable.

---

# Decision

All approved HQ architectural decisions become mandatory implementation requirements.

Each approved HQ decision shall be documented and linked to:

- Architecture Decision Records (ADR)
- Business Rules
- Domain Documentation
- Source Code
- Test Cases

---

# Motivation

This decision ensures:

- Enterprise governance.
- Architectural consistency.
- Traceability.
- Compliance verification.
- Audit readiness.

---

# Mandatory HQ Requirements

The following requirements are mandatory.

- UID Mapping.
- Revision Mapping.
- Programme Lifecycle Metadata.
- No Revision Migration.
- No Revision Merge.
- Immutable Historical Records.

---

# Architectural Rules

The following rules are established.

- HQ decisions supersede implementation preferences.
- Every HQ decision must have documented traceability.
- Compliance shall be verifiable.
- Implementation shall not contradict approved HQ decisions.

---

# Compliance Process

HQ Review

↓

Architecture Update

↓

ADR Update

↓

Business Rule Update

↓

Implementation

↓

Verification

---

# Consequences

## Positive

- Consistent enterprise architecture.
- Better governance.
- Easier compliance audits.
- Controlled architectural evolution.

## Negative

- Additional documentation effort.
- Formal approval required before implementation changes.

---

# Alternatives Considered

## Developer Interpretation Only

Rejected.

Reason:

Creates inconsistent implementations across development teams.

---

## Informal Documentation

Rejected.

Reason:

Cannot provide audit traceability.

---

# Impact

This decision affects:

- All Architecture Documents.
- All Business Rules.
- All Implementations.
- All Future ADR.
- QA and Compliance Validation.

---

# Related Documents

- PROJECT-CONSTITUTION.md
- ADR-001-Separate-Bounded-Contexts.md
- ADR-002-Program-Kerja-Boundary.md
- ADR-003-No-Migration-Between-Revisions.md
- ADR-004-Programme-Revision-Lifecycle.md
