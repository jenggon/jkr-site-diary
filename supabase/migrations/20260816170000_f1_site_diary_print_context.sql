-- F1 Golden Path: persist the original JKR Page 1 operational print fields
-- without reopening the sealed Site Diary ownership model. The additional
-- fields live in one immutable-compatible JSON print context owned by the
-- Site Diary daily record. Create/update remain inside the same transaction as
-- the existing F1 Site Diary + Workforce wrappers.

ALTER TABLE "public"."site_diary"
  ADD COLUMN IF NOT EXISTS "print_context" jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION "private"."f1_validate_print_context"(p_context jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_context jsonb := coalesce(p_context, '{}'::jsonb);
  v_scope text := upper(coalesce(v_context->>'contractor_scope', 'CONTRACTOR'));
  v_weather text := upper(coalesce(v_context->>'weather_condition', ''));
BEGIN
  IF jsonb_typeof(v_context) <> 'object' THEN
    RAISE EXCEPTION 'F1_PRINT_CONTEXT_INVALID' USING ERRCODE = 'P0001';
  END IF;

  IF v_scope NOT IN ('CONTRACTOR', 'NSC') THEN
    RAISE EXCEPTION 'F1_PRINT_CONTRACTOR_SCOPE_INVALID' USING ERRCODE = 'P0001';
  END IF;

  IF v_weather <> '' AND v_weather NOT IN ('ELOK', 'HUJAN', 'MENDUNG', 'RIBUT') THEN
    RAISE EXCEPTION 'F1_PRINT_WEATHER_INVALID' USING ERRCODE = 'P0001';
  END IF;

  -- Force time syntax validation when supplied. Empty strings remain null-like.
  IF nullif(v_context->>'work_start_time','') IS NOT NULL THEN
    PERFORM (v_context->>'work_start_time')::time;
  END IF;
  IF nullif(v_context->>'work_end_time','') IS NOT NULL THEN
    PERFORM (v_context->>'work_end_time')::time;
  END IF;
  IF nullif(v_context->>'rain_start_time','') IS NOT NULL THEN
    PERFORM (v_context->>'rain_start_time')::time;
  END IF;
  IF nullif(v_context->>'rain_end_time','') IS NOT NULL THEN
    PERFORM (v_context->>'rain_end_time')::time;
  END IF;

  RETURN jsonb_build_object(
    'location', trim(coalesce(v_context->>'location','')),
    'work_start_time', nullif(v_context->>'work_start_time',''),
    'work_end_time', nullif(v_context->>'work_end_time',''),
    'weather_condition', nullif(v_weather,''),
    'rain_start_time', nullif(v_context->>'rain_start_time',''),
    'rain_end_time', nullif(v_context->>'rain_end_time',''),
    'contractor_scope', v_scope
  );
END;
$$;

CREATE OR REPLACE FUNCTION "private"."f1_create_site_diary_full_core"(
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
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT "private"."f1_create_site_diary_full_core"($1,$2,$3,$4,$5)
$$;

CREATE OR REPLACE FUNCTION "private"."f1_update_site_diary_full_core"(
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
  v_diary jsonb;
  v_row "public"."site_diary";
  v_context jsonb;
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);

  v_diary := "private"."f1_update_site_diary_with_workforce_core"(
    p_site_diary_id, p_payload, p_actor_id, p_log_id, p_audit_id
  );

  IF p_payload ? 'print_context' THEN
    v_context := "private"."f1_validate_print_context"(p_payload->'print_context');
    UPDATE "public"."site_diary"
    SET print_context = v_context
    WHERE site_diary_id = p_site_diary_id
    RETURNING * INTO v_row;
  ELSE
    SELECT * INTO v_row
    FROM "public"."site_diary"
    WHERE site_diary_id = p_site_diary_id;
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
  p_audit_id uuid
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT "private"."f1_update_site_diary_full_core"($1,$2,$3,$4,$5)
$$;

REVOKE ALL ON FUNCTION "private"."f1_validate_print_context"(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_create_site_diary_full_core"(jsonb,uuid,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_update_site_diary_full_core"(uuid,jsonb,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "public"."f1_create_site_diary_full_atomic"(jsonb,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."f1_update_site_diary_full_atomic"(uuid,jsonb,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."f1_create_site_diary_full_atomic"(jsonb,uuid,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."f1_update_site_diary_full_atomic"(uuid,jsonb,uuid,uuid,uuid) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."site_diary" FROM PUBLIC, anon, authenticated;
