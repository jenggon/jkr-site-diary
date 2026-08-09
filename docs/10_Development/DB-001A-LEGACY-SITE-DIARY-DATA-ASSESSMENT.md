# DB-001A — LEGACY SITE DIARY DATA ASSESSMENT

**Date:** 2026-08-09
**Task:** DB-001A (Forensic Data / Schema Assessment)
**Mode:** Analysis Only

## 1. Executive Summary
The legacy `site_diary` table (from `baseline.sql`) fundamentally lacks the structural metadata required to map cleanly to the approved REM-007 architecture (Option C). Crucially, the legacy table is missing `revision_id` and `task_id`. This makes automated transformation to the DB-014 canonical `activity` model highly unsafe, as assigning historical site diaries to specific programme revisions would rely on fragile string-matching heuristics. A business decision is required regarding whether to perform a destructive reset or archive the legacy table for manual/heuristic data migration.

## 2. Legacy Schema
Source: `baseline.sql`
- `id` (uuid, PK, NOT NULL, gen_random_uuid()) — Mappable to legacy PK.
- `project_id` (uuid, FK) — Derivable equivalent to `programme_id`.
- `weather` (text) — Derivable equivalent to `weather` enum.
- `ahi` (text) — Derivable.
- `subtask` (text) — Derivable.
- `work_status` (text) — Derivable equivalent to `status` enum.
- `activity_date` (date) — Directly mappable to `site_diary.activity_date`.
- `manpower` (jsonb) — Directly mappable to `site_diary.manpower`.
- `notes` (text) — Directly mappable to `site_diary.notes`.
- `submitted_by` (text) — Obsolete type (canonical uses uuid). Risk of mapping failure.
- `actual_start_date` (date) — Directly mappable to `activity.actual_start_date`.
- `created_at` / `updated_at` (timestampz) — Directly mappable.

**Critically Missing:**
- `revision_id`
- `task_id`

## 3. Canonical Schema
| Legacy Column | Canonical Column | Mapping | Evidence | Risk |
|---|---|---|---|---|
| `id` | `site_diary_id` / `activity_id` | Ambiguous | DB-014/DB-015 | HIGH (Identity collision) |
| `project_id` | `programme_id` | Direct | `baseline.sql` | LOW |
| `work_status` | `activity.status` | Enum Cast | Application logic | MEDIUM |
| `submitted_by` | `submitted_by` | Text to UUID cast | DB-014/DB-015 | HIGH |
| (Missing) | `activity.revision_id` | None | DB-014 | CRITICAL |
| (Missing) | `activity.task_id` | None | DB-014 | CRITICAL |

## 4. Activity Mapping
- `activity_id`: AMBIGUOUS (Requires grouping legacy rows by `subtask` to avoid one activity per day).
- `programme_id`: AVAILABLE (`project_id`).
- `revision_id`: MISSING.
- `task_id`: MISSING.

A legacy row CANNOT safely become `Activity + Site Diary` without unsafe guessing.

## 5. Row Classification
Legacy rows are AMBIGUOUS. They conflate historical Site Diary concepts with operational Open Activity state, without attaching to an authoritative CPM Revision.

## 6. Data Loss Analysis
- **Option 1 (Drop/recreate):** Total loss of historical site diaries.
- **Option 2 (Transform/migrate):** Medium data loss / corruption risk due to guessing `revision_id` and `task_id`. Grouping logic for `activity_id` may artificially merge or split historical activities.
- **Option 3 (Archive and canonicalize):** No data loss. Legacy table is renamed to `legacy_site_diary`. New tables are created empty.

## 7. Identity Analysis
The legacy `id` conflates both the daily log identity and the parent activity identity. Mapping `id` strictly to `site_diary_id` orphans the required `activity_id`. Mapping `id` to `activity_id` results in a new Activity being generated for every single daily log (breaking the "One Activity -> Many Site Diaries" model).

## 8. Revision Analysis
Revision integrity is IMPOSSIBLE to guarantee from existing data. `revision_id` does not exist on the legacy `site_diary` table. Mapping these rows to the "latest authorised CPM Revision" assumes historical diaries belong to the current revision, which explicitly violates the rule prohibiting cross-revision Site Diary continuation.

## 9. Historical Preservation
Historical records must remain immutable. Under Option C, historical logs reside in `site_diary` locked against a superseded `activity`. Since we cannot confidently assign legacy records to a superseded `revision_id`, their historical integrity in the canonical model is compromised. 

## 10. Data Loss Risk & Safety
- **Legacy data:** AMBIGUOUS
- **Activity mapping:** UNSAFE
- **Site Diary mapping:** UNSAFE
- **Migration Safety:** MIGRATION REQUIRES BUSINESS DECISION

## 11. Application Field Gaps
The fields `is_locked`, `trade_info`, and `material_snapshot`:
- Required by DB-014/DB-015? NO.
- Required by REM-007? NO.
- Present in canonical SQL schema? NO.
- Legacy/Application-only? YES. These fields were introduced in repository/frontend mock types but never materialized in PostgreSQL schema migrations.

## 12. REM-004 Dependency
The REM-004 logic (locking `activity` mutations based on `programme_revision.status`) is fully decoupled from the legacy data problem. It targets the new `activity` table. It can be safely implemented during DB-001 provided the `activity` table is created cleanly.

## 13. Migration Options
**A. Archive legacy table (Recommended):** Rename `site_diary` to `legacy_site_diary`, rename `site_diary_logs` to `legacy_site_diary_logs`. Deploy canonical `activity` and `site_diary` tables. Legacy data is preserved for read-only reference or future manual ingestion.
**B. Transform:** Attempt to guess `task_id` and `revision_id`. High risk of corruption.
**C. Destructive Reset:** Drop legacy tables. Total data loss.

## 14. Recommendation
Adopt **Option A**. Rename the legacy `site_diary` table to `legacy_site_diary` to unblock DB-001 canonicalization. This preserves all historical data safely while decoupling it from the strict, revision-bound DB-014/DB-015 schemas that it is structurally incapable of satisfying.

## 15. HQ Decision Required
HQ must decide whether to authorize **Option A (Archive)** or **Option C (Destructive Reset)**.
- **Evidence needed:** Are there critical production records in `site_diary` that must be ported to the active canonical workflow immediately?
- **Consequences:** Option A requires building legacy viewers if the business needs to see old records. Option C permanently deletes historical logs. Automated mapping (Option B) is technically rejected.

## 16. Evidence Limitations
Based entirely on SQL schema definitions. No real DB connection exists to sample data distributions.
