-- F2.7-C01 Synthetic Test Fixture
-- Minimal fixture for local live security proof only.
-- NOT intended for production. NOT for develop branch.
-- Establishes three test personas and minimal domain records.

-- ============================================================
-- 1. GoTrue Auth Users (local Supabase only — 127.0.0.1)
-- ============================================================

-- P1 — Site Supervisor (submitter role)
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, instance_id, confirmation_token, recovery_token,
    email_change_token_new, email_change
) VALUES (
    '99999999-9999-9999-9999-999999999991',
    'submitter@jkr.gov.my',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}', 'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    created_at, updated_at, last_sign_in_at
) VALUES (
    gen_random_uuid(),
    '99999999-9999-9999-9999-999999999991',
    '99999999-9999-9999-9999-999999999991',
    '{"sub":"99999999-9999-9999-9999-999999999991","email":"submitter@jkr.gov.my"}',
    'email', now(), now(), now()
) ON CONFLICT DO NOTHING;

-- P2 — Resident Engineer (reviewer role)
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, instance_id, confirmation_token, recovery_token,
    email_change_token_new, email_change
) VALUES (
    '99999999-9999-9999-9999-999999999992',
    'reviewer@jkr.gov.my',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}', 'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    created_at, updated_at, last_sign_in_at
) VALUES (
    gen_random_uuid(),
    '99999999-9999-9999-9999-999999999992',
    '99999999-9999-9999-9999-999999999992',
    '{"sub":"99999999-9999-9999-9999-999999999992","email":"reviewer@jkr.gov.my"}',
    'email', now(), now(), now()
) ON CONFLICT DO NOTHING;

-- P3 — Unauthorized
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, instance_id, confirmation_token, recovery_token,
    email_change_token_new, email_change
) VALUES (
    '99999999-9999-9999-9999-999999999993',
    'unauthorized@external.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}', 'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    created_at, updated_at, last_sign_in_at
) VALUES (
    gen_random_uuid(),
    '99999999-9999-9999-9999-999999999993',
    '99999999-9999-9999-9999-999999999993',
    '{"sub":"99999999-9999-9999-9999-999999999993","email":"unauthorized@external.com"}',
    'email', now(), now(), now()
) ON CONFLICT DO NOTHING;

-- P4 — Project Manager (creator role)
INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    aud, role, instance_id, confirmation_token, recovery_token,
    email_change_token_new, email_change
) VALUES (
    '99999999-9999-4999-8999-999999999994',
    'pm@jkr.gov.my',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}', 'authenticated', 'authenticated',
    '00000000-0000-0000-0000-000000000000', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    created_at, updated_at, last_sign_in_at
) VALUES (
    gen_random_uuid(),
    '99999999-9999-4999-8999-999999999994',
    '99999999-9999-4999-8999-999999999994',
    '{"sub":"99999999-9999-4999-8999-999999999994","email":"pm@jkr.gov.my"}',
    'email', now(), now(), now()
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. User Profiles
-- ============================================================
INSERT INTO public.user_profile (user_id, full_name, is_active) VALUES
    ('99999999-9999-9999-9999-999999999991', 'C01 Submitter', true),
    ('99999999-9999-9999-9999-999999999992', 'C01 Reviewer',  true),
    ('99999999-9999-9999-9999-999999999993', 'C01 Unauth',    true),
    ('99999999-9999-4999-8999-999999999994', 'C01 Project Manager', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Programme
-- ============================================================
INSERT INTO public.programme (
    programme_id, programme_code, programme_name, status,
    created_by, created_at, updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'C01-TEST', 'C01 Test Programme', 'Approved',
    '99999999-9999-4999-8999-999999999994',
    now(), now()
) ON CONFLICT DO NOTHING;

-- Programme B (for cross-programme negative test)
INSERT INTO public.programme (
    programme_id, programme_code, programme_name, status,
    created_by, created_at, updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'C01-PROG-B', 'C01 Programme B', 'Approved',
    '99999999-9999-4999-8999-999999999994',
    now(), now()
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Programme Revisions
-- ============================================================
-- Historical superseded revision for exact historical Print proof.
INSERT INTO public.programme_revision (
    revision_id, programme_id, revision_no, revision_name,
    status, created_by, created_at
) VALUES (
    '77777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111111',
    1, 'Historical Rev 1', 'Approved',
    '99999999-9999-9999-9999-999999999991',
    '2026-08-01T00:00:00.000Z'
) ON CONFLICT DO NOTHING;

INSERT INTO public.programme_revision (
    revision_id, programme_id, revision_no, revision_name,
    status, created_by, created_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    2, 'Rev 2 Current', 'Approved',
    '99999999-9999-9999-9999-999999999991',
    now()
) ON CONFLICT DO NOTHING;

INSERT INTO public.programme_revision (
    revision_id, programme_id, revision_no, revision_name,
    status, created_by, created_at
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    1, 'Prog B Rev 1', 'Approved',
    '99999999-9999-9999-9999-999999999991',
    now()
) ON CONFLICT DO NOTHING;

-- Programme A temporarily points to its old approved revision so its immutable
-- historical diary can be seeded through the normal revision-safety trigger.
UPDATE public.programme
    SET current_revision_id = '77777777-7777-7777-7777-777777777777'
    WHERE programme_id = '11111111-1111-1111-1111-111111111111';

UPDATE public.programme
    SET current_revision_id = '44444444-4444-4444-4444-444444444444'
    WHERE programme_id = '22222222-2222-2222-2222-222222222222';

-- ============================================================
-- 5. Roles & Programme Memberships
-- ============================================================
DO $$
DECLARE
    v_ss_id  uuid := (SELECT role_id FROM public.role WHERE role_code = 'SITE_SUPERVISOR');
    v_re_id  uuid := (SELECT role_id FROM public.role WHERE role_code = 'RESIDENT_ENGINEER');
BEGIN
    -- P1 = SITE_SUPERVISOR in Programme A
    INSERT INTO public.programme_membership (membership_id, programme_id, user_id, role_id, is_active, created_at)
    VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999991', v_ss_id, true, now())
    ON CONFLICT DO NOTHING;

    -- P2 = RESIDENT_ENGINEER in Programme A
    INSERT INTO public.programme_membership (membership_id, programme_id, user_id, role_id, is_active, created_at)
    VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999992', v_re_id, true, now())
    ON CONFLICT DO NOTHING;
    -- P1 = SITE_SUPERVISOR in Programme B
    INSERT INTO public.programme_membership (membership_id, programme_id, user_id, role_id, is_active, created_at)
    VALUES (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999991', v_ss_id, true, now())
    ON CONFLICT DO NOTHING;

    -- P3 = inactive membership in Programme B (must grant no discovery)
    INSERT INTO public.programme_membership (membership_id, programme_id, user_id, role_id, is_active, created_at)
    VALUES ('c0400000-0000-4000-8000-000000000103', '22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999993', v_re_id, false, now())
    ON CONFLICT (programme_id, user_id) DO UPDATE SET is_active = false;
END;
$$;

-- ============================================================
-- 6. Task
-- ============================================================
INSERT INTO public.task (
    task_id, programme_id, revision_id, task_name, task_uid,
    wbs, outline_number, is_critical, created_at, created_by
) VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777777',
    'C01 Historical Task', 1, '1', '1', false,
    '2026-08-01T00:00:00.000Z', '99999999-9999-9999-9999-999999999991'
) ON CONFLICT DO NOTHING;

INSERT INTO public.task (
    task_id, programme_id, revision_id, task_name, task_uid,
    wbs, outline_number, outline_level, is_summary,
    planned_start, planned_finish, is_critical, created_at, created_by
) VALUES (
    'c02a0000-0000-4000-8000-000000000101',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'C01 Test Programme', 1, '0', '0', 1, true,
    CURRENT_DATE - 30, CURRENT_DATE + 180, false, now(),
    '99999999-9999-9999-9999-999999999991'
) ON CONFLICT DO NOTHING;

INSERT INTO public.task (
    task_id, programme_id, revision_id, task_name, task_uid,
    wbs, outline_number, outline_level, is_summary,
    is_critical, created_at, created_by
) VALUES (
    'c02a0000-0000-4000-8000-000000000102',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'C01 Main Building', 3, '1', '1', 4, true, false, now(),
    '99999999-9999-9999-9999-999999999991'
) ON CONFLICT DO NOTHING;

INSERT INTO public.task (
    task_id, programme_id, revision_id, task_name, task_uid,
    wbs, outline_number, outline_level, is_summary,
    is_critical, created_at, created_by
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'C01 Test Task', 2, '1.1', '1.1', 5, false, false, now(),
    '99999999-9999-9999-9999-999999999991'
) ON CONFLICT DO NOTHING;

INSERT INTO public.task (
    task_id, programme_id, revision_id, task_name, task_uid,
    wbs, outline_number, outline_level, is_summary,
    planned_start, planned_finish, is_critical, created_at, created_by
) VALUES (
    'c02a0000-0000-4000-8000-000000000201',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'C01 Programme B', 2, '0', '0', 1, true,
    CURRENT_DATE - 20, CURRENT_DATE + 120, false, now(),
    '99999999-9999-9999-9999-999999999991'
) ON CONFLICT DO NOTHING;

INSERT INTO public.task (
    task_id, programme_id, revision_id, task_name, task_uid,
    wbs, outline_number, outline_level, is_summary,
    is_critical, created_at, created_by
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'Prog B Task', 1, '1.1', '1.1', 5, false, false, now(),
    '99999999-9999-9999-9999-999999999991'
) ON CONFLICT DO NOTHING;
-- F2.7-B02-B isolated RFC-valid acceptance tasks.
INSERT INTO public.task (
    task_id, programme_id, revision_id, task_name, task_uid,
    wbs, outline_number, is_critical, created_at, created_by
) VALUES
    ('b02b1000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Pemasangan tetulang rasuk utama Blok Pentadbiran', 27001, 'B02B.SINGLE.PAGE.001.LONG-WBS', '8.1', true, now(), '99999999-9999-9999-9999-999999999991'),
    ('b02b1000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Penuangan konkrit papak podium dan pemeriksaan kemasan permukaan', 27002, 'B02B.OVERFLOW.002.LONG-WBS', '8.2', false, now(), '99999999-9999-9999-9999-999999999991'),
    ('b02b1000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'Kerja konkrit aras sejarah untuk pengesahan cetakan tepat', 27003, 'B02B.HISTORICAL.EXACT.003', '7.3', false, '2026-08-02T00:00:00.000Z', '99999999-9999-9999-9999-999999999991'),
    ('b02b1000-0000-4000-8000-000000000004', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Rekod asing Program B untuk bukti tidak boleh disenaraikan', 27004, 'B02B.FOREIGN.004', '9.1', false, now(), '99999999-9999-9999-9999-999999999991')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. Activities
-- ============================================================
INSERT INTO public.activity (
    activity_id, programme_id, revision_id, task_id,
    source_type, subtask, subtask_display_name, activity_date,
    status, notes, submitted_by, created_at, updated_at
) VALUES (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777777',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'MSP', 'Historical Concrete Works', 'Historical Concrete Works', '2026-08-01',
    'Completed', 'Historical C01 fixture', '99999999-9999-9999-9999-999999999991',
    '2026-08-01T00:00:00.000Z', '2026-08-01T00:00:00.000Z'
) ON CONFLICT DO NOTHING;

-- Create historical evidence while that approved revision is still current.
INSERT INTO public.site_diary (
    site_diary_id, programme_id, revision_id, activity_id,
    activity_date, status, notes, submitted_by, submitted_at, updated_at
) VALUES (
    '55555555-5555-5555-5555-555555555553',
    '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777777',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '2026-08-01', 'Completed', 'Historical C01 diary',
    '99999999-9999-9999-9999-999999999991',
    '2026-08-01T12:00:00.000Z',
    '2026-08-01T12:00:00.000Z'
) ON CONFLICT DO NOTHING;

-- Historical B02-B evidence is created while Revision 1 is still authorised.
INSERT INTO public.activity (
    activity_id, programme_id, revision_id, task_id, source_type,
    subtask, subtask_display_name, activity_date, status, notes,
    submitted_by, created_at, updated_at
) VALUES (
    'b02b2000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777777', 'b02b1000-0000-4000-8000-000000000003',
    'MSP', 'Historical exact concrete activity', 'Historical exact concrete activity',
    '2026-08-02', 'Completed', 'B02-B historical activity fixture',
    '99999999-9999-9999-9999-999999999991', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'
) ON CONFLICT DO NOTHING;

INSERT INTO public.site_diary (
    site_diary_id, programme_id, revision_id, activity_id, activity_date,
    status, notes, print_context, manpower, submitted_by, submitted_at, updated_at
) VALUES (
    'b02b3000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111',
    '77777777-7777-7777-7777-777777777777', 'b02b2000-0000-4000-8000-000000000003',
    '2026-08-02', 'Completed', 'Catatan sejarah tepat kekal pada semakan asal.',
    '{"location":"Aras 3, Blok Sejarah","work_start_time":"07:30","work_end_time":"16:30","weather_condition":"MENDUNG","rain_start_time":"12:00","rain_end_time":"13:00","contractor_scope":"CONTRACTOR"}'::jsonb,
    '[{"trade_name":"Tukang Konkrit Sejarah","bumi_count":2,"non_bumi_count":1,"foreign_count":0}]'::jsonb,
    '99999999-9999-9999-9999-999999999991', '2026-08-02T12:00:00.000Z', '2026-08-02T12:00:00.000Z'
) ON CONFLICT DO NOTHING;

-- Complete the legitimate revision transition only after historical evidence
-- exists. Subsequent operational fixtures use the latest approved revision.
UPDATE public.programme
    SET current_revision_id = '33333333-3333-3333-3333-333333333333'
    WHERE programme_id = '11111111-1111-1111-1111-111111111111';
UPDATE public.programme_revision
    SET status = 'Superseded'
    WHERE revision_id = '77777777-7777-7777-7777-777777777777';

INSERT INTO public.activity (
    activity_id, programme_id, revision_id, task_id,
    source_type, subtask, subtask_display_name, activity_date,
    status, notes, submitted_by, created_at, updated_at
) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'MSP', 'Concrete Works', 'Concrete Works', CURRENT_DATE - 1,
    'In Progress', 'Current C01 fixture', '99999999-9999-9999-9999-999999999991',
    now(), now()
) ON CONFLICT DO NOTHING;

-- Current and foreign B02-B activities are isolated from the C01 fixtures.
INSERT INTO public.activity (
    activity_id, programme_id, revision_id, task_id, source_type,
    subtask, subtask_display_name, activity_date, status, notes,
    submitted_by, created_at, updated_at
) VALUES
    ('b02b2000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'b02b1000-0000-4000-8000-000000000001', 'MSP', 'Single page reinforcement activity', 'Single page reinforcement activity', '2026-08-22', 'New', 'B02-B current single-page activity', '99999999-9999-9999-9999-999999999991', now(), now()),
    ('b02b2000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'b02b1000-0000-4000-8000-000000000002', 'MSP', 'Overflow concrete activity', 'Overflow concrete activity', '2026-08-23', 'In Progress', 'B02-B current overflow activity', '99999999-9999-9999-9999-999999999991', now(), now()),
    ('b02b2000-0000-4000-8000-000000000004', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'b02b1000-0000-4000-8000-000000000004', 'MSP', 'Foreign Programme B activity', 'Foreign Programme B activity', '2026-08-22', 'Completed', 'B02-B foreign record activity', '99999999-9999-9999-9999-999999999991', now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.activity (
    activity_id, programme_id, revision_id, task_id,
    source_type, subtask, subtask_display_name, activity_date,
    status, notes, submitted_by, created_at, updated_at
) VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'MSP', 'Prog B Activity', 'Prog B Activity', CURRENT_DATE - 2,
    'In Progress', 'Cross-programme C01 fixture', '99999999-9999-9999-9999-999999999991',
    now(), now()
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. Site Diaries
-- ============================================================
INSERT INTO public.site_diary (
    site_diary_id, programme_id, revision_id, activity_id,
    activity_date, status, notes, submitted_by, submitted_at, updated_at
) VALUES (
    '55555555-5555-5555-5555-555555555551',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    CURRENT_DATE - 1, 'In Progress', 'Current C01 diary',
    '99999999-9999-9999-9999-999999999991',
    '2026-08-21T12:00:00.000Z',
    '2026-08-21T12:00:00.000Z'
) ON CONFLICT DO NOTHING;

-- Programme B Site Diary (cross-programme negative test)
INSERT INTO public.site_diary (
    site_diary_id, programme_id, revision_id, activity_id,
    activity_date, status, notes, submitted_by, submitted_at, updated_at
) VALUES (
    '55555555-5555-5555-5555-555555555552',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    CURRENT_DATE - 2, 'In Progress', 'Cross-programme C01 diary',
    '99999999-9999-9999-9999-999999999991',
    '2026-08-20T12:00:00.000Z',
    '2026-08-20T12:00:00.000Z'
) ON CONFLICT DO NOTHING;

-- Isolated B02-B acceptance diaries: single-page NSC, Contractor overflow,
-- and a Programme B foreign record. One diary owns one workforce scope.
INSERT INTO public.site_diary (
    site_diary_id, programme_id, revision_id, activity_id, activity_date,
    status, notes, print_context, manpower, submitted_by, submitted_at, updated_at
) VALUES
    ('b02b3000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'b02b2000-0000-4000-8000-000000000001', '2026-08-22', 'New', 'Pemeriksaan tetulang selesai; ruang kerja selamat dan teratur.', '{"location":"Aras 2, Zon Timur, Blok Pentadbiran Utama","work_start_time":"08:15","work_end_time":"17:05","weather_condition":"HUJAN","rain_start_time":"10:30","rain_end_time":"11:45","contractor_scope":"NSC"}'::jsonb, '[{"trade_name":"Tukang Besi NSC","bumi_count":3,"non_bumi_count":1,"foreign_count":0},{"trade_name":"Penyelia Keselamatan NSC","bumi_count":1,"non_bumi_count":0,"foreign_count":0}]'::jsonb, '99999999-9999-9999-9999-999999999991', '2026-08-22T18:00:00.000Z', '2026-08-22T18:00:00.000Z'),
    ('b02b3000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'b02b2000-0000-4000-8000-000000000002', '2026-08-23', 'In Progress', 'Penuangan berperingkat diteruskan mengikut kaedah kerja diluluskan; pemeriksaan mutu setiap zon direkodkan.', '{"location":"Podium Utama, Grid A1 hingga H8, Laluan Logistik Timur","work_start_time":"07:00","work_end_time":"19:15","weather_condition":"ELOK","rain_start_time":null,"rain_end_time":null,"contractor_scope":"CONTRACTOR"}'::jsonb, '[{"trade_name":"Jurutera Tapak Kontraktor Utama","bumi_count":1,"non_bumi_count":0,"foreign_count":0},{"trade_name":"Penyelia Penuangan Konkrit","bumi_count":2,"non_bumi_count":0,"foreign_count":0},{"trade_name":"Tukang Konkrit Kemasan Permukaan","bumi_count":4,"non_bumi_count":1,"foreign_count":2},{"trade_name":"Tukang Besi Tetulang Podium","bumi_count":5,"non_bumi_count":0,"foreign_count":1},{"trade_name":"Tukang Kayu Acuan Papak","bumi_count":4,"non_bumi_count":1,"foreign_count":2},{"trade_name":"Operator Pam Konkrit Bergerak","bumi_count":1,"non_bumi_count":0,"foreign_count":1},{"trade_name":"Pemandu Lori Bancuhan Konkrit","bumi_count":2,"non_bumi_count":0,"foreign_count":3},{"trade_name":"Pegawai Keselamatan dan Kesihatan","bumi_count":1,"non_bumi_count":0,"foreign_count":0},{"trade_name":"Juruukur Aras dan Penjajaran","bumi_count":2,"non_bumi_count":1,"foreign_count":0},{"trade_name":"Pekerja Am Pembersihan Tapak","bumi_count":3,"non_bumi_count":1,"foreign_count":2}]'::jsonb, '99999999-9999-9999-9999-999999999991', '2026-08-23T20:00:00.000Z', '2026-08-23T20:00:00.000Z'),
    ('b02b3000-0000-4000-8000-000000000004', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'b02b2000-0000-4000-8000-000000000004', '2026-08-22', 'Completed', 'B02-B foreign Programme B record.', '{"location":"Program B","work_start_time":"08:00","work_end_time":"17:00","weather_condition":"ELOK","rain_start_time":null,"rain_end_time":null,"contractor_scope":"CONTRACTOR"}'::jsonb, '[]'::jsonb, '99999999-9999-9999-9999-999999999991', '2026-08-22T18:00:00.000Z', '2026-08-22T18:00:00.000Z')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. Approval (for approval queue and review tests)
-- ============================================================
INSERT INTO public.approval (
    approval_id, programme_id, revision_id, activity_id, site_diary_id,
    approval_level, approval_status, requested_by, requested_at,
    created_at, updated_at
) VALUES (
    '66666666-6666-6666-6666-666666666661',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '55555555-5555-5555-5555-555555555551',
    1, 'Pending',
    '99999999-9999-9999-9999-999999999991',
    '2026-08-21T12:00:00.000Z',
    '2026-08-21T12:00:00.000Z',
    NULL
) ON CONFLICT DO NOTHING;

-- Programme B Approval (cross-programme negative test)
INSERT INTO public.approval (
    approval_id, programme_id, revision_id, activity_id, site_diary_id,
    approval_level, approval_status, requested_by, requested_at,
    created_at, updated_at
) VALUES (
    '66666666-6666-6666-6666-666666666662',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '55555555-5555-5555-5555-555555555552',
    1, 'Pending',
    '99999999-9999-9999-9999-999999999991',
    '2026-08-20T12:00:00.000Z',
    '2026-08-20T12:00:00.000Z',
    NULL
) ON CONFLICT DO NOTHING;
