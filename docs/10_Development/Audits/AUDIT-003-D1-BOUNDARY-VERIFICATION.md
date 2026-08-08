# AUDIT-003 — D1 BOUNDARY VERIFICATION

* **Audit ID**: AUDIT-003
* **Audit Type**: D1 Remediation Verification Audit
* **Auditor**: Implementation and Technical Audit Agent
* **Authority**: HQ / Chief Architect
* **Date**: 2026-08-09
* **Audit Branch**: `audit/AUDIT-003-d1-boundary-verification`
* **Commit Under Audit**: `177d0423d32262b0d38963a9bbf893d2b90d22de`
* **Feature Branch**: `feature/program-kerja-boundary`

---

## 1. D1 Locked Requirement

> "Operational engines shall not bypass the Program Kerja boundary to consume
> raw MSP scheduling data directly. Operational engines shall consume
> scheduling-derived information through the active, approved Program Kerja."

**MSP remains the authoritative planning source.**

---

## 2. VERIFY 1 — Dependency Boundary

### Objective

Confirm TRE, WRE, and MRE do NOT directly depend on `MspResourceRepository`,
`MspWorkforceRepository`, `IMspMaterialRepository`, or raw MSP database access.

### Method

Full dependency graph trace: service constructors → composition roots → container.

### Evidence

#### TRE (`src/services/TreEngineService.ts`)

Constructor dependencies via `ITreEngineServiceDependencies` (L12–18):

| Dependency | Type |
|---|---|
| `programKerjaBoundaryService` | `IProgramKerjaBoundaryService` |
| `tradeLibraryRepository` | `ITradeLibraryRepository` |
| `knowledgeEngineAdapter` | `IKnowledgeEngineAdapter` |
| `clock` | `IClock` |
| `logger` | `Logger` |

Composition root (`src/composition/treComposition.ts`): injects
`createProgramKerjaBoundaryService()`. Zero MSP repository injection.

#### WRE (`src/services/WorkforceEngineService.ts`)

Constructor dependencies via `IWorkforceEngineServiceDependencies` (L24–31):

| Dependency | Type |
|---|---|
| `programKerjaBoundaryService` | `IProgramKerjaBoundaryService` |
| `tradeWorkforceLibraryRepository` | `ITradeWorkforceLibraryRepository` |
| `workforceRuleRepository` | `IWorkforceRuleRepository` |
| `evaluatorRegistry` | `IRuleEvaluatorRegistry` |
| `clock` | `IClock` |
| `logger` | `Logger` |

Composition root (`src/composition/wreComposition.ts`): injects
`createProgramKerjaBoundaryService()`. Zero MSP repository injection.

#### MRE (`src/services/MaterialEngineService.ts`)

Constructor dependencies via `IMaterialEngineServiceDependencies` (L24–30):

| Dependency | Type |
|---|---|
| `programKerjaBoundaryService` | `IProgramKerjaBoundaryService` |
| `tradeMaterialLibraryRepository` | `ITradeMaterialLibraryRepository` |
| `evaluatorRegistry` | `IMaterialRuleEvaluatorRegistry` |
| `clock` | `IClock` |
| `logger` | `Logger` |

Composition root (`src/composition/mreComposition.ts`): injects
`createProgramKerjaBoundaryService()`. Zero MSP repository injection.

#### Container (`src/app/api/_shared/container.ts`)

`treEngine()`, `workforceEngine()`, `materialEngine()` delegate to composition
root factories. Zero direct MSP repository injection.

#### Import scan across `src/`

Files importing MSP repositories:

| File | Role | In engine dependency chain? |
|---|---|---|
| `src/services/ProgramKerjaBoundaryService.ts` | Authorized mediator | No (upstream of engines) |
| `src/composition/programKerjaComposition.ts` | Constructs boundary service | No (upstream of engines) |
| `src/repositories/MspResourceRepository.ts` | Repository implementation | No |
| `src/repositories/MspWorkforceRepository.ts` | Repository implementation | No |

Zero engine service files import MSP repositories. Zero raw Supabase
database access in any engine file.

### Verdict: **PASS**

---

## 3. VERIFY 2 — Revision Identity Propagation

### Objective

Verify all TRE/WRE/MRE resolution paths carry `programmeId`, `revisionId`,
`taskId` from the originating request through to the boundary.

### Evidence

#### Resolution context types

All three context types define `revisionId: string` as **required**:

| Type | File | Field |
|---|---|---|
| `TreResolutionContext` | `src/types/tre.ts` L24 | `revisionId: string` (required) |
| `WorkforceResolutionContext` | `src/types/wre.ts` L118 | `revisionId: string` (required) |
| `MaterialResolutionContext` | `src/types/mre.ts` L141 | `revisionId: string` (required) |

#### Engine boundary calls

All three engines guard with `if (ctx.mspTaskId && ctx.revisionId)` before
calling the boundary service:

| Engine | File | Lines | Boundary call |
|---|---|---|---|
| TRE | `TreEngineService.ts` | L64–69 | `getProgramKerjaTrade(ctx.programmeId, ctx.revisionId, ctx.mspTaskId)` |
| WRE | `WorkforceEngineService.ts` | L51–56 | `getProgramKerjaWorkforce(ctx.programmeId, ctx.revisionId, ctx.mspTaskId)` |
| MRE | `MaterialEngineService.ts` | L50–55 | `getProgramKerjaMaterials(ctx.programmeId, ctx.revisionId, ctx.mspTaskId)` |

All three parameters (`programmeId`, `revisionId`, `taskId`) are propagated
to the boundary.

### Verdict: **PASS** (with caveats — see F-001, F-002)

---

## 4. VERIFY 3 — Active/Approved Revision Enforcement

### Objective

Prove boundary cannot return scheduling-derived data unless revision is
validated.

### Evidence

`ProgramKerjaBoundaryService.validateActiveApprovedRevision()` (L135–187):

| Check | Implementation | Lines |
|---|---|---|
| Parameters present | `if (!programmeId \|\| !revisionId \|\| !taskId)` → `Failure(InvalidProgramKerjaContextError)` | L140–152 |
| Revision exists | `revisionRepo.findById(revisionId)` → `Success(false)` if null | L153–162 |
| Revision belongs to programme | `revision.programmeId !== programmeId` → `Success(false)` | L164–171 |
| Revision status is `'Approved'` | `revision.status !== 'Approved'` → `Success(false)` | L173–183 |
| Task belongs to revision | **NOT IMPLEMENTED** | — |

All three public methods (`getProgramKerjaTrade`, `getProgramKerjaWorkforce`,
`getProgramKerjaMaterials`) call `validateActiveApprovedRevision` before
any MSP repository query. Confirmed at L48, L76, L107.

### Test matrix

| Scenario | Expected | Tested? | Test file |
|---|---|---|---|
| A. Approved revision | SUCCESS | ✅ | `ProgramKerjaBoundaryService.test.ts` Test 1 |
| B. Draft revision | REJECT | ✅ | `ProgramKerjaBoundaryService.test.ts` Test 2 |
| C. Archived revision | REJECT | ✅ | `ProgramKerjaBoundaryService.test.ts` Test 3 |
| D. revisionId from another programme | REJECT | ✅ | `ProgramKerjaBoundaryService.test.ts` Test 4 |
| E. Task belonging to another revision | REJECT | ❌ **Not implemented** | — |
| F. Missing revisionId | REJECT | ✅ | `ProgramKerjaBoundaryService.test.ts` Test 6 |

### Verdict: **PARTIAL PASS** — See Finding F-003

---

## 5. VERIFY 4 — No "Latest" Fallback

### Objective

Search for any fallback that automatically selects a revision without
explicit `revisionId`.

### Evidence

#### ProgramKerjaBoundaryService

Zero fallback logic. Missing `revisionId` → immediate `Failure`. No calls
to `findActiveRevision`, `findLatest`, `getCurrent`, or `isCurrent`. No
programme-only or task-only lookup paths.

#### OpenActivityService — `'rev-approved-default'` fallback

**CRITICAL FINDING**: `OpenActivityService.ts` uses:

```typescript
revisionId: cmd.revisionId ?? 'rev-approved-default'  // L114, L188, L256
```

This is a hardcoded phantom revision ID. When `CreateActivityCommand.revisionId`
is `undefined`, the string literal `'rev-approved-default'` is passed to all
three engines. Since no database row with `revisionId = 'rev-approved-default'`
exists, `validateActiveApprovedRevision` returns `Success(false)`, causing
Priority 1 (boundary) resolution to silently fail for all three engines.

This is functionally equivalent to a "latest fallback" — it defeats
boundary enforcement by design for any caller that omits `revisionId`.

### Verdict: **FAIL** — See Finding F-001

---

## 6. VERIFY 5 — Database Query Scope

### Objective

Confirm the final scheduling data returned corresponds to the validated
revision.

### Evidence

After `validateActiveApprovedRevision` succeeds, the boundary service calls:

| Method | Repository call | Parameters |
|---|---|---|
| `getProgramKerjaTrade` L56 | `findResourceTradeByMspTask(programmeId, taskId)` | **No `revisionId`** |
| `getProgramKerjaWorkforce` L84 | `findWorkforceByMspTask(programmeId, taskId)` | **No `revisionId`** |
| `getProgramKerjaMaterials` L115 | `findMaterialsByMspTask(programmeId, taskId)` | **No `revisionId`** |

#### `MspResourceRepository.findResourceTradeByMspTask()` (L23–42)

```typescript
const result = await this.adapter.selectOne<MspResourceRow>('msp_resources', {
  programme_id: programmeId,
  task_id: mspTaskId,
});
```

Query filter: `{ programme_id, task_id }`. **No `revision_id` filter.**

#### `MspResourceRow` schema (L7–14)

```typescript
export interface MspResourceRow {
  readonly resource_id: string;
  readonly programme_id: string;
  readonly task_id: string;
  readonly trade_code: string;
  readonly trade_name: string;
  readonly trade_category?: string | null;
}
```

No `revision_id` column in the row type.

#### Assessment

The `msp_resources` table currently has no `revision_id` column. MSP
scheduling data represents the **current** authoritative planning state,
not revision-specific historical snapshots. The boundary validation ensures
that the caller possesses an approved revision context before accessing
current MSP data.

However, this means revision validation is an **authorization gate**, not a
**data scoping filter**. If the MSP data is updated (new import) while an
older revision remains `'Approved'`, the boundary would return current MSP
data under the old revision's authorization.

This is architecturally acceptable if MSP always reflects the current
approved state. It becomes a data integrity risk if:
- Multiple revisions can be `'Approved'` simultaneously
- MSP data changes between revision approvals
- Historical revision-specific queries are required

### Verdict: **OBSERVATION** — See Finding F-004

---

## 7. VERIFY 6 — Test Quality

### Summary

| Test File | Tests | Pass |
|---|---|---|
| `ProgramKerjaBoundaryService.test.ts` | 8 | ✅ |
| `TreEngineService.test.ts` | 4 | ✅ |
| `WorkforceEngineService.test.ts` | 5 | ✅ |
| `MaterialEngineService.test.ts` | 5 | ✅ |
| `openActivityTreIntegration.integration.test.ts` | 4 | ✅ |
| **Total** | **26** | ✅ |

### Architectural invariant coverage

| Invariant | Covered? | Evidence |
|---|---|---|
| Engines cannot reach MSP repos directly | ✅ | TypeScript DI enforces at compile time; tests use boundary mocks |
| Approved revision returns data | ✅ | Boundary test 1, 7, 8 |
| Draft revision rejected | ✅ | Boundary test 2 |
| Archived revision rejected | ✅ | Boundary test 3 |
| Wrong-programme revision rejected | ✅ | Boundary test 4 |
| Missing revisionId rejected | ✅ | Boundary test 6 |
| Task-to-revision scoping | ❌ | Not implemented, not tested |
| OpenActivity → TRE → boundary integration | ✅ | Integration test 1 |
| TRE priority cascade (1→2→3→fail) | ✅ | TRE tests 1–4 |
| WRE priority cascade (1→2→3→fail) | ✅ | WRE tests 2–5 |
| MRE priority cascade (1→2→3→fail) | ✅ | MRE tests 1, 3–5 |

### Gaps

1. No test for Draft/Archived revision propagating through TRE/WRE/MRE
   end-to-end (only boundary is tested in isolation).
2. No test for engine behavior when boundary returns `Failure` (only
   `Success(null)` case is tested).
3. No test for `'rev-approved-default'` fallback behavior.
4. Integration tests mock the boundary service rather than using real
   `ProgramKerjaBoundaryService` with real revision validation.
5. No `{ _tag: 'Success' }` anti-pattern found (previous bug is fixed).

### Verdict: **PARTIAL PASS** — See Finding F-005

---

## 8. VERIFY 7 — Open Activity Propagation

### Objective

Trace `revisionId` through the full Open Activity creation path.

### Evidence

#### `CreateActivityCommand` (`src/services/IOpenActivityService.ts` L9)

```typescript
readonly revisionId?: string | undefined;
```

**`revisionId` is OPTIONAL.**

#### `OpenActivityService.createActivity()` context construction

| Engine | Line | revisionId source |
|---|---|---|
| TRE | L114 | `cmd.revisionId ?? 'rev-approved-default'` |
| WRE | L188 | `cmd.revisionId ?? 'rev-approved-default'` |
| MRE | L256 | `cmd.revisionId ?? 'rev-approved-default'` |

#### Primary API caller

`POST /api/site-diary/[diaryId]/activities` (`route.ts` L33–56):

```typescript
const result = await service.createActivity({
  siteDiaryId: diaryId,
  programmeId: body.programme_id,
  taskId: body.task_id,
  activityName: body.activity_name,
  // ...
  createdBy: body.created_by,
  // revisionId is NOT passed
});
```

`CreateActivityRequestDto` has **no `revision_id` field**.

#### Runtime path when revisionId is omitted

1. API caller passes `cmd.revisionId = undefined`
2. OpenActivityService applies `'rev-approved-default'`
3. Engine guard `if (ctx.mspTaskId && ctx.revisionId)` passes (truthy string)
4. Boundary receives `revisionId = 'rev-approved-default'`
5. `revisionRepo.findById('rev-approved-default')` returns `null`
6. Boundary returns `Success(null)` (revision not found)
7. Engine treats as Priority 1 miss, falls back to Priority 2/3

**Result**: Priority 1 boundary resolution is permanently disabled for
all API callers. The boundary exists but is unreachable through the
production API surface.

#### Edge case: empty string `revisionId`

If `cmd.revisionId = ""`:
1. `"" ?? 'rev-approved-default'` → `""` (nullish coalescing does not
   catch empty string)
2. Engine guard `if (ctx.mspTaskId && ctx.revisionId)` → `false` (falsy)
3. Boundary is never called
4. Priority 1 silently skipped

### Verdict: **FAIL** — See Findings F-001, F-002

---

## 9. VERIFY 8 — ADR Conformance

### ADR-011 reviewed

`docs/01_ADR/ADR-011-Program-Kerja-Operational-Boundary.md`

### Conformance matrix

| ADR Claim | Implementation | Match? |
|---|---|---|
| Domain Facade `IProgramKerjaBoundaryService` | Implemented in `src/services/ProgramKerjaBoundaryService.ts` | ✅ |
| Explicit DTO contracts | Implemented in `src/dto/programKerjaDto.ts` | ✅ |
| MSP remains planning authority | MSP repos remain intact, accessed internally by boundary | ✅ |
| Zero direct MSP dependencies in Zon Operasi | Confirmed — all 3 engines use boundary only | ✅ |
| Mandatory revision safety (programmeId, revisionId, taskId) | Implemented in `validateActiveApprovedRevision` | ✅ |
| revisionId must exist, belong to programmeId, status 'Approved' | Implemented | ✅ |
| Zero database migrations | Confirmed — no migration files | ✅ |
| Dependency direction diagram | Matches actual graph | ✅ |

### Discrepancies

1. ADR-011 states "Every scheduling-derived operational resolution must have
   explicit `programmeId`, `revisionId`, `taskId`." However,
   `CreateActivityCommand.revisionId` is optional and the primary API does
   not supply it (F-001, F-002).

2. ADR-011 does not document the `'rev-approved-default'` fallback behavior
   or the differentiated return types (`Failure` vs `Success(null)`) for
   different boundary rejection scenarios.

### Verdict: **PARTIAL PASS** — Implementation matches ADR claims, but ADR
overstates the strength of revision enforcement given the optional
`revisionId` in the command surface.

---

## 10. Findings

### F-001 — Phantom Revision Default Defeats Boundary (P1)

**Severity**: P1 — Major conformance failure

**Location**: `src/services/OpenActivityService.ts` L114, L188, L256

**Description**: When `CreateActivityCommand.revisionId` is `undefined`,
OpenActivityService substitutes the hardcoded string `'rev-approved-default'`.
This phantom revision ID will never match a real database row, causing
`validateActiveApprovedRevision` to return `Success(false)` (revision not
found). Priority 1 boundary resolution silently fails, and engines fall back
to Priority 2/3 sources that do not enforce revision scoping.

**Impact**: The Program Kerja boundary exists structurally but is
**unreachable through the primary API surface**. All production activity
creation currently bypasses boundary enforcement because the API caller
never supplies `revisionId`.

**D1 Conformance**: The boundary **exists and functions correctly when
called with a real revision ID**. However, D1 requires operational engines
to consume scheduling-derived information "through the active, approved
Program Kerja." The fallback mechanism prevents this from occurring in
practice.

**Recommendation**: HQ decision required — either:
- (A) Make `revisionId` mandatory in `CreateActivityCommand` and API DTO, or
- (B) Replace the phantom default with a legitimate active-revision lookup
  (but see VERIFY 4 — this creates a "latest" fallback risk)

---

### F-002 — API DTO Missing `revision_id` (P1)

**Severity**: P1 — Major conformance failure

**Location**: `src/app/api/site-diary/[diaryId]/activities/route.ts` L33–56;
`src/app/api/_shared/activity.dto.ts`

**Description**: `CreateActivityRequestDto` does not include a `revision_id`
field. The API route handler constructs `CreateActivityCommand` without
passing `revisionId`. Even if a frontend caller knows the active revision,
there is no API surface to supply it.

**Impact**: The production API surface cannot reach Priority 1 boundary
resolution. Program Kerja boundary enforcement is architecturally present
but operationally disconnected from the API contract.

**Recommendation**: Add `revision_id: string` as a required field in
`CreateActivityRequestDto` and pass it through in the route handler.

---

### F-003 — Task-to-Revision Validation Not Implemented (P2)

**Severity**: P2 — Moderate conformance gap

**Location**: `src/services/ProgramKerjaBoundaryService.ts` L135–187

**Description**: `validateActiveApprovedRevision()` checks that `taskId` is
non-empty but does NOT verify that `taskId` actually belongs to the
validated `revisionId`. The validation confirms the revision is approved, then
the subsequent MSP query uses `(programmeId, taskId)` without revision scoping.

A caller could theoretically pass a valid approved `revisionId` with a `taskId`
from a completely different revision, and the boundary would return whatever MSP
data exists for that `(programmeId, taskId)` combination.

**Mitigating factor**: MSP data is currently stored without `revision_id`
scoping (see F-004), so the query result is the same regardless. This becomes
a real issue only if revision-specific MSP data is introduced.

**Recommendation**: Log as a known gap. Implement task-to-revision
validation when MSP data model supports revision scoping.

---

### F-004 — MSP Query Scope Does Not Filter by Revision (P2)

**Severity**: P2 — Moderate (observation, potential future risk)

**Location**: `src/repositories/MspResourceRepository.ts` L27–30;
`src/services/ProgramKerjaBoundaryService.ts` L56, L84, L115

**Description**: After `validateActiveApprovedRevision` succeeds, the
subsequent MSP repository queries use only `(programmeId, taskId)`:

```typescript
this.mspResourceRepo.findResourceTradeByMspTask(programmeId, taskId)
```

The `MspResourceRow` type does not include a `revision_id` column. The
`msp_resources` table stores current planning data, not revision-specific
snapshots.

**Assessment**: This is consistent with the architectural principle that
"MSP remains the authoritative planning source" — MSP data represents the
current planning state, and the boundary validation serves as an authorization
gate (caller must possess an approved revision context). However:

- If multiple revisions can be `'Approved'` simultaneously, data leakage
  between revision contexts is theoretically possible.
- Historical queries are not supported.

**Recommendation**: HQ decision required — confirm whether current-only MSP
data scoping is acceptable, or whether revision-specific MSP data partitioning
is a future requirement.

---

### F-005 — Test Gaps in Boundary-Engine Integration (P2)

**Severity**: P2 — Moderate

**Location**: Test files listed below

**Description**: The following test scenarios are missing:

1. No end-to-end test of Draft/Archived revision flowing through
   OpenActivity → Engine → Boundary → rejection → fallback.
2. No test for engine behavior when boundary returns `Failure(error)`
   (as opposed to `Success(null)`).
3. No test for `'rev-approved-default'` fallback path (F-001).
4. Integration tests mock `IProgramKerjaBoundaryService` rather than
   testing with real `ProgramKerjaBoundaryService` and revision validation.

**Recommendation**: Add targeted integration tests once F-001 and F-002
are resolved.

---

### F-006 — Empty String `revisionId` Bypasses Boundary Silently (P3)

**Severity**: P3 — Hygiene

**Location**: `src/services/TreEngineService.ts` L64;
`src/services/WorkforceEngineService.ts` L51;
`src/services/MaterialEngineService.ts` L50;
`src/services/OpenActivityService.ts` L114

**Description**: If `cmd.revisionId = ""` (empty string):
- Nullish coalescing `?? 'rev-approved-default'` does NOT catch empty string
- Engine guard `if (ctx.mspTaskId && ctx.revisionId)` evaluates to `false`
- Priority 1 resolution is silently skipped without logging

This is benign (boundary would reject it anyway) but creates a silent
bypass path that is not logged or tracked.

**Recommendation**: Add explicit empty-string check in OpenActivityService
or document as accepted behavior.

---

## Findings Summary by Severity

| Severity | Count | IDs |
|---|---|---|
| **P0** (Critical) | 0 | — |
| **P1** (Major) | 2 | F-001, F-002 |
| **P2** (Moderate) | 3 | F-003, F-004, F-005 |
| **P3** (Hygiene) | 1 | F-006 |

---

## Merge Recommendation

### Do NOT merge to `develop`.

**Rationale**: Two P1 findings (F-001, F-002) mean that while the Program
Kerja boundary is **structurally complete and architecturally correct**, it
is **operationally disconnected** from the production API surface. The
boundary cannot be exercised by any production caller because:

1. The API DTO lacks `revision_id`
2. The command treats `revisionId` as optional with a phantom fallback

The core implementation (boundary service, DTOs, engine decoupling,
composition wiring) is sound and requires no rework. The fix scope is
narrow:

1. Add `revision_id` to `CreateActivityRequestDto` (required field)
2. Pass `revision_id` in the API route handler
3. Make `revisionId` required in `CreateActivityCommand` (remove optionality)
4. Remove the `'rev-approved-default'` fallback

**Estimated fix effort**: Small — API contract and command type changes only.
No architectural rework required.

### Conditional merge criteria

Merge may proceed once:
- [ ] F-001 is resolved (phantom default removed)
- [ ] F-002 is resolved (API DTO includes `revision_id`)
- [ ] F-005 is partially addressed (at least one integration test
  proving real boundary → engine → API flow)
- [ ] HQ confirms F-004 disposition (current-only MSP scope acceptable?)

---

*End of AUDIT-003*
