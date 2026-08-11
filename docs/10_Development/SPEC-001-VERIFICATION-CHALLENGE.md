# SPEC-001-VERIFICATION-CHALLENGE

**Mode:** READ-ONLY ARCHITECTURAL VERIFICATION
**Date:** 2026-08-10

## Challenge 1 — REM-004 Compatibility
**Result:** **FAIL / P2 ARCHITECTURAL INACCURACY**
- **Analysis:** SPEC-001 Section 6 states: "Protected by REM-004 FOR SHARE locks on the parent activity." This is factually incorrect. The `rem004` and `db001` migrations place the `FOR SHARE` lock on the `programme_revision` row (`FOR SHARE OF pr`), not the `activity` row. 
- **Remediation:** SPEC-001 must be corrected to state that REM-004 locks the parent `programme_revision` row to prevent revision supersession during activity mutation, while the `activity_workflow_events` trigger must correctly invoke the `trg_enforce_revision_operational()` function to protect event inserts.

## Challenge 2 — Workflow Event Ownership
**Result:** **CONFIRMED**
- **Analysis:** DEV-011B Activity State Machine explicitly maps `Suspended` and `Cancelled` as states governing the Activity lifecycle. The Activity Engine is the correct canonical owner for these administrative states.

## Challenge 3 — Event Table Justification
**Result:** **PROPOSED (SAFE)**
- **Analysis:** The `activity_workflow_events` table cleanly decouples administrative state from the locked DB-014 physical state (`New`, `In Progress`, `Completed`), achieving the business requirements (DEV-012B) without corrupting physical schema rules. It acts as an append-only log, fulfilling audit requirements.

## Challenge 4 — Current State Derivation
**Result:** **CONFIRMED**
- **Analysis:** The derivation (No event = Active, Suspend = Suspended, Cancel = Cancelled) is sound. The state transitions correctly enforce terminality (e.g. Cancelled -> Resume is rejected).

## Challenge 5 — Cancel Semantics
**Result:** **CONFIRMED**
- **Analysis:** DEV-011B explicitly forbids `Cancelled → Started / Continue` (Logging work on cancelled scope). Cancellation is terminal and irreversible.

## Challenge 6 — Suspend Semantics
**Result:** **PROPOSED**
- **Analysis:** The rule that "Suspended means physical Activity remains In Progress" is derived logic to satisfy AE-009's 3-state physical limitation. Since work has started but is not completed, `In Progress` is the only logically permissible underlying DB-014 state.

## Challenge 7 — Site Diary Interaction
**Result:** **CONFIRMED**
- **Analysis:** DEV-010D (Carry Forward Engine) explicitly includes `Suspended` and excludes `Cancelled`. DEV-012B (BR-ACT-005) confirms Suspended carries forward but permits 0 progress. Site Diary remains the daily execution log.

## Challenge 8 — Progress Interaction
**Result:** **CONFIRMED**
- **Analysis:** DEV-012B (BR-ACT-005) explicitly mandates "0 progress increments" for Suspended activities. DEV-012A forbids progress on Cancelled activities.

## Challenge 9 — Revision Transition
**Result:** **UNRESOLVED**
- **Analysis:** SPEC-001 correctly identifies that cross-revision carry-over of administrative states (whether a suspension on Rev N automatically applies to the replacement activity in Rev N+1) is an unresolved HQ business decision.

## Challenge 10 — Concurrency
**Result:** **SAFE**
- **Analysis:** SPEC-001 correctly proposes a `FOR UPDATE` read lock on the parent `activity` row to serialize state updates and progress logging, keeping it distinct from the REM-004 `FOR SHARE` revision lock.

## Challenge 11 — Audit Trail
**Result:** **CONFIRMED**
- **Analysis:** The append-only event table provides targeted, immutable administrative state history, which does not unnecessarily duplicate the daily operational execution `site_diary_logs`.

## Challenge 12 — API
**Result:** **PROPOSED**
- **Analysis:** Conceptual commands are defined adequately for the specification phase.

## Challenge 13 — Open Activity Projection
**Result:** **CONFIRMED**
- **Analysis:** The `OpenActivityDto` correctly composes DB-014 fields, derived lock states, and the proposed administrative event states into a cohesive projection.

## Challenge 14 — Migration
**Result:** **SAFE**
- **Analysis:** The addition of a new append-only table carries zero risk to existing DB-014/DB-015 data integrity and requires no complex legacy backfills.

## Challenge 15 — Specification Conflict Scan
**Result:** **PASS**
- **Analysis:** The proposed architecture successfully resolves the conflict between the DEV-01x legacy blueprints (which demand Suspend/Cancel) and the DB-014/AE-009 locked schemas (which reject them) by utilizing an overlay event projection.
