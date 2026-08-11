# SPEC-001-REMEDIATION

**Mode:** SPECIFICATION REMEDIATION ONLY
**Date:** 2026-08-10

## Original P2 Error
REM-004 lock boundary incorrectly described. SPEC-001 inaccurately stated that REM-004 enforced a `FOR SHARE` lock on the `activity` row.

## Resolution
Corrected every inaccurate REM-004 reference in `SPEC-001-SUSPEND-CANCEL-CANONICAL-MECHANISM.md` to reflect that REM-004 locks the parent `programme_revision` row using `FOR SHARE`.

Explicitly separated the concurrency mechanisms:
**A. Revision Safety (LOCKED):** Governed by REM-004 via a `FOR SHARE` lock on `programme_revision` to protect the revision boundary.
**B. Activity Workflow Concurrency (PROPOSED):** Governed by a `FOR UPDATE` lock on `activity` to serialize workflow events and physical mutations. This is a SPEC-001 design proposal and is explicitly *not* part of REM-004.

## Residual Unresolved
Cross-revision suspension carry-over remains unresolved. The specification explicitly states that R1 workflow history remains bound to R1 Activity, and R2 Activity is a distinct Activity under R2. No automatic migration occurs without HQ authorization.

## Action Checklist
- [x] All REM-004 references corrected
- [x] `programme_revision` FOR SHARE correctly described
- [x] `activity` FOR UPDATE clearly separated
- [x] Cross-revision carry-over remains unresolved
- [x] Suspend semantics correctly classified
- [x] Event table remains PROPOSED
- [x] No production code changed
- [x] No migration changed
- [x] No DB-014 changed
- [x] No AE-009 changed
- [x] No DB-015 changed
- [x] No REM-004 changed

## Development Status
No production code: YES
No migrations: YES
No tests: YES
Development: STOPPED
