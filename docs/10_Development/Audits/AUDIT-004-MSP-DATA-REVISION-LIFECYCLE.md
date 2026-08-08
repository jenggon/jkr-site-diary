# AUDIT-004 — MSP DATA REVISION LIFECYCLE VERIFICATION

* **Audit ID**: AUDIT-004
* **Audit Type**: MSP Data Lifecycle Evidence Audit
* **Auditor**: Implementation and Technical Audit Agent
* **Authority**: HQ / Chief Architect
* **Date**: 2026-08-09
* **Audit Branch**: `audit/AUDIT-004-msp-revision-lifecycle`
* **Triggered By**: AUDIT-003 Finding F-004 — MSP query scope does not filter by revision

---

## 1. Locked Requirements

The following are locked and not subject to change in this audit:

- MSP remains the authoritative planning source.
- Program Kerja is the approved operational boundary between Zon Penjadualan
  and Zon Operasi.
- Site Diary follows the latest authorised MSP/CPM revision.
- When a new revised CPM is authorised, the operational Site Diary begins
  a new cycle.
- Previous operational records are archived when a revision transitions.
- Open Activities terminate as recorded at the revision transition point.
- Cross-revision leakage is not allowed.
- D1: Operational engines must consume scheduling-derived data through
  Program Kerja.
- No database duplication has been approved.

---

## 2. MSP Revision Lifecycle

### Two co-existing schema representations

The codebase contains two distinct database schema layers:

| Layer | Location | Tables | Purpose |
|---|---|---|---|
| **Baseline (legacy)** | `baseline.sql` | `programme_revisions` (plural), `msp_tasks`, `msp_resources`, `msp_assignments` | Original deployed schema from pre-architecture phase |
| **Modular migrations** | `supabase/migrations/*.sql` | `programme`, `programme_revision` (singular), `task` | Locked architecture implementation (DB-011–DB-021) |

These two layers are **not yet reconciled**. The modular migrations do not
create `msp_resources`, `msp_assignments`, or `msp_materials` tables.
The baseline `msp_*` tables exist in the deployed database but are separate
from the modular programme engine tables.

### Modular schema revision lifecycle (`programme_revision`, DB-012)

The `programme_revision` table (modular migration,
`20260802141400_programme_engine.sql`) implements:

- Status enum: `'Draft' | 'Approved' | 'Archived'` (via
  `programme_lifecycle_status`)
- `programme.current_revision_id` pointer to the single active revision
- Atomic status transition in `ProgrammeService.approveRevision()` via
  database transaction:
  1. Previous active revision → `'Superseded'`, `is_current: false`
  2. New target revision → `'Approved'`, `is_current: true`
  3. `programme.current_revision_id` → updated to new revision

> **Note**: The `programme_lifecycle_status` enum values are `'Draft'`,
> `'Approved'`, `'Archived'`. However, `ProgrammeService.approveRevision()`
> transitions the previous revision to `'Superseded'` — a value that exists
> in the `ProgrammeRevisionStatus` TypeScript type but is NOT in the database
> enum. This is a separate observation recorded here for completeness.

---

## 3. MSP Import Lifecycle

### Current state: No MSP import service exists

**Critical finding**: There is currently **no MSP import service, file parser,
upload API route, or scheduled job** that populates the `msp_*` tables.

Evidence:
- No `MspImportService`, `ProgrammeImportService`, or equivalent in `src/services/`
- No file upload API route under `src/app/api/`
- `src/services/taskService.ts` explicitly notes: *"Contains no business logic,
  lifecycle transitions, audit timestamp generation, or MSP parsing."*
- `src/repositories/taskRepository.ts` provides CRUD only, no import logic

A legacy import script (`scripts/import-msp.ts`) exists outside the
application service layer but is not integrated into the runtime application.

**Consequence**: The R01/R02 import scenario described in the audit brief
is **currently theoretical**. No production path exists to import MSP data
into any msp_* table through the application.

---

## 4. msp_* Table Data Model

### Baseline schema (`baseline.sql`)

#### `msp_tasks`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | PK |
| `revision_id` | `uuid` | NOT NULL | FK → `programme_revisions.id` |
| `uid` | `text` | NOT NULL | |
| `task_uid` | `text` | NULL | |
| `wbs` | `text` | NULL | |
| `task_name` | `text` | NOT NULL | |
| `summary_path` | `text` | NULL | |
| `resource_names` | `text` | NULL | |
| `outline_number` | `text` | NULL | |
| `outline_level` | `integer` | NULL | |
| `start_date` | `timestamptz` | NULL | |
| `finish_date` | `timestamptz` | NULL | |
| `summary` | `boolean` | NULL | |
| `created_at` | `timestamptz` | NULL | |

**Unique index**: `(revision_id, task_uid)` — scoped per revision.

#### `msp_resources`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | PK |
| `revision_id` | `uuid` | NOT NULL | FK → `programme_revisions.id` |
| `resource_uid` | `text` | NOT NULL | |
| `resource_name` | `text` | NULL | |
| `created_at` | `timestamptz` | NULL | |

**Unique index**: `(revision_id, resource_uid)` — scoped per revision.

**Absent columns**: `programme_id`, `task_id`, `trade_code`, `trade_name`,
`trade_category`.

#### `msp_assignments`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | PK |
| `revision_id` | `uuid` | NOT NULL | FK → `programme_revisions.id` |
| `task_uid` | `text` | NOT NULL | |
| `resource_uid` | `text` | NOT NULL | |
| `created_at` | `timestamptz` | NULL | |

#### `msp_materials`

**Does not exist** in any schema (baseline or modular migrations).
`IMspMaterialRepository` is implemented as a mock returning `null`.

### Modular schema (`task` table, DB-013)

The modular migration `20260802222000_msp_engine.sql` creates a `task`
table with explicit `revision_id` FK to `programme_revision`:

| Column | Type | Notes |
|---|---|---|
| `task_id` | `uuid` | PK |
| `programme_id` | `uuid` | FK → `programme.programme_id` |
| `revision_id` | `uuid` | FK → `programme_revision.revision_id` |
| `task_uid` | `integer` | |
| `task_name` | `text` | |
| … | … | Full scheduling metadata |

**Unique constraint**: `(revision_id, task_uid)` — revision-scoped.

This `task` table is the approved modular replacement for `msp_tasks` but
does **not** include resource, assignment, or material columns.

---

## 5. Revision Identity Mapping

### Baseline schema linkage

```
programme_revisions.id (uuid, PK)
    ↑
msp_tasks.revision_id     (FK, NOT NULL)
msp_resources.revision_id (FK, NOT NULL)
msp_assignments.revision_id (FK, NOT NULL)
```

In the **baseline schema**: `msp_*` data is **directly and explicitly
revision-scoped** via `revision_id` FK. Multiple revisions can coexist
with each owning its isolated set of tasks, resources, and assignments.

### Modular schema linkage

```
programme_revision.revision_id (uuid, PK)
    ↑
task.revision_id (FK, NOT NULL)
```

In the **modular schema**: the `task` table is similarly revision-scoped.
`(revision_id, task_uid)` unique constraint enforces isolation.

### MspResourceRepository — Schema vs. Code mismatch

```
Actual baseline msp_resources columns:
  id, revision_id, resource_uid, resource_name, created_at

MspResourceRow TypeScript type (MspResourceRepository.ts L7–14):
  resource_id, programme_id, task_id, trade_code, trade_name, trade_category
```

**The `MspResourceRow` TypeScript interface does not match the actual
deployed `msp_resources` table schema.** The columns queried
(`programme_id`, `task_id`) do not exist in the table. The columns
returned (`trade_code`, `trade_name`, `trade_category`) do not exist
in the table.

---

## 6. R01/R02 Scenario Trace

The following traces what *would* happen under the locked architecture,
based on the baseline schema and modular migration evidence.

### Scenario Setup

| Step | Event |
|---|---|
| 1 | MSP Revision R01 imported |
| 2 | R01 becomes Approved |
| 3 | MSP Revision R02 imported |
| 4 | R02 remains Draft |
| 5 | R02 becomes Approved |
| 6 | R01 becomes Archived |

### Baseline schema behaviour (if import existed)

**Step 1 — R01 imported**:
- A row is created in `programme_revisions` with `id = R01_id`, `is_active = false`
- All MSP tasks inserted into `msp_tasks` with `revision_id = R01_id`
- All MSP resources inserted into `msp_resources` with `revision_id = R01_id`
- All MSP assignments inserted into `msp_assignments` with `revision_id = R01_id`
- Result: R01 rows isolated by `revision_id = R01_id`

**Step 2 — R01 Approved**:
- `programme_revisions.is_active = true` for R01_id
- R01 MSP data unmodified, still in tables with `revision_id = R01_id`

**Step 3 — R02 imported**:
- A new row created in `programme_revisions` with `id = R02_id`, `is_active = false`
- All R02 tasks inserted with `revision_id = R02_id`
- All R02 resources inserted with `revision_id = R02_id`
- R01 data is **NOT overwritten** (different `revision_id`)
- Result: R01 and R02 data coexist in the same tables, each scoped by `revision_id`

**Step 4 — R02 remains Draft**:
- No operational impact. R01 still active.

**Step 5 — R02 Approved** (atomic via `ProgrammeService.approveRevision()`):
- R01 `is_active → false` (Superseded)
- R02 `is_active → true`
- `programme.current_revision_id → R02_id`

**Step 6 — R01 Archived**:
- R01 row status updated to Archived
- R01 MSP data remains in tables (no cascade delete defined)

---

## 7. Draft Revision Behaviour

When R02 is in `Draft` status:
- R02 MSP rows exist in `msp_tasks`, `msp_resources`, `msp_assignments`
  with `revision_id = R02_id`
- R02 data does NOT affect operational resolution because:
  - `ProgramKerjaBoundaryService.validateActiveApprovedRevision()` rejects any
    request referencing R02_id (status != 'Approved')
  - R02_id is not the `current_revision_id` in the `programme` table

**However**: `MspResourceRepository.findResourceTradeByMspTask()` queries
by `(programme_id, task_id)` — without `revision_id`. If this query
were actually executed against the baseline schema:
- It would fail because the columns `programme_id` and `task_id` do not
  exist in `msp_resources`
- Therefore, R02 Draft data cannot contaminate R01 operational results
  through this repository — but only because the query itself would fail,
  not because of correct revision filtering

---

## 8. Approved Revision Behaviour

When a revision is `Approved`:
- In the modular schema: `programme.current_revision_id` points to the
  approved revision
- In the baseline schema: `programme_revisions.is_active = true`
- `ProgramKerjaBoundaryService.validateActiveApprovedRevision()` verifies
  `revision.status === 'Approved'` before allowing MSP queries

The boundary service enforces approval status as an **authorization gate**.
It does not scope the downstream MSP query by `revisionId`.

---

## 9. Archived Revision Behaviour

When R01 is Archived:
- `ProgramKerjaBoundaryService` rejects any request carrying R01_id
  (status !== 'Approved')
- R01 MSP rows remain in the database (no cascade delete)
- Historical data is preserved for audit and record purposes
- `ProgramKerjaBoundaryService` will never serve R01 data to operational
  engines again

---

## 10. Cross-Revision Safety Assessment

### Current safety status

| Scenario | Safe? | Reason |
|---|---|---|
| R01 Approved, R02 Draft coexist in msp_* tables | Theoretically safe | Boundary rejects R02_id |
| R02 Approved, boundary called with R02_id | Boundary passes | Correct |
| R02 Approved, boundary called with R01_id (Archived) | Boundary rejects | Correct |
| MSP repo query returns R02 data when R01 is validated | **Schema mismatch prevents runtime execution** | Query columns don't exist |

### The actual cross-revision risk

The theoretical risk identified in AUDIT-003 F-004 is:

> "After `validateActiveApprovedRevision` succeeds for R01, the downstream
> MSP query uses only `(programmeId, taskId)`. If both R01 and R02 MSP data
> exist for the same `(programme_id, task_id)`, the query could return R02 data."

This risk **is real in theory** and would materialize if:
1. The `msp_resources` table had the columns `MspResourceRepository` expects
2. Both R01 and R02 data coexisted for the same `(programme_id, task_id)`
3. The database returned the R02 row (e.g., by insertion order)

However this risk is **currently not materialized** for reasons that are
implementation accidents rather than architecture:
- The `MspResourceRepository` queries columns that don't exist in the
  deployed `msp_resources` schema
- No MSP import service exists to populate the tables

---

## 11. F-004 Assessment

### AUDIT-003 F-004 Statement

> "MSP repository queries scope by `(programmeId, taskId)` only — no
> `revisionId` filter at database level."

### Classification: **C — Architecture Gap Requiring HQ Decision**

The following evidence supports this classification.

### Evidence A — Baseline schema is revision-safe by design

The baseline `msp_resources` table has:
- `revision_id uuid NOT NULL` (FK to `programme_revisions`)
- Unique index on `(revision_id, resource_uid)`

The baseline schema **does** implement revision isolation at the database
level. R01 and R02 resources are stored in separate rows scoped by
`revision_id`.

### Evidence B — MspResourceRepository targets a non-existent schema

`MspResourceRepository` queries `msp_resources` using:
```typescript
{ programme_id: programmeId, task_id: mspTaskId }
```

But the deployed `msp_resources` has no `programme_id` column and no
`task_id` column. The `MspResourceRow` TypeScript interface declares columns
(`resource_id`, `programme_id`, `task_id`, `trade_code`, `trade_name`,
`trade_category`) that do not exist in any schema in the repository.

The repository was written for a **planned future schema** that has not been
migrated. This is a schema-code misalignment, not just a missing filter.

### Evidence C — The modular `task` table is revision-scoped

The modular migration `msp_engine.sql` (DB-013) creates a `task` table
with `revision_id` FK and `(revision_id, task_uid)` unique constraint.
This is the approved replacement for `msp_tasks`, designed correctly for
revision isolation.

### Evidence D — No approved schema for msp_resources/msp_assignments (modular)

No modular migration creates replacement tables for `msp_resources`,
`msp_assignments`, or `msp_materials`. The architecture between the modular
`task` table and the resource/assignment/material layers is undefined in the
modular schema layer.

### Evidence E — No MSP import service exists

Without an import service, no msp_* rows can be populated through the
application. The F-004 risk is theoretical — there is no production path
to introduce the data that would trigger the cross-revision leak.

### Gap statement

The architecture gap is:

1. The baseline schema **does** implement revision isolation for `msp_*`
   tables but uses a different schema shape than what `MspResourceRepository`
   targets.
2. The modular schema implements revision isolation for `task` but has no
   equivalent for resources, assignments, or materials.
3. `MspResourceRepository` is written for a third, distinct schema that
   exists in neither the baseline nor the modular migrations.
4. No MSP import service bridges the gap between physical MSP file import
   and the `msp_*` tables in any schema.

The D1 boundary enforcement relies on `MspResourceRepository` correctly
filtering by `revisionId` after validation. The repository cannot currently
do this because:
- It targets non-existent columns
- The interface does not accept `revisionId`

---

## 12. Architectural Gap

The following unresolved architectural gaps require HQ decision:

### Gap 1 — msp_resources/msp_assignments schema undefined in modular layer

The modular migration layer has `task` (DB-013) but no corresponding
approved schema for:
- `msp_resources` equivalent (trade/resource allocation per task per revision)
- `msp_assignments` equivalent (task-resource linkage per revision)
- `msp_materials` (no table exists in any schema)

The relationship between the modular `task` table and resource/assignment/
material data is architecturally undefined.

### Gap 2 — MspResourceRepository targets a phantom schema

`MspResourceRow` expects columns (`resource_id`, `programme_id`, `task_id`,
`trade_code`, `trade_name`, `trade_category`) that exist in no deployed
or migrated schema. The repository will return null for any query against
the actual database, making `MspResourceRepository` non-functional at
runtime.

### Gap 3 — No MSP import service

There is no service, API, or integration path to populate any `msp_*`
table from MSP files. The MSP data lifecycle is architecturally modelled
but operationally unimplemented.

### Gap 4 — Revision transition and msp_* data ownership

When R01 transitions to Archived upon R02 approval, no cascade behaviour
is defined:
- R01 MSP rows persist in the database
- No clean-up, archival, or read-blocking of R01 MSP data is implemented
- Open Activities using R01 data at the transition point have no formal
  termination mechanism tied to the MSP row lifecycle

---

## 13. HQ Decision Required

The following decisions are required before any remediation of F-004 can proceed.

### Decision D2 — MSP Resource/Assignment/Material Schema

**Question**: What is the approved schema for MSP resource, assignment, and
material data in the modular architecture?

**Options**:
- **(A)** Extend the modular schema with new migration tables
  (`msp_resource`, `msp_assignment` with FK to `programme_revision`) following
  the same pattern as `task` (DB-013)
- **(B)** Use the baseline `msp_resources`/`msp_assignments` tables with
  appropriate migration to align column layout with `MspResourceRepository`
  expectations
- **(C)** Retain baseline tables and add `revision_id` filtering to
  `MspResourceRepository` (aligning code to existing schema)

**Impact**: Determines whether a database migration is needed and what
`MspResourceRepository` should query.

---

### Decision D3 — MspResourceRepository Schema Target

**Question**: Should `MspResourceRepository` be aligned to the baseline schema
(revising `MspResourceRow` to match actual columns) or to a new modular
schema (requiring a migration)?

**Constraint**: The baseline schema already has `revision_id` on
`msp_resources`. If D2-C is chosen, `MspResourceRepository` can add
`revision_id` filtering with minimal change. No migration required.

---

### Decision D4 — MSP Import Service Scope

**Question**: When and how will an MSP import service be implemented?

Until an import service exists, the operational boundary for TRE Priority 1
resolution is not exercisable in production. D1 boundary conformance is
structurally present but operationally dormant.

---

### Decision D5 — Revision Transition Cascade

**Question**: When R01 is superseded by R02, what is the required behaviour
for existing Open Activities that were created under R01?

The locked requirement states: "Open Activities terminate as recorded at
the revision transition." This requires an explicit termination mechanism
at the revision transition boundary, which is currently unimplemented.

---

### F-004 Final Disposition

| Classification | Assessment |
|---|---|
| **A. Already safe by existing architecture** | **Partially** — the baseline schema already implements revision isolation via `revision_id` FK. However, `MspResourceRepository` does not use it. |
| **B. Implementation defect** | **Partially** — `MspResourceRepository` queries non-existent columns and does not accept/use `revisionId`. This is a code-schema misalignment. |
| **C. Architecture gap requiring HQ decision** | **Primary classification** — the modular schema has no approved definition for resource/assignment/material tables, no import service exists, and the schema targeted by the repository does not exist in any migration. HQ must decide schema path (D2) before F-004 can be remediated. |

**Recommendation**: F-004 is **C — Architecture Gap**. Remediation cannot
proceed until HQ issues decisions D2, D3, and D4. The structural D1 boundary
is correct. The MSP resource query layer requires schema alignment decisions
before it can enforce revision scoping at the database level.

---

*End of AUDIT-004*
