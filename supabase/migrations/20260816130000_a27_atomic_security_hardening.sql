-- A27 Option 2 Step 4: close direct mutation and make the Approval/Progress
-- RPC boundary independently enforce the sealed invariants.

-- Canonical operational writes are available only through governed functions.
DO $revoke_mutation$
DECLARE
    v_table text;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'programme', 'programme_revision', 'task', 'activity', 'site_diary',
        'progress', 'workforce', 'approval', 'audit', 'activity_logs',
        'site_diary_logs'
    ] LOOP
        IF to_regclass('public.' || v_table) IS NOT NULL THEN
            EXECUTE format(
                'REVOKE INSERT, UPDATE, DELETE ON TABLE public.%I FROM PUBLIC, anon, authenticated',
                v_table
            );
        END IF;
    END LOOP;
END;
$revoke_mutation$;

-- Remove every previous A27 privilege before rebuilding exact boundaries.
REVOKE USAGE ON SCHEMA "private" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "private" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_create_approval_atomic"(jsonb,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_update_approval_atomic"(uuid,jsonb,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_create_progress_atomic"(jsonb,uuid,uuid,uuid,boolean,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_update_progress_atomic"(uuid,jsonb,uuid,uuid,boolean,uuid) FROM PUBLIC, anon, authenticated;

DROP FUNCTION "public"."a27_create_progress_atomic"(jsonb,uuid,uuid,uuid,boolean,uuid);
DROP FUNCTION "public"."a27_update_progress_atomic"(uuid,jsonb,uuid,uuid,boolean,uuid);
DROP FUNCTION "private"."a27_create_progress_atomic"(jsonb,uuid,uuid,uuid,boolean,uuid);
DROP FUNCTION "private"."a27_update_progress_atomic"(uuid,jsonb,uuid,uuid,boolean,uuid);

CREATE OR REPLACE FUNCTION "private"."a27_assert_actor"("p_actor_id" uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_actor_id THEN
        RAISE EXCEPTION 'A27_AUTH_ACTOR_MISMATCH' USING ERRCODE = '42501';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_assert_revision_operational"(
    "p_programme_id" uuid, "p_revision_id" uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status "public"."programme_lifecycle_status";
    v_current_revision_id uuid;
BEGIN
    SELECT pr.status, p.current_revision_id
      INTO v_status, v_current_revision_id
      FROM "public"."programme_revision" pr
      JOIN "public"."programme" p ON p.programme_id = pr.programme_id
     WHERE pr.revision_id = p_revision_id
       AND pr.programme_id = p_programme_id;

    IF NOT FOUND OR v_status <> 'Approved' OR v_current_revision_id <> p_revision_id THEN
        RAISE EXCEPTION 'A27_REVISION_NOT_OPERATIONAL' USING ERRCODE = '23514';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_assert_activity_context"(
    "p_programme_id" uuid, "p_revision_id" uuid, "p_activity_id" uuid
) RETURNS "public"."activity"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_activity "public"."activity";
BEGIN
    SELECT * INTO v_activity
      FROM "public"."activity"
     WHERE activity_id = p_activity_id
       AND programme_id = p_programme_id
       AND revision_id = p_revision_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'A27_ACTIVITY_CONTEXT_MISMATCH' USING ERRCODE = '23514';
    END IF;
    RETURN v_activity;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_assert_linked_context"(
    "p_programme_id" uuid, "p_revision_id" uuid, "p_activity_id" uuid,
    "p_site_diary_id" uuid, "p_progress_id" uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM "public"."site_diary"
         WHERE site_diary_id = p_site_diary_id
           AND programme_id = p_programme_id
           AND revision_id = p_revision_id
           AND activity_id = p_activity_id
    ) THEN
        RAISE EXCEPTION 'A27_SITE_DIARY_CONTEXT_MISMATCH' USING ERRCODE = '23514';
    END IF;

    IF p_progress_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "public"."progress"
         WHERE progress_id = p_progress_id
           AND programme_id = p_programme_id
           AND revision_id = p_revision_id
           AND activity_id = p_activity_id
           AND site_diary_id = p_site_diary_id
    ) THEN
        RAISE EXCEPTION 'A27_PROGRESS_CONTEXT_MISMATCH' USING ERRCODE = '23514';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_create_approval_atomic"(
    "p_payload" jsonb, "p_actor_id" uuid, "p_approval_id" uuid, "p_audit_id" uuid
) RETURNS "public"."approval"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_row "public"."approval";
    v_programme_id uuid := (p_payload->>'programme_id')::uuid;
    v_revision_id uuid := (p_payload->>'revision_id')::uuid;
    v_activity_id uuid := (p_payload->>'activity_id')::uuid;
    v_site_diary_id uuid := NULLIF(p_payload->>'site_diary_id', '')::uuid;
    v_progress_id uuid := NULLIF(p_payload->>'progress_id', '')::uuid;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    PERFORM "private"."a27_assert_revision_operational"(v_programme_id, v_revision_id);
    PERFORM "private"."a27_assert_activity_context"(v_programme_id, v_revision_id, v_activity_id);

    IF v_site_diary_id IS NOT NULL THEN
        PERFORM "private"."a27_assert_linked_context"(
            v_programme_id, v_revision_id, v_activity_id, v_site_diary_id, v_progress_id
        );
    ELSIF v_progress_id IS NOT NULL THEN
        RAISE EXCEPTION 'A27_PROGRESS_REQUIRES_SITE_DIARY' USING ERRCODE = '23514';
    END IF;

    INSERT INTO "public"."approval" (
        approval_id, programme_id, revision_id, activity_id, site_diary_id, progress_id,
        approval_level, approval_status, approval_date, approval_comment, approved_by,
        requested_by, requested_at, created_at, updated_at
    ) VALUES (
        p_approval_id, v_programme_id, v_revision_id, v_activity_id, v_site_diary_id,
        v_progress_id, COALESCE((p_payload->>'approval_level')::integer, 1),
        'Pending'::"public"."approval_status_type", NULL,
        NULLIF(p_payload->>'approval_comment', ''), NULL, p_actor_id, now(), now(), NULL
    ) RETURNING * INTO v_row;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id, event_type,
        event_timestamp, performed_by, user_role, field_name, old_value, new_value, change_reason
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'APPROVAL', v_row.approval_id,
        'Create'::"public"."audit_event_type", now(), p_actor_id, 'submitter',
        'approval_status', NULL, 'Pending', COALESCE(v_row.approval_comment, 'Approval Request Created')
    );
    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_update_approval_atomic"(
    "p_approval_id" uuid, "p_payload" jsonb, "p_actor_id" uuid, "p_audit_id" uuid
) RETURNS "public"."approval"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_old "public"."approval";
    v_row "public"."approval";
    v_target "public"."approval_status_type";
    v_event "public"."audit_event_type";
    v_comment text := NULLIF(btrim(p_payload->>'approval_comment'), '');
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    SELECT * INTO STRICT v_old FROM "public"."approval"
     WHERE approval_id = p_approval_id FOR UPDATE;

    PERFORM "private"."a27_assert_revision_operational"(v_old.programme_id, v_old.revision_id);
    PERFORM "private"."a27_assert_activity_context"(
        v_old.programme_id, v_old.revision_id, v_old.activity_id
    );
    IF v_old.site_diary_id IS NOT NULL THEN
        PERFORM "private"."a27_assert_linked_context"(
            v_old.programme_id, v_old.revision_id, v_old.activity_id,
            v_old.site_diary_id, v_old.progress_id
        );
    END IF;

    IF v_old.approval_status IN ('Approved', 'Rejected', 'Cancelled') THEN
        RAISE EXCEPTION 'A27_APPROVAL_TERMINAL_STATE' USING ERRCODE = '23514';
    END IF;

    v_target := (p_payload->>'approval_status')::"public"."approval_status_type";
    IF v_target NOT IN ('Approved', 'Rejected', 'Returned', 'Cancelled') THEN
        RAISE EXCEPTION 'A27_APPROVAL_TARGET_INVALID' USING ERRCODE = '23514';
    END IF;
    IF v_target IN ('Rejected', 'Returned') AND v_comment IS NULL THEN
        RAISE EXCEPTION 'A27_APPROVAL_COMMENT_REQUIRED' USING ERRCODE = '23514';
    END IF;

    UPDATE "public"."approval" SET
        approval_status = v_target,
        approved_by = p_actor_id,
        approval_date = CASE WHEN v_target = 'Approved' THEN now() ELSE approval_date END,
        approval_comment = CASE WHEN p_payload ? 'approval_comment' THEN v_comment ELSE approval_comment END,
        updated_at = now()
    WHERE approval_id = p_approval_id RETURNING * INTO v_row;

    v_event := CASE v_target
        WHEN 'Approved' THEN 'Approve'::"public"."audit_event_type"
        WHEN 'Rejected' THEN 'Reject'::"public"."audit_event_type"
        ELSE 'Update'::"public"."audit_event_type" END;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id, event_type,
        event_timestamp, performed_by, user_role, field_name, old_value, new_value, change_reason
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'APPROVAL', v_row.approval_id,
        v_event, now(), p_actor_id, 'approver', 'approval_status', v_old.approval_status::text,
        v_row.approval_status::text,
        COALESCE(v_row.approval_comment, 'Approval status updated to ' || v_row.approval_status::text)
    );
    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_create_progress_atomic"(
    "p_payload" jsonb, "p_actor_id" uuid, "p_progress_id" uuid, "p_audit_id" uuid,
    "p_activity_log_id" uuid
) RETURNS "public"."progress"
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
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    PERFORM "private"."a27_assert_revision_operational"(v_programme_id, v_revision_id);
    v_activity := "private"."a27_assert_activity_context"(
        v_programme_id, v_revision_id, v_activity_id
    );
    PERFORM "private"."a27_assert_linked_context"(
        v_programme_id, v_revision_id, v_activity_id, v_site_diary_id, NULL
    );
    SELECT * INTO v_activity FROM "public"."activity"
     WHERE activity_id = v_activity_id FOR UPDATE;

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
        INSERT INTO "public"."activity_logs" (
            log_id, activity_id, event_type, snapshot_data, logged_by, logged_at
        ) VALUES (
            p_activity_log_id, v_activity.activity_id, 'UPDATE', to_jsonb(v_activity), p_actor_id, now()
        );
    END IF;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id,
        event_type, event_timestamp, performed_by
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'Progress', v_row.progress_id,
        'Create', now(), p_actor_id
    );
    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_update_progress_atomic"(
    "p_progress_id" uuid, "p_payload" jsonb, "p_actor_id" uuid, "p_audit_id" uuid,
    "p_activity_log_id" uuid
) RETURNS "public"."progress"
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
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    SELECT * INTO STRICT v_existing FROM "public"."progress"
     WHERE progress_id = p_progress_id FOR UPDATE;
    PERFORM "private"."a27_assert_revision_operational"(
        v_existing.programme_id, v_existing.revision_id
    );
    v_activity := "private"."a27_assert_activity_context"(
        v_existing.programme_id, v_existing.revision_id, v_existing.activity_id
    );
    PERFORM "private"."a27_assert_linked_context"(
        v_existing.programme_id, v_existing.revision_id, v_existing.activity_id,
        v_existing.site_diary_id, NULL
    );
    SELECT * INTO v_activity FROM "public"."activity"
     WHERE activity_id = v_existing.activity_id FOR UPDATE;

    v_new_actual := CASE WHEN p_payload ? 'actual_quantity'
        THEN (p_payload->>'actual_quantity')::numeric ELSE v_existing.actual_quantity END;
    v_new_percentage := CASE WHEN p_payload ? 'progress_percentage'
        THEN (p_payload->>'progress_percentage')::numeric ELSE v_existing.progress_percentage END;
    v_new_status := CASE WHEN p_payload ? 'measurement_status'
        THEN (p_payload->>'measurement_status')::"public"."progress_measurement_status"
        ELSE v_existing.measurement_status END;

    SELECT COALESCE(sum(actual_quantity), 0), max(planned_quantity) FILTER (WHERE planned_quantity > 0)
      INTO v_total, v_planned FROM "public"."progress"
     WHERE activity_id = v_existing.activity_id;
    IF v_planned IS NOT NULL
       AND ((v_total - v_existing.actual_quantity + v_new_actual) / v_planned) * 100 > 100 THEN
        RAISE EXCEPTION 'A27_PROGRESS_CUMULATIVE_EXCEEDS_100' USING ERRCODE = '23514';
    END IF;

    v_complete := v_new_status = 'Approved' AND v_new_percentage = 100;
    IF v_complete AND v_activity.status <> 'In Progress' THEN
        RAISE EXCEPTION 'A27_ACTIVITY_COMPLETION_TRANSITION_INVALID' USING ERRCODE = '23514';
    END IF;

    UPDATE "public"."progress" SET
        actual_quantity = v_new_actual,
        progress_percentage = v_new_percentage,
        measurement_status = v_new_status,
        verified_by = CASE WHEN v_new_status = 'Verified' THEN p_actor_id ELSE verified_by END,
        verified_at = CASE WHEN v_new_status = 'Verified' THEN now() ELSE verified_at END,
        approved_by = CASE WHEN v_new_status = 'Approved' THEN p_actor_id ELSE approved_by END,
        approved_at = CASE WHEN v_new_status = 'Approved' THEN now() ELSE approved_at END,
        updated_at = now()
    WHERE progress_id = p_progress_id RETURNING * INTO v_row;

    IF v_complete THEN
        UPDATE "public"."activity" SET status = 'Completed', completed_date = CURRENT_DATE, updated_at = now()
         WHERE activity_id = v_row.activity_id RETURNING * INTO v_activity;
        INSERT INTO "public"."activity_logs" (
            log_id, activity_id, event_type, snapshot_data, logged_by, logged_at
        ) VALUES (
            p_activity_log_id, v_activity.activity_id, 'UPDATE', to_jsonb(v_activity), p_actor_id, now()
        );
    END IF;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id,
        event_type, event_timestamp, performed_by
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'Progress', v_row.progress_id,
        'Update', now(), p_actor_id
    );
    RETURN v_row;
END;
$$;

-- Public functions are the only callable boundary. SECURITY DEFINER is required
-- solely to write tables whose direct Data API mutation privileges are revoked.
CREATE OR REPLACE FUNCTION "public"."a27_create_approval_atomic"(
    p_payload jsonb, p_actor_id uuid, p_approval_id uuid, p_audit_id uuid
) RETURNS "public"."approval"
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ SELECT "private"."a27_create_approval_atomic"($1,$2,$3,$4) $$;

CREATE OR REPLACE FUNCTION "public"."a27_update_approval_atomic"(
    p_approval_id uuid, p_payload jsonb, p_actor_id uuid, p_audit_id uuid
) RETURNS "public"."approval"
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ SELECT "private"."a27_update_approval_atomic"($1,$2,$3,$4) $$;

CREATE FUNCTION "public"."a27_create_progress_atomic"(
    p_payload jsonb, p_actor_id uuid, p_progress_id uuid, p_audit_id uuid, p_activity_log_id uuid
) RETURNS "public"."progress"
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ SELECT "private"."a27_create_progress_atomic"($1,$2,$3,$4,$5) $$;

CREATE FUNCTION "public"."a27_update_progress_atomic"(
    p_progress_id uuid, p_payload jsonb, p_actor_id uuid, p_audit_id uuid, p_activity_log_id uuid
) RETURNS "public"."progress"
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ SELECT "private"."a27_update_progress_atomic"($1,$2,$3,$4,$5) $$;

-- Exact privileges only. Authenticated clients can call the invariant-enforcing
-- public functions, never the private persistence helpers.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "private" FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA "private" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."a27_create_approval_atomic"(jsonb,uuid,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."a27_update_approval_atomic"(uuid,jsonb,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."a27_create_progress_atomic"(jsonb,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."a27_update_progress_atomic"(uuid,jsonb,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."a27_create_approval_atomic"(jsonb,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_approval_atomic"(uuid,jsonb,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_create_progress_atomic"(jsonb,uuid,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_progress_atomic"(uuid,jsonb,uuid,uuid,uuid) TO authenticated;
