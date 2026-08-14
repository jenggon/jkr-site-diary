-- ============================================================
-- Migration: A20 Phase 1 - REM-004 Relocation
-- Date: 2026-08-14
-- Purpose: Relocate revision-transition lock trigger from site_diary to activity
-- ============================================================

-- 1. Drop the misplaced REM-004 triggers from site_diary
DROP TRIGGER IF EXISTS check_activity_revision_operational_update ON "public"."site_diary";
DROP TRIGGER IF EXISTS check_activity_revision_operational_insert ON "public"."site_diary";

-- 2. Create the robust trigger function for the activity table
CREATE OR REPLACE FUNCTION trg_enforce_activity_revision_operational()
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

-- 3. Apply the triggers to the canonical activity table
DROP TRIGGER IF EXISTS check_activity_revision_operational_update ON "public"."activity";
CREATE TRIGGER check_activity_revision_operational_update
  BEFORE UPDATE ON "public"."activity"
  FOR EACH ROW
  EXECUTE FUNCTION trg_enforce_activity_revision_operational();

DROP TRIGGER IF EXISTS check_activity_revision_operational_insert ON "public"."activity";
CREATE TRIGGER check_activity_revision_operational_insert
  BEFORE INSERT ON "public"."activity"
  FOR EACH ROW
  EXECUTE FUNCTION trg_enforce_activity_revision_operational();
