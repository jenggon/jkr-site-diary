# F1 — Golden Path Evidence Matrix

## Status
IN EXECUTION

This matrix records repository-backed proof against the F1 Golden Path scenario families. It is not an architecture redesign and does not supersede locked specifications.

| # | Scenario family | Current evidence | F1 status | Required forward action |
|---|---|---|---|---|
| 1 | Programme + active revision context | `ProgrammeService`, Programme Revision API/integration tests, Site Diary service requires Approved + current revision | PROVEN / strengthening | retain existing rules; include in final closure evidence |
| 2 | Task identity bound to active MSP revision | Task projections derive from current Programme revision; Site Diary Activity validates revision/programme context | PROVEN / strengthening | add explicit golden-path proof if current tests do not assert Task->Activity->Diary chain in one scenario |
| 3 | New Activity traceability | Activity service/repository persists programme/revision/task identity and append-only history | PROVEN | retain; no semantic change |
| 4 | Same-day start and finish | Activity lifecycle routes/state machine support start and complete transitions; same-day completion is a locked requirement | PARTIAL PROOF | add focused scenario asserting same calendar day start + completion and single Actual Start/Actual Finish semantics |
| 5 | Multi-day Continue Yesterday | `SiteDiaryService.continueYesterday()` rejects Completed activities, rejects non-current/superseded revision, prevents duplicate activity/date Diary, resets weather/notes and carries allowed context; carry-forward API exists | PROVEN / strengthening | add route-level or explicit service proof for duplicate prevention + revision reset if not already present |
| 6 | Workforce capture | Workforce API exists with activity and site-diary projections; Workforce service/engine already implemented | PARTIAL PROOF | identify existing tests and add focused golden-path integration evidence only if needed |
| 7 | Progress capture | Progress API exists with activity/site-diary projections; Progress service already implemented | PARTIAL PROOF | identify existing tests and add focused golden-path integration evidence only if needed |
| 8 | Approval lifecycle | Approval API/service exists and governed architecture defines immutable approval decisions | PARTIAL PROOF | trace tests for submit/approve/reject/return and add missing focused evidence |
| 9 | New authorised revision resets operational cycle | Site Diary creation/update/carry-forward requires current Approved revision; historical Site Diaries remain readable; superseded revision writes are rejected | PROVEN | ensure no legacy cross-revision mapping path remains operational; document older superseded spec wording as non-authoritative |
| 10 | VO / non-MSP work | Frozen product specification requires VO treatment separate from MSP tasks | GAP UNDER RECON | locate implementation/schema/API/UI evidence. If absent, implement only already-locked VO behaviour; do not invent new VO semantics |
| 11 | Retrieve/edit/history without duplicate operational rows | Site Diary get/update paths exist; historical Diary readability is tested; Activity UPDATE mutates canonical row and appends history rather than duplicating Activity | PROVEN / strengthening | add any missing Diary duplicate-history proof around edit path |
| 12 | Printable Site Diary Page 1 + extension pages | Frozen product requirement exists; current `/api/reports` exposes JSON projection; no verified printable Page 1 renderer/PDF path has yet been found in source reconnaissance | IMPLEMENTATION GAP | continue repository search. If renderer is genuinely absent, implement the minimum locked Page 1 + continuation output path without redesigning layout or introducing alternate report semantics |

## Confirmed Revision-Cycle Rule

Operational behaviour follows the later sealed architecture:

- Site Diary uses only the current Approved/authorised Programme Revision.
- When a new revision becomes current, the operational cycle resets.
- Historical records remain historical/readable.
- Old Open Activities do not migrate or merge into the new revision.
- Older documentation that describes WBS-based cross-revision continuation is superseded and must not drive implementation.

## Current F1 Priority Order

1. Close proof around same-day start/finish.
2. Close proof around workforce/progress/approval integration.
3. Confirm VO implementation status against locked specification.
4. Confirm printable output implementation status.
5. Repair only genuine implementation gaps needed for the locked golden path.
6. Run unified verification and CI before PR/merge.

## Wall Policy

A wall is reported to Product Owner only if a missing behaviour requires a new business decision, conflicting authoritative specifications cannot be resolved by repository governance, or external infrastructure/capability prevents safe implementation or verification.
