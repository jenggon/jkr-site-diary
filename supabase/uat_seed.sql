-- UAT Fixture Data (Safe, Deterministic, Reset-friendly)
-- Usage: psql -f supabase/uat_seed.sql or via Supabase Dashboard
-- DO NOT RUN IN PRODUCTION

DO $BODY$ 
DECLARE
    v_prog_id uuid := '11111111-1111-1111-1111-111111111111';
    v_rev_cur uuid := '22222222-2222-2222-2222-222222222222';
    v_rev_hist uuid := '33333333-3333-3333-3333-333333333333';
    
    v_act_msp uuid := '44444444-4444-4444-4444-444444444441';
    v_act_vo uuid := '44444444-4444-4444-4444-444444444442';

    v_sd_cur uuid := '55555555-5555-5555-5555-555555555551';
    v_sd_hist uuid := '55555555-5555-5555-5555-555555555552';
    
    -- Submitter Persona (SITE_SUPERVISOR)
    v_p1_user_id uuid := '99999999-9999-9999-9999-999999999991';
    -- Reviewer Persona (RESIDENT_ENGINEER)
    v_p2_user_id uuid := '99999999-9999-9999-9999-999999999992';

    v_role_ss uuid;
    v_role_re uuid;
BEGIN
    -- 1. Get Canonical Roles
    SELECT role_id INTO v_role_ss FROM public.role WHERE role_code = 'SITE_SUPERVISOR';
    SELECT role_id INTO v_role_re FROM public.role WHERE role_code = 'RESIDENT_ENGINEER';

    -- 2. Mock User Profiles for Personas
    -- Note: auth.users MUST be manually created or bootstrapped via Supabase Dashboard / API in B03 manual phase.
    INSERT INTO public.user_profile (user_id, full_name, is_active) VALUES 
        (v_p1_user_id, 'UAT Submitter (P1)', true),
        (v_p2_user_id, 'UAT Reviewer (P2)', true)
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Synthetic Programme P-A
    INSERT INTO public.programme (programme_id, programme_code, programme_name, created_by) 
    VALUES (v_prog_id, 'UAT-PROG-A', 'UAT Synthetic Programme A', v_p1_user_id)
    ON CONFLICT (programme_id) DO NOTHING;

    -- 4. Programme Memberships
    INSERT INTO public.programme_membership (programme_id, user_id, role_id, is_active) VALUES
        (v_prog_id, v_p1_user_id, v_role_ss, true),
        (v_prog_id, v_p2_user_id, v_role_re, true)
    ON CONFLICT (programme_id, user_id) DO NOTHING;

    -- 5. Revisions (Historical and Current)
    INSERT INTO public.programme_revision (revision_id, programme_id, revision_code, revision_name, is_active, created_by) VALUES
        (v_rev_hist, v_prog_id, 'REV-01', 'Historical Revision', false, v_p1_user_id),
        (v_rev_cur, v_prog_id, 'REV-02', 'Current Active Revision', true, v_p1_user_id)
    ON CONFLICT (revision_id) DO NOTHING;

    -- 6. Activities
    INSERT INTO public.activity (activity_id, revision_id, activity_code, activity_name, source, status, created_by) VALUES
        (v_act_msp, v_rev_cur, 'ACT-MSP-1', 'Canonical MSP Activity', 'MSP', 'Started', v_p1_user_id),
        (v_act_vo, v_rev_cur, 'ACT-VO-1', 'Canonical VO Activity', 'VO', 'Started', v_p1_user_id)
    ON CONFLICT (activity_id) DO NOTHING;

    -- 7. Site Diaries (Historical and Current)
    INSERT INTO public.site_diary (site_diary_id, activity_id, revision_id, activity_date, weather_morning, weather_afternoon, created_by) VALUES
        (v_sd_hist, v_act_msp, v_rev_hist, '2026-08-01', 'Sunny', 'Rainy', v_p1_user_id),
        (v_sd_cur, v_act_msp, v_rev_cur, '2026-08-10', 'Sunny', 'Sunny', v_p1_user_id)
    ON CONFLICT (site_diary_id) DO NOTHING;

    -- 8. Workforce (To trigger Print Continuation >= 10 Contractor, >= 7 NSC)
    FOR i IN 1..10 LOOP
        INSERT INTO public.workforce (site_diary_id, scope, trade_code, trade_name, no_of_workers, working_hours, created_by) VALUES
            (v_sd_cur, 'CONTRACTOR', 'CON-' || i, 'Contractor Trade ' || i, 2, 8, v_p1_user_id);
    END LOOP;
    
    FOR i IN 1..7 LOOP
        INSERT INTO public.workforce (site_diary_id, scope, trade_code, trade_name, no_of_workers, working_hours, created_by) VALUES
            (v_sd_cur, 'NSC', 'NSC-' || i, 'NSC Trade ' || i, 1, 8, v_p1_user_id);
    END LOOP;
    
    -- 9. Setup Approval States (Pending, Returned, Rejected, Approved)
    -- Using multiple Site Diaries to respect the State Machine invariants
    
    -- SD-PENDING
    INSERT INTO public.site_diary (site_diary_id, activity_id, revision_id, activity_date, created_by) VALUES
        ('55555555-5555-5555-5555-555555555553', v_act_msp, v_rev_cur, '2026-08-11', v_p1_user_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.approval (approval_id, site_diary_id, programme_id, status, requested_by) VALUES
        ('66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555553', v_prog_id, 'Pending', v_p1_user_id)
    ON CONFLICT DO NOTHING;

    -- SD-RETURNED
    INSERT INTO public.site_diary (site_diary_id, activity_id, revision_id, activity_date, created_by) VALUES
        ('55555555-5555-5555-5555-555555555554', v_act_msp, v_rev_cur, '2026-08-12', v_p1_user_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.approval (approval_id, site_diary_id, programme_id, status, requested_by, reviewed_by, review_notes) VALUES
        ('66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555554', v_prog_id, 'Returned', v_p1_user_id, v_p2_user_id, 'Please add more workforce details')
    ON CONFLICT DO NOTHING;
    
    -- SD-REJECTED
    INSERT INTO public.site_diary (site_diary_id, activity_id, revision_id, activity_date, created_by) VALUES
        ('55555555-5555-5555-5555-555555555555', v_act_msp, v_rev_cur, '2026-08-13', v_p1_user_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.approval (approval_id, site_diary_id, programme_id, status, requested_by, reviewed_by, review_notes) VALUES
        ('66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555555', v_prog_id, 'Rejected', v_p1_user_id, v_p2_user_id, 'Duplicate record')
    ON CONFLICT DO NOTHING;

    -- SD-APPROVED
    INSERT INTO public.site_diary (site_diary_id, activity_id, revision_id, activity_date, created_by) VALUES
        ('55555555-5555-5555-5555-555555555556', v_act_msp, v_rev_cur, '2026-08-14', v_p1_user_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.approval (approval_id, site_diary_id, programme_id, status, requested_by, reviewed_by) VALUES
        ('66666666-6666-6666-6666-666666666664', '55555555-5555-5555-5555-555555555556', v_prog_id, 'Approved', v_p1_user_id, v_p2_user_id)
    ON CONFLICT DO NOTHING;
    
END $BODY$;
