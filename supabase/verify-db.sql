-- Phase 3 DB Boundary Verification Script
-- Expected to fail on the second insert with a unique constraint violation on idx_site_diary_activity_id_activity_date

BEGIN;

-- Setup test data
INSERT INTO programme (programme_id, programme_code, programme_name, status, is_locked)
VALUES ('00000000-0000-0000-0000-000000000001', 'TST001', 'Test Prog', 'Active', false)
ON CONFLICT DO NOTHING;

INSERT INTO programme_revision (revision_id, programme_id, revision_number, revision_title, is_current, status)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 1, 'Rev 1', true, 'Approved')
ON CONFLICT DO NOTHING;

INSERT INTO task (task_id, revision_id, programme_id, task_name)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Test Task')
ON CONFLICT DO NOTHING;

INSERT INTO activity (activity_id, programme_id, revision_id, task_id, activity_uid, subtask, activity_date, status, submitted_by)
VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'uid-1', 'Sub', '2026-09-01', 'In Progress', 'user')
ON CONFLICT DO NOTHING;

-- Insert first Site Diary
INSERT INTO site_diary (site_diary_id, programme_id, revision_id, activity_id, activity_date, notes, status, submitted_by)
VALUES ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', '2026-09-02', 'Note 1', 'In Progress', 'user');

-- Attempt duplicate insert (this should fail)
INSERT INTO site_diary (site_diary_id, programme_id, revision_id, activity_id, activity_date, notes, status, submitted_by)
VALUES ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', '2026-09-02', 'Note 2', 'In Progress', 'user');

ROLLBACK;
