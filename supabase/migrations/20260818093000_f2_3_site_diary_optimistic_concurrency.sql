-- F2.3-B02 — fail-closed optimistic concurrency for governed Site Diary edits.
-- The expected token is command authority only and is never persisted.

-- Remove every older authenticated update entry point. Keeping any five-argument
-- wrapper would leave a token-omission bypass even if the application stopped
-- calling it.
DROP FUNCTION IF EXISTS "public"."a27_update_site_diary_atomic"(uuid,jsonb,uuid,uuid,uuid);
DROP FUNCTION IF EXISTS "public"."f1_update_site_diary_with_workforce_atomic"(uuid,jsonb,uuid,uuid,uuid);
DROP FUNCTION IF EXISTS "public"."f1_update_site_diary_full_atomic"(uuid,jsonb,uuid,uuid,uuid);

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

CREATE OR REPLACE FUNCTION "private"."f1_update_site_diary_full_core"(
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

CREATE FUNCTION "public"."f1_update_site_diary_full_atomic"(
  p_site_diary_id uuid,
  p_payload jsonb,
  p_actor_id uuid,
  p_log_id uuid,
  p_audit_id uuid,
  p_expected_last_modified_at timestamptz
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT "private"."f1_update_site_diary_full_core"($1,$2,$3,$4,$5,$6)
$$;

REVOKE ALL ON FUNCTION "private"."f1_update_site_diary_with_workforce_core"(uuid,jsonb,uuid,uuid,uuid,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_update_site_diary_full_core"(uuid,jsonb,uuid,uuid,uuid,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."f1_update_site_diary_full_atomic"(uuid,jsonb,uuid,uuid,uuid,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."f1_update_site_diary_full_atomic"(uuid,jsonb,uuid,uuid,uuid,timestamptz) TO authenticated;
