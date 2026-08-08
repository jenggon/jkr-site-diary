# AUDIT-005 — MSP CANONICAL DATA MODEL REVIEW

* **Audit ID**: AUDIT-005
* **Audit Type**: MSP Canonical Data Model & Architecture Review
* **Auditor**: Implementation and Technical Audit Agent
* **Authority**: HQ / Chief Architect
* **Date**: 2026-08-09
* **Audit Branch**: `audit/AUDIT-005-msp-canonical-data-model`
* **Triggered By**: AUDIT-004 Finding F-004 & D2 Decision Requirement

---

## 1. Locked Requirements & Product Principles

### 1.1 Core Product Principle — Digital Site Diary First

The JKR Site Diary application is fundamentally a **digital Site Diary tool**, not a full-scale Primavera/MSP enterprise project management system.

The core user-facing product workflow is:
1. **Preserve JKR Site Diary First-Page Format**: Replicate the official JKR daily site diary layout (weather, manpower, activity progress, notes/remarks, supervisor signature).
2. **Rapid Daily Entry**: Enable site supervisors to log daily site records in **< 5 minutes**.
3. **Extension Pages**: Provide supplementary pages (manpower breakdown, detailed notes, photo attachments, progress verification) only when needed.
4. **Official PDF Output**: Generate print-ready, legally defensible JKR compliance PDF exports.
5. **MSP / Programme Context**: MSP scheduling data exists **solely to bind and support** the Site Diary (providing WBS hierarchy, Task UIDs, planned dates, and trade hints), **not** to turn the web app into a project scheduling workstation.

### 1.2 Locked Architecture Principles

- **MSP Binds Site Diary**: MSP data provides planning context; Site Diary never modifies Programme data.
- **Controlled Program Kerja Boundary**: Operational engines (TRE, WRE, MRE, Open Activities) consume scheduling data exclusively through the active, approved *Program Kerja* (`ADR-001`, `ADR-002`, `ADR-006`, `ADR-011`).
- **Single Active Revision**: Exactly ONE `Approved` Programme Revision exists per project at any given time (`ADR-004`, `DB-011`, `DB-012`).
- **Revision Cycle Transition**: Approving a new revision starts a new operational cycle. Open Activities terminate as recorded at the transition point. Operational records are never migrated across revisions (`ADR-003`).
- **Immutable Task UID**: Task UID (`task_uid`) is the immutable integration key between MSP and Site Diary (`TE-003`).
- **Historical Immutability**: Historical revisions and logs remain immutable (`AGENTS.md`).

---

## 2. A. CURRENT STATE ANALYSIS

### 2.1 Database Schema Schism (Baseline vs. Modular Engine Migrations)

The repository currently contains **two disconnected database schema paradigms**:

```
                       ┌──────────────────────────────────────────────────────────┐
                       │                   PARADIGM A: BASELINE                   │
                       │                     (baseline.sql)                       │
                       │  • projects                                              │
                       │  • programme_revisions (id, project_id, is_active)       │
                       │  • msp_tasks (id, revision_id, uid, task_uid, wbs)        │
                       │  • msp_resources (id, revision_id, resource_uid)         │
                       │  • msp_assignments (id, revision_id, task_uid, res_uid)   │
                       └────────────────────────────┬─────────────────────────────┘
                                                    │
                                  [ Unreconciled Schema Divide ]
                                                    │
                       ┌────────────────────────────▼─────────────────────────────┐
                       │               PARADIGM B: MODULAR ENGINE MIGRATIONS      │
                       │                 (supabase/migrations/*.sql)              │
                       │  • programme (programme_id, current_revision_id, status) │
                       │  • programme_revision (revision_id, programme_id, status)│
                       │  • task (task_id, programme_id, revision_id, task_uid)   │
                       │  • activity (activity_id, programme_id, revision_id)     │
                       │  • site_diary (site_diary_id, activity_id, manpower)    │
                       └──────────────────────────────────────────────────────────┘
```

#### Detailed Comparison Matrix

| Area | Paradigm A: Baseline (`baseline.sql`) | Paradigm B: Migrations (`supabase/migrations/`) |
|---|---|---|
| **Root Entity** | `projects` (`id`, `project_code`, `project_name`) | `programme` (`programme_id`, `programme_code`, `programme_name`) |
| **Revision Entity** | `programme_revisions` (`id`, `project_id`, `is_active`) | `programme_revision` (`revision_id`, `programme_id`, `revision_no`, `status`) |
| **Task Entity** | `msp_tasks` (`id`, `revision_id`, `uid`, `task_uid`, `wbs`) | `task` (`task_id`, `programme_id`, `revision_id`, `task_uid`, `wbs`) |
| **Resource Entity** | `msp_resources` (`id`, `revision_id`, `resource_uid`) | **None** (Spec DB-019 `resource_assignment` unmigrated) |
| **Assignment Entity** | `msp_assignments` (`id`, `revision_id`, `task_uid`, `resource_uid`) | **None** |
| **Workforce Entity** | None | **None** (Spec DB-017 `workforce` unmigrated) |
| **Trade Library** | `trade_library` (`id`, `trade_name`) | **None** (Spec DB-018 `trade_library` unmigrated) |

### 2.2 Repository Realities & Column Mismatches

| Repository | Target Table | Actual Query Status | Code vs Schema Mismatch |
|---|---|---|---|
| `taskRepository.ts` | `task` | **Functional** | Matches migration `20260802222000_msp_engine.sql` |
| `ProgrammeRepository.ts` | `programme` | **Functional** | Matches migration `20260802141400_programme_engine.sql` |
| `ProgrammeRevisionRepository.ts` | `programme_revision` | **Functional (with bugs)** | Queries `revision_number` (DB has `revision_no`), `revision_title` (DB has `revision_name`), `is_current` (DB has no `is_current` column) |
| `MspResourceRepository.ts` | `msp_resources` | **Broken at runtime** | Queries `resource_id`, `programme_id`, `task_id`, `trade_code`, `trade_name` — **none of these columns exist in `baseline.sql` or migrations** |
| `MspWorkforceRepository.ts` | N/A | **Placeholder / Mock** | Returns `null` unconditionally (DEV-027 placeholder) |
| `tradeLibraryRepository.ts` | `trade_library` | **Broken at runtime** | Queries `trade_id`, `trade_code`, `is_active` — `baseline.sql` has `id`, `trade_name` |
| `OpenActivityRepository.ts` | `site_diary` | **Broken at runtime** | Queries `activity_name`, `trade_info`, `workforce_count` on `site_diary` — migration `site_diary` has `activity_id`, `manpower` (JSONB) |

### 2.3 Import Capability Realities

1. **`scripts/import-msp.ts`**:
   - Parses MSP XML sample (`samples/fptv-upsi-rev00.xml`).
   - Inserts directly into **Paradigm A baseline tables** (`projects`, `programme_revisions`, `msp_tasks`, `msp_resources`, `msp_assignments`).
   - Does **not** insert into Paradigm B modular tables (`programme`, `programme_revision`, `task`).
2. **`src/services/mspParser.ts`**:
   - Parses `<Tasks>` section (extracts `UID`, `Name`, `WBS`, `OutlineNumber`, `OutlineLevel`, `Summary`, `Start`, `Finish`).
   - **Completely ignores** `<Resources>` and `<Assignments>` sections.
3. **Application Runtime Service**:
   - **No runtime MSP import service, upload API handler, or daemon exists** in `src/services/` or `src/app/api/`.

---

## 3. B. MINIMUM SITE DIARY REQUIREMENT

To fulfill the product vision of a simple, compliant **digital Site Diary**, we classify all scheduling/MSP data elements into 4 categories:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          1. MANDATORY (MVP CORE)                            │
│  • Programme ID (programme_id)          • Activity Date (activity_date)    │
│  • Revision ID (revision_id)            • Session Weather (weather)        │
│  • Task ID & Task UID (task_id, task_uid)• Manpower Breakdown (JSONB)      │
│  • Task Name / Subtask Name             • Daily Supervisor Notes (notes)   │
│  • WBS / Outline Number (ahi)           • User Audit ID (submitted_by)     │
├─────────────────────────────────────────────────────────────────────────────┤
│                          2. USEFUL (RECOMMENDED)                            │
│  • Planned Start & Finish Dates         • Trade Recommendation Hint        │
│  • Planned Duration (Days)              • Cumulative Progress %            │
├─────────────────────────────────────────────────────────────────────────────┤
│                          3. OPTIONAL (FUTURE UI)                            │
│  • Building / Floor / Zone Reference    • Material Lead Time Hints         │
├─────────────────────────────────────────────────────────────────────────────┤
│                          4. NOT REQUIRED FOR MVP                            │
│  • Raw MSP Assignments / XML Blobs      • MSP Task GUID                    │
│  • Critical Path Flags (is_critical)    • Complex Constraint Dates         │
│  • Parent Task UID Tree Rollups         • Full CPM Network Diagrams        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Categorization Table for MSP Fields

| Field / Entity | Classification | Justification for Site Diary |
|---|---|---|
| `programme_id` | **1. Mandatory** | Root aggregate ownership context (`ADR-009`) |
| `revision_id` | **1. Mandatory** | Approved baseline revision scope (`ADR-004`) |
| `task_id` / `task_uid` | **1. Mandatory** | Immutable bridge between MSP task and site activity (`TE-003`) |
| `task_name` / `subtask` | **1. Mandatory** | Human-readable work description displayed on Site Diary form |
| `outline_number` (`ahi`) | **1. Mandatory** | WBS Outline Number for quick supervisor SearchPicker UI |
| `planned_start` / `finish` | **2. Useful** | Comparison context on diary entry screen |
| `trade_name` / `trade_code` | **2. Useful** | Pre-populates TRE dropdowns for manpower logging |
| `manpower` (JSONB) | **1. Mandatory** | Form input: Local (Bumi/Non-Bumi) vs Foreign headcount |
| `notes` | **1. Mandatory** | Daily site remarks (legal requirement for JKR diary) |
| `weather` | **1. Mandatory** | Session weather dropdown (`Morning`, `Afternoon`, `Night`) |
| `is_critical` | **4. Not Required** | Critical path analysis belongs to planning engineers, not site supervisors |
| `parent_task_uid` | **4. Not Required** | WBS tree nesting is collapsed into flat AHI outline strings for site use |
| `constraint_type` / `date` | **4. Not Required** | MSP engine constraint mechanics irrelevant to daily diary recording |
| `raw msp_assignments` | **4. Not Required** | Complex assignment rows add DB overhead without aiding supervisor daily entry |

---

## 4. C. THREE ARCHITECTURAL OPTIONS EVALUATION

We evaluate three potential architectural paths for the MSP data model:

---

### OPTION A: Keep and Extend Existing Baseline `msp_*` Schema

#### Description
Retain `baseline.sql` tables (`projects`, `programme_revisions`, `msp_tasks`, `msp_resources`, `msp_assignments`) as the primary database model. Abandon or rollback the modular `supabase/migrations/` tables (`programme`, `programme_revision`, `task`).

#### Evaluation Matrix

| Metric | Option A Rating & Findings |
|---|---|
| **Architecture** | Legacy monolithic schema. Uses `project_id` instead of `programme_id`. |
| **Data Flow** | MSP XML → `import-msp.ts` → `msp_tasks`/`msp_resources` → API routes → UI. |
| **Required Tables** | `projects`, `programme_revisions`, `msp_tasks`, `msp_resources`, `msp_assignments`. |
| **Revision Behaviour** | `programme_revisions.is_active` boolean column. Direct FK `revision_id` on `msp_*` tables. |
| **UID Behaviour** | `msp_tasks.task_uid` (text). Unique index `(revision_id, task_uid)`. |
| **Import Behaviour** | Directly executed via `scripts/import-msp.ts`. |
| **Impact on TRE/WRE/MRE** | TRE queries `msp_resources` directly. WRE/MRE require complex queries against raw assignments. |
| **Impact on Site Diary** | Requires mapping `project_id` to `programme_id`. Does not align with `DB-015` `site_diary` schema. |
| **Impact on PDF** | Works for legacy PDF scripts, but lacks clean modular progress/approval link. |
| **Migration Complexity** | **Low** (already deployed in `baseline.sql`). |
| **Maintenance Complexity** | **High** (violates DB-011 through DB-021 specifications; unmaintained schema drift). |
| **User-Facing Complexity** | Low. |
| **Risk** | **High** — Abandons the locked Architecture Baseline (`DEV-010A`, `DB-011`, `ADR-009`). |
| **MVP Suitability** | Poor — conflicts with all recent modular services (`ProgrammeService`, `OpenActivityService`). |
| **Future Extensibility** | Poor — monolithic table design. |

---

### OPTION B: Complete Newer Modular Architecture (`programme` / `programme_revision` / `task`)

#### Description
Complete the modular architecture defined in `supabase/migrations/` (DB-011 through DB-021). Migrate `msp_resources`, `resource_assignment` (DB-019), `workforce` (DB-017), and `trade_library` (DB-018) as full normalized database tables for every scheduling entity.

#### Evaluation Matrix

| Metric | Option B Rating & Findings |
|---|---|
| **Architecture** | Full normalized multi-table schema per DB specs (10+ engine tables). |
| **Data Flow** | MSP XML → MSP Parser → `programme` + `programme_revision` + `task` + `resource` + `resource_assignment` → Program Kerja → Engines → Site Diary. |
| **Required Tables** | `programme`, `programme_revision`, `task`, `resource`, `resource_assignment`, `workforce`, `trade_library`, `activity`, `site_diary`, `progress`, `approval`, `audit`. |
| **Revision Behaviour** | Atomic status transitions (`Draft` → `Approved` → `Archived`). Revision pointer `programme.current_revision_id`. |
| **UID Behaviour** | `task.task_uid` (INTEGER). Unique constraint `(revision_id, task_uid)`. |
| **Import Behaviour** | Complex multi-stage relational parser writing to 5+ normalized tables in a single transaction. |
| **Impact on TRE/WRE/MRE** | High structural cleanliness, but requires querying multiple join tables for simple trade hints. |
| **Impact on Site Diary** | Full alignment with `DB-015` `site_diary` and `DB-014` `activity`. |
| **Impact on PDF** | Fully supported via `progress` and `approval` tables. |
| **Migration Complexity** | **High** — Requires writing and testing 4+ missing migration files (`resource_assignment`, `workforce`, `trade_library`) and refactoring 6+ repositories. |
| **Maintenance Complexity** | **High** — Large relational surface area for simple daily diary needs. |
| **User-Facing Complexity** | Low (supervisors see simple UI). |
| **Risk** | **Medium-High** — High migration risk, long implementation lead time, heavy database overhead. |
| **MVP Suitability** | Medium — Overengineered for MVP Site Diary recording. |
| **Future Extensibility** | Excellent. |

---

### OPTION C (RECOMMENDED): Controlled Canonical Program Kerja Model

#### Description
Establish the **modular `programme`, `programme_revision`, and `task` tables** as the canonical planning baseline, combined with a **lightweight, controlled Program Kerja projection** for trade/workforce hints. 

Raw MSP XML is parsed upon import into the approved `task` table (`task_id`, `programme_id`, `revision_id`, `task_uid`, `wbs`, `task_name`, `planned_start`, `planned_finish`). Trade hints from MSP resources are stored as a clean `trade_name` / `trade_code` column on `task` or in a lightweight `program_kerja_trade` boundary table, omitting complex raw assignment tables.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OPTION C: CANONICAL PROGRAM KERJA DATA FLOW             │
│                                                                             │
│   [ Raw MSP XML ]                                                           │
│          │                                                                  │
│          ▼ (MSP Import Parser)                                              │
│   [ Canonical Planning Baseline: programme + programme_revision + task ]    │
│          │  (Revision Scoped: programme_id + revision_id + task_uid)        │
│          ▼                                                                  │
│   [ ProgramKerjaBoundaryService (IProgramKerjaBoundaryService) ]            │
│          │  (Validates revision.status === 'Approved')                      │
│          ▼                                                                  │
│   [ Operational Engines: TRE / WRE / MRE / Open Activity ]                  │
│          │                                                                  │
│          ▼                                                                  │
│   [ Digital Site Diary: site_diary (manpower JSONB, weather, notes) ]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Evaluation Matrix

| Metric | Option C Rating & Findings |
|---|---|
| **Architecture** | **Clean, Focused, Compliant.** Follows locked modular specs (`DB-011`, `DB-012`, `DB-013`, `ADR-001`, `ADR-002`, `ADR-006`, `ADR-011`). |
| **Data Flow** | Direct, deterministic pipeline: MSP XML → Canonical `task` → `ProgramKerjaBoundaryService` → Engines → Site Diary. |
| **Required Tables** | `programme`, `programme_revision`, `task`, `activity`, `site_diary`, `progress`, `approval`, `audit`. (Drop legacy `msp_*` tables). |
| **Revision Behaviour** | **100% Revision Safe.** All queries against `task` filter by `(programme_id, revision_id, task_id)`. Replaces invalid `msp_resources` queries with `task`-level trade fields. |
| **UID Behaviour** | `task.task_uid` (INTEGER). Unique constraint `(revision_id, task_uid)`. |
| **Import Behaviour** | Single-pass XML parser populates `programme_revision` and `task` table in one transaction. |
| **Impact on TRE** | **Simplified & Fast.** TRE Priority 1 reads trade hints directly from `task` via `ProgramKerjaBoundaryService`. |
| **Impact on WRE/MRE** | WRE/MRE receive clean DTOs from `ProgramKerjaBoundaryService` without raw join tables. |
| **Impact on Site Diary** | **Perfect Fit.** Site Diary binds to `activity` and `task` with zero unnecessary join overhead. |
| **Impact on PDF** | Fully supported with clean execution history. |
| **Migration Complexity** | **Low-Medium** — Aligns existing migrations (`programme_engine.sql`, `msp_engine.sql`, `site_diary_engine.sql`); cleans up legacy `baseline.sql` references. |
| **Maintenance Complexity** | **Low** — Minimal database surface area, zero schema bloat. |
| **User-Facing Complexity** | **Zero.** Supervisor workflow remains simple (< 5 mins per entry). |
| **Risk** | **Low** — Minimal moving parts, maximum alignment with locked principles. |
| **MVP Suitability** | **Ideal (10/10).** |
| **Future Extensibility** | High — Can add detailed resource assignment tables in future sprints if explicitly needed. |

---

## 5. D. OVERENGINEERING CHECK

### Question: "Does this option introduce infrastructure that the Site Diary product does not actually need?"

| Feature / Infrastructure | Option A | Option B | Option C | Overengineered for Site Diary MVP? |
|---|---|---|---|---|
| **Legacy `msp_assignments` (Raw MSP Assignment Rows)** | Yes | No | **No** | **YES — Overengineered.** Raw assignment rows (thousands per project) add DB bloat without benefiting supervisor daily diary input. |
| **Full CPM Critical Path Calculation Daemons** | No | Yes | **No** | **YES — Overengineered.** Site supervisors need WBS names and dates, not real-time CPM forward/backward pass recalculations. |
| **Multi-level Normalized Resource Breakdown Tables** | No | Yes | **No** | **YES — Overengineered.** JKR Site Diary manpower is captured as daily headcount (Bumi/Non-Bumi/Foreign) in `site_diary.manpower` JSONB. Normalized resource rate tables are unneeded for MVP. |
| **Canonical `task` Table (`DB-013`)** | No | Yes | **Yes** | **NO — Essential.** Required for revision-safe WBS task binding (`task_uid`, `wbs`, `planned_start/finish`). |
| **`ProgramKerjaBoundaryService` Facade** | No | Yes | **Yes** | **NO — Essential.** Enforces D1 boundary and revision safety (`ADR-011`). |

---

## 6. E. RECOMMENDATION

### HQ Recommendation: OPTION C — Controlled Canonical Program Kerja Model

#### Rationale
Option C is recommended based on strict evaluation against the six required criteria:

1. **Locked Architecture**: Option C honors `ADR-001`, `ADR-002`, `ADR-004`, `ADR-006`, `ADR-009`, and `ADR-011`. It enforces `programme` as root aggregate, `programme_revision` as versioned baseline, and `ProgramKerjaBoundaryService` as operational facade.
2. **Actual Site Diary Intent**: Supervisors log daily weather, manpower breakdown (JSONB), notes, and progress against tasks. Option C delivers the exact data bindings required for the < 5 minute diary entry workflow and JKR PDF export without unused schema bloat.
3. **Minimum Viable Implementation**: Eliminates the need to write and maintain 4+ complex resource/assignment migration tables for MVP.
4. **Revision Safety & Data Integrity**: Fully resolves AUDIT-004 Finding F-004 by ensuring all task queries against the canonical `task` table require `(programme_id, revision_id, task_id)`.
5. **Maintainability**: Reconciles the database schism by establishing `supabase/migrations/` (`programme`, `programme_revision`, `task`, `activity`, `site_diary`) as the single canonical schema and deprecating legacy `baseline.sql` `msp_*` tables.

---

## 7. F. D2 — HQ DECISION PACKAGE

### Summary of D2 Recommendation

| Field | HQ Decision Recommendation |
|---|---|
| **Recommended Option** | **OPTION C: Controlled Canonical Program Kerja Model** |
| **Canonical Schema** | Modular migration tables in `supabase/migrations/`: `programme` (DB-011), `programme_revision` (DB-012), `task` (DB-013), `activity` (DB-014), `site_diary` (DB-015), `progress` (DB-016), `approval` (DB-020), `audit` (DB-021). |
| **Legacy / Deprecated** | Legacy `baseline.sql` tables (`projects`, `programme_revisions`, `msp_tasks`, `msp_resources`, `msp_assignments`) are deprecated and will be removed upon canonical import service deployment. |
| **What MUST NOT Be Built** | Do NOT build complex normalized `msp_assignments`, `resource_assignment` (DB-019), or background CPM calculation daemons for MVP. |
| **Minimum Required Schema** | `programme`, `programme_revision`, `task` (with added `trade_name` / `trade_code` column for TRE hints), `activity`, `site_diary`. |
| **Minimum Required Import Data** | MSP XML `<Tasks>` parsing: `UID` (`task_uid`), `Name` (`task_name`), `WBS` (`wbs`), `OutlineNumber` (`outline_number`), `Start` (`planned_start`), `Finish` (`planned_finish`), `ResourceNames` (parsed into trade hint string). |
| **Minimum Required APIs** | `POST /api/programme/import` (XML upload → canonical `programme_revision` + `task`), `GET /api/programme/[id]/tasks` (fetch canonical Program Kerja tasks). |
| **Deferred Features** | Multi-resource rate structures, raw assignment historical tracking, complex material substitution engines. |

### Consequences of Choosing Option C

1. **Immediate Resolution of F-004**: Replacing `MspResourceRepository` queries with canonical `task` table queries scoped by `(programme_id, revision_id, task_id)` eliminates the cross-revision leak vulnerability.
2. **Clean Import Pipeline**: A single XML parser writes `programme_revision` and `task` rows in one atomic transaction.
3. **Repository Realignment**: Standardizes all repositories (`taskRepository.ts`, `ProgrammeRevisionRepository.ts`, `OpenActivityRepository.ts`) against the single canonical migration schema.
4. **Developer Efficiency**: Simplifies the codebase, eliminating parallel dual-schema code paths and runtime schema mismatch errors.

---

*End of AUDIT-005 Decision Package.*
