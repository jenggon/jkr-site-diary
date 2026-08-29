\set ON_ERROR_STOP on

-- F3-B06 runtime security proof.
-- Run only against a conclusively local disposable Supabase database after
-- `supabase db reset --local --no-seed`. The entire fixture and proof matrix is
-- transactional and rolls back at the end.

BEGIN;

CREATE FUNCTION pg_temp.b06_assert(p_condition boolean, p_label text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(p_condition, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'F3-B06 ASSERTION FAILED: %', p_label;
  END IF;
  RAISE NOTICE 'PASS: %', p_label;
END;
$$;

CREATE FUNCTION pg_temp.b06_expect_state(
  p_sql text,
  p_expected_states text[],
  p_label text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'F3-B06 EXPECTED REJECTION DID NOT OCCUR: %', p_label;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLSTATE = ANY(p_expected_states) THEN
      RAISE NOTICE 'PASS: % rejected with SQLSTATE %', p_label, SQLSTATE;
      RETURN;
    END IF;
    RAISE;
END;
$$;

-- Supplies a valid optimistic-concurrency token independently of caller RLS.
-- This prevents a foreign proof from passing on an earlier missing-token check.
CREATE FUNCTION pg_temp.b06_site_diary_token(p_site_diary_id uuid)
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(updated_at, submitted_at)
  FROM public.site_diary
  WHERE site_diary_id = p_site_diary_id
$$;

GRANT EXECUTE ON FUNCTION pg_temp.b06_assert(boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.b06_expect_state(text, text[], text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.b06_site_diary_token(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Personas
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'b06-admin@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'b06-planner-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'b06-so-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'b06-se-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'b06-re-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'b06-foreign-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'b06-nomember@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'b06-inactive@example.test', '', now(), '{}', '{}', now(), now());

INSERT INTO public.user_profile (user_id, full_name, is_active, global_role_id)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'P-ADMIN', true, (SELECT role_id FROM public.role WHERE role_code = 'SYSTEM_ADMIN')),
  ('00000000-0000-4000-8000-000000000002', 'P-PLANNER-A', true, NULL),
  ('00000000-0000-4000-8000-000000000003', 'P-SO-A', true, NULL),
  ('00000000-0000-4000-8000-000000000004', 'P-SE-A', true, NULL),
  ('00000000-0000-4000-8000-000000000005', 'P-RE-A', true, NULL),
  ('00000000-0000-4000-8000-000000000006', 'P-FOREIGN-B', true, NULL),
  ('00000000-0000-4000-8000-000000000007', 'P-NOMEMBER', true, NULL),
  ('00000000-0000-4000-8000-000000000008', 'P-INACTIVE', false, (SELECT role_id FROM public.role WHERE role_code = 'SYSTEM_ADMIN'));

-- Programme A starts on an older approved revision so fixtures can preserve a
-- real superseded-revision row after the current revision is installed.
INSERT INTO public.programme (
  programme_id, programme_code, programme_name, status, created_by
)
VALUES (
  '10000000-0000-4000-8000-000000000001', 'B06-A', 'B06 Programme A',
  'Approved', '00000000-0000-4000-8000-000000000001'
);

INSERT INTO public.programme_revision (
  revision_id, programme_id, revision_no, revision_name, status, created_by,
  approved_at, approved_by
)
VALUES (
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', 1, 'Superseded fixture',
  'Approved', '00000000-0000-4000-8000-000000000001', now(),
  '00000000-0000-4000-8000-000000000001'
);
UPDATE public.programme
SET current_revision_id = '11000000-0000-4000-8000-000000000001'
WHERE programme_id = '10000000-0000-4000-8000-000000000001';

INSERT INTO public.task (
  task_id, programme_id, revision_id, task_uid, task_name, created_by
)
VALUES (
  '12000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001', 1,
  'Superseded task', '00000000-0000-4000-8000-000000000001'
);

INSERT INTO public.activity (
  activity_id, programme_id, revision_id, task_id, activity_uid, ahi,
  subtask, activity_date, status, notes, submitted_by
)
VALUES (
  '13000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000001', 'A-OLD',
  'Superseded activity', DATE '2026-08-01', 'In Progress', 'historical',
  '00000000-0000-4000-8000-000000000004'
);

INSERT INTO public.site_diary (
  site_diary_id, programme_id, revision_id, activity_id, activity_date,
  notes, status, submitted_by, print_context
)
VALUES (
  '14000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000001', DATE '2026-08-01',
  'historical diary', 'In Progress', '00000000-0000-4000-8000-000000000004',
  '{"location":"old","contractor_scope":"CONTRACTOR"}'
);

INSERT INTO public.programme_revision (
  revision_id, programme_id, revision_no, revision_name, status, created_by,
  approved_at, approved_by
)
VALUES
  ('11000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 2, 'Current fixture', 'Approved', '00000000-0000-4000-8000-000000000001', now(), '00000000-0000-4000-8000-000000000001'),
  ('11000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 3, 'Foreign takeover target', 'Draft', '00000000-0000-4000-8000-000000000001', NULL, NULL);

UPDATE public.programme_revision
SET status = 'Superseded'
WHERE revision_id = '11000000-0000-4000-8000-000000000001';
UPDATE public.programme
SET current_revision_id = '11000000-0000-4000-8000-000000000002'
WHERE programme_id = '10000000-0000-4000-8000-000000000001';

INSERT INTO public.task (
  task_id, programme_id, revision_id, task_uid, task_name, created_by,
  outline_number, trade_code, trade_name
)
VALUES (
  '12000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002', 2,
  'Current task A', '00000000-0000-4000-8000-000000000002',
  '1', 'CARP', 'Carpentry'
);

INSERT INTO public.activity (
  activity_id, programme_id, revision_id, task_id, activity_uid, ahi,
  subtask, activity_date, status, actual_start_date, notes, submitted_by
)
VALUES
  ('13000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002', 'A-01', 'Current activity A', DATE '2026-08-20', 'In Progress', DATE '2026-08-20', 'fixture A', '00000000-0000-4000-8000-000000000004'),
  ('13000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000003', 'A-02', 'Completable activity A', DATE '2026-08-21', 'New', NULL, 'fixture A2', '00000000-0000-4000-8000-000000000004');

INSERT INTO public.site_diary (
  site_diary_id, programme_id, revision_id, activity_id, activity_date,
  notes, status, submitted_by, print_context
)
VALUES
  ('14000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002', DATE '2026-08-20', 'diary A', 'In Progress', '00000000-0000-4000-8000-000000000004', '{"location":"A","contractor_scope":"CONTRACTOR"}'),
  ('14000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002', DATE '2026-08-21', 'approval diary 1', 'In Progress', '00000000-0000-4000-8000-000000000004', '{"location":"A1","contractor_scope":"CONTRACTOR"}'),
  ('14000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002', DATE '2026-08-22', 'approval diary 2', 'In Progress', '00000000-0000-4000-8000-000000000004', '{"location":"A2","contractor_scope":"CONTRACTOR"}');

INSERT INTO public.trade_library (
  trade_id, trade_code, trade_name, is_active, created_by
)
VALUES (
  '16000000-0000-4000-8000-000000000001', 'B06-EXIST',
  'B06 Existing Trade', true, '00000000-0000-4000-8000-000000000001'
);

INSERT INTO public.workforce (
  workforce_id, programme_id, revision_id, activity_id, site_diary_id,
  trade_id, trade_name, bumiputera_count, non_bumiputera_count,
  foreign_count, total_count
)
VALUES (
  '15000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002',
  '13000000-0000-4000-8000-000000000002',
  '14000000-0000-4000-8000-000000000002',
  '16000000-0000-4000-8000-000000000001', 'B06 Existing Trade', 1, 1, 1, 3
);

INSERT INTO public.vo_item (
  vo_item_id, programme_id, revision_id, vo_reference, line_item,
  description, is_omission, created_by
)
VALUES (
  '17000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002',
  'VO-A', '001', 'Programme A VO', false,
  '00000000-0000-4000-8000-000000000001'
);

INSERT INTO public.progress (
  progress_id, programme_id, revision_id, activity_id, site_diary_id,
  measurement_date, progress_type, planned_quantity, actual_quantity,
  unit, progress_percentage, measurement_status
)
VALUES (
  '18000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002',
  '13000000-0000-4000-8000-000000000002',
  '14000000-0000-4000-8000-000000000002', DATE '2026-08-20',
  'Quantity', 100, 10, 'unit', 10, 'Draft'
);

INSERT INTO public.approval (
  approval_id, programme_id, revision_id, activity_id, site_diary_id,
  approval_status, requested_by
)
VALUES (
  '19000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002',
  '13000000-0000-4000-8000-000000000002',
  '14000000-0000-4000-8000-000000000003', 'Pending',
  '00000000-0000-4000-8000-000000000004'
);

INSERT INTO public.audit (
  audit_id, programme_id, revision_id, entity_name, entity_id, event_type,
  performed_by
)
VALUES (
  '1a000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002', 'B06',
  '13000000-0000-4000-8000-000000000002', 'Create',
  '00000000-0000-4000-8000-000000000004'
);

INSERT INTO public.activity_logs (
  log_id, activity_id, event_type, snapshot_data, logged_by
)
VALUES (
  '1b000000-0000-4000-8000-000000000001',
  '13000000-0000-4000-8000-000000000002', 'NEW', '{"programme":"A"}',
  '00000000-0000-4000-8000-000000000004'
);

INSERT INTO public.site_diary_logs (
  log_id, site_diary_id, event_type, snapshot_data, logged_by
)
VALUES (
  '1c000000-0000-4000-8000-000000000001',
  '14000000-0000-4000-8000-000000000002', 'NEW', '{"programme":"A"}',
  '00000000-0000-4000-8000-000000000004'
);

-- Programme B and its distinct sensitive rows.
INSERT INTO public.programme (
  programme_id, programme_code, programme_name, status, created_by
)
VALUES (
  '20000000-0000-4000-8000-000000000001', 'B06-B', 'B06 Programme B',
  'Approved', '00000000-0000-4000-8000-000000000006'
);
INSERT INTO public.programme_revision (
  revision_id, programme_id, revision_no, revision_name, status, created_by,
  approved_at, approved_by
)
VALUES (
  '21000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001', 1, 'Current B', 'Approved',
  '00000000-0000-4000-8000-000000000006', now(),
  '00000000-0000-4000-8000-000000000006'
);
UPDATE public.programme
SET current_revision_id = '21000000-0000-4000-8000-000000000001'
WHERE programme_id = '20000000-0000-4000-8000-000000000001';
INSERT INTO public.task (task_id, programme_id, revision_id, task_uid, task_name, created_by)
VALUES ('22000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 1, 'Task B', '00000000-0000-4000-8000-000000000006');
INSERT INTO public.activity (
  activity_id, programme_id, revision_id, task_id, activity_uid, ahi,
  subtask, activity_date, status, actual_start_date, notes, submitted_by
)
VALUES ('23000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'B-01', 'Activity B', DATE '2026-08-20', 'In Progress', DATE '2026-08-20', 'fixture B', '00000000-0000-4000-8000-000000000006');
INSERT INTO public.site_diary (
  site_diary_id, programme_id, revision_id, activity_id, activity_date,
  notes, status, submitted_by, print_context
)
VALUES ('24000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', DATE '2026-08-20', 'diary B', 'In Progress', '00000000-0000-4000-8000-000000000006', '{"location":"B","contractor_scope":"CONTRACTOR"}');
INSERT INTO public.workforce (
  workforce_id, programme_id, revision_id, activity_id, site_diary_id,
  trade_id, trade_name, bumiputera_count, non_bumiputera_count,
  foreign_count, total_count
)
VALUES ('25000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'B06 Existing Trade', 2, 0, 0, 2);
INSERT INTO public.vo_item (
  vo_item_id, programme_id, revision_id, vo_reference, line_item,
  description, is_omission, created_by
)
VALUES ('27000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'VO-B', '001', 'Programme B VO', false, '00000000-0000-4000-8000-000000000006');
INSERT INTO public.progress (
  progress_id, programme_id, revision_id, activity_id, site_diary_id,
  measurement_date, progress_type, planned_quantity, actual_quantity,
  unit, progress_percentage, measurement_status
)
VALUES ('28000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', DATE '2026-08-20', 'Quantity', 100, 20, 'unit', 20, 'Draft');
INSERT INTO public.audit (audit_id, programme_id, revision_id, entity_name, entity_id, event_type, performed_by)
VALUES ('2a000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'B06', '23000000-0000-4000-8000-000000000001', 'Create', '00000000-0000-4000-8000-000000000006');
INSERT INTO public.activity_logs (log_id, activity_id, event_type, snapshot_data, logged_by)
VALUES ('2b000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'NEW', '{"programme":"B"}', '00000000-0000-4000-8000-000000000006');
INSERT INTO public.site_diary_logs (log_id, site_diary_id, event_type, snapshot_data, logged_by)
VALUES ('2c000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'NEW', '{"programme":"B"}', '00000000-0000-4000-8000-000000000006');

-- Replace trigger-created creator memberships with the intended personas and
-- add the exact Programme A role matrix.
INSERT INTO public.programme_membership (programme_id, user_id, role_id, is_active)
VALUES
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', (SELECT role_id FROM public.role WHERE role_code='PLANNER'), true),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', (SELECT role_id FROM public.role WHERE role_code='SUPERINTENDING_OFFICER'), true),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', (SELECT role_id FROM public.role WHERE role_code='SITE_SUPERVISOR'), true),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', (SELECT role_id FROM public.role WHERE role_code='RESIDENT_ENGINEER'), true)
ON CONFLICT (programme_id, user_id) DO UPDATE
SET role_id = EXCLUDED.role_id, is_active = EXCLUDED.is_active;

INSERT INTO public.programme_membership (programme_id, user_id, role_id, is_active)
VALUES ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000006', (SELECT role_id FROM public.role WHERE role_code='SITE_SUPERVISOR'), true)
ON CONFLICT (programme_id, user_id) DO UPDATE
SET role_id = EXCLUDED.role_id, is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- B01: authority foundation and scope invariants
-- ---------------------------------------------------------------------------

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
SELECT private.assert_global_capability('00000000-0000-4000-8000-000000000001', 'PROGRAMME_CREATE');
SELECT private.assert_authority('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'TASK_UPDATE');
SELECT pg_temp.b06_assert(true, 'P-ADMIN global capability and combined authority pass');

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
SELECT private.assert_authority('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'REVISION_IMPORT');
SELECT pg_temp.b06_expect_state(
  $sql$SELECT private.assert_global_capability('00000000-0000-4000-8000-000000000002','PROGRAMME_CREATE')$sql$,
  ARRAY['PT403'], 'ordinary Programme user denied global capability'
);
SELECT pg_temp.b06_expect_state(
  $sql$SELECT private.assert_authority('00000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','REVISION_IMPORT')$sql$,
  ARRAY['PT403'], 'foreign Programme authority denied'
);
SELECT pg_temp.b06_expect_state(
  $sql$SELECT private.assert_authority('00000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','REVISION_IMPORT')$sql$,
  ARRAY['42501'], 'forged no-member actor denied before authority lookup'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000007', true);
SELECT pg_temp.b06_expect_state(
  $sql$SELECT private.assert_authority('00000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','REVISION_IMPORT')$sql$,
  ARRAY['PT403'], 'authenticated no-member denied'
);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000008', true);
SELECT pg_temp.b06_expect_state(
  $sql$SELECT private.assert_global_capability('00000000-0000-4000-8000-000000000008','PROGRAMME_CREATE')$sql$,
  ARRAY['PT403'], 'inactive global user denied'
);

UPDATE public.permission SET is_active=false WHERE permission_code='PROGRAMME_CREATE';
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
SELECT pg_temp.b06_expect_state(
  $sql$SELECT private.assert_global_capability('00000000-0000-4000-8000-000000000001','PROGRAMME_CREATE')$sql$,
  ARRAY['PT403'], 'inactive permission denied'
);
UPDATE public.permission SET is_active=true WHERE permission_code='PROGRAMME_CREATE';

SELECT pg_temp.b06_expect_state(
  $sql$UPDATE public.user_profile SET global_role_id=(SELECT role_id FROM public.role WHERE role_code='PLANNER') WHERE user_id='00000000-0000-4000-8000-000000000007'$sql$,
  ARRAY['PT400'], 'Programme role rejected as global_role_id'
);
SELECT pg_temp.b06_expect_state(
  $sql$INSERT INTO public.programme_membership(programme_id,user_id,role_id) VALUES ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000007',(SELECT role_id FROM public.role WHERE role_code='SYSTEM_ADMIN'))$sql$,
  ARRAY['PT400'], 'Global role rejected as Programme membership'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
SELECT pg_temp.b06_expect_state(
  $sql$SELECT private.assert_authority('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','REVISION_IMPORT')$sql$,
  ARRAY['42501'], 'authenticated cannot directly invoke private authority helper'
);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- Critical foreign revision takeover replay and direct foreign RPC matrix
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000006', true);
SELECT pg_temp.b06_expect_state(
  $sql$SELECT public.a27_ingest_msp_atomic(
    '{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000004","revision_no":4,"revision_name":"FOREIGN","msp_file_name":"foreign.xml","msp_file_hash":"foreign-hash","status":"Draft"}',
    '[{"task_id":"12000000-0000-4000-8000-000000000004","programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000004","task_uid":4,"task_name":"Foreign task"}]',
    '00000000-0000-4000-8000-000000000006','1a000000-0000-4000-8000-000000000004')$sql$,
  ARRAY['PT403'], 'critical foreign revision ingest denied at authority boundary'
);
SELECT pg_temp.b06_expect_state(
  $sql$SELECT public.a27_approve_revision_atomic('11000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000006','1a000000-0000-4000-8000-000000000005')$sql$,
  ARRAY['PT403'], 'critical foreign revision approval denied at authority boundary'
);
RESET ROLE;

SELECT pg_temp.b06_assert(
  (SELECT current_revision_id='11000000-0000-4000-8000-000000000002' FROM public.programme WHERE programme_id='10000000-0000-4000-8000-000000000001'),
  'foreign takeover leaves Programme A current revision unchanged'
);
SELECT pg_temp.b06_assert(
  NOT EXISTS (SELECT 1 FROM public.programme_revision WHERE revision_id='11000000-0000-4000-8000-000000000004')
  AND NOT EXISTS (SELECT 1 FROM public.task WHERE task_id='12000000-0000-4000-8000-000000000004')
  AND NOT EXISTS (SELECT 1 FROM public.audit WHERE audit_id IN ('1a000000-0000-4000-8000-000000000004','1a000000-0000-4000-8000-000000000005')),
  'foreign takeover produces no revision, task, or audit side effects'
);
SELECT pg_temp.b06_assert(
  (SELECT status='Draft' FROM public.programme_revision WHERE revision_id='11000000-0000-4000-8000-000000000003'),
  'foreign approval leaves target revision Draft'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000006', true);
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_archive_programme('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000006')$sql$, ARRAY['PT403'], 'foreign Programme archive denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_task('12000000-0000-4000-8000-000000000002','{"task_name":"foreign"}','00000000-0000-4000-8000-000000000006')$sql$, ARRAY['PT403'], 'foreign Task update denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_create_activity_atomic('{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","task_id":"12000000-0000-4000-8000-000000000002","source_type":"MSP","subtask":"foreign","activity_date":"2026-08-24","notes":"foreign"}','00000000-0000-4000-8000-000000000006','13000000-0000-4000-8000-000000000020','1b000000-0000-4000-8000-000000000020')$sql$, ARRAY['PT403'], 'foreign Activity create denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_activity_atomic('13000000-0000-4000-8000-000000000002','{"notes":"foreign"}','00000000-0000-4000-8000-000000000006','1b000000-0000-4000-8000-000000000021')$sql$, ARRAY['PT403'], 'foreign Activity update denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_start_activity_atomic('13000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000006','1b000000-0000-4000-8000-000000000022')$sql$, ARRAY['PT403'], 'foreign Activity start denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_complete_activity_atomic('13000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000006','1b000000-0000-4000-8000-000000000023')$sql$, ARRAY['PT403'], 'foreign Activity complete denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.f1_create_site_diary_full_atomic('{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","activity_id":"13000000-0000-4000-8000-000000000002","activity_date":"2026-08-24","operation_intent":"IN_PROGRESS_DIARY","notes":"foreign","manpower":[{"trade_name":"B06 Foreign Global Trade","bumiputera_count":1}],"print_context":{"location":"A","contractor_scope":"CONTRACTOR"}}','00000000-0000-4000-8000-000000000006','14000000-0000-4000-8000-000000000020','1c000000-0000-4000-8000-000000000020','1a000000-0000-4000-8000-000000000020')$sql$, ARRAY['PT403'], 'foreign Site Diary create and hidden Trade creation denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.f1_update_site_diary_full_atomic('14000000-0000-4000-8000-000000000002','{"notes":"foreign"}','00000000-0000-4000-8000-000000000006','1c000000-0000-4000-8000-000000000021','1a000000-0000-4000-8000-000000000021',pg_temp.b06_site_diary_token('14000000-0000-4000-8000-000000000002'))$sql$, ARRAY['PT403'], 'foreign Site Diary update denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_create_workforce_atomic('{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","activity_id":"13000000-0000-4000-8000-000000000002","site_diary_id":"14000000-0000-4000-8000-000000000002","trade_id":"16000000-0000-4000-8000-000000000001","bumiputera_count":1,"non_bumiputera_count":0,"foreign_count":0}','00000000-0000-4000-8000-000000000006','15000000-0000-4000-8000-000000000020','1a000000-0000-4000-8000-000000000022')$sql$, ARRAY['PT403'], 'foreign Workforce create denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_workforce_atomic('15000000-0000-4000-8000-000000000001','{"bumiputera_count":9}','00000000-0000-4000-8000-000000000006','1a000000-0000-4000-8000-000000000023')$sql$, ARRAY['PT403'], 'foreign Workforce update denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_create_progress_atomic('{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","activity_id":"13000000-0000-4000-8000-000000000002","site_diary_id":"14000000-0000-4000-8000-000000000002","measurement_date":"2026-08-20","progress_type":"Quantity","planned_quantity":100,"actual_quantity":1,"unit":"unit","progress_percentage":1,"measurement_status":"Draft"}','00000000-0000-4000-8000-000000000006','18000000-0000-4000-8000-000000000020','1a000000-0000-4000-8000-000000000024','1b000000-0000-4000-8000-000000000024')$sql$, ARRAY['PT403'], 'foreign Progress create denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_progress_atomic('18000000-0000-4000-8000-000000000001','{"actual_quantity":11}','00000000-0000-4000-8000-000000000006','1a000000-0000-4000-8000-000000000025','1b000000-0000-4000-8000-000000000025')$sql$, ARRAY['PT403'], 'foreign Progress edit denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.f1_create_vo_item_atomic('10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','VO-FOREIGN','001','foreign',false,'00000000-0000-4000-8000-000000000006','17000000-0000-4000-8000-000000000020')$sql$, ARRAY['PT403'], 'foreign VO Item create denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.f1_create_trade_atomic('B06-FOREIGN','B06 Foreign Trade')$sql$, ARRAY['PT403'], 'ordinary Programme user denied global Trade create');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_approval_atomic('19000000-0000-4000-8000-000000000001','{"approval_status":"Approved"}','00000000-0000-4000-8000-000000000006','1a000000-0000-4000-8000-000000000026',pg_temp.b06_site_diary_token('14000000-0000-4000-8000-000000000003'))$sql$, ARRAY['PT403'], 'foreign Approval decision denied');
RESET ROLE;

SELECT pg_temp.b06_assert(
  NOT EXISTS (SELECT 1 FROM public.activity WHERE activity_id='13000000-0000-4000-8000-000000000020')
  AND NOT EXISTS (SELECT 1 FROM public.site_diary WHERE site_diary_id='14000000-0000-4000-8000-000000000020')
  AND NOT EXISTS (SELECT 1 FROM public.workforce WHERE workforce_id='15000000-0000-4000-8000-000000000020')
  AND NOT EXISTS (SELECT 1 FROM public.progress WHERE progress_id='18000000-0000-4000-8000-000000000020')
  AND NOT EXISTS (SELECT 1 FROM public.vo_item WHERE vo_item_id='17000000-0000-4000-8000-000000000020')
  AND NOT EXISTS (SELECT 1 FROM public.trade_library WHERE trade_name IN ('B06 Foreign Global Trade','B06 Foreign Trade')),
  'foreign RPC matrix leaves target and global Trade rows unchanged'
);

-- ---------------------------------------------------------------------------
-- Forged actor and superseded revision invariants
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000006', true);
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_ingest_msp_atomic('{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000004","revision_no":4,"revision_name":"forged","msp_file_hash":"forged","status":"Draft"}','[{"task_id":"12000000-0000-4000-8000-000000000004","programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000004","task_uid":4,"task_name":"forged"}]','00000000-0000-4000-8000-000000000002','1a000000-0000-4000-8000-000000000030')$sql$, ARRAY['42501'], 'Revision forged actor denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_activity_atomic('13000000-0000-4000-8000-000000000002','{"notes":"forged"}','00000000-0000-4000-8000-000000000004','1b000000-0000-4000-8000-000000000030')$sql$, ARRAY['42501'], 'Activity forged actor denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.f1_update_site_diary_full_atomic('14000000-0000-4000-8000-000000000002','{"notes":"forged"}','00000000-0000-4000-8000-000000000004','1c000000-0000-4000-8000-000000000030','1a000000-0000-4000-8000-000000000031',pg_temp.b06_site_diary_token('14000000-0000-4000-8000-000000000002'))$sql$, ARRAY['42501'], 'Site Diary forged actor denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_progress_atomic('18000000-0000-4000-8000-000000000001','{"actual_quantity":11}','00000000-0000-4000-8000-000000000004','1a000000-0000-4000-8000-000000000032','1b000000-0000-4000-8000-000000000032')$sql$, ARRAY['42501'], 'Progress forged actor denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_approval_atomic('19000000-0000-4000-8000-000000000001','{"approval_status":"Approved"}','00000000-0000-4000-8000-000000000005','1a000000-0000-4000-8000-000000000033',pg_temp.b06_site_diary_token('14000000-0000-4000-8000-000000000003'))$sql$, ARRAY['42501'], 'Approval forged actor denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_activity_atomic('13000000-0000-4000-8000-000000000001','{"notes":"superseded"}','00000000-0000-4000-8000-000000000004','1b000000-0000-4000-8000-000000000034')$sql$, ARRAY['23514'], 'authorized Activity mutation on superseded revision denied');
SELECT pg_temp.b06_expect_state($sql$SELECT public.f1_update_site_diary_full_atomic('14000000-0000-4000-8000-000000000001','{"notes":"superseded"}','00000000-0000-4000-8000-000000000004','1c000000-0000-4000-8000-000000000034','1a000000-0000-4000-8000-000000000034',(SELECT coalesce(updated_at,submitted_at) FROM public.site_diary WHERE site_diary_id='14000000-0000-4000-8000-000000000001'))$sql$, ARRAY['23514'], 'authorized Site Diary mutation on superseded revision denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000006', true);
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_activity_atomic('13000000-0000-4000-8000-000000000001','{"notes":"foreign superseded"}','00000000-0000-4000-8000-000000000006','1b000000-0000-4000-8000-000000000035')$sql$, ARRAY['PT403'], 'foreign denial remains independent of superseded revision state');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- Authorized positive RPC matrix
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
SELECT public.a27_create_programme_atomic(
  '{"programme_code":"B06-C","programme_name":"B06 Positive Programme"}',
  '00000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  '3a000000-0000-4000-8000-000000000001'
);
RESET ROLE;

INSERT INTO public.programme_membership(programme_id,user_id,role_id,is_active)
VALUES
  ('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',(SELECT role_id FROM public.role WHERE role_code='PLANNER'),true),
  ('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',(SELECT role_id FROM public.role WHERE role_code='SUPERINTENDING_OFFICER'),true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
SELECT public.a27_ingest_msp_atomic(
  '{"programme_id":"30000000-0000-4000-8000-000000000001","revision_id":"31000000-0000-4000-8000-000000000002","revision_no":2,"revision_name":"Authorized import","msp_file_name":"authorized.xml","msp_file_hash":"authorized-hash","status":"Draft"}',
  '[{"task_id":"32000000-0000-4000-8000-000000000002","programme_id":"30000000-0000-4000-8000-000000000001","revision_id":"31000000-0000-4000-8000-000000000002","task_uid":2,"task_name":"Authorized task"}]',
  '00000000-0000-4000-8000-000000000002','3a000000-0000-4000-8000-000000000002'
);
SELECT public.a27_update_task('12000000-0000-4000-8000-000000000002','{"task_name":"Authorized task A"}','00000000-0000-4000-8000-000000000002');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
SELECT public.a27_approve_revision_atomic('31000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','3a000000-0000-4000-8000-000000000003');
RESET ROLE;

SELECT pg_temp.b06_assert(
  (SELECT current_revision_id='31000000-0000-4000-8000-000000000002' FROM public.programme WHERE programme_id='30000000-0000-4000-8000-000000000001')
  AND EXISTS (SELECT 1 FROM public.task WHERE task_id='32000000-0000-4000-8000-000000000002'),
  'authorized Programme create, Revision import/approve, and Task persistence pass'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
SELECT public.a27_archive_programme(
  '30000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);
RESET ROLE;
SELECT pg_temp.b06_assert(
  (SELECT status='Archived' FROM public.programme WHERE programme_id='30000000-0000-4000-8000-000000000001'),
  'authorized Global Programme archive passes'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
SELECT public.a27_create_activity_atomic(
  '{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","task_id":"12000000-0000-4000-8000-000000000002","source_type":"MSP","ahi":"A-POS","subtask":"Authorized activity","activity_date":"2026-08-25","notes":"created"}',
  '00000000-0000-4000-8000-000000000004','13000000-0000-4000-8000-000000000010','1b000000-0000-4000-8000-000000000010'
);
SELECT public.a27_update_activity_atomic('13000000-0000-4000-8000-000000000010','{"notes":"authorized update"}','00000000-0000-4000-8000-000000000004','1b000000-0000-4000-8000-000000000011');
SELECT public.a27_start_activity_atomic('13000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000004','1b000000-0000-4000-8000-000000000012');
SELECT public.a27_start_activity_atomic('13000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','1b000000-0000-4000-8000-000000000013');
SELECT public.a27_complete_activity_atomic('13000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004','1b000000-0000-4000-8000-000000000014');

SELECT public.f1_create_site_diary_full_atomic(
  '{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","activity_id":"13000000-0000-4000-8000-000000000010","activity_date":"2026-08-25","operation_intent":"IN_PROGRESS_DIARY","notes":"authorized diary","manpower":[{"trade_name":"B06 Existing Trade","bumiputera_count":1,"non_bumiputera_count":1,"foreign_count":0}],"print_context":{"location":"Zone A","work_start_time":"08:00","work_end_time":"17:00","weather_condition":"ELOK","contractor_scope":"CONTRACTOR"}}',
  '00000000-0000-4000-8000-000000000004','14000000-0000-4000-8000-000000000010','1c000000-0000-4000-8000-000000000010','1a000000-0000-4000-8000-000000000010'
);
SELECT public.f1_update_site_diary_full_atomic(
  '14000000-0000-4000-8000-000000000010','{"notes":"authorized diary update"}',
  '00000000-0000-4000-8000-000000000004','1c000000-0000-4000-8000-000000000011','1a000000-0000-4000-8000-000000000011',
  (SELECT coalesce(updated_at,submitted_at) FROM public.site_diary WHERE site_diary_id='14000000-0000-4000-8000-000000000010')
);
SELECT public.f1_create_site_diary_full_atomic(
  '{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","activity_id":"13000000-0000-4000-8000-000000000010","activity_date":"2026-08-26","operation_intent":"IN_PROGRESS_DIARY","notes":"dynamic trade authority","manpower":[{"trade_name":"B06 Dynamic Trade","bumiputera_count":1,"non_bumiputera_count":0,"foreign_count":0}],"print_context":{"location":"Zone A2","weather_condition":"ELOK","contractor_scope":"CONTRACTOR"}}',
  '00000000-0000-4000-8000-000000000004','14000000-0000-4000-8000-000000000011','1c000000-0000-4000-8000-000000000012','1a000000-0000-4000-8000-000000000052'
);
SELECT public.a27_create_workforce_atomic(
  '{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","activity_id":"13000000-0000-4000-8000-000000000010","site_diary_id":"14000000-0000-4000-8000-000000000010","trade_id":"16000000-0000-4000-8000-000000000001","bumiputera_count":2,"non_bumiputera_count":1,"foreign_count":0}',
  '00000000-0000-4000-8000-000000000004','15000000-0000-4000-8000-000000000010','1a000000-0000-4000-8000-000000000012'
);
SELECT public.a27_update_workforce_atomic('15000000-0000-4000-8000-000000000010','{"bumiputera_count":3}','00000000-0000-4000-8000-000000000004','1a000000-0000-4000-8000-000000000013');

SELECT public.a27_create_progress_atomic(
  '{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","activity_id":"13000000-0000-4000-8000-000000000010","site_diary_id":"14000000-0000-4000-8000-000000000010","measurement_date":"2026-08-25","progress_type":"Quantity","planned_quantity":100,"actual_quantity":10,"unit":"unit","progress_percentage":10,"measurement_status":"Draft"}',
  '00000000-0000-4000-8000-000000000004','18000000-0000-4000-8000-000000000010','1a000000-0000-4000-8000-000000000014','1b000000-0000-4000-8000-000000000015'
);
SELECT public.a27_update_progress_atomic('18000000-0000-4000-8000-000000000010','{"actual_quantity":20,"progress_percentage":20,"measurement_status":"Draft"}','00000000-0000-4000-8000-000000000004','1a000000-0000-4000-8000-000000000015','1b000000-0000-4000-8000-000000000016');
RESET ROLE;

SELECT pg_temp.b06_assert(
  EXISTS (
    SELECT 1 FROM public.trade_library
    WHERE trade_name='B06 Dynamic Trade'
      AND created_by='00000000-0000-4000-8000-000000000004'
  )
  AND EXISTS (
    SELECT 1 FROM public.workforce
    WHERE site_diary_id='14000000-0000-4000-8000-000000000011'
  ),
  'SITE_SUPERVISOR exact TRADE_CREATE_DURING_ENTRY path creates bounded dynamic Trade'
);

-- Progress invalid creation/status smuggling and vertical authority.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_create_progress_atomic('{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","activity_id":"13000000-0000-4000-8000-000000000010","site_diary_id":"14000000-0000-4000-8000-000000000010","measurement_date":"2026-08-25","progress_type":"Quantity","planned_quantity":100,"actual_quantity":1,"unit":"unit","progress_percentage":1,"measurement_status":"Verified"}','00000000-0000-4000-8000-000000000004','18000000-0000-4000-8000-000000000011','1a000000-0000-4000-8000-000000000016','1b000000-0000-4000-8000-000000000017')$sql$, ARRAY['23514'], 'PROGRESS_EDIT cannot create directly Verified');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_create_progress_atomic('{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","activity_id":"13000000-0000-4000-8000-000000000010","site_diary_id":"14000000-0000-4000-8000-000000000010","measurement_date":"2026-08-25","progress_type":"Quantity","planned_quantity":100,"actual_quantity":1,"unit":"unit","progress_percentage":1,"measurement_status":"Approved"}','00000000-0000-4000-8000-000000000004','18000000-0000-4000-8000-000000000012','1a000000-0000-4000-8000-000000000017','1b000000-0000-4000-8000-000000000018')$sql$, ARRAY['23514'], 'PROGRESS_EDIT cannot create directly Approved');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_progress_atomic('18000000-0000-4000-8000-000000000010','{"measurement_status":"Verified"}','00000000-0000-4000-8000-000000000004','1a000000-0000-4000-8000-000000000018','1b000000-0000-4000-8000-000000000019')$sql$, ARRAY['PT403'], 'PROGRESS_EDIT cannot promote Draft to Verified');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_progress_atomic('18000000-0000-4000-8000-000000000010','{"measurement_status":"Approved"}','00000000-0000-4000-8000-000000000004','1a000000-0000-4000-8000-000000000019','1b000000-0000-4000-8000-00000000001a')$sql$, ARRAY['PT409'], 'PROGRESS_EDIT cannot skip Draft to Approved');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000005', true);
SELECT public.a27_update_progress_atomic('18000000-0000-4000-8000-000000000010','{"measurement_status":"Verified"}','00000000-0000-4000-8000-000000000005','1a000000-0000-4000-8000-00000000001a','1b000000-0000-4000-8000-00000000001b');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_progress_atomic('18000000-0000-4000-8000-000000000010','{"measurement_status":"Approved"}','00000000-0000-4000-8000-000000000005','1a000000-0000-4000-8000-00000000001b','1b000000-0000-4000-8000-00000000001c')$sql$, ARRAY['PT403'], 'PROGRESS_VERIFY does not imply PROGRESS_APPROVE');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
SELECT public.a27_update_progress_atomic('18000000-0000-4000-8000-000000000010','{"measurement_status":"Approved"}','00000000-0000-4000-8000-000000000003','1a000000-0000-4000-8000-00000000001c','1b000000-0000-4000-8000-00000000001d');
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_progress_atomic('18000000-0000-4000-8000-000000000010','{"measurement_status":"Draft"}','00000000-0000-4000-8000-000000000003','1a000000-0000-4000-8000-00000000001d','1b000000-0000-4000-8000-00000000001e')$sql$, ARRAY['PT409'], 'Approved Progress cannot be reopened or downgraded');
RESET ROLE;

-- Approval SoD: self and foreign deny, independent actor passes.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
SELECT pg_temp.b06_expect_state($sql$SELECT public.a27_update_approval_atomic('19000000-0000-4000-8000-000000000001','{"approval_status":"Approved"}','00000000-0000-4000-8000-000000000004','1a000000-0000-4000-8000-000000000040',(SELECT coalesce(updated_at,submitted_at) FROM public.site_diary WHERE site_diary_id='14000000-0000-4000-8000-000000000003'))$sql$, ARRAY['PT403'], 'requester cannot approve own request');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000005', true);
SELECT public.a27_update_approval_atomic('19000000-0000-4000-8000-000000000001','{"approval_status":"Approved"}','00000000-0000-4000-8000-000000000005','1a000000-0000-4000-8000-000000000041',(SELECT coalesce(updated_at,submitted_at) FROM public.site_diary WHERE site_diary_id='14000000-0000-4000-8000-000000000003'));
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
SELECT public.a27_create_approval_atomic(
  '{"programme_id":"10000000-0000-4000-8000-000000000001","revision_id":"11000000-0000-4000-8000-000000000002","activity_id":"13000000-0000-4000-8000-000000000002","site_diary_id":"14000000-0000-4000-8000-000000000004","approval_level":1}',
  '00000000-0000-4000-8000-000000000004','19000000-0000-4000-8000-000000000002','1a000000-0000-4000-8000-000000000042',
  (SELECT coalesce(updated_at,submitted_at) FROM public.site_diary WHERE site_diary_id='14000000-0000-4000-8000-000000000004')
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000005', true);
SELECT public.a27_update_approval_atomic('19000000-0000-4000-8000-000000000002','{"approval_status":"Returned","approval_comment":"correct it"}','00000000-0000-4000-8000-000000000005','1a000000-0000-4000-8000-000000000043',(SELECT coalesce(updated_at,submitted_at) FROM public.site_diary WHERE site_diary_id='14000000-0000-4000-8000-000000000004'));
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
SELECT public.a27_update_approval_atomic('19000000-0000-4000-8000-000000000002','{"approval_status":"Pending","approval_comment":"resubmitted"}','00000000-0000-4000-8000-000000000004','1a000000-0000-4000-8000-000000000044',(SELECT coalesce(updated_at,submitted_at) FROM public.site_diary WHERE site_diary_id='14000000-0000-4000-8000-000000000004'));
SELECT public.a27_update_approval_atomic('19000000-0000-4000-8000-000000000002','{"approval_status":"Cancelled"}','00000000-0000-4000-8000-000000000004','1a000000-0000-4000-8000-000000000045',(SELECT coalesce(updated_at,submitted_at) FROM public.site_diary WHERE site_diary_id='14000000-0000-4000-8000-000000000004'));
RESET ROLE;

SELECT pg_temp.b06_assert(
  (SELECT approval_status='Approved' AND approved_by='00000000-0000-4000-8000-000000000005' FROM public.approval WHERE approval_id='19000000-0000-4000-8000-000000000001')
  AND (SELECT approval_status='Cancelled' FROM public.approval WHERE approval_id='19000000-0000-4000-8000-000000000002'),
  'independent Approval decision and Returned-to-Pending cancellation regression pass'
);

-- Authorized global VO and Trade creation.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
SELECT public.f1_create_vo_item_atomic('10000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000002','VO-AUTH','002','authorized',false,'00000000-0000-4000-8000-000000000001','17000000-0000-4000-8000-000000000010');
SELECT public.f1_create_trade_atomic('B06-AUTH','B06 Authorized Global Trade');
RESET ROLE;

SELECT pg_temp.b06_assert(
  EXISTS (SELECT 1 FROM public.vo_item WHERE vo_item_id='17000000-0000-4000-8000-000000000010')
  AND EXISTS (SELECT 1 FROM public.trade_library WHERE trade_code='B06-AUTH'),
  'authorized Global VO and Trade create pass'
);

-- ---------------------------------------------------------------------------
-- Read isolation and direct table mutation runtime proof
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.audit WHERE programme_id='10000000-0000-4000-8000-000000000001') > 0, 'Programme A member reads A audit rows');
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.audit WHERE programme_id='20000000-0000-4000-8000-000000000001') = 0, 'Programme A member cannot read B audit rows');
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.vo_item WHERE programme_id='10000000-0000-4000-8000-000000000001') > 0 AND (SELECT count(*) FROM public.vo_item WHERE programme_id='20000000-0000-4000-8000-000000000001')=0, 'VO Item is Programme A scoped');
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.workforce WHERE programme_id='10000000-0000-4000-8000-000000000001') > 0 AND (SELECT count(*) FROM public.workforce WHERE programme_id='20000000-0000-4000-8000-000000000001')=0, 'Workforce is Programme A scoped');
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.activity_logs WHERE activity_id='13000000-0000-4000-8000-000000000002') > 0 AND (SELECT count(*) FROM public.activity_logs WHERE activity_id='23000000-0000-4000-8000-000000000001')=0, 'Activity history is parent-Programme scoped');
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.site_diary_logs WHERE site_diary_id='14000000-0000-4000-8000-000000000002') > 0 AND (SELECT count(*) FROM public.site_diary_logs WHERE site_diary_id='24000000-0000-4000-8000-000000000001')=0, 'Site Diary history is parent-Programme scoped');
SELECT pg_temp.b06_expect_state($sql$SELECT * FROM public.approval LIMIT 1$sql$, ARRAY['42501'], 'authenticated direct Approval SELECT denied');
SELECT pg_temp.b06_expect_state($sql$SELECT * FROM public.progress LIMIT 1$sql$, ARRAY['42501'], 'authenticated direct Progress SELECT denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000006', true);
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.audit WHERE programme_id='20000000-0000-4000-8000-000000000001') > 0 AND (SELECT count(*) FROM public.audit WHERE programme_id='10000000-0000-4000-8000-000000000001')=0, 'Programme B member reads only B audit rows');
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.vo_item WHERE programme_id='20000000-0000-4000-8000-000000000001') > 0 AND (SELECT count(*) FROM public.vo_item WHERE programme_id='10000000-0000-4000-8000-000000000001')=0, 'Programme B member reads only B VO rows');
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.workforce WHERE programme_id='20000000-0000-4000-8000-000000000001') > 0 AND (SELECT count(*) FROM public.workforce WHERE programme_id='10000000-0000-4000-8000-000000000001')=0, 'Programme B member reads only B Workforce rows');
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.activity_logs WHERE activity_id='23000000-0000-4000-8000-000000000001') > 0 AND (SELECT count(*) FROM public.activity_logs WHERE activity_id='13000000-0000-4000-8000-000000000002')=0, 'Programme B member reads only B Activity history');
SELECT pg_temp.b06_assert((SELECT count(*) FROM public.site_diary_logs WHERE site_diary_id='24000000-0000-4000-8000-000000000001') > 0 AND (SELECT count(*) FROM public.site_diary_logs WHERE site_diary_id='14000000-0000-4000-8000-000000000002')=0, 'Programme B member reads only B Site Diary history');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT pg_temp.b06_expect_state($sql$SELECT * FROM public.audit LIMIT 1$sql$, ARRAY['42501'], 'anon Audit read denied');
SELECT pg_temp.b06_expect_state($sql$SELECT * FROM public.vo_item LIMIT 1$sql$, ARRAY['42501'], 'anon VO read denied');
SELECT pg_temp.b06_expect_state($sql$SELECT * FROM public.workforce LIMIT 1$sql$, ARRAY['42501'], 'anon Workforce read denied');
SELECT pg_temp.b06_expect_state($sql$SELECT * FROM public.activity_logs LIMIT 1$sql$, ARRAY['42501'], 'anon Activity history read denied');
SELECT pg_temp.b06_expect_state($sql$SELECT * FROM public.site_diary_logs LIMIT 1$sql$, ARRAY['42501'], 'anon Site Diary history read denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
SELECT pg_temp.b06_expect_state($sql$INSERT INTO public.programme_revision DEFAULT VALUES$sql$, ARRAY['42501'], 'direct programme_revision INSERT denied');
SELECT pg_temp.b06_expect_state($sql$UPDATE public.task SET task_name=task_name WHERE task_id='12000000-0000-4000-8000-000000000002'$sql$, ARRAY['42501'], 'direct task UPDATE denied');
SELECT pg_temp.b06_expect_state($sql$DELETE FROM public.activity WHERE activity_id='13000000-0000-4000-8000-000000000002'$sql$, ARRAY['42501'], 'direct activity DELETE denied');
SELECT pg_temp.b06_expect_state($sql$UPDATE public.site_diary SET notes=notes WHERE site_diary_id='14000000-0000-4000-8000-000000000002'$sql$, ARRAY['42501'], 'direct site_diary UPDATE denied');
SELECT pg_temp.b06_expect_state($sql$DELETE FROM public.workforce WHERE workforce_id='15000000-0000-4000-8000-000000000001'$sql$, ARRAY['42501'], 'direct workforce DELETE denied');
SELECT pg_temp.b06_expect_state($sql$INSERT INTO public.progress DEFAULT VALUES$sql$, ARRAY['42501'], 'direct progress INSERT denied');
SELECT pg_temp.b06_expect_state($sql$UPDATE public.approval SET approval_status=approval_status WHERE approval_id='19000000-0000-4000-8000-000000000001'$sql$, ARRAY['42501'], 'direct approval UPDATE denied');
SELECT pg_temp.b06_expect_state($sql$DELETE FROM public.audit WHERE audit_id='1a000000-0000-4000-8000-000000000001'$sql$, ARRAY['42501'], 'direct audit DELETE denied');
SELECT pg_temp.b06_expect_state($sql$INSERT INTO public.vo_item DEFAULT VALUES$sql$, ARRAY['42501'], 'direct vo_item INSERT denied');
SELECT pg_temp.b06_expect_state($sql$UPDATE public.trade_library SET trade_name=trade_name WHERE trade_id='16000000-0000-4000-8000-000000000001'$sql$, ARRAY['42501'], 'direct trade_library UPDATE denied');
RESET ROLE;

-- ---------------------------------------------------------------------------
-- Effective catalog invariants
-- ---------------------------------------------------------------------------

SELECT pg_temp.b06_assert(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
      AND (p.proconfig IS NULL OR NOT ('search_path=""'=ANY(p.proconfig)))
  ),
  'all public SECURITY DEFINER functions use fixed empty search_path'
);

SELECT pg_temp.b06_assert(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
      AND (
        EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
        OR has_function_privilege('anon',p.oid,'EXECUTE')
      )
  ),
  'no public privileged SECURITY DEFINER function is executable by PUBLIC or anon'
);

SELECT pg_temp.b06_assert(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='private'
      AND p.proname IN (
        'assert_capability','assert_authority','assert_global_capability',
        'a27_create_approval_atomic','f24_assert_site_diary_unsealed',
        'get_site_diary_approval_queue','trg_bootstrap_programme_creator',
        'trg_check_programme_membership_role_scope'
      )
      AND (
        EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
        OR has_function_privilege('anon',p.oid,'EXECUTE')
        OR has_function_privilege('authenticated',p.oid,'EXECUTE')
      )
  ),
  'private authority helpers, cores, queue helper, and trigger functions have no client EXECUTE'
);

SELECT pg_temp.b06_assert(
  NOT has_schema_privilege('anon','private','USAGE')
  AND NOT has_schema_privilege('authenticated','private','USAGE'),
  'private schema has no anon or authenticated USAGE'
);

SELECT pg_temp.b06_assert(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('audit','vo_item','workforce','activity_logs','site_diary_logs')
      AND cmd='SELECT'
      AND regexp_replace(qual,'\s','','g') IN ('true','(true)')
  ),
  'no B03 Programme-sensitive SELECT policy uses a global true predicate'
);

SELECT pg_temp.b06_assert(
  (SELECT count(*)=7 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('audit','approval','progress','vo_item','workforce','activity_logs','site_diary_logs') AND c.relrowsecurity)
  AND NOT has_table_privilege('authenticated','public.approval','SELECT')
  AND NOT has_table_privilege('authenticated','public.progress','SELECT'),
  'B03 RLS flags and fail-closed Approval/Progress SELECT grants are effective'
);

SELECT pg_temp.b06_assert(
  NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'a27_create_site_diary_atomic','f1_create_site_diary_with_workforce_atomic'
    )
  ),
  'retired public Site Diary overloads do not survive'
);

\echo 'F3-B06 RUNTIME DATABASE PROOF: PASS'

ROLLBACK;
