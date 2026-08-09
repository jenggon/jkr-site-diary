-- ============================================================
-- Migration: DB-001 Database Canonicalization
-- Date: 2026-08-09
-- Purpose: Resolve legacy site_diary conflict, establish Option C
-- ============================================================

-- ============================================================
-- STEP 2 & 3: ARCHIVE LEGACY SITE DIARY & RENAME CONSTRAINTS
-- ============================================================

-- Rename tables
ALTER TABLE "public"."site_diary" RENAME TO "legacy_site_diary";
ALTER TABLE "public"."site_diary_logs" RENAME TO "legacy_site_diary_logs";

-- Rename indexes (PostgreSQL auto-names PK indexes identically to the constraint)
ALTER INDEX IF EXISTS "site_diary_pkey" RENAME TO "legacy_site_diary_pkey";
ALTER INDEX IF EXISTS "site_diary_logs_pkey" RENAME TO "legacy_site_diary_logs_pkey";

-- Rename constraints to free up the canonical names
ALTER TABLE "public"."legacy_site_diary" 
    RENAME CONSTRAINT "site_diary_project_id_fkey" TO "legacy_site_diary_project_id_fkey";

ALTER TABLE "public"."legacy_site_diary_logs" 
    RENAME CONSTRAINT "fk_site_diary_logs" TO "legacy_fk_site_diary_logs";

-- ============================================================
-- STEP 4: DEACTIVATE LEGACY REM-004
-- ============================================================

DROP TRIGGER IF EXISTS "check_activity_revision_operational_update" ON "public"."legacy_site_diary";
DROP TRIGGER IF EXISTS "check_activity_revision_operational_insert" ON "public"."legacy_site_diary";

-- ============================================================
-- STEP 5 & 6 & 7: CANONICAL SITE_DIARY
-- Note: 'activity' was correctly established in DEV-004A.
-- 'site_diary' canonical creation (DEV-005A) was silently skipped previously due to legacy collision.
-- ============================================================

CREATE TABLE "public"."site_diary" (
    "site_diary_id" uuid                     NOT NULL DEFAULT gen_random_uuid(),
    "programme_id"  uuid                     NOT NULL,
    "revision_id"   uuid                     NOT NULL,
    "activity_id"   uuid                     NOT NULL,
    "activity_date" date                     NOT NULL,
    "weather"       "public"."activity_weather_session",
    "notes"         text                     NOT NULL,
    "status"        "public"."activity_operational_status",
    "manpower"      jsonb,
    "submitted_by"  uuid                     NOT NULL,
    "submitted_at"  timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at"    timestamp with time zone,
    CONSTRAINT "site_diary_pkey" PRIMARY KEY ("site_diary_id"),
    CONSTRAINT "site_diary_activity_id_activity_date_key" UNIQUE ("activity_id", "activity_date"),
    CONSTRAINT "site_diary_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "public"."programme" ("programme_id"),
    CONSTRAINT "site_diary_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "public"."programme_revision" ("revision_id"),
    CONSTRAINT "site_diary_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activity" ("activity_id")
);

CREATE INDEX "idx_site_diary_programme_id" ON "public"."site_diary" USING btree ("programme_id");
CREATE INDEX "idx_site_diary_revision_id" ON "public"."site_diary" USING btree ("revision_id");
CREATE INDEX "idx_site_diary_activity_id" ON "public"."site_diary" USING btree ("activity_id");
CREATE INDEX "idx_site_diary_activity_id_activity_date" ON "public"."site_diary" USING btree ("activity_id", "activity_date");
CREATE INDEX "idx_site_diary_submitted_by" ON "public"."site_diary" USING btree ("submitted_by");
CREATE INDEX "idx_site_diary_activity_date" ON "public"."site_diary" USING btree ("activity_date");

-- ============================================================
-- STEP 8: REM-004 RELOCATION TO ACTIVITY
-- ============================================================

CREATE OR REPLACE FUNCTION trg_enforce_revision_operational()
RETURNS TRIGGER AS $$
DECLARE
  v_status VARCHAR;
  v_current_revision_id UUID;
BEGIN
  -- Serialize against Programme Revision transition and lock
  SELECT pr.status, p.current_revision_id 
  INTO v_status, v_current_revision_id
  FROM programme_revision pr
  JOIN programme p ON p.programme_id = pr.programme_id
  WHERE pr.revision_id = NEW.revision_id
  FOR SHARE OF pr;

  IF NOT FOUND THEN
    RETURN NEW; 
  END IF;

  IF v_status != 'Approved' THEN
    RAISE EXCEPTION 'ACTIVITY_REVISION_SUPERSEDED: Activity revision % is no longer operationally current (status: %)', NEW.revision_id, v_status USING ERRCODE = 'P0001';
  END IF;

  IF v_current_revision_id != NEW.revision_id THEN
    RAISE EXCEPTION 'ACTIVITY_REVISION_MISMATCH: Activity revision % is not the current programme revision', NEW.revision_id USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_activity_revision_operational_update
BEFORE UPDATE ON "public"."activity"
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_revision_operational();

CREATE TRIGGER check_activity_revision_operational_insert
BEFORE INSERT ON "public"."activity"
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_revision_operational();
