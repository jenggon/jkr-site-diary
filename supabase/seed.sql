-- UAT Fixture Data
DO $$ 
DECLARE
    v_prog_id uuid := '11111111-1111-1111-1111-111111111111';
    v_rev_cur uuid := '22222222-2222-2222-2222-222222222222';
    v_rev_hist uuid := '33333333-3333-3333-3333-333333333333';
    
    v_act_msp uuid := '44444444-4444-4444-4444-444444444441';
    v_act_hist uuid := '44444444-4444-4444-4444-444444444443';

    v_sd_cur uuid := '55555555-5555-5555-5555-555555555551';
    v_sd_hist uuid := '55555555-5555-5555-5555-555555555552';
    
    v_p1_user_id uuid := '99999999-9999-9999-9999-999999999991';
    v_p2_user_id uuid := '99999999-9999-9999-9999-999999999992';
    v_p3_user_id uuid := '99999999-9999-9999-9999-999999999993';

    v_role_ss uuid;
    v_role_re uuid;
BEGIN
    SELECT role_id INTO v_role_ss FROM public.role WHERE role_code = 'SITE_SUPERVISOR';
    SELECT role_id INTO v_role_re FROM public.role WHERE role_code = 'RESIDENT_ENGINEER';

    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES 
        ('00000000-0000-0000-0000-000000000000', v_p1_user_id, 'authenticated', 'authenticated', 'submitter@jkr.gov.my', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
        ('00000000-0000-0000-0000-000000000000', v_p2_user_id, 'authenticated', 'authenticated', 'reviewer@jkr.gov.my', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
        ('00000000-0000-0000-0000-000000000000', v_p3_user_id, 'authenticated', 'authenticated', 'unauthorized@jkr.gov.my', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES
        (gen_random_uuid(), v_p1_user_id, format('{"sub":"%s","email":"%s"}', v_p1_user_id::text, 'submitter@jkr.gov.my')::jsonb, 'email', v_p1_user_id::text, now(), now(), now()),
        (gen_random_uuid(), v_p2_user_id, format('{"sub":"%s","email":"%s"}', v_p2_user_id::text, 'reviewer@jkr.gov.my')::jsonb, 'email', v_p2_user_id::text, now(), now(), now()),
        (gen_random_uuid(), v_p3_user_id, format('{"sub":"%s","email":"%s"}', v_p3_user_id::text, 'unauthorized@jkr.gov.my')::jsonb, 'email', v_p3_user_id::text, now(), now(), now())
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_profile (user_id, full_name, is_active) VALUES 
        (v_p1_user_id, 'UAT Submitter (P1)', true),
        (v_p2_user_id, 'UAT Reviewer (P2)', true),
        (v_p3_user_id, 'UAT Unauthorized (P3)', true)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.programme (programme_id, programme_code, programme_name, created_by) 
    VALUES (v_prog_id, 'UAT-PROG-A', 'UAT Synthetic Programme A', v_p1_user_id)
    ON CONFLICT (programme_id) DO NOTHING;

    INSERT INTO public.programme_membership (programme_id, user_id, role_id, is_active) VALUES
        (v_prog_id, v_p1_user_id, v_role_ss, true),
        (v_prog_id, v_p2_user_id, v_role_re, true)
    ON CONFLICT (programme_id, user_id) DO NOTHING;

    -- 1. Insert historical revision as Approved initially
    INSERT INTO public.programme_revision (revision_id, programme_id, revision_no, revision_name, status, created_by) VALUES
        (v_rev_hist, v_prog_id, 1, 'Historical Revision', 'Approved', v_p1_user_id)
    ON CONFLICT (revision_id) DO NOTHING;

    -- 2. Make it current
    UPDATE public.programme SET current_revision_id = v_rev_hist WHERE programme_id = v_prog_id;

    -- 3. Insert historical tasks/activities/site_diaries
    INSERT INTO public.task (task_id, programme_id, revision_id, task_uid, task_name, created_by) VALUES
        ('77777777-7777-7777-7777-777777777771', v_prog_id, v_rev_hist, 1, 'Historical Task', v_p1_user_id)
    ON CONFLICT (task_id) DO NOTHING;

    INSERT INTO public.activity (activity_id, programme_id, revision_id, task_id, subtask, activity_date, notes, submitted_by, source_type) VALUES
        (v_act_hist, v_prog_id, v_rev_hist, '77777777-7777-7777-7777-777777777771', 'Subtask H', '2026-08-01', 'Hist act notes', v_p1_user_id, 'MSP')
    ON CONFLICT (activity_id) DO NOTHING;

    INSERT INTO public.site_diary (site_diary_id, programme_id, activity_id, revision_id, activity_date, notes, status, submitted_by) VALUES
        (v_sd_hist, v_prog_id, v_act_hist, v_rev_hist, '2026-08-01', 'Historical notes', 'In Progress', v_p1_user_id)
    ON CONFLICT (site_diary_id) DO NOTHING;

    -- 4. Insert current revision as Approved
    INSERT INTO public.programme_revision (revision_id, programme_id, revision_no, revision_name, status, created_by) VALUES
        (v_rev_cur, v_prog_id, 2, 'Current Active Revision', 'Approved', v_p1_user_id)
    ON CONFLICT (revision_id) DO NOTHING;

    -- 5. Make it current
    UPDATE public.programme SET current_revision_id = v_rev_cur WHERE programme_id = v_prog_id;

    -- 6. Archive historical revision
    UPDATE public.programme_revision SET status = 'Archived' WHERE revision_id = v_rev_hist;

    -- 7. Insert current tasks/activities/site_diaries
    INSERT INTO public.task (task_id, programme_id, revision_id, task_uid, task_name, created_by) VALUES
        ('77777777-7777-7777-7777-777777777772', v_prog_id, v_rev_cur, 2, 'Current Task', v_p1_user_id)
    ON CONFLICT (task_id) DO NOTHING;

    INSERT INTO public.activity (activity_id, programme_id, revision_id, task_id, subtask, activity_date, notes, submitted_by, source_type) VALUES
        (v_act_msp, v_prog_id, v_rev_cur, '77777777-7777-7777-7777-777777777772', 'Subtask C', '2026-08-10', 'Cur act notes', v_p1_user_id, 'MSP')
    ON CONFLICT (activity_id) DO NOTHING;

    INSERT INTO public.site_diary (site_diary_id, programme_id, activity_id, revision_id, activity_date, notes, status, submitted_by) VALUES
        (v_sd_cur, v_prog_id, v_act_msp, v_rev_cur, '2026-08-10', 'Current notes', 'In Progress', v_p1_user_id)
    ON CONFLICT (site_diary_id) DO NOTHING;

    INSERT INTO public.site_diary (site_diary_id, programme_id, activity_id, revision_id, activity_date, notes, status, submitted_by, submitted_at, updated_at) VALUES
        ('55555555-5555-5555-5555-555555555553', v_prog_id, v_act_msp, v_rev_cur, '2026-08-11', 'Pending Approval', 'In Progress', v_p1_user_id, '2026-08-11T12:00:00Z', '2026-08-11T12:00:00Z')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.approval (approval_id, site_diary_id, programme_id, activity_id, revision_id, approval_status, requested_by) VALUES
        ('66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555553', v_prog_id, v_act_msp, v_rev_cur, 'Pending', v_p1_user_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.site_diary (site_diary_id, programme_id, activity_id, revision_id, activity_date, notes, status, submitted_by) VALUES
        ('55555555-5555-5555-5555-555555555554', v_prog_id, v_act_msp, v_rev_cur, '2026-08-12', 'Returned Diary', 'In Progress', v_p1_user_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.approval (approval_id, site_diary_id, programme_id, activity_id, revision_id, approval_status, requested_by, approved_by, approval_comment) VALUES
        ('66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555554', v_prog_id, v_act_msp, v_rev_cur, 'Returned', v_p1_user_id, v_p2_user_id, 'Please add more workforce details')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.site_diary (site_diary_id, programme_id, activity_id, revision_id, activity_date, notes, status, submitted_by) VALUES
        ('55555555-5555-5555-5555-555555555555', v_prog_id, v_act_msp, v_rev_cur, '2026-08-13', 'Rejected Diary', 'In Progress', v_p1_user_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.approval (approval_id, site_diary_id, programme_id, activity_id, revision_id, approval_status, requested_by, approved_by, approval_comment) VALUES
        ('66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555555', v_prog_id, v_act_msp, v_rev_cur, 'Rejected', v_p1_user_id, v_p2_user_id, 'Duplicate record')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.site_diary (site_diary_id, programme_id, activity_id, revision_id, activity_date, notes, status, submitted_by) VALUES
        ('55555555-5555-5555-5555-555555555556', v_prog_id, v_act_msp, v_rev_cur, '2026-08-14', 'Approved Diary', 'In Progress', v_p1_user_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.approval (approval_id, site_diary_id, programme_id, activity_id, revision_id, approval_status, requested_by, approved_by, approval_comment) VALUES
        ('66666666-6666-6666-6666-666666666664', '55555555-5555-5555-5555-555555555556', v_prog_id, v_act_msp, v_rev_cur, 'Approved', v_p1_user_id, v_p2_user_id, NULL)
    ON CONFLICT DO NOTHING;
    
END $$;
SET session_replication_role = 'origin';
