# F1 — Golden Path Product Proof Closure Report

## Verdict
F1 is functionally complete and has passed the final feature-branch CI gate.

## Objective Achieved
F1 proved the governed daily operational path without reopening sealed architecture or redesigning the official output:

`Programme -> current authorised Revision -> MSP Task or VO Item -> Activity -> Site Diary -> Workforce / governed Progress & Approval boundaries -> Continue Yesterday / revision-cycle behavior -> retrieve/edit/history -> JKR Page 1 printable output + derived continuation pages`.

## Locked Product Outcome
The application remains a digital JKR Site Diary system. Its output endpoint is the official first-page Site Diary structure supplied by the Product Owner, with continuation pages only when overflow requires them. F1 adds a print route capable of A4 browser printing / Save PDF while preserving the Page 1 visual contract.

## Material F1 Deliverables

- browser authenticated API propagation without restoring client actor authority;
- canonical Trade persistence replacing legacy direct table mutation;
- Known Start Date and date-aware Activity lifecycle, including same-day start/finish;
- explicit Activity operational source architecture: MSP Task XOR VO Item, never both;
- authenticated VO registration and dual-source Activity creation;
- atomic Site Diary + canonical Workforce create/update integration;
- persisted printable context for location, work times, weather/rain fields and Contractor/NSC workforce scope;
- Continue Yesterday remains current-revision-only and duplicate-safe;
- authoritative JKR Page 1 renderer and derived continuation/overflow pages;
- F1 cross-cutting closure contract test.

## Architecture Amendment
ADR-F1-001 is the sole explicit F1 domain amendment authorised by the Product Owner:

> Activity has exactly one operational source. It shall reference either one MSP Task or one VO Item, never both. Programme and Programme Revision ownership remain mandatory regardless of source. Historical source identity is immutable.

DB-014, DM-005 and BR-005 were reconciled to that rule.

## Database Safety
All F1 schema/RPC validation migrations were applied only to the dedicated `jkr-site-diary-a27-test` Supabase project during F1 execution. The production/main Supabase project was not migrated as part of F1.

## CI-HARDEN-001
F1 remained subject to the unified gate:

`frozen lockfile -> typecheck -> API-inclusive typecheck -> lint -> tests -> build`.

Final feature-head CI run **#131** passed at `54a957438966e809b66a5aeb0f82218a2c3fefd2`.

## Deferred to Later Phases / UAT

- real field usability judgement and visual print acceptance by the Product Owner;
- release/security hardening that belongs to F3;
- release/repository hygiene that belongs to F4;
- production release rehearsal/UAT that belongs to F5;
- any richer Progress/Approval product surfaces not required by the locked Site Diary Page 1.

These are not unfinished F1 architecture work.

## Final Mechanical Gate

The feature branch is green and ready for merge. After merge, `develop` CI must also be green. Once that post-merge gate passes, F1 is CLOSED and `develop` becomes the F1 baseline for F2.
