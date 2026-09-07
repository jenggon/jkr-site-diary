# NGAMSOI N09+ — UI/UX PROGRAM CLOSURE ROADMAP

**Project:** JKR Site Diary Digital Platform  
**Repository:** `jenggon/jkr-site-diary`  
**Status:** PRODUCT OWNER LOCKED  
**Authority:** Product Owner + HQ / Chief Architect  
**Captured:** 2026-09-06  
**Execution/proving baseline supersession:** 2026-09-07  
**Workspace-alignment adjustment:** 2026-09-07  
**Starting seal commit:** `1ec8b467716f29d5111b553d20488adf658096bf`  
**Immutable accepted F4.5 product datum:** `be5233fce209029cac97e080e8312113c94c4e08`

## 1. Purpose

This document is the durable roadmap for closing the remaining NGAMSOI UI/UX programme after F4.5 Round 3 was physically accepted and sealed.

It prevents the team, HQ and interchangeable agentic helpers from treating the F4.5 CATAT seal as the end of the entire application UI programme or prematurely integrating the current branch into `develop`.

The accepted F4.5 product datum remains immutable evidence. Downstream UI work must preserve it unless an explicit Product Owner / Chief Architect decision formally reopens a locked requirement.

## 2. Current programme position

The historical mission chain is treated as follows:

| Mission | Current adjudication |
| --- | --- |
| N01 — NGAMSOI brand foundation | COMPLETE / inherited |
| N02 — Mobile shell + selected-source primitive | COMPLETE / inherited |
| N03 — Field/input language | COMPLETE / inherited |
| N04 — Workforce rebuild | COMPLETE / inherited |
| N05 / N05R — Spine grammar and integrated visual reset | COMPLETE / superseded into later authority |
| N06 — Completion ritual | COMPLETE / inherited |
| N07 — Homecoming + navigation | COMPLETE / inherited |
| N08 — Mobile New Entry final visual gate | COMPLETE / superseded and strengthened by F4.5 |
| F4.5 CATAT / New Entry authority | PHYSICALLY ACCEPTED / SEALED |
| N09+ — Records -> Approval -> application-wide propagation | ACTIVE PROGRAMME CLOSURE |

No earlier N01-N08 mission is to be resurrected as a separate redesign programme. Later work may only regression-protect or deliberately supersede it through governance.

## 3. Locked sequence

The remaining UI/UX programme executes in this order:

```text
N09A — REKOD current-state propagation and acceptance
  -> N09B — SEMAK / Approval visual propagation
  -> N09C — Cross-surface responsive / accessibility / onboarding / print-handoff closure
  -> N09D — NGAMSOI application final visual gate
  -> UI/UX PROGRAM SEAL
  -> stacked PR reconciliation / close-as-superseded where appropriate
  -> ONE canonical integration PR into develop
```

The order is intentional. A later stage must not be used to hide, bypass or defer a red earlier stage.

## 4. N09A — REKOD current-state propagation and acceptance

### Existing state

A historical N09 Records propagation implementation and runtime gate already exist. That evidence is useful but is not sufficient to claim current-state Product Owner acceptance because the authoritative lineage moved substantially after the original N09 gate.

### Scope

Review REKOD on the current sealed lineage, including where applicable:

- current vs historical Programme Revision clarity;
- filters and request behaviour;
- record rows / ledger scanability;
- record detail;
- workforce readback;
- audit timeline presentation;
- loading, error and empty states;
- mobile, half-window and desktop presentation;
- navigation into and out of REKOD.

### Protected semantics

Do not change merely to satisfy visual acceptance:

- canonical Site Diary identity;
- read-only superseded records;
- exact edit authority;
- append-only audit/history semantics;
- Programme / Revision authority;
- REKOD #7 daily aggregation / daily approval redesign;
- print semantics.

### Exit gate

N09A is complete only after:

1. safe workspace alignment to the governed branch/expected HEAD, followed by governance preflight and LOCKED REQUIREMENT IMPACT MATRIX;
2. bounded implementation/remediation by the authorised local executor if needed;
3. the smallest authoritative targeted test/browser gate is green;
4. agentic recon/challenge is used where ambiguity or risk warrants it and all findings are adjudicated before freeze;
5. complete exact-head stage-aware PREPROVE is green, including real-browser evidence with zero retries where applicable;
6. the exact candidate SHA is frozen, promoted under the required Product Owner authority and authoritatively reproved;
7. Product Owner physical acceptance passes on that exact lineage.

Old N09 green CI alone does not satisfy N09A physical acceptance.

## 5. N09B — SEMAK / Approval visual propagation

### Scope

Propagate the accepted NGAMSOI visual grammar to the existing approval/review workspace (`SEMAK` / backend workspace `APPROVALS`).

The visual mission includes, where applicable:

- approval queue hierarchy and scanability;
- record/revision context;
- reviewer detail surface;
- decision/comment controls;
- concurrency / terminal feedback presentation;
- loading, error and empty states;
- capability-aware navigation;
- mobile, half-window and desktop presentation.

### Hard boundary

This is visual/interaction propagation, not approval-domain redesign.

Preserve:

- existing approval semantics;
- RBAC/RLS and authentication/security;
- separation of duty;
- status transition rules;
- comment rules;
- concurrency rules;
- database/migration ownership unless separately authorised;
- audit/history integrity.

Any finding that requires changing those semantics is an escalation, not a UI fix.

### Exit gate

N09B requires exact-head proof, authoritative reprove and Product Owner physical acceptance before N09C may be considered complete.

## 6. N09C — Cross-surface application closure

N09C is not permission to redesign already accepted CATAT.

Its purpose is to prove that the application reads as one NGAMSOI product across the four canonical workspaces:

- `Baharu` / CATAT;
- `Aktiviti`;
- `Rekod`;
- `Semak`.

### Required viewport coverage

- wide desktop;
- half-window / medium desktop-tablet width;
- phone.

### Required closure checks

- shared shell, header and navigation grammar;
- selected-state consistency;
- typography and field-language consistency;
- sharp-sleek geometry consistency;
- no horizontal page overflow;
- accessibility / keyboard / focus behaviour appropriate to the surface;
- loading, empty, error and completed states belong to the same visual family;
- no legacy workspace appears to come from another application;
- accepted CATAT/F4.5 behaviour remains regression-safe;
- first-use/onboarding guidance, where required by NGAMSOI UI Grammar, teaches the same normal-runtime labels, controls, colours and metaphors rather than tutorial-only concepts;
- print handoff / entry into official output remains visually coherent while print content, aggregation and official print semantics remain protected and unchanged.

### Exit gate

N09C completes only when cross-surface runtime evidence is green and the Product Owner has no unresolved visual/interaction blocker across the required viewports.

## 7. N09D — NGAMSOI application final visual gate

N09D is the integrated application acceptance gate, not another redesign sprint.

It shall prove the already-accepted programme as one product from normal user navigation.

Minimum evidence:

- production-runtime browser execution, not source-string substitution;
- wide, half-window and phone;
- `Baharu -> Aktiviti -> Rekod -> Semak` navigation reachability according to capability;
- zero horizontal page overflow;
- critical geometry / computed-style checks where deterministic;
- acceptance-state recurrence protection from earlier missions;
- zero Playwright retries;
- full `pnpm run verify`;
- exact candidate SHA recorded;
- separate Product Owner physical acceptance.

`CI GREEN` is not equivalent to `SEALED`.

N09D becomes SEALED only after Product Owner physical acceptance of the exact proven candidate.

## 8. Execution ownership and agentic operating model — shifted left

Canonical operating authority is `docs/00_Governance/EXECUTION-PROVING-BASELINE.md`.

Default ownership:

```text
Product Owner   -> product/process authority + promotion authority where required + physical acceptance
Klopp / HQ      -> governance / governed branch+HEAD / impact matrix / bounded contract / adjudication / review / gate control
Codex           -> default local working-tree executor, including safe fast-forward-only alignment under contract
Agentic helper  -> recon when ambiguity warrants; read-only challenge after targeted green when risk warrants
CI              -> confirm/prove the already-preproved exact candidate
```

The Product Owner is not the routine shell, patch, test or Git operator. Lack of direct local-write access by Klopp/HQ must not be converted into a default requirement for the Product Owner to edit or run commands manually.

A governed remote mutation must be assumed capable of making an attached local executor stale. Therefore local/remote equality is never merely assumed: the executor first proves workspace alignment to the expected governed branch/HEAD. Same-head is a no-op; a behind exact ancestor may fast-forward only after dirty-state and protected-path safety checks; ahead/diverged/unsafe states stop to HQ. Reset, clean, stash, force, auto-rebase and merge-commit recovery are not authorised alignment mechanisms.

When Codex implements, Antigravity is preferred as the independent challenger when available. A challenger does not self-authorise a patch; findings return to Klopp/HQ for adjudication and, when required, a new bounded executor pass. One helper remains the default and a second independent agent is reserved for high-risk unresolved ambiguity.

For governed implementation/remediation, the default gate order is:

```text
MISSION / EXPECTED GOVERNED HEAD
-> WORKSPACE ALIGNMENT PREFLIGHT
-> GOVERNANCE PREFLIGHT
-> LOCKED REQUIREMENT IMPACT MATRIX
-> IMPLEMENT (authorised local executor)
-> TARGETED TEST
-> AGENTIC CHALLENGE when risk warrants
-> PREPROVE — EXACT CI MIRROR
-> ALL GREEN
-> FREEZE EXACT SHA
-> PRODUCT OWNER PROMOTION AUTHORITY where required
-> ONE PROMOTION PUSH of the proven candidate
-> OFFICIAL CI CONFIRMATION
-> AUTHORITATIVE REPROVE where required
-> PHYSICAL ACCEPT
-> SEAL
```

Agentic output never has authority to weaken a Product Owner lock, broaden an executor contract or make CI green by bypass.

## 9. First-pass-green proving contract and efficiency metric

Official CI is confirmation/proof of an already-preproved exact candidate. Deterministic product, harness, governance or environment-parity defects should be discovered before official promotion wherever technically possible.

Before freeze, the complete stage-aware PREPROVE must mirror the applicable official proof and include, where applicable:

- lockset verification;
- frozen dependency/install parity;
- required typechecks;
- lint;
- Vitest / required automated suites;
- production build;
- Linux/path/case portability audit;
- applicable production-runtime Playwright/browser gate;
- zero Playwright retries;
- `git diff --check`;
- bounded-scope/diff review against the impact matrix.

The desired steady state is one canonical `pnpm run preprove:<stage>` contract called by both the local executor and official CI. The desired execution-preflight companion is `pnpm run exec:preflight`. Until those commands exist, the same required gates must be executed explicitly; absence of convenience commands removes no gate.

Only an ALL GREEN exact candidate may freeze and become eligible for promotion. After the required Product Owner promotion authority, the proven candidate receives one promotion push. This means the first official push of that frozen candidate, not a prohibition on later governed replacements if an external or newly discovered issue genuinely requires a new candidate. Blind fix -> push -> red -> fix -> push loops are forbidden.

Every official red must be classified before another candidate promotion as one of:

- `PRODUCT_DEFECT`;
- `HARNESS_DEFECT`;
- `ENVIRONMENT_PARITY`;
- `GOVERNANCE_PREFLIGHT`;
- `INFRASTRUCTURE`.

Official red-loop process signal remains:

- `0` official CI reds before green: excellent / target;
- `1`: classify the miss;
- `2`: process miss — review recon/preflight/preprove coverage before continuing;
- `3+`: stop repeated proving and improve the mechanism before another attempt.

Local alignment stops, targeted-test failures, challenger findings or preprove failures that prevent an unsafe/defective candidate from reaching official proving are successful shift-left discovery provided evidence is not weakened.

## 10. No-green-by-bypass

The existing repository rule remains mandatory. Do not obtain green status by:

- force-clicking required interactions;
- skipping/deleting locked assertions;
- weakening geometry, overflow, identity, authority or state thresholds;
- hiding an overlay that is part of the real interaction;
- arbitrary timeout inflation;
- retries that mask deterministic failures;
- internal URLs/state manipulation that bypass required user navigation;
- replacing required browser evidence with source-text checks;
- changing production behaviour only to satisfy a faulty harness.

Repair a faulty harness only with equal-or-stronger evidence.

## 11. Protected boundaries for the N09+ closure programme

Unless separately approved through architecture/business governance, the UI/UX closure programme must not alter:

- NGAMSOI canonical mark geometry;
- Programme / Revision authority and no-cross-revision policy;
- Activity and Site Diary domain ownership;
- canonical Site Diary identity;
- immutable historical/audit rules;
- database/migrations solely for cosmetic convenience;
- RLS/RBAC/authentication/security;
- approval business semantics;
- REKOD #7 daily aggregation / daily approval redesign;
- official print aggregation/content semantics;
- official weather/domain authority;
- accepted F4.5 CATAT work-state semantics including MULA_DAN_SIAP.

## 12. Develop integration is explicitly blocked until programme seal

Do **not** merge the current F4.5/N09+ lineage into `develop` merely because F4.5 CATAT is sealed.

Integration is authorised only after:

1. N09A PASS;
2. N09B PASS;
3. N09C PASS;
4. N09D exact-head proof PASS;
5. Product Owner final application physical acceptance PASS;
6. UI/UX programme seal recorded;
7. stacked historical PRs reconciled so their disposition is clear.

Then create one canonical PR into `develop`, preserving traceable ancestry of the accepted/sealed lineage. Do not independently merge the old stacked UI PRs merely because they remain open.

`main` remains outside this closure roadmap and continues to require the separate release workflow.

## 13. Stop / escalation conditions

Stop before implementation if:

- workspace alignment cannot prove the local executor is safely on the expected governed branch/HEAD;
- local HEAD is ahead/diverged, unsafe tracked changes exist, or an incoming governed change collides with a protected local path;
- governance preflight or lockset verification mismatches after alignment;
- work would require changing a protected semantic boundary;
- the current candidate is not descended from the accepted F4.5 seal without an explicitly documented reason;
- a later stage is being used to bypass an unresolved earlier stage;
- a proposed change reopens a sealed F4.5 behaviour without explicit Product Owner authority;
- implementation and evidence disagree on what the requirement means.

## 14. Programme completion definition

The NGAMSOI UI/UX programme is complete only when:

```text
N09A PASS
+ N09B PASS
+ N09C PASS
+ N09D PASS
+ Product Owner final physical acceptance
+ UI/UX PROGRAM SEAL
+ stacked PR disposition recorded
+ one canonical integration PR ready for develop
```

Until then, the programme is ACTIVE and `develop` integration remains blocked.
