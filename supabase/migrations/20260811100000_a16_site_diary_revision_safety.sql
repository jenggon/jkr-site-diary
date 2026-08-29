-- ============================================================
-- Migration: A16 Site Diary Revision Safety
-- Date: 2026-08-11
-- Purpose: Implement DB-015 revision mutation safety natively
-- ============================================================

CREATE OR REPLACE FUNCTION trg_enforce_site_diary_revision_operational()
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
    RAISE EXCEPTION 'SITE_DIARY_REVISION_SUPERSEDED: Site Diary revision % is no longer operationally current (status: %)', NEW.revision_id, v_status USING ERRCODE = 'P0001';
  END IF;

  IF v_current_revision_id != NEW.revision_id THEN
    RAISE EXCEPTION 'SITE_DIARY_REVISION_MISMATCH: Site Diary revision % is not the current programme revision', NEW.revision_id USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_site_diary_revision_operational_update
  BEFORE UPDATE ON "public"."site_diary"
  FOR EACH ROW
  EXECUTE FUNCTION trg_enforce_site_diary_revision_operational();

CREATE TRIGGER check_site_diary_revision_operational_insert
  BEFORE INSERT ON "public"."site_diary"
  FOR EACH ROW
  EXECUTE FUNCTION trg_enforce_site_diary_revision_operational();
