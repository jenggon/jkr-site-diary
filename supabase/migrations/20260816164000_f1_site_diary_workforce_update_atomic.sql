-- F1 Golden Path: editing a Site Diary manpower allocation must update the
-- canonical Workforce records in the same transaction as the Diary edit.
-- Existing Workforce identities are retained; removed allocations are zeroed
-- rather than deleted so the governed audit/history surface is preserved.

CREATE OR REPLACE FUNCTION "private"."f1_resolve_trade"(
  p_trade_name text,
  p_actor_id uuid
) RETURNS "public"."trade_library"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trade "public"."trade_library";
  v_name text := trim(coalesce(p_trade_name, ''));
  v_code text;
BEGIN
  IF v_name = '' THEN
    RAISE EXCEPTION 'F1_WORKFORCE_TRADE_NAME_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_trade
  FROM "public"."trade_library"
  WHERE lower(trim(trade_name)) = lower(v_name)
    AND is_active = true
  ORDER BY display_order, created_at
  LIMIT 1;

  IF FOUND THEN
    RETURN v_trade;
  END IF;

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

CREATE OR REPLACE FUNCTION "private"."f1_update_site_diary_with_workforce_core"(
  p_site_diary_id uuid,
  p_payload jsonb,
  p_actor_id uuid,
  p_log_id uuid,
  p_audit_id uuid
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
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);

  IF p_payload ? 'manpower'
     AND p_payload->'manpower' IS NOT NULL
     AND jsonb_typeof(p_payload->'manpower') <> 'array' THEN
    RAISE EXCEPTION 'F1_SITE_DIARY_MANPOWER_INVALID' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_diary_row
  FROM "public"."site_diary"
  WHERE site_diary_id = p_site_diary_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  v_diary := "private"."a27_mutate_site_diary_core"(
    p_site_diary_id,
    p_payload,
    p_actor_id,
    p_log_id,
    p_audit_id,
    false
  );

  IF NOT (p_payload ? 'manpower') THEN
    RETURN v_diary;
  END IF;

  -- Preserve Workforce identities: reset current allocations to zero with the
  -- normal A27 update core so every change remains audited.
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
      v_existing.workforce_id,
      v_payload,
      p_actor_id,
      gen_random_uuid(),
      false
    );
  END LOOP;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(coalesce(p_payload->'manpower', '[]'::jsonb))
  LOOP
    v_b := coalesce(nullif(v_item->>'bumiputera_count', '')::integer,
                    nullif(v_item->>'bumi_count', '')::integer, 0);
    v_n := coalesce(nullif(v_item->>'non_bumiputera_count', '')::integer,
                    nullif(v_item->>'non_bumi_count', '')::integer, 0);
    v_f := coalesce(nullif(v_item->>'foreign_count', '')::integer, 0);

    IF v_b < 0 OR v_n < 0 OR v_f < 0 THEN
      RAISE EXCEPTION 'F1_WORKFORCE_COUNT_INVALID' USING ERRCODE = 'P0001';
    END IF;
    IF v_b + v_n + v_f = 0 THEN
      CONTINUE;
    END IF;

    v_trade := "private"."f1_resolve_trade"(v_item->>'trade_name', p_actor_id);

    SELECT * INTO v_workforce
    FROM "public"."workforce"
    WHERE site_diary_id = p_site_diary_id
      AND trade_id = v_trade.trade_id
    ORDER BY created_at, workforce_id
    LIMIT 1;

    IF FOUND THEN
      v_payload := jsonb_build_object(
        'trade_id', v_trade.trade_id,
        'bumiputera_count', v_b,
        'non_bumiputera_count', v_n,
        'foreign_count', v_f
      );
      PERFORM "private"."a27_mutate_workforce_core"(
        v_workforce.workforce_id,
        v_payload,
        p_actor_id,
        gen_random_uuid(),
        false
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
        gen_random_uuid(),
        v_payload,
        p_actor_id,
        gen_random_uuid(),
        true
      );
    END IF;
  END LOOP;

  RETURN v_diary;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."f1_update_site_diary_with_workforce_atomic"(
  p_site_diary_id uuid,
  p_payload jsonb,
  p_actor_id uuid,
  p_log_id uuid,
  p_audit_id uuid
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT "private"."f1_update_site_diary_with_workforce_core"($1,$2,$3,$4,$5)
$$;

REVOKE ALL ON FUNCTION "private"."f1_resolve_trade"(text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_update_site_diary_with_workforce_core"(uuid,jsonb,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."f1_update_site_diary_with_workforce_atomic"(uuid,jsonb,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."f1_update_site_diary_with_workforce_atomic"(uuid,jsonb,uuid,uuid,uuid) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."site_diary" FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."workforce" FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."trade_library" FROM PUBLIC, anon, authenticated;
