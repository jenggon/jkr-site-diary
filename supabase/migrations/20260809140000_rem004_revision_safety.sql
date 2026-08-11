-- ============================================================
-- Migration: REM-004 Revision Transition Atomicity
-- Date: 2026-08-09
-- Purpose: Enforce Programme Revision concurrency lock (F-03)
-- ============================================================

CREATE OR REPLACE FUNCTION trg_enforce_revision_operational()
RETURNS TRIGGER AS $$
DECLARE
  v_status VARCHAR;
BEGIN
  -- 1. Serialize against Programme Revision transition by locking the row.
  --    This prevents concurrent transitions (e.g. approveRevision) from superseding
  --    the revision while this mutation is committing.
  SELECT status INTO v_status
  FROM programme_revision
  WHERE revision_id = NEW.revision_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN NEW; -- No revision linked, or broken integrity.
  END IF;

  -- 2. Reject mutation if revision is superseded or not approved.
  --    This enforces the F-03 rule AT the transaction commit boundary.
  --    (We enforce it globally for this remediation rather than dynamically checking
  --     fields, to provide robust mutation protection.)
  IF v_status != 'Approved' THEN
    RAISE EXCEPTION 'ACTIVITY_REVISION_SUPERSEDED: Activity revision % is no longer operationally current (status: %)', NEW.revision_id, v_status USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for UPDATE on site_diary
DROP TRIGGER IF EXISTS check_activity_revision_operational_update ON site_diary;
CREATE TRIGGER check_activity_revision_operational_update
BEFORE UPDATE ON site_diary
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_revision_operational();

-- Trigger for INSERT on site_diary (protecting new activities)
DROP TRIGGER IF EXISTS check_activity_revision_operational_insert ON site_diary;
CREATE TRIGGER check_activity_revision_operational_insert
BEFORE INSERT ON site_diary
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_revision_operational();
