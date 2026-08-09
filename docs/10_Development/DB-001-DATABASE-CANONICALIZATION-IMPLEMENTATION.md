# DB-001 — DATABASE CANONICALIZATION IMPLEMENTATION

**Project:** JKR Site Diary Digital Platform
**Date:** 2026-08-09
**Status:** 🔴 BLOCKED

---

## 1. Baseline
- **Branch:** `feature/db-001-database-canonicalization`
- **Starting Schema:** `baseline.sql` combined with Sprint DEV-004A through DEV-006A migrations.

## 2. Current Schema Problem
- `baseline.sql` created a legacy `site_diary` table with PK `id` and legacy LHI columns (`work_status`, `manpower` JSON, `actual_start_date`).
- Sprint DEV-005A (`20260802232900_site_diary_engine.sql`) attempted to redefine `site_diary` using `CREATE TABLE IF NOT EXISTS` with a new PK `site_diary_id` and normalized columns. Because the table already existed, PostgreSQL skips creation, meaning the database structure remains locked to the `baseline.sql` version.
- `OpenActivityRepository` attempts to query columns from `site_diary` (`is_locked`, `trade_info`, `material_snapshot`, `activity_name`) that do not exist in *any* SQL migration file. The mock test suites mask this fatal DB missing-column crash.

## 3. Canonical Target
- `activity` table must become the canonical state owner (adding the missing `is_locked`, `trade_info`, `material_snapshot`, `activity_name` columns).
- `site_diary` table must be dedicated strictly to the daily log, using `site_diary_id`.

## 10. Historical Data Assessment & Execution Blocker
**Data migration CANNOT be safely automated without business input.**

**Exact Blocker:**
To canonicalize the database, the `site_diary` table conflict must be resolved. The legacy `baseline.sql` version of `site_diary` physically blocks the canonical DEV-005A version of `site_diary` from existing correctly.
I cannot safely write a migration script because it requires a destructive business decision:
1. Do we rename the legacy `site_diary` to `legacy_site_diary` and create the canonical one fresh?
2. Or do we run a destructive schema mutation on `site_diary` (dropping `id`, adding `site_diary_id`, extracting stateful records into `activity`, and deleting orphan records)?
Since historical data integrity is at risk and columns like `is_locked` literally do not exist anywhere to map from, any data migration attempt would be guessing.

**Execution is STOPPED pending HQ decision on legacy data destruction/migration strategy.**

## 15. Exit Status
Status: BLOCKED at Step 8 (Historical Data). No SQL migration was written to prevent data corruption.
