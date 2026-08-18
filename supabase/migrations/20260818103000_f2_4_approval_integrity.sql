-- F2.4-B01 — Approval Integrity Foundation
-- Introduces Approval Edit Sealing, Token Handshakes, and Canonical Lock Ordering.

-- 1. Drop existing legacy RPCs to avoid security bypass
DROP FUNCTION IF EXISTS "public"."a27_create_approval_atomic"(jsonb, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS "public"."a27_update_approval_atomic"(uuid, jsonb, uuid, uuid);

-- 2. Edit Sealing Invariant
CREATE OR REPLACE FUNCTION "private"."f24_assert_site_diary_unsealed"(p_site_diary_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "public"."approval"
    WHERE site_diary_id = p_site_diary_id
      AND approval_status IN ('Pending', 'Approved')
  ) THEN
    RAISE EXCEPTION 'F24_SITE_DIARY_SEALED' USING ERRCODE = 'PT409';
  END IF;
END;
$$;

-- 3. Update Site Diary Core to invoke Sealing Invariant
CREATE OR REPLACE FUNCTION "private"."f1_update_site_diary_with_workforce_core"(
  p_site_diary_id uuid,
  p_payload jsonb,
  p_actor_id uuid,
  p_log_id uuid,
  p_audit_id uuid,
  p_expected_last_modified_at timestamptz
) RETURNS jsonb
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

  -- Concurrency authority: lock first, then compare the canonical timestamptz.
  SELECT * INTO v_diary_row
  FROM "public"."site_diary"
  WHERE site_diary_id = p_site_diary_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  -- B01: Seal edits if Pending or Approved
  PERFORM "private"."f24_assert_site_diary_unsealed"(p_site_diary_id);

  PERFORM "private"."a27_assert_revision_operational"(
    v_diary_row.programme_id,
    v_diary_row.revision_id
  );

  IF p_expected_last_modified_at IS NULL THEN
    RAISE EXCEPTION 'F23_EXPECTED_LAST_MODIFIED_REQUIRED' USING ERRCODE = '22007';
  END IF;

  v_locked_last_modified_at := coalesce(v_diary_row.updated_at, v_diary_row.submitted_at);
  IF v_locked_last_modified_at IS DISTINCT FROM p_expected_last_modified_at THEN
    RAISE EXCEPTION 'F23_SITE_DIARY_STALE_EDIT' USING ERRCODE = 'PT409';
  END IF;

  -- All mutable operations occur only after the locked stale-token check.
  v_diary := "private"."a27_mutate_site_diary_core"(
    p_site_diary_id, p_payload, p_actor_id, p_log_id, p_audit_id, false
  );

  IF NOT (p_payload ? 'manpower') THEN
    RETURN v_diary;
  END IF;

  FOR v_existing IN
    SELECT * FROM "public"."workforce"
    WHERE site_diary_id = p_site_diary_id
    ORDER BY created_at, workforce_id
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

    v_trade := "private"."f1_resolve_trade"(v_item->>'trade_name', p_actor_id);
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

-- 4. Create Approval with Site Diary Token Handshake
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

-- 5. Update Approval with Canonical Lock Order
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

-- 6. Public Wrappers
CREATE OR REPLACE FUNCTION "public"."a27_create_approval_atomic"(
    "p_payload" jsonb, "p_actor_id" uuid, "p_approval_id" uuid, "p_audit_id" uuid, "p_expected_sd_last_modified_at" timestamptz
) RETURNS "public"."approval"
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$ SELECT "private"."a27_create_approval_atomic"($1,$2,$3,$4,$5) $$;

CREATE OR REPLACE FUNCTION "public"."a27_update_approval_atomic"(
    "p_approval_id" uuid, "p_payload" jsonb, "p_actor_id" uuid, "p_audit_id" uuid, "p_expected_sd_last_modified_at" timestamptz
) RETURNS "public"."approval"
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$ SELECT "private"."a27_update_approval_atomic"($1,$2,$3,$4,$5) $$;

REVOKE ALL ON FUNCTION "public"."a27_create_approval_atomic"(jsonb,uuid,uuid,uuid,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_create_approval_atomic"(jsonb,uuid,uuid,uuid,timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION "public"."a27_update_approval_atomic"(uuid,jsonb,uuid,uuid,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_approval_atomic"(uuid,jsonb,uuid,uuid,timestamptz) TO authenticated;
