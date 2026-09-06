# N09A — AGENTIC PRE-PROVE DIRECTIVE

**Programme:** NGAMSOI N09+ UI/UX Closure  
**Stage:** N09A — REKOD current-state propagation and acceptance  
**Role:** PRE-PROVE REVIEW ONLY  
**Execution branch:** `feature/N09A-ngamsoi-records-current-state`  
**Adjudicated implementation base:** `8d73ed64765a502b411c9c11349ba473be8fa9c3`  
**Bounded product-repair commit:** `87ae0df22d262cb6937e93a75e286239c40bfa45`  
**Active lockset:** `2026.09.06.1`  
**Expected lockset hash:** `fe3866e259155215b6848840774816ace95b1688e2a4d31e416ab68bc650ea16`  
**Expected locked requirements:** `43`

## 1. Mission

Perform a read-only pre-PROVE review of the N09A bounded REKOD repair before any official product PROVE.

The purpose is to catch semantic drift, incomplete repair, CSS recurrence, brittle browser evidence and accidental broad churn while defects are still upstream of official CI proving.

Do not implement. Do not edit files. Do not commit. Do not push. Do not create or merge PRs. Do not change tests to fit defects.

The local workstation may contain pre-existing untracked evidence at `docs/evidence/f4.5-datum-01/`. Treat it as user-owned evidence and do not add, delete, move, stash, reset, clean or modify it.

## 2. Mandatory governance preflight

Read in order:

1. `AGENTS.md`
2. `docs/00_Governance/AI_CONSTITUTION.md`
3. `docs/00_Governance/PROJECT-CONSTITUTION.md`
4. `docs/00_Governance/ACTIVE_LOCKSET.json`
5. active programme roadmap referenced by the lockset
6. `docs/00_Governance/AGENT_LOCKSET_PROTOCOL.md`
7. `docs/10_Development/N09A-AGENTIC-RECON-DIRECTIVE.md`
8. `docs/10_Development/N09A-KLOPP-ADJUDICATION-AND-IMPLEMENTATION-LOCK.md`
9. this directive

Then run:

```bash
git branch --show-current
git rev-parse HEAD
git status --short
pnpm run lockset:verify
```

Return the exact `LOCKSET COMPLIANCE ACK` required by governance with `ACTIVE_STAGE=N09A` and `ROLE=AUDIT`.

If branch, lineage, lockset, local safety or governance mismatches, STOP.

## 3. Authoritative review range

Review product/code changes from:

```text
8d73ed64765a502b411c9c11349ba473be8fa9c3
..
87ae0df22d262cb6937e93a75e286239c40bfa45
```

The later documentation-only pre-prove directive commit may be present at HEAD; do not mistake it for product change.

Expected product change set:

- `src/app/ngamsoi-n09-records.css`
- `src/app/site-diary/DiaryManagementList.tsx`
- `src/app/site-diary/DiaryDetail.tsx`
- `src/app/site-diary/DailyEntryForm.tsx`
- `tests/integration/ui/diaryManagementList.test.ts`
- `tests/integration/ui/diaryDetail.test.ts`
- `tests/e2e/n09a-records-current-state.e2e.spec.ts`

Unexpected product/domain files are a BLOCKER.

## 4. Highest-risk review — DailyEntryForm semantic drift

This is mandatory.

The repair intentionally needs only a narrow REKOD edit-mode presentation hook in `DailyEntryForm`. The implementation diff is textually broad because JSX/comments were compacted while the file was reconstructed. Do not accept textual similarity as semantic proof.

Compare the base and repair versions carefully and answer whether **all pre-existing behaviour is semantically preserved outside the intended additions**.

The only intended semantic additions are:

1. optional presentation prop `uiContext?: 'DEFAULT' | 'RECORDS_EDIT'`;
2. `RECORDS_EDIT` marker on the edit form;
3. `Pelaksana` and `Kontraktor Utama` user-facing copy only when invoked from REKOD edit mode;
4. no change to default NEW/CONTINUE presentation from this hook;
5. no change to submit/persistence/lifecycle/edit authority.

Explicitly diff/audit:

- `resolveDailyEntryMode`;
- `submitDailyEntry` payloads and endpoints;
- NEW activity lifecycle transitions;
- CONTINUE lifecycle transitions and completion recovery;
- EDIT `PATCH /api/site-diary/[siteDiaryId]` behaviour;
- optimistic concurrency token `expected_last_modified_at`;
- canonical `editingSiteDiaryId` authority;
- activity/source mode exclusivity;
- continuation prefill/reset behaviour;
- workforce persistence filtering;
- weather/print-context persistence;
- `onSuccess` / `onCancel` behaviour;
- all DEFAULT-mode copy/controls outside the REKOD-specific hook.

If any behaviour was deleted, changed, reordered in a consequential way, or cannot be proven equivalent, classify **REPAIR BEFORE PROVE**. Do not wave through broad churn simply because tests happen to pass.

## 5. Adjudicated repair checks

Verify each accepted AG finding was repaired faithfully:

### R1/R3 completion-green recurrence

No decorative REKOD element may use completion-green / `--ng-established` merely for current/active/print/audit styling.

Inspect actual active CSS and computed style where runtime is available for:

- current revision rail;
- current record row rail;
- detail header rail;
- historical detail rail;
- audit timeline dots;
- print action.

Historical warning/amber and tactical current/orange are allowed. Genuine success/completion green semantics remain protected elsewhere.

### R2 field language

User-facing REKOD list/filter/detail/edit presentation must use:

- `Pelaksana`
- `Kontraktor Utama`
- `NSC`

Underlying `CONTRACTOR` persistence enum must remain unchanged and must not leak as user-facing copy.

### R4 workforce readback

Detail readback must clearly expose saved values as:

- `B`
- `BB`
- `A`
- `JUMLAH`

Do not alter stored workforce values, TRE/WRE or zero semantics.

### R5 detail navigation

Record detail must have one deliberate back path. The old detail-mode duplicate `Rekod Semasa / Semakan Terdahulu` context tablist must not remain.

### R6 filter geometry

Verify the four secondary filters form a balanced layout under the full-width search field at half/wide widths and a coherent 2x2 layout on phone.

### R7 Edit Rekod bounded visual authority

Verify REKOD edit:

- still enters the existing Edit Engine with canonical `site_diary_id`;
- is sharp/sleek;
- uses `Pelaksana` / `Kontraktor Utama`;
- retains cancel/save semantics;
- does not globally restyle unrelated NEW/CONTINUE modes;
- does not reopen sealed CATAT F4.5 authority.

### R9 detail states

Loading/error/warning surfaces must be sharp and usable.

## 6. CSS authority / recurrence review

Inspect `src/app/ngamsoi-n09-records.css` for:

- no decorative `--ng-established` recurrence;
- no new generic/global selector owning unrelated workspaces;
- one owner per REKOD concern;
- no override-on-override generation against F4.5;
- no rounded operational surface leakage in REKOD edit/detail/list;
- no horizontal overflow introduced by workforce/filter matrices;
- no fragile class-name substring logic where a semantic data attribute is available.

A selector scoped under `data-record-edit-authority="N09A"` is intended to be presentation-only and must not mutate domain behaviour.

## 7. Browser evidence review

Review `tests/e2e/n09a-records-current-state.e2e.spec.ts` as evidence, not as implementation authority.

It must genuinely cover production-runtime behaviour with `retries=0` and normal user-visible interactions for:

- 390x844 phone;
- 960x900 half-window;
- 1280x900 wide desktop;
- current REKOD list;
- Pelaksana / Kontraktor Utama;
- balanced filter geometry;
- no horizontal overflow;
- explicit anti-green recurrence checks;
- historical revision selection through UI;
- historical detail read-only state;
- one back path;
- current detail workforce readback;
- canonical print href;
- Edit Rekod entry and cancel return;
- sharp edit geometry.

Flag any fixture route that accidentally bypasses required product navigation, fails open on unexpected application API calls, or creates misleading evidence.

Do not weaken assertions, add retries, force-click, relax geometry, or replace browser evidence with source-string presence checks.

## 8. Pre-PROVE execution

Run, if the local environment permits:

```bash
pnpm run lockset:verify
pnpm exec vitest run tests/integration/ui/diaryManagementList.test.ts tests/integration/ui/diaryDetail.test.ts tests/integration/ui/diaryHistoryTimeline.test.ts tests/contract/recordsReadRepository.contract.test.ts tests/integration/ui/siteDiaryWorkspace.test.ts
pnpm run typecheck
pnpm run typecheck:api
```

Then run the formal N09A browser spec if the required production runtime/build environment can be established without bypass:

```bash
pnpm exec playwright test tests/e2e/n09a-records-current-state.e2e.spec.ts --project=chromium --retries=0
```

If browser execution is unavailable because the built runtime or environment is not available, report that as UNVERIFIED. Do not fabricate PASS.

Do **not** open an official proving PR. This is pre-PROVE only.

## 9. Protected boundaries

Confirm untouched:

- NGAMSOI mark geometry;
- REKOD #7 daily aggregation / daily approval redesign;
- official print content/aggregation semantics;
- approval business semantics;
- canonical Site Diary identity;
- Edit Engine `editingReportId === site_diary_id` authority;
- Programme/Revision authority and no-cross-revision rules;
- append-only audit/history;
- DB/migrations/RLS/RBAC/auth/security;
- Activity/Site Diary domain ownership;
- official weather authority;
- sealed F4.5 CATAT behaviour.

Any crossing is `STOP-ESCALATE`.

## 10. Required report

Return exactly:

```text
LOCKSET COMPLIANCE ACK
...

PRE-PROVE VERDICT
READY FOR EXACT-HEAD PROVE / REPAIR BEFORE PROVE / STOP-ESCALATE

CHANGESET BOUNDARY CHECK
...

DAILYENTRYFORM SEMANTIC DIFF AUDIT
PASS / FAIL / UNVERIFIED
- intended additions
- any unintended semantic change
- evidence

ADJUDICATED FINDINGS RETEST
R1/R3 ...
R2 ...
R4 ...
R5 ...
R6 ...
R7 ...
R9 ...

CSS AUTHORITY / RECURRENCE CHECK
...

TARGETED TEST RESULTS
...

N09A BROWSER EVIDENCE REVIEW
...

PROTECTED BOUNDARY CHECK
...

OFFICIAL PROVE RED COUNT
0 (pre-prove findings do not count as official product CI reds)

FINAL HANDOFF TO HQ/KLOPP
PROCEED TO EXACT-HEAD PROVE / REPAIR BEFORE PROVE / STOP FOR GOVERNANCE DECISION
```

After the report, STOP. HQ/Klopp adjudicates any remaining issue.
