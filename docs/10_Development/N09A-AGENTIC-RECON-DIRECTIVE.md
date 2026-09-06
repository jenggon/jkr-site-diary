# N09A — AGENTIC RECON DIRECTIVE

**Programme:** NGAMSOI N09+ UI/UX Closure  
**Stage:** N09A — REKOD current-state propagation and acceptance  
**Role:** RECON ONLY  
**Execution branch:** `feature/N09A-ngamsoi-records-current-state`  
**Starting governance head:** `88f11930980fc7425a304bf3e9c3283c429bb5bf`  
**Active lockset:** `2026.09.06.1`  
**Expected lockset hash:** `fe3866e259155215b6848840774816ace95b1688e2a4d31e416ab68bc650ea16`  
**Expected locked requirements:** `43`

## 1. Mission

Perform a read-only reconnaissance of the current REKOD workspace on the N09A execution branch before Klopp/HQ implementation or first official PROVE.

The purpose is to discover visual, interaction, responsive, accessibility, stale-authority and test/evidence gaps early so that defects are repaired before they enter official CI proving.

Do not implement. Do not edit files. Do not commit. Do not push. Do not open or merge a PR. Do not modify the lockset to fit the code.

### Local workspace safety

The developer workstation may contain pre-existing untracked local evidence, especially `docs/evidence/f4.5-datum-01/`. Treat it as user-owned evidence. Do not add, delete, edit, stash, reset, clean, move or otherwise touch it. Do not run `git clean`, destructive reset, or any command intended to erase untracked/local work. If unrelated local modifications prevent safe checkout/recon, STOP and report them rather than mutating the workspace.

## 2. Mandatory governance preflight

Before analysis, read in this order:

1. `AGENTS.md`
2. `docs/00_Governance/AI_CONSTITUTION.md`
3. `docs/00_Governance/PROJECT-CONSTITUTION.md`
4. `docs/00_Governance/ACTIVE_LOCKSET.json`
5. `docs/10_Development/NGAMSOI-N09PLUS-UIUX-PROGRAM-CLOSURE-ROADMAP.md`
6. `docs/00_Governance/AGENT_LOCKSET_PROTOCOL.md`
7. `docs/10_Development/F4.5-R3-HQ-ACCEPTANCE-CLOSURE.md`
8. `docs/NGAMSOI-UI-GRAMMAR.md`

Then run:

```bash
git branch --show-current
git rev-parse HEAD
pnpm run lockset:verify
git status --short
```

The report MUST begin with the exact `LOCKSET COMPLIANCE ACK` required by `AGENT_LOCKSET_PROTOCOL.md`.

Expected active programme:

`NGAMSOI-N09PLUS-UIUX-CLOSURE`

Expected active stage:

`N09A`

Primary affected requirement:

`NGUI-REKOD-001`

Also evaluate compliance impact against:

- `NGUI-BASE-001`
- `NGUI-ROADMAP-001`
- `NGUI-CROSS-001` where current REKOD behaviour can create downstream cross-surface debt
- `NGUI-AGENT-001`
- `NGUI-CI-001`
- `NGUI-SCOPE-001`
- inherited F4.5 locks that REKOD shell/navigation could regress, especially `F45-NAV-001`, `F45-RESP-001`, `F45-GEO-001`, `F45-CSS-001`, `F45-BRAND-001`

If branch, HEAD lineage, lockset version/hash or governance cannot be established, STOP and report the mismatch.

## 3. Hard no-change boundaries

Recon may identify a boundary problem but MUST NOT propose silently changing protected product semantics as a visual fix.

Protect at minimum:

- NGAMSOI canonical mark geometry;
- canonical Site Diary identity;
- current-vs-superseded Programme Revision authority;
- no cross-revision operational migration/use;
- read-only historical/superseded records;
- exact edit authority;
- append-only audit/history semantics;
- REKOD #7 daily aggregation / daily approval redesign;
- print content, aggregation and official output semantics;
- approval semantics;
- database/migrations/RLS/RBAC/auth/security;
- Activity/Site Diary domain ownership;
- sealed F4.5 CATAT behaviour.

If a finding truly requires one of these to change, classify it `ESCALATION`, not `UI REPAIR`.

## 4. Recon targets

Inspect implementation, CSS ownership, tests and runtime evidence around at least:

### Workspace / navigation

- `src/app/site-diary/SiteDiaryWorkspace.tsx`
- current navigation into/out of `RECORDS`
- selected state at wide, 768–1199 and phone
- shell/header interaction with REKOD

### REKOD list / revision context

- `src/app/site-diary/DiaryManagementList.tsx`
- current vs historical revision switcher
- current-revision authority line
- historical selector
- filter strip and search
- loading/error/empty/no-current/malformed-current states
- stale request / race handling visible state
- record-row scanability and CTA actionability
- whether user-facing copy still speaks field language rather than implementation language

### REKOD detail / readback

- `src/app/site-diary/DiaryDetail.tsx`
- `src/app/site-diary/DiaryHistoryTimeline.tsx`
- current vs historical read-only clarity
- source/location/work status readback
- workforce readback
- audit timeline hierarchy
- exact `Edit Rekod` authority presentation
- print handoff presentation only; do not redesign print semantics

### Visual ownership

- `src/app/ngamsoi-n09-records.css`
- imports/order relative to F4.5 and older NGAMSOI CSS authorities
- selector specificity / legacy leakage / duplicate ownership
- sharp-sleek geometry
- colour semantics, especially no accidental use of completion-green as a generic tactical/decorative accent
- horizontal overflow and width ownership
- any pseudo-elements or legacy rules capable of recurrence after later F4.5 authority changes

### Existing evidence

- `.github/workflows/n09-records-ledger-propagation.yml`
- `scripts/capture-ngamsoi-n09-records-runtime.ts`
- `tests/integration/ui/diaryManagementList.test.ts`
- `tests/integration/ui/diaryDetail.test.ts`
- `tests/integration/ui/diaryHistoryTimeline.test.ts`
- `tests/contract/recordsReadRepository.contract.test.ts`
- navigation/workspace tests relevant to RECORDS

Treat historical N09 green evidence as useful context only. It does not prove the current lineage visually accepted.

## 5. Runtime recon

Read-only runtime execution is encouraged.

Where practical, inspect the current REKOD workspace at:

- wide desktop >= 1200px;
- half-window / medium width 768–1199px;
- phone < 768px.

Exercise normal user-visible routes/interactions, including where the fixture/runtime allows:

1. enter REKOD from application navigation;
2. inspect current revision record list;
3. use filters/search;
4. switch to historical revision;
5. return to current records;
6. open current record detail;
7. inspect workforce and audit history;
8. inspect historical detail as read-only;
9. verify navigation/back flows;
10. inspect empty/error/loading states from existing deterministic test fixtures where available.

Do not fabricate live product data, bypass auth, force-click hidden controls, or use internal state URLs solely to avoid required interaction.

## 6. Specific questions AG must answer

1. Does current REKOD visually belong to the same NGAMSOI product that F4.5 CATAT R3 sealed, or does any area still read as legacy/generic UI?
2. Are `Rekod Semasa` vs `Semakan Terdahulu` and read-only history unmistakable without relying only on colour?
3. Is revision authority clear enough that a user cannot reasonably mistake a superseded record for current operational authority?
4. Are record rows fast to scan for date, activity, source, location, executor/scope and status without exposing raw IDs?
5. Are filters usable and geometrically stable at all required widths?
6. Does detail hierarchy match the accepted sharp-sleek fieldbook grammar rather than nested generic cards?
7. Is workforce readback understandable and aligned with current B/BB/A/JUMLAH language where applicable?
8. Is the audit timeline visually secondary but still legible and trustworthy?
9. Is `Edit Rekod` exposed only for currently authorised current-revision records, with historical read-only state clear?
10. Does the print handoff look coherent without changing print semantics?
11. Are loading/error/empty states intentionally designed, or do they fall back to legacy styling/copy?
12. Are there any CSS ownership conflicts likely to reproduce the F4.5 recurrence problem (legacy selector outranking newer authority)?
13. Does the existing N09 runtime capture test enough of the current acceptance risk? Name exact missing browser assertions.
14. What would most likely cause an official CI red or Product Owner physical rejection if Klopp went straight to PROVE now?

## 7. Finding severity

Classify each finding as exactly one of:

- `BLOCKER` — likely PO rejection, authority ambiguity, broken interaction, serious responsive/accessibility problem or known CI/runtime failure risk; repair before PROVE.
- `MAJOR` — meaningful UI/UX inconsistency or evidence gap that should be repaired before N09A physical acceptance.
- `MINOR` — polish/non-blocking issue; explicitly state whether to defer to N09C.
- `ESCALATION` — cannot be solved without crossing a protected semantic/architecture boundary.
- `NO ISSUE` — inspected area is already adequate and should not be changed.

Do not create findings merely to justify activity. Prefer `NO ISSUE` where the current implementation is already correct.

## 8. Evidence quality review

For each BLOCKER/MAJOR finding, identify:

- exact file(s)/selector/component involved;
- requirement ID(s);
- observed runtime/source evidence;
- likely root cause;
- minimum bounded repair direction;
- exact automated evidence that should protect the repair;
- whether current N09 capture can be strengthened or a new N09A real-browser test is needed.

Do not write the repair.

## 9. Required final report format

Return one report in this structure:

```text
LOCKSET COMPLIANCE ACK
...

EXECUTIVE VERDICT
READY FOR KLOPP IMPLEMENTATION / NO REPAIR REQUIRED / STOP-ESCALATE

CURRENT REKOD MAP
- list surface
- detail surface
- history surface
- navigation
- responsive states
- existing evidence

FINDINGS
R1 [BLOCKER|MAJOR|MINOR|ESCALATION|NO ISSUE]
Requirement IDs:
Files/selectors:
Evidence:
Root cause:
Bounded repair direction:
Required proof:

...

CSS AUTHORITY / RECURRENCE REVIEW
...

TEST & BROWSER EVIDENCE GAPS
...

PROTECTED BOUNDARY CHECK
...

PRE-PROVE RECOMMENDATION
- exact repair set Klopp should adjudicate
- what must remain untouched
- proposed exact-head browser scenarios
- expected official CI red-risk if no repair is made
```

## 10. Stop condition

This directive authorises reconnaissance only. After the report is returned, STOP. Klopp/HQ will adjudicate every finding and decide the bounded implementation set before any code changes.
