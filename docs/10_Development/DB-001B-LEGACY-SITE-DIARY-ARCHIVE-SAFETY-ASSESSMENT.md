# DB-001B — LEGACY SITE DIARY ARCHIVE SAFETY ASSESSMENT

**Date:** 2026-08-09
**Task:** DB-001B (Archive Safety Assessment)
**Mode:** Analysis Only

## 1. Executive Summary
Renaming `site_diary` to `legacy_site_diary` is the safest way to preserve historical data while unblocking DB-014/DB-015 canonicalization. The database rename operation preserves all bytes, keys, and audit log foreign keys automatically. However, it requires renaming legacy constraints (e.g., `site_diary_pkey`) to prevent collisions when the canonical table is created. Furthermore, this database migration MUST be strictly paired with an application code update, as `OpenActivityRepository` incorrectly queries `site_diary` and will fatally crash against the new canonical schema.

## 2. Database Dependencies
- **`site_diary_logs`:** Contains an explicit FK `fk_site_diary_logs` referencing `site_diary(id)` ON DELETE CASCADE.
- **Triggers:** `check_activity_revision_operational_update` and `check_activity_revision_operational_insert` (REM-004) are bound to `site_diary`.
- **Impact of Rename:** PostgreSQL automatically tracks table renames for triggers and foreign keys. The FK from `site_diary_logs` will automatically follow the rename to `legacy_site_diary`, perfectly preserving audit integrity.

## 3. Application Dependencies
- `OpenActivityRepository` (Legacy implementation) -> Expects operational state on `site_diary`.
- `siteDiaryRepository` (Canonical) -> Expects `site_diary_id` and daily execution state on `site_diary`.
- `progressRepository`, `approvalRepository`, `workforceRepository` -> Expect `site_diary_id` FK.

## 4. Repository Dependencies
- `OpenActivityRepository` currently depends physically on the string `'site_diary'`. Once the canonical `site_diary` table replaces the legacy one, `OpenActivityRepository` will crash because the canonical table lacks operational fields like `is_locked` and `trade_info`.
- `siteDiaryRepository` will begin working correctly as soon as the canonical table is created.

## 5. Audit Log Dependencies
The `site_diary_logs` table has a direct foreign key to `site_diary(id)`. When `site_diary` is renamed, PostgreSQL automatically redirects this FK to `legacy_site_diary(id)`. Historical logs remain perfectly intact and bound to their legacy parent records. No additional SQL is required to maintain this link.

## 6. Rename Safety
`ALTER TABLE site_diary RENAME TO legacy_site_diary;`
- Preserves data? **YES**
- Preserves PK? **YES**
- Preserves constraints? **YES**
- Preserves triggers? **YES**
- Preserves audit relationships? **YES**
- Breaks application references? **YES** (Temporary, until canonical table is created and repositories are updated).
- Naming collisions? **YES** (Indexes and constraint names like `site_diary_pkey` do NOT rename automatically and will collide with canonical creation scripts).

## 7. Data Preservation
The data is preserved byte-for-byte at the database storage level. The table simply receives a new identifier in `pg_class`.

## 8. Canonical Table Creation
The archive successfully frees the table name `site_diary`.
**CRITICAL BLOCKER:** The canonical script executes:
`ALTER TABLE ONLY "public"."site_diary" ADD CONSTRAINT "site_diary_pkey" PRIMARY KEY ("site_diary_id");`
Because constraints are not renamed when a table is renamed, the old `site_diary_pkey` will still exist on `legacy_site_diary`, causing the canonical creation to crash with a "relation already exists" error.
The migration must explicitly rename constraints and indexes.

## 9. Migration Order
1. Rename table `site_diary` to `legacy_site_diary`.
2. Rename table `site_diary_logs` to `legacy_site_diary_logs`.
3. Rename constraint `site_diary_pkey` to `legacy_site_diary_pkey`.
4. Rename constraint `site_diary_logs_pkey` to `legacy_site_diary_logs_pkey`.
5. Drop REM-004 triggers from legacy table (they belong on the new activity table).
6. Create canonical `activity` table.
7. Create canonical `site_diary` table.
8. Establish canonical REM-004 trigger on `activity`.
9. Deploy application code update pointing `OpenActivityRepository` to `activity`.

## 10. Rollback
If canonical creation fails:
1. Drop canonical tables.
2. Rename constraints back to `site_diary_pkey`.
3. Rename tables back to `site_diary`.
Legacy data is completely preserved.

## 11. Production Safety
**SAFE WITH CONDITIONS.**
The database archive is non-destructive. However, to prevent a fatal application crash, the schema canonicalization must be deployed simultaneously with the repository refactor (`OpenActivityRepository` -> `activity`).

## 12. Required Migration Contract
A valid DB-001 migration MUST:
- Use `ALTER TABLE ... RENAME TO`.
- NOT delete any legacy rows.
- Explicitly rename legacy constraints (e.g. `site_diary_pkey`) to prevent collision.
- Drop REM-004 triggers from the legacy table to prevent legacy mutations from throwing false errors.
- Ensure no automated data mapping attempts to force legacy data into DB-014 constraints.

## 13. REM-004 Impact
The existing triggers will follow the rename to `legacy_site_diary`. They must be explicitly dropped from `legacy_site_diary` and established on the new canonical `activity` table.

## 14. HQ Decision Required
HQ must authorize the DB-001 implementation plan including the constraint renaming and simultaneous repository update requirements. No destructive data choices are required.
