# N09A — KLOPP ADJUDICATION & IMPLEMENTATION LOCK

**Programme:** NGAMSOI N09+ UI/UX Closure  
**Stage:** N09A — REKOD current-state propagation and acceptance  
**Authority:** Product Owner + HQ/Klopp  
**Status:** IMPLEMENTATION SCOPE LOCKED AFTER AGENTIC RECON  
**Recon branch/head:** `feature/N09A-ngamsoi-records-current-state` @ `d3bc84a6601c31d79922d0c5f073fb6ca36fda7e`  
**Lockset:** `2026.09.06.1`  
**Lockset hash:** `fe3866e259155215b6848840774816ace95b1688e2a4d31e416ab68bc650ea16`  
**Locked requirements:** `43`

## 1. Adjudication

AG recon is accepted as a valid shift-left discovery pass. It established the required lockset handshake on the current N09A branch and found bounded REKOD UI/evidence defects before first official N09A PROVE.

The recon does **not** reveal a protected-domain blocker. No architecture/business escalation is required at this point.

HQ/Klopp adjudicates the findings as follows:

| Finding | AG severity | HQ adjudication | Implementation treatment |
| --- | --- | --- | --- |
| R1 decorative completion-green in REKOD | BLOCKER | **VALID BLOCKER** | Repair in N09A |
| R2 legacy `Skop` / raw `CONTRACTOR` copy | BLOCKER | **VALID BLOCKER** | Repair in N09A |
| R3 historical detail green rail | BLOCKER | **VALID SYMPTOM, MERGED INTO R1** | Do not create unnecessary new authority state solely for colour; neutralise decorative rail and retain existing explicit historical/read-only cues |
| R4 workforce readback grammar | MAJOR | **VALID MAJOR** | Repair readback presentation only; preserve stored counts/WRE/TRE semantics |
| R5 duplicate context tablist in detail | MAJOR | **VALID MAJOR** | Remove detail-mode duplicate context switcher; detail owns one explicit back path |
| R6 unbalanced filter grid | MAJOR | **VALID MAJOR** | Rebalance responsive grid |
| R7 legacy Edit Rekod visual surface | MAJOR | **VALID MAJOR / HIGH-RISK BOUNDED REPAIR** | Preserve existing Edit Engine and `DailyEntryForm`; reconcile only edit-mode visual/copy authority with scoped N09A ownership |
| R8 historical capture is insufficient proving evidence | MAJOR | **VALID PROVING GAP** | Strengthen real-browser N09A evidence before first official PROVE; not a reason to alter product semantics |
| R9 rounded detail loading/error containers | MINOR | **VALID / INCLUDE** | Repair because trivial, directly required by sharp-sleek geometry |
| R10 canonical identity/history/domain | NO ISSUE | **PASS** | No change |
| R11 responsive workspace navigation | NO ISSUE | **PASS** | No change |

## 2. Locked implementation objective

The smallest faithful N09A repair is:

1. retire decorative/surface green from REKOD except genuine success/completion meaning;
2. propagate current field language `PELAKSANA` and display `CONTRACTOR` as `Kontraktor Utama` without changing persistence values;
3. present workforce readback with explicit `B / BB / A / JUMLAH` labels while preserving exact saved counts;
4. remove the duplicate detail-context tab switcher and leave one deliberate `Kembali ke Senarai` path;
5. balance the filter layout at phone, half-window and wide widths;
6. bring the current-record edit surface into the same sharp-sleek NGAMSOI family through scoped edit-mode visual/copy ownership, without replacing the Edit Engine or changing identity/authority semantics;
7. normalise detail loading/error geometry;
8. create/strengthen N09A real-browser proving for current list, historical detail, edit entry/cancel, anti-green recurrence and triple-viewport overflow.

This is a remediation pass, not a REKOD redesign.

## 3. Decisions that prevent over-implementation

### 3.1 Historical record colour

R3 does not justify inventing a new domain state or persistence flag.

Historical/read-only authority already exists through runtime semantics and explicit `Sejarah / Baca Sahaja` presentation. N09A should use neutral/tactical detail rails and retain the existing amber historical/read-only cue. A new `data-record-authority` attribute is allowed only if genuinely required for deterministic visual/test ownership, not as a new business semantic.

### 3.2 Workforce readback

N09A may change labels/layout only.

Required readback language:

- `B`
- `BB`
- `A`
- `JUMLAH`

Do not alter saved workforce rows, zero handling, TRE/WRE recommendation authority or persistence. A decorative hardhat glyph is not a new blocking requirement if the canonical count grammar is otherwise clear and accessible.

### 3.3 Edit Rekod

Do not replace the existing edit path with CATAT or invent a new edit flow.

Preserve:

- `editingReportId === site_diary_id`;
- current-revision edit authority;
- canonical identity checks;
- current API/domain persistence;
- cancel/save round-trip semantics.

The preferred direction is a scoped REKOD edit-mode authority wrapper plus minimum conditional field-copy alignment required by accepted `PELAKSANA` language. Avoid global legacy-form restyling that could affect unrelated surfaces.

## 4. LOCKED REQUIREMENT IMPACT MATRIX

| Concern | Affected locks | Protected locks/boundaries | Likely files |
| --- | --- | --- | --- |
| Decorative colour authority | `F45-VIS-001`, `F45-CSS-001`, `NGUI-REKOD-001` | brand geometry, completion semantics | `src/app/ngamsoi-n09-records.css`, targeted tests |
| Field language | `F45-EXEC-001`, `F45-COPY-002`, `NGUI-REKOD-001` | persistence enum values/domain | `DiaryManagementList.tsx`, `DiaryDetail.tsx`, edit-mode copy if required |
| Workforce readback | `F45-WF-001`, `F45-WF-002`, `NGUI-REKOD-001` | WRE/TRE and persistence | `DiaryDetail.tsx`, CSS/tests |
| Detail navigation | `F45-NAV-001`, `NGUI-REKOD-001` | workspace IDs/navigation doctrine | `DiaryManagementList.tsx`, tests |
| Responsive filters | `F45-RESP-001`, `F45-GEO-001`, `NGUI-REKOD-001` | no-cross-revision semantics | `DiaryManagementList.tsx`, CSS/browser evidence |
| Edit visual authority | `F45-GEO-001`, `F45-CSS-001`, `F45-EXEC-001`, `NGUI-REKOD-001` | Edit Engine, identity, DB/API/auth | `DiaryManagementList.tsx`, `DailyEntryForm.tsx` only if conditional copy is unavoidable, `ngamsoi-n09-records.css`, tests |
| Detail state geometry | `F45-GEO-001`, `NGUI-REKOD-001` | error semantics | `DiaryDetail.tsx` and/or scoped CSS |
| N09A proving | `NGUI-CI-001`, `F45-CI-001`, `NGUI-REKOD-001` | no-green-by-bypass | new/updated `tests/e2e` evidence, existing deterministic fixture/support where appropriate |

## 5. Forbidden implementation changes

N09A implementation must not change:

- NGAMSOI canonical mark geometry;
- REKOD #7 daily aggregation / daily approval redesign;
- official print content, aggregation or output semantics;
- approval business semantics;
- canonical Site Diary identity;
- `editingReportId === site_diary_id` Edit Engine authority;
- current vs superseded Programme Revision authority;
- no-cross-revision operational rules;
- append-only audit/history semantics;
- database/migrations for cosmetic convenience;
- RLS/RBAC/auth/security;
- Activity/Site Diary domain ownership;
- official weather authority;
- sealed F4.5 CATAT behaviour/assets except passive shared regression protection.

## 6. Required pre-PROVE evidence

Before first official N09A PROVE, implementation must have deterministic evidence for at least:

### Current REKOD — 390 / 960 / 1280

- `Pelaksana` visible;
- `CONTRACTOR` not leaked as user-facing copy;
- `Kontraktor Utama` displayed;
- balanced filter geometry;
- no decorative completion-green on revision/list/detail/print/action surfaces;
- zero horizontal page overflow.

### Historical REKOD

- historical revision selectable through normal UI;
- historical record detail reachable through normal UI;
- explicit `Sejarah / Baca Sahaja` retained;
- `Edit Rekod` absent;
- no decorative green historical detail rail;
- single back path from detail to list.

### Current detail/edit

- current detail reaches workforce readback with `B / BB / A / JUMLAH`;
- print handoff URL remains canonical;
- `Edit Rekod` enters the existing edit flow;
- edit surface is sharp-sleek and uses accepted Pelaksana copy where applicable;
- cancel returns to detail without changing saved record or authority.

### Technical gate

- `pnpm run lockset:verify`;
- targeted tests;
- full `pnpm run verify`;
- production-runtime real-browser N09A gate;
- `--retries=0`;
- exact candidate SHA recorded;
- no force-click, test skip, threshold relaxation, internal-state shortcut or semantic product change to satisfy the harness.

## 7. Process metric

At this adjudication point:

```text
N09A OFFICIAL PRODUCT PROVE RED COUNT = 0
```

The defects were discovered during AGENTIC RECON before the first official N09A product PROVE. This is the intended shift-left result.

## 8. Next gate

```text
N09A LOCK                 PASS
N09A EXECUTION BRANCH     PASS
AGENTIC RECON             PASS
KLOPP ADJUDICATION        PASS by this record
KLOPP BOUNDED REPAIR      NEXT
AGENTIC PRE-PROVE         PENDING, risk-based
EXACT-HEAD PROVE          PENDING
AUTHORITATIVE REPROVE     PENDING
PO PHYSICAL ACCEPTANCE    PENDING
N09A SEAL                 BLOCKED until PO PASS
```
