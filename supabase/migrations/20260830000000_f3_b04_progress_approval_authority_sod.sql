-- Migration: 20260830000000_f3_b04_progress_approval_authority_sod.sql
-- Description: F3-B04 Progress vertical authority and Approval separation of duty
--
-- Effective-definition precedence:
--   * Progress cores supersede F3-B02 (20260829220000).
--   * Approval update core supersedes F2.4-B02 (20260819120000).
--
-- Public RPC signatures remain unchanged. B03's fail-closed direct read posture
-- for public.progress and public.approval is intentionally untouched.

-- ============================================================
-- 1. Progress create: PROGRESS_EDIT creates Draft only
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
    v_percentage numeric := NULLIF(p_payload->>'progress_percentage', '')::numeric;
BEGIN
    -- Bind the supplied actor before touching protected state.
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    -- Derive the canonical Programme/Revision from the locked Activity row.
    SELECT * INTO STRICT v_activity
      FROM "public"."activity"
     WHERE activity_id = v_activity_id
     FOR UPDATE;

    IF v_activity.programme_id IS DISTINCT FROM v_programme_id
       OR v_activity.revision_id IS DISTINCT FROM v_revision_id THEN
        RAISE EXCEPTION 'A27_ACTIVITY_CONTEXT_MISMATCH' USING ERRCODE = '23514';
    END IF;

    PERFORM "private"."assert_authority"(
        p_actor_id, v_activity.programme_id, 'PROGRESS_EDIT'
    );
    PERFORM "private"."a27_assert_revision_operational"(
        v_activity.programme_id, v_activity.revision_id
    );
    PERFORM "private"."a27_assert_linked_context"(
        v_activity.programme_id, v_activity.revision_id, v_activity.activity_id,
        v_site_diary_id, NULL
    );

    -- Creation is an entry/edit operation, never a verification or approval path.
    IF p_payload ? 'measurement_status'
       AND COALESCE(NULLIF(btrim(p_payload->>'measurement_status'), ''), 'Draft') <> 'Draft' THEN
        RAISE EXCEPTION 'F3_PROGRESS_CREATE_STATUS_INVALID' USING ERRCODE = '23514';
    END IF;

    SELECT COALESCE(sum(actual_quantity), 0),
           max(planned_quantity) FILTER (WHERE planned_quantity > 0)
      INTO v_total, v_planned
      FROM "public"."progress"
     WHERE activity_id = v_activity.activity_id;

    IF v_planned IS NOT NULL AND ((v_total + v_actual) / v_planned) * 100 > 100 THEN
        RAISE EXCEPTION 'A27_PROGRESS_CUMULATIVE_EXCEEDS_100' USING ERRCODE = '23514';
    END IF;

    INSERT INTO "public"."progress" (
        progress_id, programme_id, revision_id, activity_id, site_diary_id,
        measurement_date, progress_type, planned_quantity, actual_quantity, unit,
        progress_percentage, measurement_status, verified_by, verified_at,
        approved_by, approved_at, created_at, updated_at
    ) VALUES (
        p_progress_id, v_activity.programme_id, v_activity.revision_id,
        v_activity.activity_id, v_site_diary_id,
        (p_payload->>'measurement_date')::date,
        NULLIF(p_payload->>'progress_type', '')::"public"."progress_measurement_type",
        NULLIF(p_payload->>'planned_quantity', '')::numeric,
        v_actual, NULLIF(p_payload->>'unit', ''), v_percentage,
        'Draft'::"public"."progress_measurement_status",
        NULL, NULL, NULL, NULL, now(), NULL
    )
    RETURNING * INTO v_row;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id,
        event_type, event_timestamp, performed_by
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'Progress',
        v_row.progress_id, 'Create', now(), p_actor_id
    );

    RETURN v_row;
END;
$$;

-- ============================================================
-- 2. Progress update: exact lifecycle and vertical authority
-- ============================================================

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
    v_has_edit_patch boolean;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    -- Stored Progress is the authority source; caller Programme input is ignored.
    SELECT * INTO STRICT v_existing
      FROM "public"."progress"
     WHERE progress_id = p_progress_id
     FOR UPDATE;

    v_new_actual := CASE
        WHEN p_payload ? 'actual_quantity'
            THEN (p_payload->>'actual_quantity')::numeric
        ELSE v_existing.actual_quantity
    END;
    v_new_percentage := CASE
        WHEN p_payload ? 'progress_percentage'
            THEN (p_payload->>'progress_percentage')::numeric
        ELSE v_existing.progress_percentage
    END;
    v_new_status := CASE
        WHEN p_payload ? 'measurement_status'
            THEN (p_payload->>'measurement_status')::"public"."progress_measurement_status"
        ELSE v_existing.measurement_status
    END;
    v_has_edit_patch := p_payload ? 'actual_quantity'
        OR p_payload ? 'progress_percentage';

    -- Ordinary edits are allowed only while the row remains Draft.
    IF v_existing.measurement_status = 'Draft' AND v_new_status = 'Draft' THEN
        PERFORM "private"."assert_authority"(
            p_actor_id, v_existing.programme_id, 'PROGRESS_EDIT'
        );

    -- Verification is one exact transition. Bundled field edits require both
    -- edit and verify authority; PROGRESS_VERIFY is not an edit substitute.
    ELSIF v_existing.measurement_status = 'Draft' AND v_new_status = 'Verified' THEN
        IF v_has_edit_patch THEN
            PERFORM "private"."assert_authority"(
                p_actor_id, v_existing.programme_id, 'PROGRESS_EDIT'
            );
        END IF;
        PERFORM "private"."assert_authority"(
            p_actor_id, v_existing.programme_id, 'PROGRESS_VERIFY'
        );

    -- Approval is one exact transition and cannot carry an ordinary edit.
    ELSIF v_existing.measurement_status = 'Verified' AND v_new_status = 'Approved' THEN
        IF v_has_edit_patch THEN
            RAISE EXCEPTION 'F3_PROGRESS_NOT_EDITABLE' USING ERRCODE = 'PT409';
        END IF;
        PERFORM "private"."assert_authority"(
            p_actor_id, v_existing.programme_id, 'PROGRESS_APPROVE'
        );

    ELSE
        RAISE EXCEPTION 'F3_PROGRESS_TRANSITION_INVALID' USING ERRCODE = 'PT409';
    END IF;

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

    SELECT * INTO STRICT v_activity
      FROM "public"."activity"
     WHERE activity_id = v_existing.activity_id
       AND programme_id = v_existing.programme_id
       AND revision_id = v_existing.revision_id
     FOR UPDATE;

    SELECT COALESCE(sum(actual_quantity), 0),
           max(planned_quantity) FILTER (WHERE planned_quantity > 0)
      INTO v_total, v_planned
      FROM "public"."progress"
     WHERE activity_id = v_existing.activity_id;

    IF v_planned IS NOT NULL
       AND ((v_total - v_existing.actual_quantity + v_new_actual) / v_planned) * 100 > 100 THEN
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
           verified_by = CASE
               WHEN v_existing.measurement_status = 'Draft' AND v_new_status = 'Verified'
                   THEN p_actor_id
               ELSE v_existing.verified_by
           END,
           verified_at = CASE
               WHEN v_existing.measurement_status = 'Draft' AND v_new_status = 'Verified'
                   THEN now()
               ELSE v_existing.verified_at
           END,
           approved_by = CASE
               WHEN v_existing.measurement_status = 'Verified' AND v_new_status = 'Approved'
                   THEN p_actor_id
               ELSE v_existing.approved_by
           END,
           approved_at = CASE
               WHEN v_existing.measurement_status = 'Verified' AND v_new_status = 'Approved'
                   THEN now()
               ELSE v_existing.approved_at
           END,
           updated_at = now()
     WHERE progress_id = p_progress_id
    RETURNING * INTO v_row;

    -- Approval and its Activity completion/history side effect remain one
    -- SECURITY DEFINER transaction. Any failure rolls back the whole mutation.
    IF v_complete THEN
        UPDATE "public"."activity"
           SET status = 'Completed', completed_date = CURRENT_DATE, updated_at = now()
         WHERE activity_id = v_row.activity_id
        RETURNING * INTO v_activity;

        INSERT INTO "public"."activity_logs" (
            log_id, activity_id, event_type, snapshot_data, logged_by, logged_at
        ) VALUES (
            p_activity_log_id, v_activity.activity_id, 'UPDATE',
            to_jsonb(v_activity), p_actor_id, now()
        );
    END IF;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id,
        event_type, event_timestamp, performed_by
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'Progress',
        v_row.progress_id, 'Update', now(), p_actor_id
    );

    RETURN v_row;
END;
$$;

-- ============================================================
-- 3. Approval decisions: capability plus separation of duty
-- ============================================================

CREATE OR REPLACE FUNCTION "private"."a27_update_approval_atomic"(
    p_approval_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_audit_id uuid,
    p_expected_sd_last_modified_at timestamptz
)
RETURNS "public"."approval"
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
    v_is_resubmit boolean;
    v_constraint_name text;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    SELECT site_diary_id, programme_id, revision_id, activity_id
      INTO v_disc_sd_id, v_disc_prog_id, v_disc_rev_id, v_disc_act_id
      FROM "public"."approval"
     WHERE approval_id = p_approval_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'A27_APPROVAL_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    v_target := (p_payload->>'approval_status')::"public"."approval_status_type";

    -- Preserve the existing F2.4 operation-specific capability matrix.
    IF v_disc_sd_id IS NOT NULL THEN
        IF v_target = 'Pending' THEN
            PERFORM "private"."assert_capability"(
                p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_REQUEST'
            );
        ELSIF v_target = 'Approved' THEN
            PERFORM "private"."assert_capability"(
                p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_APPROVE'
            );
        ELSIF v_target = 'Returned' THEN
            PERFORM "private"."assert_capability"(
                p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_RETURN'
            );
        ELSIF v_target = 'Rejected' THEN
            PERFORM "private"."assert_capability"(
                p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_REJECT'
            );
        ELSIF v_target = 'Cancelled' THEN
            PERFORM "private"."assert_capability"(
                p_actor_id, v_disc_prog_id, 'SITE_DIARY_APPROVAL_CANCEL'
            );
        ELSE
            RAISE EXCEPTION 'A27_APPROVAL_TARGET_INVALID' USING ERRCODE = '23514';
        END IF;
    ELSE
        IF v_target NOT IN ('Approved', 'Rejected', 'Returned', 'Cancelled') THEN
            RAISE EXCEPTION 'A27_APPROVAL_TARGET_INVALID' USING ERRCODE = '23514';
        END IF;
    END IF;

    -- Preserve canonical lock order: Site Diary, then Approval.
    IF v_disc_sd_id IS NOT NULL THEN
        IF p_expected_sd_last_modified_at IS NULL THEN
            RAISE EXCEPTION 'F24_EXPECTED_LAST_MODIFIED_REQUIRED' USING ERRCODE = '22007';
        END IF;

        SELECT coalesce(updated_at, submitted_at)
          INTO v_sd_token
          FROM "public"."site_diary"
         WHERE site_diary_id = v_disc_sd_id
         FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE = 'P0001';
        END IF;
        IF v_sd_token IS DISTINCT FROM p_expected_sd_last_modified_at THEN
            RAISE EXCEPTION 'F24_SITE_DIARY_STALE' USING ERRCODE = 'PT409';
        END IF;
    END IF;

    SELECT * INTO STRICT v_old
      FROM "public"."approval"
     WHERE approval_id = p_approval_id
     FOR UPDATE;

    IF v_old.site_diary_id IS DISTINCT FROM v_disc_sd_id
       OR v_old.programme_id IS DISTINCT FROM v_disc_prog_id
       OR v_old.revision_id IS DISTINCT FROM v_disc_rev_id
       OR v_old.activity_id IS DISTINCT FROM v_disc_act_id THEN
        RAISE EXCEPTION 'F24_APPROVAL_CONTEXT_CHANGED' USING ERRCODE = 'PT409';
    END IF;

    PERFORM "private"."a27_assert_revision_operational"(
        v_old.programme_id, v_old.revision_id
    );
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
        RAISE EXCEPTION 'A27_APPROVAL_TERMINAL_STATE' USING ERRCODE = 'PT409';
    END IF;

    IF v_old.site_diary_id IS NOT NULL THEN
        IF NOT (
            (v_old.approval_status = 'Pending'
             AND v_target IN ('Approved', 'Returned', 'Rejected', 'Cancelled'))
            OR (v_old.approval_status = 'Returned' AND v_target = 'Pending')
        ) THEN
            RAISE EXCEPTION 'F24_APPROVAL_TRANSITION_INVALID' USING ERRCODE = 'PT409';
        END IF;

        -- Decision/review authority never permits deciding one's own request.
        -- Cancellation and requester resubmission remain governed by their
        -- existing requester-owned capability semantics.
        IF v_target IN ('Approved', 'Rejected', 'Returned')
           AND p_actor_id = v_old.requested_by THEN
            RAISE EXCEPTION 'F3_APPROVAL_SELF_DECISION_DENIED' USING ERRCODE = 'PT403';
        END IF;
    END IF;

    IF v_target IN ('Rejected', 'Returned') AND v_comment IS NULL THEN
        RAISE EXCEPTION 'A27_APPROVAL_COMMENT_REQUIRED' USING ERRCODE = '23514';
    END IF;

    v_is_resubmit := v_old.site_diary_id IS NOT NULL
        AND v_old.approval_status = 'Returned'
        AND v_target = 'Pending';

    IF v_is_resubmit AND EXISTS (
        SELECT 1
          FROM "public"."approval"
         WHERE site_diary_id = v_old.site_diary_id
           AND approval_status = 'Approved'
           AND approval_id <> p_approval_id
    ) THEN
        RAISE EXCEPTION 'F24_APPROVED_APPROVAL_EXISTS' USING ERRCODE = 'PT409';
    END IF;

    BEGIN
        UPDATE "public"."approval"
           SET approval_status = v_target,
               approved_by = CASE WHEN v_is_resubmit THEN NULL ELSE p_actor_id END,
               approval_date = CASE
                   WHEN v_is_resubmit THEN NULL
                   WHEN v_target = 'Approved' THEN now()
                   ELSE approval_date
               END,
               approval_comment = CASE
                   WHEN p_payload ? 'approval_comment' THEN v_comment
                   ELSE approval_comment
               END,
               requested_by = CASE WHEN v_is_resubmit THEN p_actor_id ELSE requested_by END,
               requested_at = CASE WHEN v_is_resubmit THEN now() ELSE requested_at END,
               updated_at = now()
         WHERE approval_id = p_approval_id
        RETURNING * INTO v_row;
    EXCEPTION WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
        IF v_constraint_name = 'uq_approval_one_pending_site_diary' THEN
            RAISE EXCEPTION 'F24_PENDING_APPROVAL_EXISTS' USING ERRCODE = 'PT409';
        END IF;
        RAISE;
    END;

    v_event := CASE v_target
        WHEN 'Approved' THEN 'Approve'::"public"."audit_event_type"
        WHEN 'Rejected' THEN 'Reject'::"public"."audit_event_type"
        ELSE 'Update'::"public"."audit_event_type"
    END;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id, event_type,
        event_timestamp, performed_by, user_role, field_name, old_value,
        new_value, change_reason
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'APPROVAL',
        v_row.approval_id, v_event, now(), p_actor_id,
        CASE WHEN v_is_resubmit THEN 'submitter' ELSE 'approver' END,
        'approval_status', v_old.approval_status::text,
        v_row.approval_status::text,
        CASE WHEN v_is_resubmit
            THEN 'Approval resubmitted after correction'
                || CASE WHEN v_comment IS NULL THEN '' ELSE ': ' || v_comment END
            ELSE COALESCE(
                v_row.approval_comment,
                'Approval status updated to ' || v_row.approval_status::text
            )
        END
    );

    RETURN v_row;
END;
$$;

-- ============================================================
-- 4. Exact function privilege posture (signatures unchanged)
-- ============================================================

REVOKE ALL ON FUNCTION "private"."a27_create_progress_atomic"(jsonb, uuid, uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."a27_update_progress_atomic"(uuid, jsonb, uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."a27_update_approval_atomic"(uuid, jsonb, uuid, uuid, timestamptz)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION "public"."a27_create_progress_atomic"(jsonb, uuid, uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_create_progress_atomic"(jsonb, uuid, uuid, uuid, uuid)
TO authenticated;

REVOKE ALL ON FUNCTION "public"."a27_update_progress_atomic"(uuid, jsonb, uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_progress_atomic"(uuid, jsonb, uuid, uuid, uuid)
TO authenticated;

REVOKE ALL ON FUNCTION "public"."a27_update_approval_atomic"(uuid, jsonb, uuid, uuid, timestamptz)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_approval_atomic"(uuid, jsonb, uuid, uuid, timestamptz)
TO authenticated;
