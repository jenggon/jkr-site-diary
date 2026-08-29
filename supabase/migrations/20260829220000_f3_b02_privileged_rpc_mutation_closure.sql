-- Migration: 20260829220000_f3_b02_privileged_rpc_mutation_closure.sql
-- Description: F3-B02 Privileged RPC Mutation Closure

-- ============================================================
-- 1. Additive Seed: TRADE_CREATE_DURING_ENTRY Permission & Role Mapping
-- ============================================================

INSERT INTO "public"."permission" (permission_id, permission_code, module)
VALUES (gen_random_uuid(), 'TRADE_CREATE_DURING_ENTRY', 'TradeLibrary')
ON CONFLICT (permission_code) DO NOTHING;

DO $$
DECLARE
    v_sys_admin uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'SYSTEM_ADMIN');
    v_hq_admin  uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'HQ_ADMIN');
    v_se        uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'SITE_ENGINEER');
    v_ss        uuid := (SELECT role_id FROM "public"."role" WHERE role_code = 'SITE_SUPERVISOR');
    v_perm_trade_entry uuid := (SELECT permission_id FROM "public"."permission" WHERE permission_code = 'TRADE_CREATE_DURING_ENTRY');
BEGIN
    INSERT INTO "public"."role_permission" (role_id, permission_id) VALUES
        (v_sys_admin, v_perm_trade_entry),
        (v_hq_admin, v_perm_trade_entry),
        (v_se, v_perm_trade_entry),
        (v_ss, v_perm_trade_entry)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$;

-- ============================================================
-- 2. Target 1: Programme Create (GLOBAL PROGRAMME_CREATE)
-- ============================================================

CREATE OR REPLACE FUNCTION "private"."a27_create_programme_core"(
    p_payload jsonb,
    p_actor_id uuid,
    p_programme_id uuid,
    p_revision_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_programme "public"."programme";
BEGIN
    -- 1. Must have global capability PROGRAMME_CREATE
    PERFORM "private"."assert_global_capability"(p_actor_id, 'PROGRAMME_CREATE');

    -- 2. Validate payload
    IF coalesce(trim(p_payload->>'programme_code'),'')='' OR coalesce(trim(p_payload->>'programme_name'),'')='' THEN
        RAISE EXCEPTION 'A27_PROGRAMME_INVALID' USING ERRCODE='P0001';
    END IF;

    -- 3. Insert programme
    INSERT INTO "public"."programme" (
        programme_id, programme_code, programme_name, employer_name,
        contractor_name, supervising_officer, contract_start_date,
        contract_completion_date, defect_liability_end, current_revision_id,
        status, is_locked, created_at, created_by
    ) VALUES (
        p_programme_id, p_payload->>'programme_code', p_payload->>'programme_name',
        p_payload->>'employer_name', p_payload->>'contractor_name',
        p_payload->>'supervising_officer',
        nullif(p_payload->>'contract_start_date','')::date,
        nullif(p_payload->>'contract_completion_date','')::date,
        nullif(p_payload->>'defect_liability_end','')::date,
        NULL, 'Approved', false, now(), p_actor_id
    ) RETURNING * INTO v_programme;

    -- 4. Insert baseline revision
    INSERT INTO "public"."programme_revision" (
        revision_id, programme_id, revision_no, revision_name, status, created_at, created_by
    ) VALUES (
        p_revision_id, p_programme_id, 1, 'Baseline Revision', 'Draft', now(), p_actor_id
    );

    -- 5. Update current pointer
    UPDATE "public"."programme"
       SET current_revision_id = p_revision_id
     WHERE programme_id = p_programme_id
    RETURNING * INTO v_programme;

    IF v_programme.current_revision_id IS DISTINCT FROM p_revision_id THEN
        RAISE EXCEPTION 'A27_PROGRAMME_POINTER_INVALID' USING ERRCODE='P0001';
    END IF;

    -- 6. Audit & return
    PERFORM "private"."a27_write_audit"(p_audit_id, p_programme_id, p_revision_id, 'PROGRAMME', p_programme_id, 'Create', p_actor_id, NULL, to_jsonb(v_programme));
    RETURN to_jsonb(v_programme);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."a27_create_programme_atomic"(
    p_payload jsonb,
    p_actor_id uuid,
    p_programme_id uuid,
    p_revision_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_create_programme_core"($1, $2, $3, $4, $5);
$$;

REVOKE ALL ON FUNCTION "private"."a27_create_programme_core"(jsonb, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_create_programme_atomic"(jsonb, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_create_programme_atomic"(jsonb, uuid, uuid, uuid, uuid) TO authenticated;

-- ============================================================
-- 3. Target 2: Revision Import / MSP Ingest (REVISION_IMPORT)
-- ============================================================

CREATE OR REPLACE FUNCTION "private"."a27_ingest_msp_core"(
    p_revision jsonb,
    p_tasks jsonb,
    p_actor_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_revision "public"."programme_revision";
    v_task jsonb;
    v_programme uuid := (p_revision->>'programme_id')::uuid;
    v_revision_id uuid := (p_revision->>'revision_id')::uuid;
BEGIN
    -- 1. Assert authority before any mutation
    PERFORM "private"."assert_authority"(p_actor_id, v_programme, 'REVISION_IMPORT');

    -- 2. Validate tasks array
    IF jsonb_typeof(p_tasks) <> 'array' OR jsonb_array_length(p_tasks) = 0 THEN
        RAISE EXCEPTION 'A27_MSP_TASKS_INVALID' USING ERRCODE='P0001';
    END IF;

    -- 3. Verify Programme operational
    PERFORM 1 FROM "public"."programme" WHERE programme_id = v_programme AND status <> 'Archived' FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'A27_PROGRAMME_NOT_OPERATIONAL' USING ERRCODE='P0001';
    END IF;

    -- 4. Check duplicate file hash
    IF EXISTS (SELECT 1 FROM "public"."programme_revision" WHERE programme_id = v_programme AND msp_file_hash = p_revision->>'msp_file_hash') THEN
        RAISE EXCEPTION 'A27_MSP_DUPLICATE' USING ERRCODE='23505';
    END IF;

    -- 5. Insert revision
    INSERT INTO "public"."programme_revision" (
        revision_id, programme_id, revision_no, revision_name,
        msp_file_name, msp_file_hash, msp_imported_at, msp_imported_by,
        status, created_at, created_by
    ) VALUES (
        v_revision_id, v_programme, (p_revision->>'revision_no')::integer,
        p_revision->>'revision_name', p_revision->>'msp_file_name',
        p_revision->>'msp_file_hash', now(), p_actor_id,
        (p_revision->>'status')::"public"."programme_lifecycle_status",
        now(), p_actor_id
    ) RETURNING * INTO v_revision;

    -- 6. Insert tasks
    FOR v_task IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
        IF (v_task->>'programme_id')::uuid <> v_programme
           OR (v_task->>'revision_id')::uuid <> v_revision_id
           OR coalesce(trim(v_task->>'task_name'),'') = '' THEN
            RAISE EXCEPTION 'A27_MSP_TASK_CONTEXT_INVALID' USING ERRCODE='P0001';
        END IF;

        INSERT INTO "public"."task" (
            task_id, programme_id, revision_id, task_uid, task_guid, wbs, task_name,
            parent_task_uid, outline_level, display_order, planned_start, planned_finish,
            planned_duration_days, is_milestone, is_critical, is_summary,
            constraint_type, constraint_date, created_at, created_by,
            outline_number, trade_code, trade_name
        ) VALUES (
            (v_task->>'task_id')::uuid, v_programme, v_revision_id, (v_task->>'task_uid')::integer,
            nullif(v_task->>'task_guid','')::uuid, v_task->>'wbs', v_task->>'task_name',
            nullif(v_task->>'parent_task_uid','')::integer, nullif(v_task->>'outline_level','')::integer,
            nullif(v_task->>'display_order','')::integer, nullif(v_task->>'planned_start','')::date,
            nullif(v_task->>'planned_finish','')::date, nullif(v_task->>'planned_duration_days','')::numeric,
            coalesce((v_task->>'is_milestone')::boolean, false), coalesce((v_task->>'is_critical')::boolean, false),
            coalesce((v_task->>'is_summary')::boolean, false), v_task->>'constraint_type',
            nullif(v_task->>'constraint_date','')::date, now(), p_actor_id,
            v_task->>'outline_number', v_task->>'trade_code', v_task->>'trade_name'
        );
    END LOOP;

    -- 7. Audit & return
    PERFORM "private"."a27_write_audit"(p_audit_id, v_programme, v_revision_id, 'PROGRAMME_REVISION', v_revision_id, 'Import', p_actor_id, NULL, jsonb_build_object('task_count', jsonb_array_length(p_tasks)));
    RETURN to_jsonb(v_revision);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."a27_ingest_msp_atomic"(
    p_revision jsonb,
    p_tasks jsonb,
    p_actor_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_ingest_msp_core"($1, $2, $3, $4);
$$;

REVOKE ALL ON FUNCTION "private"."a27_ingest_msp_core"(jsonb, jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_ingest_msp_atomic"(jsonb, jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_ingest_msp_atomic"(jsonb, jsonb, uuid, uuid) TO authenticated;

-- ============================================================
-- 4. Target 3: Revision Approve & Takeover Closure (REVISION_APPROVE)
-- ============================================================

CREATE OR REPLACE FUNCTION "private"."a27_approve_revision_core"(
    p_revision_id uuid,
    p_actor_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_target "public"."programme_revision";
    v_programme "public"."programme";
    v_previous uuid;
BEGIN
    -- 1. Lock target revision row
    SELECT * INTO v_target FROM "public"."programme_revision" WHERE revision_id = p_revision_id FOR UPDATE;
    IF NOT FOUND OR v_target.status NOT IN ('Draft', 'UnderReview') THEN
        RAISE EXCEPTION 'A27_REVISION_TRANSITION_INVALID' USING ERRCODE='P0001';
    END IF;

    -- 2. Derive programme_id from canonical database row and assert authority
    PERFORM "private"."assert_authority"(p_actor_id, v_target.programme_id, 'REVISION_APPROVE');

    -- 3. Lock programme and verify operational
    SELECT * INTO v_programme FROM "public"."programme" WHERE programme_id = v_target.programme_id FOR UPDATE;
    IF NOT FOUND OR v_programme.status = 'Archived' THEN
        RAISE EXCEPTION 'A27_PROGRAMME_NOT_OPERATIONAL' USING ERRCODE='P0001';
    END IF;

    -- 4. Supersede previous Approved revision
    v_previous := v_programme.current_revision_id;
    IF v_previous IS NOT NULL AND v_previous <> p_revision_id THEN
        UPDATE "public"."programme_revision"
           SET status = 'Superseded'
         WHERE revision_id = v_previous
           AND programme_id = v_target.programme_id
           AND status = 'Approved';
    END IF;

    -- 5. Transition target to Approved
    UPDATE "public"."programme_revision"
       SET status = 'Approved', approved_at = now(), approved_by = p_actor_id
     WHERE revision_id = p_revision_id
    RETURNING * INTO v_target;

    -- 6. Update programme current pointer
    UPDATE "public"."programme"
       SET current_revision_id = p_revision_id, updated_at = now(), updated_by = p_actor_id
     WHERE programme_id = v_target.programme_id;

    IF (SELECT count(*) FROM "public"."programme_revision" WHERE programme_id = v_target.programme_id AND status = 'Approved') <> 1 THEN
        RAISE EXCEPTION 'A27_REVISION_CURRENT_CARDINALITY' USING ERRCODE='P0001';
    END IF;

    -- 7. Audit & return
    PERFORM "private"."a27_write_audit"(p_audit_id, v_target.programme_id, p_revision_id, 'PROGRAMME_REVISION', p_revision_id, 'Approve', p_actor_id, jsonb_build_object('previous_revision_id', v_previous), to_jsonb(v_target));
    RETURN to_jsonb(v_target);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."a27_approve_revision_atomic"(
    p_revision_id uuid,
    p_actor_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_approve_revision_core"($1, $2, $3);
$$;

REVOKE ALL ON FUNCTION "private"."a27_approve_revision_core"(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_approve_revision_atomic"(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_approve_revision_atomic"(uuid, uuid, uuid) TO authenticated;

-- ============================================================
-- 5. Target 4: Programme Archive (PROGRAMME_ARCHIVE)
-- ============================================================

CREATE OR REPLACE FUNCTION "private"."a27_archive_programme_core"(
    p_programme_id uuid,
    p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_programme "public"."programme";
BEGIN
    -- 1. Assert authority on target Programme
    PERFORM "private"."assert_authority"(p_actor_id, p_programme_id, 'PROGRAMME_ARCHIVE');

    -- 2. Update status to Archived
    UPDATE "public"."programme"
       SET status = 'Archived', archived_at = now(), archived_by = p_actor_id, updated_at = now(), updated_by = p_actor_id
     WHERE programme_id = p_programme_id AND status <> 'Archived'
    RETURNING * INTO v_programme;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'A27_PROGRAMME_ARCHIVE_INVALID' USING ERRCODE='P0001';
    END IF;

    RETURN to_jsonb(v_programme);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."a27_archive_programme"(
    p_programme_id uuid,
    p_actor_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_archive_programme_core"($1, $2);
$$;

REVOKE ALL ON FUNCTION "private"."a27_archive_programme_core"(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_archive_programme"(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_archive_programme"(uuid, uuid) TO authenticated;

-- ============================================================
-- 6. Target 5: Task Update (TASK_UPDATE)
-- ============================================================

CREATE OR REPLACE FUNCTION "private"."a27_update_task_core"(
    p_task_id uuid,
    p_payload jsonb,
    p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_task "public"."task";
BEGIN
    -- 1. Lock task row
    SELECT * INTO v_task FROM "public"."task" WHERE task_id = p_task_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'A27_TASK_NOT_FOUND' USING ERRCODE='P0001';
    END IF;

    -- 2. Derive programme_id from canonical Task row and assert authority
    PERFORM "private"."assert_authority"(p_actor_id, v_task.programme_id, 'TASK_UPDATE');

    -- 3. Assert revision operational
    PERFORM "private"."a27_assert_revision_operational"(v_task.programme_id, v_task.revision_id);

    -- 4. Update task
    UPDATE "public"."task"
       SET task_name = coalesce(nullif(p_payload->>'task_name',''), task_name),
           wbs = CASE WHEN p_payload ? 'wbs' THEN p_payload->>'wbs' ELSE wbs END,
           trade_code = CASE WHEN p_payload ? 'trade_code' THEN p_payload->>'trade_code' ELSE trade_code END,
           trade_name = CASE WHEN p_payload ? 'trade_name' THEN p_payload->>'trade_name' ELSE trade_name END
     WHERE task_id = p_task_id
    RETURNING * INTO v_task;

    RETURN to_jsonb(v_task);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."a27_update_task"(
    p_task_id uuid,
    p_payload jsonb,
    p_actor_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_update_task_core"($1, $2, $3);
$$;

REVOKE ALL ON FUNCTION "private"."a27_update_task_core"(uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_update_task"(uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_task"(uuid, jsonb, uuid) TO authenticated;

-- ============================================================
-- 7. Target 6: Activity Create & Update (ACTIVITY_CREATE, ACTIVITY_UPDATE)
-- ============================================================

CREATE OR REPLACE FUNCTION "private"."a27_create_activity_core"(
    p_payload jsonb,
    p_actor_id uuid,
    p_activity_id uuid,
    p_log_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_activity "public"."activity";
    v_programme uuid := (p_payload->>'programme_id')::uuid;
    v_revision uuid := (p_payload->>'revision_id')::uuid;
    v_source "public"."activity_source_type" := coalesce(nullif(p_payload->>'source_type',''), 'MSP')::"public"."activity_source_type";
    v_task uuid := nullif(p_payload->>'task_id','')::uuid;
    v_vo uuid := nullif(p_payload->>'vo_item_id','')::uuid;
BEGIN
    -- 1. Assert authority on target Programme
    PERFORM "private"."assert_authority"(p_actor_id, v_programme, 'ACTIVITY_CREATE');

    -- 2. Assert revision operational
    PERFORM "private"."a27_assert_revision_operational"(v_programme, v_revision);

    -- 3. Context validation
    IF coalesce(trim(p_payload->>'subtask'),'') = '' THEN
        RAISE EXCEPTION 'A27_ACTIVITY_CONTEXT_INVALID' USING ERRCODE='P0001';
    END IF;

    IF v_source = 'MSP' THEN
        IF v_task IS NULL OR v_vo IS NOT NULL THEN
            RAISE EXCEPTION 'F1_ACTIVITY_SOURCE_INVALID' USING ERRCODE='P0001';
        END IF;
        PERFORM 1 FROM "public"."task" WHERE task_id = v_task AND programme_id = v_programme AND revision_id = v_revision;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'A27_ACTIVITY_CONTEXT_INVALID' USING ERRCODE='P0001';
        END IF;
    ELSIF v_source = 'VO' THEN
        IF v_vo IS NULL OR v_task IS NOT NULL THEN
            RAISE EXCEPTION 'F1_ACTIVITY_SOURCE_INVALID' USING ERRCODE='P0001';
        END IF;
        PERFORM 1 FROM "public"."vo_item" WHERE vo_item_id = v_vo AND programme_id = v_programme AND revision_id = v_revision AND is_omission = false;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'F1_VO_ACTIVITY_CONTEXT_INVALID' USING ERRCODE='P0001';
        END IF;
    ELSE
        RAISE EXCEPTION 'F1_ACTIVITY_SOURCE_INVALID' USING ERRCODE='P0001';
    END IF;

    -- 4. Insert activity & log
    INSERT INTO "public"."activity" (
        activity_id, programme_id, revision_id, source_type, task_id, vo_item_id,
        activity_uid, ahi, ahi_display_name, subtask, subtask_display_name,
        activity_date, actual_start_date, completed_date, status, weather, notes,
        submitted_by, created_at, updated_at
    ) VALUES (
        p_activity_id, v_programme, v_revision, v_source, v_task, v_vo,
        p_activity_id, p_payload->>'ahi', p_payload->>'ahi_display_name',
        p_payload->>'subtask', p_payload->>'subtask_display_name',
        (p_payload->>'activity_date')::date, NULL, NULL, 'New', NULL,
        coalesce(p_payload->>'notes',''), p_actor_id, now(), NULL
    ) RETURNING * INTO v_activity;

    INSERT INTO "public"."activity_logs" (log_id, activity_id, event_type, snapshot_data, logged_by, logged_at)
    VALUES (p_log_id, p_activity_id, 'NEW', to_jsonb(v_activity), p_actor_id, now());

    RETURN to_jsonb(v_activity);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."a27_create_activity_atomic"(
    p_payload jsonb,
    p_actor_id uuid,
    p_activity_id uuid,
    p_log_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_create_activity_core"($1, $2, $3, $4);
$$;

CREATE OR REPLACE FUNCTION "private"."a27_mutate_activity_core"(
    p_activity_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_log_id uuid,
    p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_activity "public"."activity";
    v_target "public"."activity_operational_status";
BEGIN
    -- 1. Lock activity row
    SELECT * INTO v_activity FROM "public"."activity" WHERE activity_id = p_activity_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'A27_ACTIVITY_NOT_FOUND' USING ERRCODE='P0001';
    END IF;

    -- 2. Assert authority based on action
    IF p_action = 'UPDATE' THEN
        PERFORM "private"."assert_authority"(p_actor_id, v_activity.programme_id, 'ACTIVITY_UPDATE');
    ELSIF p_action IN ('START', 'COMPLETE') THEN
        PERFORM "private"."assert_authority"(p_actor_id, v_activity.programme_id, 'ACTIVITY_EXECUTE');
    ELSE
        RAISE EXCEPTION 'A27_ACTIVITY_TRANSITION_INVALID' USING ERRCODE='P0001';
    END IF;

    -- 3. Assert revision operational
    PERFORM "private"."a27_assert_revision_operational"(v_activity.programme_id, v_activity.revision_id);

    -- 4. Mutate activity
    IF p_action = 'UPDATE' THEN
        UPDATE "public"."activity"
           SET subtask = coalesce(nullif(p_payload->>'subtask',''), subtask),
               notes = coalesce(p_payload->>'notes', notes),
               weather = coalesce((p_payload->>'weather')::"public"."activity_weather_session", weather),
               updated_at = now()
         WHERE activity_id = p_activity_id
        RETURNING * INTO v_activity;
    ELSE
        v_target := CASE p_action
            WHEN 'START' THEN 'In Progress'::"public"."activity_operational_status"
            WHEN 'COMPLETE' THEN 'Completed'::"public"."activity_operational_status"
            ELSE NULL END;

        IF v_target IS NULL
           OR (v_activity.status = 'New' AND v_target <> 'In Progress')
           OR (v_activity.status = 'In Progress' AND v_target <> 'Completed')
           OR v_activity.status = 'Completed' THEN
            RAISE EXCEPTION 'A27_ACTIVITY_TRANSITION_INVALID' USING ERRCODE='P0001';
        END IF;

        UPDATE "public"."activity"
           SET status = v_target,
               actual_start_date = CASE WHEN v_target = 'In Progress' THEN current_date ELSE actual_start_date END,
               completed_date = CASE WHEN v_target = 'Completed' THEN current_date ELSE completed_date END,
               updated_at = now()
         WHERE activity_id = p_activity_id
        RETURNING * INTO v_activity;
    END IF;

    -- 5. Log & return
    INSERT INTO "public"."activity_logs" (log_id, activity_id, event_type, snapshot_data, logged_by, logged_at)
    VALUES (p_log_id, p_activity_id, 'UPDATE', to_jsonb(v_activity), p_actor_id, now());

    RETURN to_jsonb(v_activity);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."a27_update_activity_atomic"(
    p_activity_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_log_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_mutate_activity_core"($1, $2, $3, $4, 'UPDATE');
$$;

REVOKE ALL ON FUNCTION "private"."a27_create_activity_core"(jsonb, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_create_activity_atomic"(jsonb, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_create_activity_atomic"(jsonb, uuid, uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION "private"."a27_mutate_activity_core"(uuid, jsonb, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_update_activity_atomic"(uuid, jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_activity_atomic"(uuid, jsonb, uuid, uuid) TO authenticated;

-- ============================================================
-- 8. Target 7: Activity Execution Lifecycle Paths (ACTIVITY_EXECUTE)
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."a27_start_activity_atomic"(
    p_activity_id uuid,
    p_actor_id uuid,
    p_log_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_mutate_activity_core"($1, '{}'::jsonb, $2, $3, 'START');
$$;

CREATE OR REPLACE FUNCTION "public"."a27_complete_activity_atomic"(
    p_activity_id uuid,
    p_actor_id uuid,
    p_log_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_mutate_activity_core"($1, '{}'::jsonb, $2, $3, 'COMPLETE');
$$;

REVOKE ALL ON FUNCTION "public"."a27_start_activity_atomic"(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_start_activity_atomic"(uuid, uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION "public"."a27_complete_activity_atomic"(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_complete_activity_atomic"(uuid, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION "private"."f1_start_activity_on_date_core"(
    p_activity_id uuid,
    p_actual_start_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor uuid := "private"."f1_assert_actor"();
    v_activity "public"."activity";
BEGIN
    IF p_actual_start_date IS NULL THEN
        RAISE EXCEPTION 'F1_ACTIVITY_START_DATE_REQUIRED' USING ERRCODE = 'P0001';
    END IF;
    IF p_actual_start_date > current_date THEN
        RAISE EXCEPTION 'F1_ACTIVITY_START_DATE_FUTURE' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_activity FROM "public"."activity" WHERE activity_id = p_activity_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'F1_ACTIVITY_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    -- Assert authority on target Programme derived from row
    PERFORM "private"."assert_authority"(v_actor, v_activity.programme_id, 'ACTIVITY_EXECUTE');

    PERFORM "private"."a27_assert_revision_operational"(v_activity.programme_id, v_activity.revision_id);

    IF v_activity.status <> 'New'::"public"."activity_operational_status" THEN
        RAISE EXCEPTION 'F1_ACTIVITY_START_TRANSITION_INVALID' USING ERRCODE = 'P0001';
    END IF;

    UPDATE "public"."activity"
       SET status = 'In Progress'::"public"."activity_operational_status",
           actual_start_date = p_actual_start_date,
           updated_at = now()
     WHERE activity_id = p_activity_id
    RETURNING * INTO v_activity;

    INSERT INTO "public"."activity_logs" (log_id, activity_id, event_type, snapshot_data, logged_by, logged_at)
    VALUES (gen_random_uuid(), p_activity_id, 'UPDATE', to_jsonb(v_activity), v_actor, now());

    RETURN to_jsonb(v_activity);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."f1_start_activity_on_date_atomic"(
    p_activity_id uuid,
    p_actual_start_date date
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."f1_start_activity_on_date_core"($1, $2);
$$;

CREATE OR REPLACE FUNCTION "private"."f1_complete_activity_with_dates_core"(
    p_activity_id uuid,
    p_actual_start_date date,
    p_completed_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor uuid := "private"."f1_assert_actor"();
    v_activity "public"."activity";
BEGIN
    IF p_completed_date IS NULL THEN
        RAISE EXCEPTION 'F1_ACTIVITY_COMPLETED_DATE_REQUIRED' USING ERRCODE = 'P0001';
    END IF;
    IF p_completed_date > current_date THEN
        RAISE EXCEPTION 'F1_ACTIVITY_COMPLETED_DATE_FUTURE' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_activity FROM "public"."activity" WHERE activity_id = p_activity_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'F1_ACTIVITY_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    -- Assert authority on target Programme derived from row
    PERFORM "private"."assert_authority"(v_actor, v_activity.programme_id, 'ACTIVITY_EXECUTE');

    PERFORM "private"."a27_assert_revision_operational"(v_activity.programme_id, v_activity.revision_id);

    IF v_activity.status = 'Completed'::"public"."activity_operational_status" THEN
        RAISE EXCEPTION 'F1_ACTIVITY_ALREADY_COMPLETED' USING ERRCODE = 'P0001';
    END IF;

    IF v_activity.status = 'New'::"public"."activity_operational_status" THEN
        IF p_actual_start_date IS NULL THEN
            RAISE EXCEPTION 'F1_ACTIVITY_START_DATE_REQUIRED' USING ERRCODE = 'P0001';
        END IF;
        IF p_actual_start_date > p_completed_date THEN
            RAISE EXCEPTION 'F1_ACTIVITY_DATE_ORDER_INVALID' USING ERRCODE = 'P0001';
        END IF;

        UPDATE "public"."activity"
           SET status = 'In Progress'::"public"."activity_operational_status",
               actual_start_date = p_actual_start_date,
               updated_at = now()
         WHERE activity_id = p_activity_id
        RETURNING * INTO v_activity;

        INSERT INTO "public"."activity_logs" (log_id, activity_id, event_type, snapshot_data, logged_by, logged_at)
        VALUES (gen_random_uuid(), p_activity_id, 'UPDATE', to_jsonb(v_activity), v_actor, now());
    ELSE
        IF v_activity.actual_start_date IS NULL THEN
            IF p_actual_start_date IS NULL THEN
                RAISE EXCEPTION 'F1_ACTIVITY_START_DATE_REQUIRED' USING ERRCODE = 'P0001';
            END IF;
            v_activity.actual_start_date := p_actual_start_date;
        END IF;
        IF v_activity.actual_start_date > p_completed_date THEN
            RAISE EXCEPTION 'F1_ACTIVITY_DATE_ORDER_INVALID' USING ERRCODE = 'P0001';
        END IF;
    END IF;

    UPDATE "public"."activity"
       SET status = 'Completed'::"public"."activity_operational_status",
           actual_start_date = COALESCE(actual_start_date, p_actual_start_date),
           completed_date = p_completed_date,
           updated_at = now()
     WHERE activity_id = p_activity_id
    RETURNING * INTO v_activity;

    INSERT INTO "public"."activity_logs" (log_id, activity_id, event_type, snapshot_data, logged_by, logged_at)
    VALUES (gen_random_uuid(), p_activity_id, 'UPDATE', to_jsonb(v_activity), v_actor, now());

    RETURN to_jsonb(v_activity);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."f1_complete_activity_with_dates_atomic"(
    p_activity_id uuid,
    p_actual_start_date date,
    p_completed_date date
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."f1_complete_activity_with_dates_core"($1, $2, $3);
$$;

REVOKE ALL ON FUNCTION "private"."f1_start_activity_on_date_core"(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."f1_start_activity_on_date_atomic"(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f1_start_activity_on_date_atomic"(uuid, date) TO authenticated;

REVOKE ALL ON FUNCTION "private"."f1_complete_activity_with_dates_core"(uuid, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."f1_complete_activity_with_dates_atomic"(uuid, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f1_complete_activity_with_dates_atomic"(uuid, date, date) TO authenticated;

-- ============================================================
-- 9. Target 8: Site Diary Public Surface Closure & Mutation Hardening
-- ============================================================

-- Drop obsolete unreferenced sibling entry points
DROP FUNCTION IF EXISTS "public"."a27_create_site_diary_atomic"(jsonb, uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS "public"."f1_create_site_diary_with_workforce_atomic"(jsonb, uuid, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION "private"."a27_mutate_site_diary_core"(
    p_site_diary_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_log_id uuid,
    p_audit_id uuid,
    p_create boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_diary "public"."site_diary";
    v_activity "public"."activity";
    v_intent text;
    v_act_date date;
    v_carry_forward boolean;
BEGIN
    IF p_create THEN
        -- 1. Lock Activity row
        SELECT * INTO v_activity FROM "public"."activity" WHERE activity_id = (p_payload->>'activity_id')::uuid FOR SHARE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'A27_ACTIVITY_NOT_FOUND' USING ERRCODE='P0001';
        END IF;

        -- 2. Verify Programme and Revision match Activity
        IF v_activity.programme_id <> (p_payload->>'programme_id')::uuid OR v_activity.revision_id <> (p_payload->>'revision_id')::uuid THEN
            RAISE EXCEPTION 'A27_SITE_DIARY_CONTEXT_INVALID' USING ERRCODE='P0001';
        END IF;

        -- 3. Assert authority on derived Programme
        PERFORM "private"."assert_authority"(p_actor_id, v_activity.programme_id, 'SITE_DIARY_CREATE');

        -- 4. Revalidate current authorised Programme Revision
        PERFORM "private"."a27_assert_revision_operational"(v_activity.programme_id, v_activity.revision_id);

        -- 5. Closed Operation Intent Validation
        v_intent := nullif(trim(coalesce(p_payload->>'operation_intent', '')), '');
        v_carry_forward := coalesce((p_payload->>'carry_forward')::boolean, false);
        v_act_date := (p_payload->>'activity_date')::date;

        CASE v_intent
            WHEN 'IN_PROGRESS_DIARY' THEN
                IF v_carry_forward THEN
                    RAISE EXCEPTION 'A27_INTENT_CARRY_FORWARD_CONFLICT' USING ERRCODE='P0001';
                END IF;
                IF v_activity.status <> 'In Progress' THEN
                    RAISE EXCEPTION 'A27_INTENT_IN_PROGRESS_INVALID_ACTIVITY_STATUS: %', v_activity.status USING ERRCODE='P0001';
                END IF;

            WHEN 'FINAL_COMPLETION_DIARY' THEN
                IF v_carry_forward THEN
                    RAISE EXCEPTION 'A27_INTENT_CARRY_FORWARD_CONFLICT' USING ERRCODE='P0001';
                END IF;
                IF v_activity.status <> 'Completed' THEN
                    RAISE EXCEPTION 'A27_INTENT_COMPLETION_ACTIVITY_NOT_COMPLETED: %', v_activity.status USING ERRCODE='P0001';
                END IF;
                IF v_activity.completed_date IS NULL THEN
                    RAISE EXCEPTION 'A27_INTENT_COMPLETION_MISSING_COMPLETED_DATE' USING ERRCODE='P0001';
                END IF;
                IF v_activity.completed_date <> v_act_date THEN
                    RAISE EXCEPTION 'A27_INTENT_COMPLETION_DATE_MISMATCH: completed_date % vs activity_date %', v_activity.completed_date, v_act_date USING ERRCODE='P0001';
                END IF;

            WHEN 'CARRY_FORWARD_DIARY' THEN
                IF NOT v_carry_forward THEN
                    RAISE EXCEPTION 'A27_INTENT_CARRY_FORWARD_REQUIRED' USING ERRCODE='P0001';
                END IF;
                IF v_activity.status NOT IN ('New', 'In Progress') THEN
                    RAISE EXCEPTION 'A27_INTENT_CARRY_FORWARD_INVALID_ACTIVITY_STATUS: %', v_activity.status USING ERRCODE='P0001';
                END IF;

            ELSE
                RAISE EXCEPTION 'A27_UNKNOWN_OPERATION_INTENT: %', coalesce(v_intent, 'NULL') USING ERRCODE='P0001';
        END CASE;

        -- 6. Insert Site Diary row
        INSERT INTO "public"."site_diary" (
            site_diary_id, programme_id, revision_id, activity_id,
            activity_date, weather, notes, status, manpower,
            submitted_by, submitted_at, updated_at
        ) VALUES (
            p_site_diary_id, v_activity.programme_id, v_activity.revision_id, v_activity.activity_id,
            v_act_date, nullif(p_payload->>'weather','')::"public"."activity_weather_session",
            coalesce(p_payload->>'notes',''), v_activity.status, p_payload->'manpower',
            p_actor_id, now(), NULL
        ) RETURNING * INTO v_diary;

        INSERT INTO "public"."site_diary_logs" (log_id, site_diary_id, event_type, snapshot_data, logged_by, logged_at)
        VALUES (p_log_id, p_site_diary_id, 'NEW', to_jsonb(v_diary), p_actor_id, now());

        PERFORM "private"."a27_write_audit"(
            p_audit_id, v_diary.programme_id, v_diary.revision_id, 'SITE_DIARY', p_site_diary_id,
            CASE WHEN v_carry_forward THEN 'Carry Forward'::"public"."audit_event_type" ELSE 'Create'::"public"."audit_event_type" END,
            p_actor_id, NULL, to_jsonb(v_diary)
        );
    ELSE
        -- 1. Lock Site Diary row
        SELECT * INTO v_diary FROM "public"."site_diary" WHERE site_diary_id = p_site_diary_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE='P0001';
        END IF;

        -- 2. Assert authority on derived Programme
        PERFORM "private"."assert_authority"(p_actor_id, v_diary.programme_id, 'SITE_DIARY_UPDATE');

        -- 3. Assert revision operational
        PERFORM "private"."a27_assert_revision_operational"(v_diary.programme_id, v_diary.revision_id);

        -- 4. Update Site Diary row
        UPDATE "public"."site_diary"
           SET weather = CASE WHEN p_payload ? 'weather' THEN nullif(p_payload->>'weather','')::"public"."activity_weather_session" ELSE weather END,
               notes = CASE WHEN p_payload ? 'notes' THEN p_payload->>'notes' ELSE notes END,
               manpower = CASE WHEN p_payload ? 'manpower' THEN p_payload->'manpower' ELSE manpower END,
               updated_at = now()
         WHERE site_diary_id = p_site_diary_id
        RETURNING * INTO v_diary;

        INSERT INTO "public"."site_diary_logs" (log_id, site_diary_id, event_type, snapshot_data, logged_by, logged_at)
        VALUES (p_log_id, p_site_diary_id, 'UPDATE', to_jsonb(v_diary), p_actor_id, now());

        PERFORM "private"."a27_write_audit"(p_audit_id, v_diary.programme_id, v_diary.revision_id, 'SITE_DIARY', p_site_diary_id, 'Update', p_actor_id, NULL, to_jsonb(v_diary));
    END IF;

    RETURN to_jsonb(v_diary);
END;
$$;

REVOKE ALL ON FUNCTION "private"."a27_mutate_site_diary_core"(uuid, jsonb, uuid, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 10. Targets 9, 11, 12: Workforce, Trade Master, and Secured Dynamic Trade Resolver
-- ============================================================

-- Explicit Trade Master Create (Target 11: GLOBAL TRADE_LIBRARY_MANAGE)
CREATE OR REPLACE FUNCTION "public"."f1_create_trade_atomic"(
    p_trade_code text,
    p_trade_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor uuid := auth.uid();
    v_trade "public"."trade_library";
    v_code text := upper(trim(p_trade_code));
    v_name text := trim(p_trade_name);
BEGIN
    IF v_actor IS NULL THEN
        RAISE EXCEPTION 'F1_TRADE_UNAUTHENTICATED' USING ERRCODE = 'P0001';
    END IF;

    -- Global capability required for explicit Trade Master administration
    PERFORM "private"."assert_global_capability"(v_actor, 'TRADE_LIBRARY_MANAGE');

    IF v_name = '' THEN
        RAISE EXCEPTION 'F1_TRADE_NAME_REQUIRED' USING ERRCODE = 'P0001';
    END IF;
    IF v_code = '' THEN
        RAISE EXCEPTION 'F1_TRADE_CODE_REQUIRED' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO "public"."trade_library" (
        trade_code, trade_name, display_order, is_active, created_at, created_by
    ) VALUES (
        v_code, v_name, 0, true, now(), v_actor
    )
    ON CONFLICT (trade_code) DO UPDATE
        SET trade_name = EXCLUDED.trade_name
    WHERE "public"."trade_library".trade_name = EXCLUDED.trade_name
    RETURNING * INTO v_trade;

    IF v_trade.trade_id IS NULL THEN
        SELECT * INTO v_trade
          FROM "public"."trade_library"
         WHERE trade_code = v_code AND trade_name = v_name;
    END IF;

    IF v_trade.trade_id IS NULL THEN
        RAISE EXCEPTION 'F1_TRADE_CODE_CONFLICT' USING ERRCODE = 'P0001';
    END IF;

    RETURN to_jsonb(v_trade);
END;
$$;

REVOKE ALL ON FUNCTION "public"."f1_create_trade_atomic"(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f1_create_trade_atomic"(text, text) TO authenticated;

-- Secured Dynamic Trade Resolver (Target 12: TRADE_CREATE_DURING_ENTRY)
CREATE OR REPLACE FUNCTION "private"."f1_resolve_trade"(
    p_trade_name text,
    p_actor_id uuid,
    p_programme_id uuid
)
RETURNS "public"."trade_library"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_trade "public"."trade_library";
    v_name text := trim(coalesce(p_trade_name, ''));
    v_code text;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    IF v_name = '' THEN
        RAISE EXCEPTION 'F1_WORKFORCE_TRADE_NAME_REQUIRED' USING ERRCODE = 'P0001';
    END IF;

    -- 1. Lookup existing active trade
    SELECT * INTO v_trade
      FROM "public"."trade_library"
     WHERE lower(trim(trade_name)) = lower(v_name)
       AND is_active = true
     ORDER BY display_order, created_at
     LIMIT 1;

    IF FOUND THEN
        RETURN v_trade;
    END IF;

    -- 2. If missing, assert authority on target Programme before creation
    PERFORM "private"."assert_authority"(p_actor_id, p_programme_id, 'TRADE_CREATE_DURING_ENTRY');

    v_code := upper(regexp_replace(v_name, '[^A-Za-z0-9]+', '_', 'g'));
    v_code := left(trim(both '_' from v_code), 50);
    IF v_code = '' THEN
        RAISE EXCEPTION 'F1_WORKFORCE_TRADE_CODE_INVALID' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO "public"."trade_library" (
        trade_code, trade_name, display_order, is_active, created_at, created_by
    ) VALUES (
        v_code, v_name, 0, true, now(), p_actor_id
    )
    ON CONFLICT (trade_code) DO UPDATE
        SET trade_name = EXCLUDED.trade_name
    WHERE "public"."trade_library".trade_name = EXCLUDED.trade_name
    RETURNING * INTO v_trade;

    IF v_trade.trade_id IS NULL THEN
        SELECT * INTO v_trade
          FROM "public"."trade_library"
         WHERE trade_code = v_code AND trade_name = v_name AND is_active = true;
    END IF;

    IF v_trade.trade_id IS NULL THEN
        RAISE EXCEPTION 'F1_WORKFORCE_TRADE_CODE_CONFLICT' USING ERRCODE = 'P0001';
    END IF;

    RETURN v_trade;
END;
$$;

REVOKE ALL ON FUNCTION "private"."f1_resolve_trade"(text, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Workforce Mutation Core (Target 9: WORKFORCE_MANAGE)
CREATE OR REPLACE FUNCTION "private"."a27_mutate_workforce_core"(
    p_workforce_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_audit_id uuid,
    p_create boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_workforce "public"."workforce";
    v_diary "public"."site_diary";
    v_trade "public"."trade_library";
    v_b integer;
    v_n integer;
    v_f integer;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    IF p_create THEN
        SELECT * INTO v_diary FROM "public"."site_diary" WHERE site_diary_id = (p_payload->>'site_diary_id')::uuid FOR SHARE;
        IF NOT FOUND
           OR v_diary.programme_id <> (p_payload->>'programme_id')::uuid
           OR v_diary.revision_id <> (p_payload->>'revision_id')::uuid
           OR v_diary.activity_id <> (p_payload->>'activity_id')::uuid THEN
            RAISE EXCEPTION 'A27_WORKFORCE_CONTEXT_INVALID' USING ERRCODE='P0001';
        END IF;

        -- Assert authority on derived Programme
        PERFORM "private"."assert_authority"(p_actor_id, v_diary.programme_id, 'WORKFORCE_MANAGE');

        PERFORM "private"."a27_assert_revision_operational"(v_diary.programme_id, v_diary.revision_id);

        SELECT * INTO v_trade FROM "public"."trade_library" WHERE trade_id = (p_payload->>'trade_id')::uuid AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'A27_WORKFORCE_TRADE_INVALID' USING ERRCODE='P0001';
        END IF;

        v_b := coalesce((p_payload->>'bumiputera_count')::integer, 0);
        v_n := coalesce((p_payload->>'non_bumiputera_count')::integer, 0);
        v_f := coalesce((p_payload->>'foreign_count')::integer, 0);

        INSERT INTO "public"."workforce" (
            workforce_id, programme_id, revision_id, activity_id, site_diary_id,
            trade_id, trade_name, bumiputera_count, non_bumiputera_count,
            foreign_count, total_count, created_at
        ) VALUES (
            p_workforce_id, v_diary.programme_id, v_diary.revision_id, v_diary.activity_id,
            v_diary.site_diary_id, v_trade.trade_id, v_trade.trade_name,
            v_b, v_n, v_f, v_b + v_n + v_f, now()
        ) RETURNING * INTO v_workforce;

        PERFORM "private"."a27_write_audit"(p_audit_id, v_workforce.programme_id, v_workforce.revision_id, 'WORKFORCE', p_workforce_id, 'Create', p_actor_id, NULL, to_jsonb(v_workforce));
    ELSE
        SELECT * INTO v_workforce FROM "public"."workforce" WHERE workforce_id = p_workforce_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'A27_WORKFORCE_NOT_FOUND' USING ERRCODE='P0001';
        END IF;

        -- Assert authority on derived Programme
        PERFORM "private"."assert_authority"(p_actor_id, v_workforce.programme_id, 'WORKFORCE_MANAGE');

        PERFORM "private"."a27_assert_revision_operational"(v_workforce.programme_id, v_workforce.revision_id);

        SELECT * INTO v_trade FROM "public"."trade_library" WHERE trade_id = coalesce((p_payload->>'trade_id')::uuid, v_workforce.trade_id) AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'A27_WORKFORCE_TRADE_INVALID' USING ERRCODE='P0001';
        END IF;

        v_b := coalesce((p_payload->>'bumiputera_count')::integer, v_workforce.bumiputera_count);
        v_n := coalesce((p_payload->>'non_bumiputera_count')::integer, v_workforce.non_bumiputera_count);
        v_f := coalesce((p_payload->>'foreign_count')::integer, v_workforce.foreign_count);

        UPDATE "public"."workforce"
           SET trade_id = v_trade.trade_id, trade_name = v_trade.trade_name,
               bumiputera_count = v_b, non_bumiputera_count = v_n, foreign_count = v_f,
               total_count = v_b + v_n + v_f, updated_at = now()
         WHERE workforce_id = p_workforce_id
        RETURNING * INTO v_workforce;

        PERFORM "private"."a27_write_audit"(p_audit_id, v_workforce.programme_id, v_workforce.revision_id, 'WORKFORCE', p_workforce_id, 'Update', p_actor_id, NULL, to_jsonb(v_workforce));
    END IF;

    RETURN to_jsonb(v_workforce);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."a27_create_workforce_atomic"(
    p_payload jsonb,
    p_actor_id uuid,
    p_workforce_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_mutate_workforce_core"($3, $1, $2, $4, true);
$$;

CREATE OR REPLACE FUNCTION "public"."a27_update_workforce_atomic"(
    p_workforce_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_mutate_workforce_core"($1, $2, $3, $4, false);
$$;

REVOKE ALL ON FUNCTION "private"."a27_mutate_workforce_core"(uuid, jsonb, uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_create_workforce_atomic"(jsonb, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_create_workforce_atomic"(jsonb, uuid, uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION "public"."a27_update_workforce_atomic"(uuid, jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_workforce_atomic"(uuid, jsonb, uuid, uuid) TO authenticated;

-- Site Diary with Workforce Composition Helpers
CREATE OR REPLACE FUNCTION "private"."f1_create_site_diary_with_workforce_core"(
    p_payload jsonb,
    p_actor_id uuid,
    p_site_diary_id uuid,
    p_log_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_diary jsonb;
    v_item jsonb;
    v_trade "public"."trade_library";
    v_trade_name text;
    v_b integer;
    v_n integer;
    v_f integer;
    v_workforce_payload jsonb;
    v_programme_id uuid := (p_payload->>'programme_id')::uuid;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    IF p_payload ? 'manpower'
       AND p_payload->'manpower' IS NOT NULL
       AND jsonb_typeof(p_payload->'manpower') <> 'array' THEN
        RAISE EXCEPTION 'F1_SITE_DIARY_MANPOWER_INVALID' USING ERRCODE = 'P0001';
    END IF;

    v_diary := "private"."a27_mutate_site_diary_core"(
        p_site_diary_id, p_payload, p_actor_id, p_log_id, p_audit_id, true
    );

    FOR v_item IN
        SELECT value FROM jsonb_array_elements(coalesce(p_payload->'manpower', '[]'::jsonb))
    LOOP
        v_trade_name := trim(coalesce(v_item->>'trade_name', ''));
        v_b := coalesce(nullif(v_item->>'bumiputera_count', '')::integer,
                        nullif(v_item->>'bumi_count', '')::integer, 0);
        v_n := coalesce(nullif(v_item->>'non_bumiputera_count', '')::integer,
                        nullif(v_item->>'non_bumi_count', '')::integer, 0);
        v_f := coalesce(nullif(v_item->>'foreign_count', '')::integer, 0);

        IF v_trade_name = '' THEN
            RAISE EXCEPTION 'F1_WORKFORCE_TRADE_NAME_REQUIRED' USING ERRCODE = 'P0001';
        END IF;
        IF v_b < 0 OR v_n < 0 OR v_f < 0 THEN
            RAISE EXCEPTION 'F1_WORKFORCE_COUNT_INVALID' USING ERRCODE = 'P0001';
        END IF;
        IF v_b + v_n + v_f = 0 THEN
            CONTINUE;
        END IF;

        -- Resolve trade through secured resolver
        v_trade := "private"."f1_resolve_trade"(v_trade_name, p_actor_id, v_programme_id);

        v_workforce_payload := jsonb_build_object(
            'programme_id', p_payload->>'programme_id',
            'revision_id', p_payload->>'revision_id',
            'activity_id', p_payload->>'activity_id',
            'site_diary_id', p_site_diary_id,
            'trade_id', v_trade.trade_id,
            'bumiputera_count', v_b,
            'non_bumiputera_count', v_n,
            'foreign_count', v_f
        );

        PERFORM "private"."a27_mutate_workforce_core"(
            gen_random_uuid(), v_workforce_payload, p_actor_id, gen_random_uuid(), true
        );
    END LOOP;

    RETURN v_diary;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."f1_update_site_diary_with_workforce_core"(
    p_site_diary_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_log_id uuid,
    p_audit_id uuid,
    p_expected_last_modified_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_diary_row "public"."site_diary";
    v_diary jsonb;
    v_existing "public"."workforce";
    v_item jsonb;
    v_trade "public"."trade_library";
    v_workforce "public"."workforce";
    v_b integer;
    v_n integer;
    v_f integer;
    v_payload jsonb;
    v_locked_last_modified_at timestamptz;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    IF p_payload ? 'manpower'
       AND p_payload->'manpower' IS NOT NULL
       AND jsonb_typeof(p_payload->'manpower') <> 'array' THEN
        RAISE EXCEPTION 'F1_SITE_DIARY_MANPOWER_INVALID' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_diary_row FROM "public"."site_diary" WHERE site_diary_id = p_site_diary_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    -- Seal edits if Pending or Approved (F2.4 invariant)
    PERFORM "private"."f24_assert_site_diary_unsealed"(p_site_diary_id);

    PERFORM "private"."a27_assert_revision_operational"(v_diary_row.programme_id, v_diary_row.revision_id);

    IF p_expected_last_modified_at IS NULL THEN
        RAISE EXCEPTION 'F23_EXPECTED_LAST_MODIFIED_REQUIRED' USING ERRCODE = '22007';
    END IF;

    v_locked_last_modified_at := coalesce(v_diary_row.updated_at, v_diary_row.submitted_at);
    IF v_locked_last_modified_at IS DISTINCT FROM p_expected_last_modified_at THEN
        RAISE EXCEPTION 'F23_SITE_DIARY_STALE_EDIT' USING ERRCODE = 'PT409';
    END IF;

    v_diary := "private"."a27_mutate_site_diary_core"(
        p_site_diary_id, p_payload, p_actor_id, p_log_id, p_audit_id, false
    );

    IF NOT (p_payload ? 'manpower') THEN
        RETURN v_diary;
    END IF;

    FOR v_existing IN
        SELECT * FROM "public"."workforce" WHERE site_diary_id = p_site_diary_id ORDER BY created_at, workforce_id
    LOOP
        v_payload := jsonb_build_object(
            'trade_id', v_existing.trade_id,
            'bumiputera_count', 0,
            'non_bumiputera_count', 0,
            'foreign_count', 0
        );
        PERFORM "private"."a27_mutate_workforce_core"(
            v_existing.workforce_id, v_payload, p_actor_id, gen_random_uuid(), false
        );
    END LOOP;

    FOR v_item IN
        SELECT value FROM jsonb_array_elements(coalesce(p_payload->'manpower', '[]'::jsonb))
    LOOP
        v_b := coalesce(nullif(v_item->>'bumiputera_count', '')::integer,
                        nullif(v_item->>'bumi_count', '')::integer, 0);
        v_n := coalesce(nullif(v_item->>'non_bumiputera_count', '')::integer,
                        nullif(v_item->>'non_bumi_count', '')::integer, 0);
        v_f := coalesce(nullif(v_item->>'foreign_count', '')::integer, 0);

        IF v_b < 0 OR v_n < 0 OR v_f < 0 THEN
            RAISE EXCEPTION 'F1_WORKFORCE_COUNT_INVALID' USING ERRCODE = 'P0001';
        END IF;
        IF v_b + v_n + v_f = 0 THEN CONTINUE; END IF;

        v_trade := "private"."f1_resolve_trade"(v_item->>'trade_name', p_actor_id, v_diary_row.programme_id);
        SELECT * INTO v_workforce FROM "public"."workforce"
         WHERE site_diary_id = p_site_diary_id AND trade_id = v_trade.trade_id
         ORDER BY created_at, workforce_id LIMIT 1;

        IF FOUND THEN
            v_payload := jsonb_build_object(
                'trade_id', v_trade.trade_id,
                'bumiputera_count', v_b,
                'non_bumiputera_count', v_n,
                'foreign_count', v_f
            );
            PERFORM "private"."a27_mutate_workforce_core"(
                v_workforce.workforce_id, v_payload, p_actor_id, gen_random_uuid(), false
            );
        ELSE
            v_payload := jsonb_build_object(
                'programme_id', v_diary_row.programme_id,
                'revision_id', v_diary_row.revision_id,
                'activity_id', v_diary_row.activity_id,
                'site_diary_id', p_site_diary_id,
                'trade_id', v_trade.trade_id,
                'bumiputera_count', v_b,
                'non_bumiputera_count', v_n,
                'foreign_count', v_f
            );
            PERFORM "private"."a27_mutate_workforce_core"(
                gen_random_uuid(), v_payload, p_actor_id, gen_random_uuid(), true
            );
        END IF;
    END LOOP;

    RETURN v_diary;
END;
$$;

-- Canonical Site Diary Full Wrappers
CREATE OR REPLACE FUNCTION "private"."f1_create_site_diary_full_core"(
    p_payload jsonb,
    p_actor_id uuid,
    p_site_diary_id uuid,
    p_log_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_diary jsonb;
    v_context jsonb;
    v_row "public"."site_diary";
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    v_context := "private"."f1_validate_print_context"(p_payload->'print_context');

    v_diary := "private"."f1_create_site_diary_with_workforce_core"(
        p_payload, p_actor_id, p_site_diary_id, p_log_id, p_audit_id
    );

    UPDATE "public"."site_diary"
       SET print_context = v_context
     WHERE site_diary_id = p_site_diary_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'F1_SITE_DIARY_PRINT_CONTEXT_WRITE_FAILED' USING ERRCODE = 'P0001';
    END IF;

    RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."f1_create_site_diary_full_atomic"(
    p_payload jsonb,
    p_actor_id uuid,
    p_site_diary_id uuid,
    p_log_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."f1_create_site_diary_full_core"($1, $2, $3, $4, $5);
$$;

CREATE OR REPLACE FUNCTION "private"."f1_update_site_diary_full_core"(
    p_site_diary_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_log_id uuid,
    p_audit_id uuid,
    p_expected_last_modified_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_diary jsonb;
    v_row "public"."site_diary";
    v_context jsonb;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    v_diary := "private"."f1_update_site_diary_with_workforce_core"(
        p_site_diary_id, p_payload, p_actor_id, p_log_id, p_audit_id,
        p_expected_last_modified_at
    );

    IF p_payload ? 'print_context' THEN
        v_context := "private"."f1_validate_print_context"(p_payload->'print_context');
        UPDATE "public"."site_diary" SET print_context = v_context
         WHERE site_diary_id = p_site_diary_id RETURNING * INTO v_row;
    ELSE
        SELECT * INTO v_row FROM "public"."site_diary" WHERE site_diary_id = p_site_diary_id;
    END IF;

    IF v_row.site_diary_id IS NULL THEN
        RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."f1_update_site_diary_full_atomic"(
    p_site_diary_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_log_id uuid,
    p_audit_id uuid,
    p_expected_last_modified_at timestamptz
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."f1_update_site_diary_full_core"($1, $2, $3, $4, $5, $6);
$$;

REVOKE ALL ON FUNCTION "private"."f1_create_site_diary_with_workforce_core"(jsonb, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_update_site_diary_with_workforce_core"(uuid, jsonb, uuid, uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_create_site_diary_full_core"(jsonb, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_update_site_diary_full_core"(uuid, jsonb, uuid, uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION "public"."f1_create_site_diary_full_atomic"(jsonb, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f1_create_site_diary_full_atomic"(jsonb, uuid, uuid, uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION "public"."f1_update_site_diary_full_atomic"(uuid, jsonb, uuid, uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f1_update_site_diary_full_atomic"(uuid, jsonb, uuid, uuid, uuid, timestamptz) TO authenticated;

-- ============================================================
-- 11. Target 10: VO Item Create (VO_ITEM_CREATE)
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."f1_create_vo_item_atomic"(
    p_programme_id uuid,
    p_revision_id uuid,
    p_vo_reference text,
    p_line_item text,
    p_description text,
    p_is_omission boolean,
    p_actor_id uuid,
    p_vo_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_item "public"."vo_item";
BEGIN
    -- 1. Assert authority on target Programme (VO_ITEM_CREATE)
    PERFORM "private"."assert_authority"(p_actor_id, p_programme_id, 'VO_ITEM_CREATE');

    -- 2. Assert revision operational
    PERFORM "private"."a27_assert_revision_operational"(p_programme_id, p_revision_id);

    -- 3. Validate reference and line item
    IF coalesce(trim(p_vo_reference), '') = '' THEN
        RAISE EXCEPTION 'F1_VO_REFERENCE_REQUIRED' USING ERRCODE='P0001';
    END IF;
    IF coalesce(trim(p_line_item), '') = '' THEN
        RAISE EXCEPTION 'F1_VO_LINE_ITEM_REQUIRED' USING ERRCODE='P0001';
    END IF;

    -- 4. Insert vo_item
    INSERT INTO "public"."vo_item" (
        vo_item_id, programme_id, revision_id, vo_reference, line_item,
        description, is_omission, created_by, created_at
    ) VALUES (
        p_vo_item_id, p_programme_id, p_revision_id, trim(p_vo_reference), trim(p_line_item),
        nullif(trim(coalesce(p_description, '')), ''), coalesce(p_is_omission, false), p_actor_id, now()
    ) RETURNING * INTO v_item;

    RETURN to_jsonb(v_item);
END;
$$;

REVOKE ALL ON FUNCTION "public"."f1_create_vo_item_atomic"(uuid, uuid, text, text, text, boolean, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."f1_create_vo_item_atomic"(uuid, uuid, text, text, text, boolean, uuid, uuid) TO authenticated;

-- ============================================================
-- 12. Target 13: Progress Create & Update Basic Programme Authority (PROGRESS_EDIT)
-- ============================================================

CREATE OR REPLACE FUNCTION "private"."a27_create_progress_atomic"(
    p_payload jsonb,
    p_actor_id uuid,
    p_progress_id uuid,
    p_audit_id uuid,
    p_activity_log_id uuid
)
RETURNS "public"."progress"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_row "public"."progress";
    v_activity "public"."activity";
    v_programme_id uuid := (p_payload->>'programme_id')::uuid;
    v_revision_id uuid := (p_payload->>'revision_id')::uuid;
    v_activity_id uuid := (p_payload->>'activity_id')::uuid;
    v_site_diary_id uuid := (p_payload->>'site_diary_id')::uuid;
    v_actual numeric := (p_payload->>'actual_quantity')::numeric;
    v_total numeric;
    v_planned numeric;
    v_status "public"."progress_measurement_status" := COALESCE(
        NULLIF(p_payload->>'measurement_status', '')::"public"."progress_measurement_status", 'Draft'
    );
    v_percentage numeric := NULLIF(p_payload->>'progress_percentage', '')::numeric;
    v_complete boolean;
BEGIN
    -- 1. Assert authority on target Programme
    PERFORM "private"."assert_authority"(p_actor_id, v_programme_id, 'PROGRESS_EDIT');

    -- 2. Assert revision operational
    PERFORM "private"."a27_assert_revision_operational"(v_programme_id, v_revision_id);

    -- 3. Assert activity & linked context
    v_activity := "private"."a27_assert_activity_context"(v_programme_id, v_revision_id, v_activity_id);
    PERFORM "private"."a27_assert_linked_context"(v_programme_id, v_revision_id, v_activity_id, v_site_diary_id, NULL);

    SELECT * INTO v_activity FROM "public"."activity" WHERE activity_id = v_activity_id FOR UPDATE;

    -- 4. Quantity validation
    SELECT COALESCE(sum(actual_quantity), 0), max(planned_quantity) FILTER (WHERE planned_quantity > 0)
      INTO v_total, v_planned
      FROM "public"."progress" WHERE activity_id = v_activity_id;
    IF v_planned IS NOT NULL AND ((v_total + v_actual) / v_planned) * 100 > 100 THEN
        RAISE EXCEPTION 'A27_PROGRESS_CUMULATIVE_EXCEEDS_100' USING ERRCODE = '23514';
    END IF;

    v_complete := v_status = 'Approved' AND v_percentage = 100;
    IF v_complete AND v_activity.status <> 'In Progress' THEN
        RAISE EXCEPTION 'A27_ACTIVITY_COMPLETION_TRANSITION_INVALID' USING ERRCODE = '23514';
    END IF;

    -- 5. Insert progress
    INSERT INTO "public"."progress" (
        progress_id, programme_id, revision_id, activity_id, site_diary_id, measurement_date,
        progress_type, planned_quantity, actual_quantity, unit, progress_percentage,
        measurement_status, verified_by, verified_at, approved_by, approved_at, created_at, updated_at
    ) VALUES (
        p_progress_id, v_programme_id, v_revision_id, v_activity_id, v_site_diary_id,
        (p_payload->>'measurement_date')::date,
        NULLIF(p_payload->>'progress_type', '')::"public"."progress_measurement_type",
        NULLIF(p_payload->>'planned_quantity', '')::numeric, v_actual,
        NULLIF(p_payload->>'unit', ''), v_percentage, v_status,
        CASE WHEN v_status = 'Verified' THEN p_actor_id ELSE NULL END,
        CASE WHEN v_status = 'Verified' THEN now() ELSE NULL END,
        CASE WHEN v_status = 'Approved' THEN p_actor_id ELSE NULL END,
        CASE WHEN v_status = 'Approved' THEN now() ELSE NULL END,
        now(), NULL
    ) RETURNING * INTO v_row;

    IF v_complete THEN
        UPDATE "public"."activity" SET status = 'Completed', completed_date = CURRENT_DATE, updated_at = now()
         WHERE activity_id = v_activity_id RETURNING * INTO v_activity;
        INSERT INTO "public"."activity_logs" (log_id, activity_id, event_type, snapshot_data, logged_by, logged_at)
        VALUES (p_activity_log_id, v_activity.activity_id, 'UPDATE', to_jsonb(v_activity), p_actor_id, now());
    END IF;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id, event_type, event_timestamp, performed_by
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'Progress', v_row.progress_id, 'Create', now(), p_actor_id
    );

    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_update_progress_atomic"(
    p_progress_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_audit_id uuid,
    p_activity_log_id uuid
)
RETURNS "public"."progress"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_existing "public"."progress";
    v_row "public"."progress";
    v_activity "public"."activity";
    v_new_actual numeric;
    v_new_percentage numeric;
    v_new_status "public"."progress_measurement_status";
    v_total numeric;
    v_planned numeric;
    v_complete boolean;
BEGIN
    -- 1. Lock progress row
    SELECT * INTO STRICT v_existing FROM "public"."progress" WHERE progress_id = p_progress_id FOR UPDATE;

    -- 2. Assert authority on derived Programme
    PERFORM "private"."assert_authority"(p_actor_id, v_existing.programme_id, 'PROGRESS_EDIT');

    -- 3. Assert revision operational
    PERFORM "private"."a27_assert_revision_operational"(v_existing.programme_id, v_existing.revision_id);

    -- 4. Context assertions
    v_activity := "private"."a27_assert_activity_context"(v_existing.programme_id, v_existing.revision_id, v_existing.activity_id);
    PERFORM "private"."a27_assert_linked_context"(v_existing.programme_id, v_existing.revision_id, v_existing.activity_id, v_existing.site_diary_id, NULL);

    SELECT * INTO v_activity FROM "public"."activity" WHERE activity_id = v_existing.activity_id FOR UPDATE;

    v_new_actual := CASE WHEN p_payload ? 'actual_quantity' THEN (p_payload->>'actual_quantity')::numeric ELSE v_existing.actual_quantity END;
    v_new_percentage := CASE WHEN p_payload ? 'progress_percentage' THEN (p_payload->>'progress_percentage')::numeric ELSE v_existing.progress_percentage END;
    v_new_status := CASE WHEN p_payload ? 'measurement_status' THEN (p_payload->>'measurement_status')::"public"."progress_measurement_status" ELSE v_existing.measurement_status END;

    SELECT COALESCE(sum(actual_quantity), 0), max(planned_quantity) FILTER (WHERE planned_quantity > 0)
      INTO v_total, v_planned FROM "public"."progress" WHERE activity_id = v_existing.activity_id;
    IF v_planned IS NOT NULL AND ((v_total - v_existing.actual_quantity + v_new_actual) / v_planned) * 100 > 100 THEN
        RAISE EXCEPTION 'A27_PROGRESS_CUMULATIVE_EXCEEDS_100' USING ERRCODE = '23514';
    END IF;

    v_complete := v_new_status = 'Approved' AND v_new_percentage = 100;
    IF v_complete AND v_activity.status <> 'In Progress' THEN
        RAISE EXCEPTION 'A27_ACTIVITY_COMPLETION_TRANSITION_INVALID' USING ERRCODE = '23514';
    END IF;

    UPDATE "public"."progress"
       SET actual_quantity = v_new_actual,
           progress_percentage = v_new_percentage,
           measurement_status = v_new_status,
           verified_by = CASE WHEN v_new_status = 'Verified' THEN p_actor_id ELSE verified_by END,
           verified_at = CASE WHEN v_new_status = 'Verified' THEN now() ELSE verified_at END,
           approved_by = CASE WHEN v_new_status = 'Approved' THEN p_actor_id ELSE approved_by END,
           approved_at = CASE WHEN v_new_status = 'Approved' THEN now() ELSE approved_at END,
           updated_at = now()
     WHERE progress_id = p_progress_id
    RETURNING * INTO v_row;

    IF v_complete THEN
        UPDATE "public"."activity" SET status = 'Completed', completed_date = CURRENT_DATE, updated_at = now()
         WHERE activity_id = v_row.activity_id RETURNING * INTO v_activity;
        INSERT INTO "public"."activity_logs" (log_id, activity_id, event_type, snapshot_data, logged_by, logged_at)
        VALUES (p_activity_log_id, v_activity.activity_id, 'UPDATE', to_jsonb(v_activity), p_actor_id, now());
    END IF;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id, event_type, event_timestamp, performed_by
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'Progress', v_row.progress_id, 'Update', now(), p_actor_id
    );

    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."a27_create_progress_atomic"(
    p_payload jsonb,
    p_actor_id uuid,
    p_progress_id uuid,
    p_audit_id uuid,
    p_activity_log_id uuid
)
RETURNS "public"."progress"
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_create_progress_atomic"($1, $2, $3, $4, $5);
$$;

CREATE OR REPLACE FUNCTION "public"."a27_update_progress_atomic"(
    p_progress_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_audit_id uuid,
    p_activity_log_id uuid
)
RETURNS "public"."progress"
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT "private"."a27_update_progress_atomic"($1, $2, $3, $4, $5);
$$;

REVOKE ALL ON FUNCTION "private"."a27_create_progress_atomic"(jsonb, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_create_progress_atomic"(jsonb, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_create_progress_atomic"(jsonb, uuid, uuid, uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION "private"."a27_update_progress_atomic"(uuid, jsonb, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_update_progress_atomic"(uuid, jsonb, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_progress_atomic"(uuid, jsonb, uuid, uuid, uuid) TO authenticated;
