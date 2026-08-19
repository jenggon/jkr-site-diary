-- Migration: F2.4-P03 Capability Authority Guard

-- 1. Create Capability Assertion Primitive
CREATE OR REPLACE FUNCTION "private"."assert_capability"(
    p_actor_id uuid,
    p_programme_id uuid,
    p_permission_code character varying(100)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_authorized boolean;
BEGIN
    -- 1. Actor must bind to auth.uid()
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    -- 2. Check capability
    SELECT EXISTS (
        SELECT 1
        FROM "public"."user_profile" up
        JOIN "public"."programme_membership" pm ON up.user_id = pm.user_id
        JOIN "public"."role" r ON pm.role_id = r.role_id
        JOIN "public"."role_permission" rp ON r.role_id = rp.role_id
        JOIN "public"."permission" p ON rp.permission_id = p.permission_id
        WHERE up.user_id = p_actor_id
          AND up.is_active = true
          AND pm.programme_id = p_programme_id
          AND pm.is_active = true
          AND r.is_active = true
          AND r.scope = 'Programme'
          AND p.permission_code = p_permission_code
          AND p.is_active = true
    ) INTO v_authorized;

    IF NOT v_authorized THEN
        RAISE EXCEPTION 'F24_UNAUTHORIZED_CAPABILITY' USING ERRCODE = 'PT403';
    END IF;
END;
$$;

-- 2. Update Create Approval
CREATE OR REPLACE FUNCTION "private"."a27_create_approval_atomic"(
    "p_payload" jsonb, "p_actor_id" uuid, "p_approval_id" uuid, "p_audit_id" uuid, "p_expected_sd_last_modified_at" timestamptz
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
    v_sd_token timestamptz;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    
    -- Capability Authority for Site Diary
    IF v_site_diary_id IS NOT NULL THEN
        PERFORM "private"."assert_capability"(p_actor_id, v_programme_id, 'SITE_DIARY_APPROVAL_REQUEST');
    END IF;

    PERFORM "private"."a27_assert_revision_operational"(v_programme_id, v_revision_id);
    PERFORM "private"."a27_assert_activity_context"(v_programme_id, v_revision_id, v_activity_id);

    IF v_site_diary_id IS NOT NULL THEN
        -- Site Diary Token Handshake Check
        IF p_expected_sd_last_modified_at IS NULL THEN
            RAISE EXCEPTION 'F24_EXPECTED_LAST_MODIFIED_REQUIRED' USING ERRCODE = '22007';
        END IF;

        -- Lock Site Diary First
        SELECT coalesce(updated_at, submitted_at) INTO v_sd_token 
        FROM "public"."site_diary" 
        WHERE site_diary_id = v_site_diary_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE = 'P0001';
        END IF;

        IF v_sd_token IS DISTINCT FROM p_expected_sd_last_modified_at THEN
            RAISE EXCEPTION 'F24_SITE_DIARY_STALE' USING ERRCODE = 'PT409';
        END IF;

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

-- 3. Update Update Approval
CREATE OR REPLACE FUNCTION "private"."a27_update_approval_atomic"(
    "p_approval_id" uuid, "p_payload" jsonb, "p_actor_id" uuid, "p_audit_id" uuid, "p_expected_sd_last_modified_at" timestamptz
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
    v_disc_sd_id uuid;
    v_disc_prog_id uuid;
    v_disc_rev_id uuid;
    v_disc_act_id uuid;
    v_sd_token timestamptz;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    
    -- Unlocked discovery read to determine parent
    SELECT site_diary_id, programme_id, revision_id, activity_id 
    INTO v_disc_sd_id, v_disc_prog_id, v_disc_rev_id, v_disc_act_id 
    FROM "public"."approval" WHERE approval_id = p_approval_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'A27_APPROVAL_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    -- Capability Authority
    -- Attempt to cast target status, will fail early if invalid string
    v_target := (p_payload->>'approval_status')::"public"."approval_status_type";
    IF v_disc_sd_id IS NOT NULL THEN
        IF v_target = 'Approved' THEN
            PERFORM "private"."assert_capability"(p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_APPROVE');
        ELSIF v_target = 'Returned' THEN
            PERFORM "private"."assert_capability"(p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_RETURN');
        ELSIF v_target = 'Rejected' THEN
            PERFORM "private"."assert_capability"(p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_REJECT');
        ELSIF v_target = 'Cancelled' THEN
            PERFORM "private"."assert_capability"(p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_CANCEL');
        ELSE
            RAISE EXCEPTION 'A27_APPROVAL_TARGET_INVALID' USING ERRCODE = '23514';
        END IF;
    ELSE
        IF v_target NOT IN ('Approved', 'Rejected', 'Returned', 'Cancelled') THEN
            RAISE EXCEPTION 'A27_APPROVAL_TARGET_INVALID' USING ERRCODE = '23514';
        END IF;
    END IF;

    -- Canonical Lock Order: Site Diary -> Approval
    IF v_disc_sd_id IS NOT NULL THEN
        IF p_expected_sd_last_modified_at IS NULL THEN
            RAISE EXCEPTION 'F24_EXPECTED_LAST_MODIFIED_REQUIRED' USING ERRCODE = '22007';
        END IF;

        -- Lock Site Diary first
        SELECT coalesce(updated_at, submitted_at) INTO v_sd_token 
        FROM "public"."site_diary" 
        WHERE site_diary_id = v_disc_sd_id FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE = 'P0001';
        END IF;

        IF v_sd_token IS DISTINCT FROM p_expected_sd_last_modified_at THEN
            RAISE EXCEPTION 'F24_SITE_DIARY_STALE' USING ERRCODE = 'PT409';
        END IF;
    END IF;

    -- Lock Approval second
    SELECT * INTO STRICT v_old FROM "public"."approval"
     WHERE approval_id = p_approval_id FOR UPDATE;

    -- Post-lock revalidation
    IF v_old.site_diary_id IS DISTINCT FROM v_disc_sd_id OR 
       v_old.programme_id IS DISTINCT FROM v_disc_prog_id OR 
       v_old.revision_id IS DISTINCT FROM v_disc_rev_id OR 
       v_old.activity_id IS DISTINCT FROM v_disc_act_id THEN 
        RAISE EXCEPTION 'F24_APPROVAL_CONTEXT_CHANGED' USING ERRCODE = 'PT409'; 
    END IF;

    IF v_old.site_diary_id IS NOT NULL AND p_expected_sd_last_modified_at IS NULL THEN
        RAISE EXCEPTION 'F24_EXPECTED_LAST_MODIFIED_REQUIRED' USING ERRCODE = '22007';
    END IF;

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
