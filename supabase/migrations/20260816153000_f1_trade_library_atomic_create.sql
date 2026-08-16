-- F1 Golden Path: manual Trade creation must persist without reopening direct table mutation.
-- A27 remains authoritative: authenticated users retain no direct INSERT/UPDATE/DELETE
-- on trade_library. This exact wrapper binds the stored actor to auth.uid().

CREATE OR REPLACE FUNCTION "public"."f1_create_trade_atomic"(
  p_trade_code text,
  p_trade_name text
) RETURNS jsonb
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

  IF v_name = '' THEN
    RAISE EXCEPTION 'F1_TRADE_NAME_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF v_code = '' THEN
    RAISE EXCEPTION 'F1_TRADE_CODE_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO "public"."trade_library" (
    trade_code,
    trade_name,
    display_order,
    is_active,
    created_at,
    created_by
  ) VALUES (
    v_code,
    v_name,
    0,
    true,
    now(),
    v_actor
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

REVOKE ALL ON FUNCTION "public"."f1_create_trade_atomic"(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."f1_create_trade_atomic"(text, text) TO authenticated;

-- Re-assert the sealed A27 table mutation boundary.
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."trade_library" FROM PUBLIC, anon, authenticated;
