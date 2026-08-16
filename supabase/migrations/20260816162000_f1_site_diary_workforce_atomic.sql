-- F1 Golden Path: persist the locked per-Activity Trade Allocation together with
-- the Site Diary write. This preserves A27 DB-INVARIANT atomicity and keeps the
-- legacy manpower JSON only as an input/snapshot compatibility surface.

CREATE OR REPLACE FUNCTION "private"."f1_create_site_diary_with_workforce_core"(
  p_payload jsonb,
  p_actor_id uuid,
  p_site_diary_id uuid,
  p_log_id uuid,
  p_audit_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_diary jsonb;
  v_item jsonb;
  v_trade "public"."trade_library";
  v_trade_name text;
  v_trade_code text;
  v_b integer;
  v_n integer;
  v_f integer;
  v_workforce_payload jsonb;
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);

  IF p_payload ? 'manpower'
     AND p_payload->'manpower' IS NOT NULL
     AND jsonb_typeof(p_payload->'manpower') <> 'array' THEN
    RAISE EXCEPTION 'F1_SITE_DIARY_MANPOWER_INVALID' USING ERRCODE = 'P0001';
  END IF;

  v_diary := "private"."a27_mutate_site_diary_core"(
    p_site_diary_id,
    p_payload,
    p_actor_id,
    p_log_id,
    p_audit_id,
    true
  );

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(coalesce(p_payload->'manpower', '[]'::jsonb))
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

    SELECT * INTO v_trade
    FROM "public"."trade_library"
    WHERE lower(trim(trade_name)) = lower(v_trade_name)
      AND is_active = true
    ORDER BY display_order, created_at
    LIMIT 1;

    IF NOT FOUND THEN
      v_trade_code := upper(regexp_replace(v_trade_name, '[^A-Za-z0-9]+', '_', 'g'));
      v_trade_code := trim(both '_' from v_trade_code);
      v_trade_code := left(v_trade_code, 50);
      IF v_trade_code = '' THEN
        RAISE EXCEPTION 'F1_WORKFORCE_TRADE_CODE_INVALID' USING ERRCODE = 'P0001';
      END IF;

      INSERT INTO "public"."trade_library" (
        trade_code, trade_name, display_order, is_active, created_at, created_by
      ) VALUES (
        v_trade_code, v_trade_name, 0, true, now(), p_actor_id
      )
      ON CONFLICT (trade_code) DO UPDATE
        SET trade_name = EXCLUDED.trade_name
      WHERE "public"."trade_library".trade_name = EXCLUDED.trade_name
      RETURNING * INTO v_trade;

      IF v_trade.trade_id IS NULL THEN
        SELECT * INTO v_trade
        FROM "public"."trade_library"
        WHERE trade_code = v_trade_code AND trade_name = v_trade_name AND is_active = true;
      END IF;

      IF v_trade.trade_id IS NULL THEN
        RAISE EXCEPTION 'F1_WORKFORCE_TRADE_CODE_CONFLICT' USING ERRCODE = 'P0001';
      END IF;
    END IF;

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
      gen_random_uuid(),
      v_workforce_payload,
      p_actor_id,
      gen_random_uuid(),
      true
    );
  END LOOP;

  RETURN v_diary;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."f1_create_site_diary_with_workforce_atomic"(
  p_payload jsonb,
  p_actor_id uuid,
  p_site_diary_id uuid,
  p_log_id uuid,
  p_audit_id uuid
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT "private"."f1_create_site_diary_with_workforce_core"($1,$2,$3,$4,$5)
$$;

REVOKE ALL ON FUNCTION "private"."f1_create_site_diary_with_workforce_core"(jsonb,uuid,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."f1_create_site_diary_with_workforce_atomic"(jsonb,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."f1_create_site_diary_with_workforce_atomic"(jsonb,uuid,uuid,uuid,uuid) TO authenticated;

-- Preserve the sealed table mutation boundary.
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."site_diary" FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."workforce" FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."trade_library" FROM PUBLIC, anon, authenticated;
