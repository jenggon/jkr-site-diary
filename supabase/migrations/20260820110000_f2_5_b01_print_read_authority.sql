-- Migration: F2.5-B01 Exact Print Read Authority

-- 1. Seed Permission
INSERT INTO "public"."permission" (permission_id, permission_code, module) VALUES
(gen_random_uuid(), 'SITE_DIARY_PRINT_READ', 'SiteDiary')
ON CONFLICT (permission_code) DO NOTHING;

-- 2. Map to Roles (Programme scope)
DO $$
DECLARE
    v_pm_id uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'PROJECT_MANAGER');
    v_re_id uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'RESIDENT_ENGINEER');
    v_ss_id uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'SITE_SUPERVISOR');
    v_ct_id uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'CONTRACTOR');
    v_vi_id uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'VIEWER');
    v_print_read uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'SITE_DIARY_PRINT_READ');
BEGIN
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_pm_id, v_print_read) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_re_id, v_print_read) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_ss_id, v_print_read) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_ct_id, v_print_read) ON CONFLICT DO NOTHING;
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES (v_vi_id, v_print_read) ON CONFLICT DO NOTHING;
END;
$$;

-- 3. Create Private Read Function
CREATE OR REPLACE FUNCTION "private"."get_site_diary_print_read"(
    p_actor_id uuid,
    p_site_diary_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result jsonb;
    v_canonical_programme_id uuid;
    v_site_diary_record record;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    
    -- 1. Get Canonical Programme and check context equality
    SELECT 
        sd.programme_id,
        sd.revision_id,
        sd.activity_id,
        a.programme_id AS act_prog_id,
        a.revision_id AS act_rev_id
    INTO v_site_diary_record
    FROM "public"."site_diary" sd
    JOIN "public"."activity" a ON sd.activity_id = a.activity_id
    WHERE sd.site_diary_id = p_site_diary_id;

    IF v_site_diary_record IS NULL THEN
        RAISE EXCEPTION 'PT404_SITE_DIARY_NOT_FOUND' USING ERRCODE = 'PT404';
    END IF;

    -- Canonical context equality: fail closed unless relationships agree
    IF v_site_diary_record.programme_id != v_site_diary_record.act_prog_id OR
       v_site_diary_record.revision_id != v_site_diary_record.act_rev_id THEN
        RAISE EXCEPTION 'CANONICAL_CONTEXT_MISMATCH' USING ERRCODE = 'P0001';
    END IF;

    v_canonical_programme_id := v_site_diary_record.programme_id;

    -- 2. Assert Capability against the canonical programme
    PERFORM "private"."assert_capability"(
        p_actor_id, v_canonical_programme_id, 'SITE_DIARY_PRINT_READ'
    );

    -- 3. Construct JSON result matching RawPrintDiaryRow (omitting approval)
    SELECT jsonb_build_object(
        'site_diary_id', sd.site_diary_id,
        'programme_id', sd.programme_id,
        'revision_id', sd.revision_id,
        'activity_id', sd.activity_id,
        'activity_date', sd.activity_date,
        'weather', sd.weather,
        'notes', sd.notes,
        'status', sd.status,
        'manpower', sd.manpower,
        'print_context', sd.print_context,
        'submitted_by', sd.submitted_by,
        'submitted_at', sd.submitted_at,
        'updated_at', sd.updated_at,
        'activity', (
            SELECT jsonb_build_object(
                'activity_id', a.activity_id,
                'source_type', a.source_type,
                'task_id', a.task_id,
                'vo_item_id', a.vo_item_id,
                'subtask', a.subtask,
                'subtask_display_name', a.subtask_display_name,
                'status', a.status,
                'actual_start_date', a.actual_start_date,
                'completed_date', a.completed_date,
                'task', CASE WHEN a.task_id IS NOT NULL THEN (
                    SELECT jsonb_build_object(
                        'task_id', t.task_id,
                        'task_name', t.task_name,
                        'task_uid', t.task_uid,
                        'wbs', t.wbs,
                        'outline_number', t.outline_number,
                        'is_critical', t.is_critical
                    ) FROM "public"."task" t WHERE t.task_id = a.task_id
                ) ELSE null END,
                'vo_item', CASE WHEN a.vo_item_id IS NOT NULL THEN (
                    SELECT jsonb_build_object(
                        'vo_item_id', v.vo_item_id,
                        'vo_reference', v.vo_reference,
                        'line_item', v.line_item,
                        'description', v.description
                    ) FROM "public"."vo_item" v WHERE v.vo_item_id = a.vo_item_id
                ) ELSE null END
            ) FROM "public"."activity" a WHERE a.activity_id = sd.activity_id
        ),
        'programme', (
            SELECT jsonb_build_object(
                'programme_id', p.programme_id,
                'programme_code', p.programme_code,
                'programme_name', p.programme_name,
                'current_revision_id', p.current_revision_id,
                'created_by', p.created_by
            ) FROM "public"."programme" p WHERE p.programme_id = sd.programme_id
        ),
        'programme_revision', (
            SELECT jsonb_build_object(
                'revision_id', pr.revision_id,
                'revision_no', pr.revision_no,
                'revision_title', pr.revision_title,
                'status', pr.status
            ) FROM "public"."programme_revision" pr WHERE pr.revision_id = sd.revision_id
        )
    ) INTO v_result
    FROM "public"."site_diary" sd
    WHERE sd.site_diary_id = p_site_diary_id;

    RETURN v_result;
END;
$$;

-- 4. Create Public Wrapper
CREATE OR REPLACE FUNCTION "public"."f25_get_site_diary_print_read"(
    p_site_diary_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT "private"."get_site_diary_print_read"(
        (SELECT auth.uid()), p_site_diary_id
    );
$$;

REVOKE ALL ON FUNCTION "public"."f25_get_site_diary_print_read"(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f25_get_site_diary_print_read"(uuid) TO authenticated;
