-- F4.5 CATAT corrections #1/#2
-- 1) Persist an immutable daily work-status observation independently from Activity lifecycle.
-- 2) Preserve hourly weather evidence/provenance while keeping legacy Page 1 fields compatible.

ALTER TABLE "public"."site_diary"
  ADD COLUMN IF NOT EXISTS "daily_work_status" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'site_diary_daily_work_status_check'
      AND conrelid = 'public.site_diary'::regclass
  ) THEN
    ALTER TABLE "public"."site_diary"
      ADD CONSTRAINT "site_diary_daily_work_status_check"
      CHECK (
        daily_work_status IS NULL OR
        daily_work_status IN ('MULA', 'LAKSANA', 'SIAP', 'MULA_DAN_SIAP')
      );
  END IF;
END $$;

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
  v_source text := upper(coalesce(v_context->>'weather_source', ''));
  v_provider text := upper(coalesce(v_context->>'weather_provider', ''));
  v_resolution text := upper(coalesce(v_context->>'weather_provider_resolution', ''));
  v_intervals jsonb := coalesce(v_context->'rain_intervals', '[]'::jsonb);
  v_suggested jsonb := coalesce(v_context->'weather_suggested_intervals', '[]'::jsonb);
  v_interval jsonb;
  v_start text;
  v_end text;
BEGIN
  IF jsonb_typeof(v_context) <> 'object' THEN
    RAISE EXCEPTION 'F1_PRINT_CONTEXT_INVALID' USING ERRCODE = 'P0001';
  END IF;

  IF v_scope NOT IN ('CONTRACTOR', 'NSC') THEN
    RAISE EXCEPTION 'F1_PRINT_CONTRACTOR_SCOPE_INVALID' USING ERRCODE = 'P0001';
  END IF;

  -- Authoritative Site Diary weather is now intentionally binary.
  IF v_weather <> '' AND v_weather NOT IN ('ELOK', 'HUJAN') THEN
    RAISE EXCEPTION 'F45_PRINT_WEATHER_INVALID' USING ERRCODE = 'P0001';
  END IF;

  IF v_source <> '' AND v_source NOT IN ('AUTO', 'USER_CONFIRMED', 'MANUAL') THEN
    RAISE EXCEPTION 'F45_WEATHER_SOURCE_INVALID' USING ERRCODE = 'P0001';
  END IF;

  IF v_provider <> '' AND v_provider <> 'VISUAL_CROSSING' THEN
    RAISE EXCEPTION 'F45_WEATHER_PROVIDER_INVALID' USING ERRCODE = 'P0001';
  END IF;

  IF v_resolution <> '' AND v_resolution <> 'HOURLY' THEN
    RAISE EXCEPTION 'F45_WEATHER_RESOLUTION_INVALID' USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(v_intervals) <> 'array' OR jsonb_typeof(v_suggested) <> 'array' THEN
    RAISE EXCEPTION 'F45_WEATHER_INTERVALS_INVALID' USING ERRCODE = 'P0001';
  END IF;

  FOR v_interval IN SELECT value FROM jsonb_array_elements(v_intervals)
  LOOP
    IF jsonb_typeof(v_interval) <> 'object' THEN
      RAISE EXCEPTION 'F45_WEATHER_INTERVAL_INVALID' USING ERRCODE = 'P0001';
    END IF;
    v_start := coalesce(v_interval->>'start', '');
    v_end := coalesce(v_interval->>'end', '');
    IF v_start !~ '^(?:[01][0-9]|2[0-3]):00$' OR v_end !~ '^(?:[01][0-9]|2[0-3]|24):00$' THEN
      RAISE EXCEPTION 'F45_WEATHER_INTERVAL_NOT_HOURLY' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  FOR v_interval IN SELECT value FROM jsonb_array_elements(v_suggested)
  LOOP
    IF jsonb_typeof(v_interval) <> 'object' THEN
      RAISE EXCEPTION 'F45_WEATHER_SUGGESTION_INVALID' USING ERRCODE = 'P0001';
    END IF;
    v_start := coalesce(v_interval->>'start', '');
    v_end := coalesce(v_interval->>'end', '');
    IF v_start !~ '^(?:[01][0-9]|2[0-3]):00$' OR v_end !~ '^(?:[01][0-9]|2[0-3]|24):00$' THEN
      RAISE EXCEPTION 'F45_WEATHER_SUGGESTION_NOT_HOURLY' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  -- Force legacy time syntax validation when supplied. Empty strings remain null-like.
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

  IF nullif(v_context->>'weather_provider_fetched_at','') IS NOT NULL THEN
    PERFORM (v_context->>'weather_provider_fetched_at')::timestamptz;
  END IF;

  RETURN jsonb_build_object(
    'location', trim(coalesce(v_context->>'location','')),
    'work_start_time', nullif(v_context->>'work_start_time',''),
    'work_end_time', nullif(v_context->>'work_end_time',''),
    'weather_condition', nullif(v_weather,''),
    -- Legacy first interval fields retained until date-level output #7 supersedes exact-record print.
    'rain_start_time', nullif(v_context->>'rain_start_time',''),
    'rain_end_time', nullif(v_context->>'rain_end_time',''),
    'rain_intervals', v_intervals,
    'weather_suggested_intervals', v_suggested,
    'weather_source', nullif(v_source,''),
    'weather_provider', nullif(v_provider,''),
    'weather_provider_fetched_at', nullif(v_context->>'weather_provider_fetched_at',''),
    'weather_provider_resolution', nullif(v_resolution,''),
    'weather_latitude', CASE WHEN v_context ? 'weather_latitude' THEN (v_context->>'weather_latitude')::numeric ELSE NULL END,
    'weather_longitude', CASE WHEN v_context ? 'weather_longitude' THEN (v_context->>'weather_longitude')::numeric ELSE NULL END,
    'weather_timezone', nullif(v_context->>'weather_timezone',''),
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
  v_daily_work_status text := upper(nullif(p_payload->>'daily_work_status',''));
  v_row "public"."site_diary";
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);
  v_context := "private"."f1_validate_print_context"(p_payload->'print_context');

  IF v_daily_work_status IS NULL OR v_daily_work_status NOT IN ('MULA','LAKSANA','SIAP','MULA_DAN_SIAP') THEN
    RAISE EXCEPTION 'F45_DAILY_WORK_STATUS_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  v_diary := "private"."f1_create_site_diary_with_workforce_core"(
    p_payload, p_actor_id, p_site_diary_id, p_log_id, p_audit_id
  );

  UPDATE "public"."site_diary"
  SET print_context = v_context,
      daily_work_status = v_daily_work_status
  WHERE site_diary_id = p_site_diary_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'F1_SITE_DIARY_PRINT_CONTEXT_WRITE_FAILED' USING ERRCODE = 'P0001';
  END IF;

  RETURN to_jsonb(v_row);
END;
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
  v_daily_work_status text;
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);

  v_diary := "private"."f1_update_site_diary_with_workforce_core"(
    p_site_diary_id, p_payload, p_actor_id, p_log_id, p_audit_id
  );

  IF p_payload ? 'print_context' THEN
    v_context := "private"."f1_validate_print_context"(p_payload->'print_context');
    UPDATE "public"."site_diary"
    SET print_context = v_context
    WHERE site_diary_id = p_site_diary_id;
  END IF;

  IF p_payload ? 'daily_work_status' THEN
    v_daily_work_status := upper(nullif(p_payload->>'daily_work_status',''));
    IF v_daily_work_status IS NULL OR v_daily_work_status NOT IN ('MULA','LAKSANA','SIAP','MULA_DAN_SIAP') THEN
      RAISE EXCEPTION 'F45_DAILY_WORK_STATUS_INVALID' USING ERRCODE = 'P0001';
    END IF;
    UPDATE "public"."site_diary"
    SET daily_work_status = v_daily_work_status
    WHERE site_diary_id = p_site_diary_id;
  END IF;

  SELECT * INTO v_row
  FROM "public"."site_diary"
  WHERE site_diary_id = p_site_diary_id;

  IF v_row.site_diary_id IS NULL THEN
    RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION "private"."f1_validate_print_context"(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_create_site_diary_full_core"(jsonb,uuid,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_update_site_diary_full_core"(uuid,jsonb,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
