# N09A PHYSICAL R1 — AGENTIC PRE-PROVE DIRECTIVE

**Role:** READ-ONLY agentic challenger (Antigravity or Codex)  
**Stage:** N09A_PHYSICAL_R1_REMEDIATION  
**Target branch:** `isolate/N09A-physical-r1-remediation`  
**Adjudicated base before physical R1 remediation:** `7d9cf7227263c0b4eaec8ef311a700f50cf5432b`  
**Initial bounded remediation commit:** `8ae72aac887ab986c21edbb0cd499afe7b2be199`  
**Official exact-head PROVE:** NOT YET AUTHORISED

## 1. Mission

Independently challenge the bounded P1–P8 remediation before HQ sends any candidate to official exact-head proving.

Do not optimise for green. Look for product regression, governance drift, preview leakage, semantic bypass, stale tests, compile/build defects and missing runtime evidence.

Do **not** implement fixes. HQ/Klopp adjudicates and implements any valid finding.

## 2. Mandatory preflight

Read, in order:

1. `AGENTS.md`
2. `docs/00_Governance/AI_CONSTITUTION.md`
3. `docs/00_Governance/PROJECT-CONSTITUTION.md`
4. `docs/00_Governance/ACTIVE_LOCKSET.json`
5. `docs/10_Development/NGAMSOI-N09PLUS-UIUX-PROGRAM-CLOSURE-ROADMAP.md`
6. `docs/00_Governance/AGENT_LOCKSET_PROTOCOL.md`
7. `docs/10_Development/N09A-PHYSICAL-ACCEPTANCE-R1-LOCKS.md`
8. relevant implementation/tests discovered during review

Run:

```text
pnpm run lockset:verify
```

Expected current lockset after bounded remediation:

```text
LOCKSET_VERSION=2026.09.06.2
LOCKSET_HASH=1ba57312064caf90de45f48f236424615ac9fe4095a5482b36d665553756b6ca
LOCKSET_LOCKED_REQUIREMENTS=47
```

Record actual output. Stop on mismatch.

The report must begin with a full `LOCKSET COMPLIANCE ACK` required by `AGENT_LOCKSET_PROTOCOL.md`, with:

```text
ACTIVE_PROGRAMME=NGAMSOI-N09PLUS-UIUX-CLOSURE
ACTIVE_STAGE=N09A_PHYSICAL_R1_REMEDIATION
ROLE=AUDIT
```

## 3. Local evidence safety

A pre-existing user-owned untracked folder may exist:

`docs/evidence/f4.5-datum-01/`

Do not add, edit, inspect destructively, delete, move, stash, reset, clean or otherwise modify it.

## 4. Exact remediation authority

Audit against P1–P8 and the exact scope in:

`docs/10_Development/N09A-PHYSICAL-ACCEPTANCE-R1-LOCKS.md`

The accepted user-facing source vocabulary is:

```text
internal MSP -> Skop Kontrak
internal VO  -> Perubahan Skop (VO)
```

`Pelaksana`, `Kontraktor Utama`, and `NSC` remain accepted and protected.

REKOD range filtering remains range filtering, but its date controls must belong to the HARIAN date-control grammar and must not permit future local dates. CATAT HARIAN must also reject future dates.

The development-only `?preview=ngamsoi` acceptance environment must make the normal physical path reachable:

```text
CATAT
-> Save
-> Tunjuk Rekod
-> current record card
-> Lihat Butiran
-> workforce / audit / print handoff visibility
-> Edit Rekod
-> Batal
-> Semakan Terdahulu
-> historical record
-> read-only detail with no Edit Rekod
```

## 5. Highest-risk independent checks

### A. Preview boundary must not leak into production

Inspect `src/lib/ngamsoiPreview.ts`, `AuthContext.tsx`, and all changed callers.

Confirm:

- preview remains disabled when `NODE_ENV === 'production'`;
- no production route, database table, migration, auth bypass or server-side preview endpoint was added;
- no RLS/RBAC/auth semantics were weakened;
- preview in-memory state is reachable only through the existing development-only preview boundary;
- production fetch behaviour remains unchanged when preview mode is off.

Any leakage is a P0 governance blocker.

### B. Internal source semantics must remain unchanged

Confirm user-facing copy changed without changing canonical internal semantics:

- sourceType remains `MSP | VO`;
- MSP task IDs and VO item IDs still route through their existing canonical fields;
- no persistence/API/domain enum rename occurred;
- specific VO references remain intact.

Look for remaining normal user-facing `MSP`, `VO / APK`, `VO/APK`, `Jadual MSP`, or `/APK` copy in the CATAT/REKOD acceptance path. Governance/history text and code identifiers do not count as user-facing leakage.

### C. Date authority

Confirm:

- CATAT HARIAN date has current-local-date max authority;
- REKOD `Tarikh mula` and `Tarikh akhir` have the same no-future rule;
- past dates remain usable;
- REKOD retains independent from/to range semantics;
- no accidental UTC date rollover creates tomorrow/yesterday around Malaysia midnight;
- no Programme/Actual Start/weather authority semantics changed.

### D. Preview current/historical identity and edit authority

Confirm the preview state uses canonical-shaped IDs and preserves existing runtime checks:

- current record belongs to current Approved revision and is editable through the normal `DiaryDetail` authority check;
- historical record belongs to Superseded read-only revision and exposes no Edit Rekod;
- `editingReportId` / edit identity remains canonical Site Diary identity;
- detail identity validation passes without bypass;
- PATCH keeps optimistic concurrency (`expected_last_modified_at`) and stale writes still fail with 409;
- history remains append-only presentation evidence;
- workforce readback remains B / BB / A / JUMLAH.

### E. Save -> REKOD state continuity

Verify a preview CATAT save updates what REKOD subsequently reads through normal workspace navigation. No internal route jump, direct state mutation from the UI, or force-click bypass is acceptable.

### F. Temporary implementation tooling

Confirm the resulting tree does **not** contain:

- `scripts/apply-n09a-physical-r1-remediation.mjs`
- `.github/workflows/n09a-r1-remediation-apply.yml`

These were isolate-only one-shot tooling and are not product/governance artifacts.

## 6. Required local verification

Run at minimum:

```text
pnpm run lockset:verify
pnpm run typecheck
pnpm run typecheck:api
pnpm exec vitest run \
  tests/unit/ui/ngamsoiPreviewN09AR1.test.ts \
  tests/unit/ui/f45FinalVisualContract.test.ts \
  tests/unit/ui/f45UiAuthorityCutover.test.ts \
  tests/integration/ui/diaryManagementList.test.ts \
  tests/integration/ui/diaryDetail.test.ts \
  tests/integration/ui/diaryHistoryTimeline.test.ts \
  tests/integration/ui/siteDiaryWorkspace.test.ts
pnpm exec playwright test tests/e2e/n09a-records-current-state.e2e.spec.ts --project=chromium --retries=0
```

If environment permits, also run the development interactive preview through the normal UI path and report what was actually observed.

Do not use browser source-string checks as a substitute for runtime evidence.

## 7. Test/evidence challenge

Check whether evidence genuinely protects:

- `Skop Kontrak` and `Perubahan Skop (VO)` in CATAT and REKOD;
- no normal-path `/APK` or raw MSP category copy recurrence;
- unchanged internal `MSP | VO` values;
- Pelaksana wording retained;
- CATAT and REKOD no-future date enforcement;
- current preview record visible after Save;
- current detail/edit/cancel path;
- historical read-only detail;
- workforce, audit and print-handoff visibility;
- phone / half / wide no-horizontal-overflow checks;
- retries=0.

Do not weaken old N09A assertions to fit the remediation.

## 8. Required diff audit

Inspect:

```text
7d9cf7227263c0b4eaec8ef311a700f50cf5432b..HEAD
```

Separate:

- governance/lock changes;
- product presentation changes;
- development-only preview changes;
- test changes;
- anything outside the authorised scope.

Flag any unexplained file or semantic expansion.

## 9. Report format

Return exactly:

1. `LOCKSET COMPLIANCE ACK`
2. `EXECUTIVE VERDICT`
3. `P1-P8 COMPLIANCE MATRIX`
4. `PREVIEW PRODUCTION-BOUNDARY AUDIT`
5. `SOURCE SEMANTICS / COPY AUDIT`
6. `DATE AUTHORITY AUDIT`
7. `CURRENT / HISTORICAL / EDIT AUTHORITY AUDIT`
8. `TEST AND RUNTIME RESULTS`
9. `BLOCKERS` — P0/P1/P2 only, each with file, evidence and bounded correction direction
10. `NON-BLOCKING OBSERVATIONS`
11. `PROTECTED BOUNDARY CHECK`
12. `FINAL HANDOFF`

Final handoff must be exactly one of:

```text
READY FOR EXACT-HEAD PROVE
REPAIR BEFORE PROVE
STOP FOR GOVERNANCE DECISION
```

Then STOP. Do not implement anything.
