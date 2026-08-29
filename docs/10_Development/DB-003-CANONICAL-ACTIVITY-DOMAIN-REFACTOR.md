# DB-003 — CANONICAL ACTIVITY DOMAIN REFACTOR

**Project:** JKR Site Diary Digital Platform
**Date:** 2026-08-10
**Status:** BLOCKED / STOPPED (SECOND ATTEMPT)

## 1. Baseline
Commit: `c90b33e`

## 2. Canonical Target
- **Activity:** Canonical operational domain entity (DB-014).
- **Site Diary:** Child daily record of Activity (DB-015).
- **OpenActivity:** Not a persistence entity; API projection only.

## 3. Domain Changes
**BLOCKED.** The refactor is halted due to the `Suspended`/`Cancelled` state conflict.

## 4. Repository Changes
**BLOCKED.**

## 5. OpenActivity Projection
**BLOCKED.**

## 6. Status Handling
**CONFLICT.** HQ authorized enforcing the canonical `New → In Progress → Completed` Activity state machine (AE-009) and dropping `Suspended`/`Cancelled` from the Activity domain. However, existing application code heavily relies on `Suspended` and `Cancelled`. 
HQ directed: "If an existing canonical engine/specification provides the appropriate representation, use it. If no authoritative mechanism exists: STOP and report to HQ."
**Investigation Result:** There is NO existing canonical persistence mechanism for a "halted" or "suspended" status in `DB-014` (Activity), `DB-015` (Site Diary), or any other documented engine schema in `06_Database` or `05_Zon_Operasi`. Representing these states requires inventing a new persistence mechanism (e.g., adding `is_suspended` or a `Suspension` sub-table). Because inventing mechanisms is explicitly forbidden, this is a hard stop condition.

## 7. Lock Semantics
Resolved by HQ. `isLocked` must be a read-only projection derived from `programme_revision` boundaries, governed by REM-004. Implementation blocked by Status conflict.

## 8. Resource Ownership
Resolved by HQ. `location`, `tradeInfo`, `workforceCount`, `materialSnapshot` must not be persisted on canonical Activity. Implementation blocked by Status conflict.

## 9. API Impact
Blocked.

## 10. Test Impact
Blocked.

## 11. REM-004 Regression
N/A (No changes made).

## 12. Search Results
Unperformed due to immediate hard stop conditions.

## 13. Validation
Not performed.

## 14. Known Limitations
Blocked by lack of canonical representation for Suspended/Cancelled.

## 15. Remaining HQ Decisions (STOP CONDITIONS MET)
The following hard stop condition was met:
1. `Suspend/Cancel` requires a newly invented persistence mechanism because no existing authoritative engine or DB schema provides one.

## 16. Files Changed
- `docs/10_Development/DB-003-CANONICAL-ACTIVITY-DOMAIN-REFACTOR.md` (UPDATED)

## 17. Commit SHA
Uncommitted.
