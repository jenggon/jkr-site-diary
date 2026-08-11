# HQ-DECISION-001 — ACTIVITY STATUS AND NAMING
**Mode:** ARCHITECTURAL DECISION RECORD
**Date:** 2026-08-09

## 1. Decision 1 — Status
Resolve the conflict between legacy `OpenActivity` status values (`Planned`, `InProgress`, `Suspended`, `Cancelled`, `Completed`) and canonical `DB-014` / `AE-009` status values (`New`, `In Progress`, `Completed`).

## 2. Evidence
- **AE-009 (Activity State Machine):** Explicitly defines a 3-state machine: `New → In Progress → Completed`.
- **DB-014 (Activity Schema):** `status` ENUM is restricted to `'New'`, `'In Progress'`, `'Completed'`.
- **DEV-010/011/012 (Legacy Blueprints):** Rely heavily on `Suspended` and `Cancelled` for daily workflow routing (e.g., Carry Forward engine excludes Cancelled, allows 0% progress on Suspended).

## 3. Options
- **OPTION A:** Keep canonical AE-009 / DB-014 three-state Activity lifecycle.
- **OPTION B:** Supersede AE-009 / DB-014 and formally introduce Suspended / Cancelled.
- **OPTION C:** Keep Activity three-state and represent Suspend/Cancel through another canonical engine/state mechanism.

## 4. Recommended decision
**RECOMMENDATION:** **OPTION C**
**Reasoning:** `AE-009` and `DB-014` are locked Zon Operasi specifications representing the physical execution boundary of an Activity. An activity is either physically not started (`New`), physically active (`In Progress`), or physically done (`Completed`).
`Suspended` and `Cancelled` are workflow/planning administrative states, not physical execution states. For example, a `Suspended` activity is still technically physically `In Progress` but temporarily halted administratively (e.g. by SO order or weather). `Cancelled` is a Task-level or Programme-level omission.
These administrative states should be handled by a side mechanism (e.g., a Site Diary "Halt" record, or a Task Engine `cancelled` flag) rather than illegally expanding the locked DB-014 physical state enum.

---

## 5. Decision 2 — activityName
Resolve the semantic mapping of the `OpenActivity.activityName` field to the DB-014 schema.

## 6. Evidence
- **DB-014:** Defines `subtask` as `VARCHAR(100)`, "MSP Work Package" (Required). Defines `subtask_display_name` as `TEXT` (Optional).
- **OpenActivity Type:** Defines `activityName` as `string` (Required).
- **Source Code (`src/`):** Existing APIs heavily use `activityName` as the primary human-readable identifier for an activity. The legacy `previous-activities` API attempts to map `subtask_name` from `task_name` and falls back to `subtask`. `activityValidation.ts` enforces `activityName` to be a required string.
- No authoritative specification explicitly equates `activityName` to `subtask`.

## 7. Options
- **OPTION A:** activityName = subtask
- **OPTION B:** activityName = subtask_display_name
- **OPTION C:** activityName is a separate projection/display concept and must not be persisted as Activity canonical state.
- **OPTION D:** Insufficient evidence — defer.

## 8. Recommended decision
**RECOMMENDATION:** **OPTION A**
**Reasoning:** In `DB-014`, `subtask` is the only **required** text field representing the operational naming of the Activity (derived from the MSP Work Package). `OpenActivity.activityName` is also a strictly required domain field. To comply with canonical persistence, the required `activityName` concept must map to the required `subtask` persistence column. However, to prevent ongoing ambiguity, the domain entity field must be explicitly renamed from `activityName` to `subtask`.

---

## 9. Impact on DB-003
If Option C (Status) and Option A (Naming) are authorized:
- The DB-003 domain refactor can proceed.
- The `Activity` domain entity will strictly use `New | In Progress | Completed` and `subtask`.
- The `OpenActivityDto` API projection will be built without breaking the DB-014 schema.

## 10. Explicit authority statement
This document provides evidence-based recommendations. It does not unilaterally modify locked specifications. DB-014 and AE-009 remain strictly unmodified.
