# F1 — Golden Path Evidence Matrix

## Status
IN EXECUTION

This matrix records repository-backed proof against the F1 Golden Path scenario families. It is not an architecture redesign and does not supersede locked specifications.

| # | Scenario family | Current evidence | F1 status | Required forward action |
|---|---|---|---|---|
| 1 | Programme + active revision context | `ProgrammeService`, Programme Revision API/integration tests, Site Diary service requires Approved + current revision | PROVEN / strengthening | retain existing rules; include in final closure evidence |
| 2 | Task identity bound to active MSP revision | Task projections derive from current Programme revision; Activity provisioning validates task/revision/programme linkage before persistence | PROVEN | retain; no semantic change |
| 3 | New Activity traceability | Activity service/repository persists programme/revision/task identity and append-only history | PROVEN | retain; no semantic change |
| 4 | Same-day start and finish | A27 DB-INVARIANT Activity start sets `actual_start_date=current_date`; immediate complete sets `completed_date=current_date`; transition remains New -> In Progress -> Completed | PROVEN AT DB BOUNDARY | retain; include same-day scenario in final product/UAT evidence |
| 5 | Multi-day Continue Yesterday | `SiteDiaryService.continueYesterday()` rejects Completed activities, rejects non-current/superseded revision, prevents duplicate activity/date Diary, resets weather/notes and carries allowed context; carry-forward API exists | PROVEN / strengthening | retain and include in final golden-path scenario evidence |
| 6 | Workforce capture | Workforce API exists; A27 authenticated DB-INVARIANT wrapper validates Site Diary/Programme/Revision/Activity/Trade linkage, derives totals and writes Audit atomically | PROVEN AT DB/API BOUNDARY | product UI integration remains under proof; manual Trade creation defect noted below |
| 7 | Progress capture | A27 Step 4 real DB verification proves authenticated Progress POST, actor binding, cumulative bounds, completion derivation, rollback and Audit/Activity-log atomicity | PROVEN AT DB/API BOUNDARY | product UI integration remains under proof |
| 8 | Approval lifecycle | A27 Step 4 real DB verification proves authenticated Approval POST/PATCH, actor binding, lifecycle/terminal-state protection, rejection/return comment rules and rollback | PROVEN AT DB/API BOUNDARY | product UI integration remains under proof |
| 9 | New authorised revision resets operational cycle | Site Diary creation/update/carry-forward requires current Approved revision; historical Site Diaries remain readable; superseded revision writes are rejected | PROVEN | ensure no legacy cross-revision mapping path remains operational; older superseded wording is non-authoritative |
| 10 | VO / non-MSP work | Frozen product specification requires VO treatment separate from MSP tasks | GAP UNDER RECON | locate implementation/schema/API/UI evidence. If absent, implement only already-locked VO behaviour; do not invent new VO semantics |
| 11 | Retrieve/edit/history without duplicate operational rows | Site Diary get/update paths exist; historical Diary readability is tested; Activity UPDATE mutates canonical row and appends history rather than duplicating Activity | PROVEN / strengthening | add any missing Diary duplicate-history proof around edit path |
| 12 | Printable Site Diary Page 1 + extension pages | Frozen product requirement exists; current `/api/reports` exposes JSON projection; no verified printable Page 1 renderer/PDF path has yet been found in source reconnaissance | IMPLEMENTATION GAP | continue repository search. If renderer is genuinely absent, implement the minimum locked Page 1 + continuation output path without redesigning layout or introducing alternate report semantics |

## F1 Defect Register

### F1-D01 — Browser API bearer propagation

**Finding:** Post-A27 canonical API routes verify callers from the `Authorization: Bearer <Supabase access token>` header, while the existing Site Diary UI uses same-origin `fetch('/api/...')` calls without explicitly supplying that header. This makes the real browser golden path capable of receiving 401 responses even though service/API tests pass.

**Remediation:** `AuthProvider` now centrally injects the current verified Supabase session bearer token into same-origin `/api/*` browser fetches only. It does not invent actor identity; server routes continue deriving the actor from the verified token. External/non-API requests are not modified.

**Status:** IMPLEMENTED — pending CI verification.

### F1-D02 — Manual Trade creation path

**Finding:** The UI directly inserts a new manual Trade into `trade_library`, but A27 intentionally revokes authenticated direct table mutation. The existing Trade Library POST service also returns a synthetic record rather than persisting it. The locked product requirement says a user-created Trade is recorded in Trade Master.

**Status:** CONFIRMED GOLDEN-PATH DEFECT — remediation required without weakening A27 mutation boundaries.

**Required treatment:** Replace the direct browser table mutation with a verified API/DB-INVARIANT creation path. Do not restore broad authenticated INSERT grants to `trade_library`.

## Confirmed Revision-Cycle Rule

Operational behaviour follows the later sealed architecture:

- Site Diary uses only the current Approved/authorised Programme Revision.
- When a new revision becomes current, the operational cycle resets.
- Historical records remain historical/readable.
- Old Open Activities do not migrate or merge into the new revision.
- Older documentation that describes WBS-based cross-revision continuation is superseded and must not drive implementation.

## Current F1 Priority Order

1. CI-prove F1-D01 bearer propagation.
2. Repair F1-D02 manual Trade creation without weakening A27.
3. Confirm canonical Workforce/Progress/Approval UI integration.
4. Confirm VO implementation status against locked specification.
5. Confirm printable output implementation status.
6. Repair only genuine implementation gaps needed for the locked golden path.
7. Run unified verification and CI before PR/merge.

## Wall Policy

A wall is reported to Product Owner only if a missing behaviour requires a new business decision, conflicting authoritative specifications cannot be resolved by repository governance, or external infrastructure/capability prevents safe implementation or verification.
