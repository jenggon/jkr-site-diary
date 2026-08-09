# DB-001 — DATABASE CANONICALIZATION IMPLEMENTATION

**Project:** JKR Site Diary Digital Platform
**Date:** 2026-08-09
**Status:** COMPLETE

---

## 1. Baseline SHA
Commit: `d4a70ce` (docs: save db-001a and db-001b assessments)

## 2. Legacy Archive Operation
The legacy table `site_diary` (from `baseline.sql`) has been archived using `ALTER TABLE "public"."site_diary" RENAME TO "legacy_site_diary";`. 
The `site_diary_logs` table has similarly been archived to `legacy_site_diary_logs`.
All legacy records are preserved byte-for-byte. No data deletion or automated migration occurred.

## 3. Constraint/Index Renames
To free the canonical constraint names for the new tables, the following legacy objects were explicitly renamed:
- Index `site_diary_pkey` → `legacy_site_diary_pkey`
- Index `site_diary_logs_pkey` → `legacy_site_diary_logs_pkey`
- Constraint `site_diary_project_id_fkey` → `legacy_site_diary_project_id_fkey`
- Constraint `fk_site_diary_logs` → `legacy_fk_site_diary_logs`

## 4. Canonical Activity
The canonical `activity` table was already correctly established by the Sprint DEV-004A migration (`20260802231500_activity_engine.sql`). It faithfully implements DB-014 without injecting speculative application fields (`is_locked`, `trade_info`, etc.).

## 5. Canonical Site Diary
The canonical `site_diary` table has been created exactly as specified by DB-015, using `site_diary_id` as the primary key. This replaces the failed DEV-005A attempt that was previously blocked by the legacy table collision.

## 6. FK Relationships
The canonical `site_diary` establishes the required `activity_id` foreign key pointing strictly to `activity.activity_id`.

## 7. REM-004 Relocation
The REM-004 operational revision protection triggers have been explicitly `DROP`ped from `legacy_site_diary`. The `trg_enforce_revision_operational()` function was updated to enforce both `programme.current_revision_id == activity.revision_id` and `status == 'Approved'` using `SELECT ... FOR SHARE`. The protection is now active on the `activity` table via `BEFORE UPDATE` and `BEFORE INSERT` triggers.

## 8. Historical Data Preservation
Legacy records in `legacy_site_diary` and `legacy_site_diary_logs` remain safely untouched. The legacy PK `id` and foreign key linkages between those two legacy tables are preserved.

## 9. Application Cutover Dependency
**CRITICAL:** The database migration MUST NOT be considered production-release safe until the application repository cutover has been completed. Currently, `OpenActivityRepository` physically depends on the string `'site_diary'` and expects legacy operational state (`is_locked`, `trade_info`). It MUST be updated to point to the `activity` table in the next controlled implementation task.

## 10. Validation Evidence
- **Typecheck:** PASSED
- **Lint:** PASSED
- **Tests:** PASSED (`npm test` passed 221 tests successfully).
- **Real DB evidence:** C (Migration code evidence). A real Supabase execution environment was not available to run the migration against a live database instance.

## 11. Known Limitations
- The `OpenActivityRepository` is structurally broken against this new schema and will crash until the application cutover task is completed.
- Legacy data is isolated and currently inaccessible to the canonical API routes without a future manual migration or legacy viewer.

## 12. Exact Files Changed
- `supabase/migrations/20260809220000_db001_database_canonicalization.sql` (NEW)
- `docs/10_Development/DB-001-DATABASE-CANONICALIZATION-IMPLEMENTATION.md` (UPDATED)

## 13. Commit SHA
*(To be generated upon commit)*
