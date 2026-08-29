-- F1 Golden Path: preserve the sealed Activity lifecycle while allowing the
-- Site Diary execution date / known start date to become the authoritative
-- Actual Start / Actual Finish values.
--
-- These wrappers DO NOT allow New -> Completed as a direct state jump. The
-- same-day completion wrapper performs New -> In Progress -> Completed inside
-- one transaction and writes one history record for each transition.

CREATE OR REPLACE FUNCTION "private"."f1_assert_actor"()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'F1_ACTIVITY_UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_actor;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."f1_start_activity_on_date_core"(
  p_activity_id uuid,
  p_actual_start_date date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := "private"."f1_assert_actor"();
  v_activity "public"."activity";
BEGIN
  IF p_actual_start_date IS NULL THEN
    RAISE EXCEPTION 'F1_ACTIVITY_START_DATE_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF p_actual_start_date > current_date THEN
    RAISE EXCEPTION 'F1_ACTIVITY_START_DATE_FUTURE' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_activity
  FROM "public"."activity"
  WHERE activity_id = p_activity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'F1_ACTIVITY_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  PERFORM "private"."a27_assert_revision_operational"(
    v_activity.programme_id,
    v_activity.revision_id
  );

  IF v_activity.status <> 'New'::"public"."activity_operational_status" THEN
    RAISE EXCEPTION 'F1_ACTIVITY_START_TRANSITION_INVALID' USING ERRCODE = 'P0001';
  END IF;

  UPDATE "public"."activity"
  SET status = 'In Progress'::"public"."activity_operational_status",
      actual_start_date = p_actual_start_date,
      updated_at = now()
  WHERE activity_id = p_activity_id
  RETURNING * INTO v_activity;

  INSERT INTO "public"."activity_logs" (
    log_id,
    activity_id,
    event_type,
    snapshot_data,
    logged_by,
    logged_at
  ) VALUES (
    gen_random_uuid(),
    p_activity_id,
    'UPDATE',
    to_jsonb(v_activity),
    v_actor,
    now()
  );

  RETURN to_jsonb(v_activity);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."f1_start_activity_on_date_atomic"(
  p_activity_id uuid,
  p_actual_start_date date
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT "private"."f1_start_activity_on_date_core"($1, $2)
$$;

CREATE OR REPLACE FUNCTION "private"."f1_complete_activity_with_dates_core"(
  p_activity_id uuid,
  p_actual_start_date date,
  p_completed_date date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := "private"."f1_assert_actor"();
  v_activity "public"."activity";
BEGIN
  IF p_completed_date IS NULL THEN
    RAISE EXCEPTION 'F1_ACTIVITY_COMPLETED_DATE_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF p_completed_date > current_date THEN
    RAISE EXCEPTION 'F1_ACTIVITY_COMPLETED_DATE_FUTURE' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_activity
  FROM "public"."activity"
  WHERE activity_id = p_activity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'F1_ACTIVITY_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  PERFORM "private"."a27_assert_revision_operational"(
    v_activity.programme_id,
    v_activity.revision_id
  );

  IF v_activity.status = 'Completed'::"public"."activity_operational_status" THEN
    RAISE EXCEPTION 'F1_ACTIVITY_ALREADY_COMPLETED' USING ERRCODE = 'P0001';
  END IF;

  IF v_activity.status = 'New'::"public"."activity_operational_status" THEN
    IF p_actual_start_date IS NULL THEN
      RAISE EXCEPTION 'F1_ACTIVITY_START_DATE_REQUIRED' USING ERRCODE = 'P0001';
    END IF;

    IF p_actual_start_date > p_completed_date THEN
      RAISE EXCEPTION 'F1_ACTIVITY_DATE_ORDER_INVALID' USING ERRCODE = 'P0001';
    END IF;

    UPDATE "public"."activity"
    SET status = 'In Progress'::"public"."activity_operational_status",
        actual_start_date = p_actual_start_date,
        updated_at = now()
    WHERE activity_id = p_activity_id
    RETURNING * INTO v_activity;

    INSERT INTO "public"."activity_logs" (
      log_id,
      activity_id,
      event_type,
      snapshot_data,
      logged_by,
      logged_at
    ) VALUES (
      gen_random_uuid(),
      p_activity_id,
      'UPDATE',
      to_jsonb(v_activity),
      v_actor,
      now()
    );
  ELSE
    IF v_activity.actual_start_date IS NULL THEN
      IF p_actual_start_date IS NULL THEN
        RAISE EXCEPTION 'F1_ACTIVITY_START_DATE_REQUIRED' USING ERRCODE = 'P0001';
      END IF;
      v_activity.actual_start_date := p_actual_start_date;
    END IF;

    IF v_activity.actual_start_date > p_completed_date THEN
      RAISE EXCEPTION 'F1_ACTIVITY_DATE_ORDER_INVALID' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE "public"."activity"
  SET status = 'Completed'::"public"."activity_operational_status",
      actual_start_date = COALESCE(actual_start_date, p_actual_start_date),
      completed_date = p_completed_date,
      updated_at = now()
  WHERE activity_id = p_activity_id
  RETURNING * INTO v_activity;

  INSERT INTO "public"."activity_logs" (
    log_id,
    activity_id,
    event_type,
    snapshot_data,
    logged_by,
    logged_at
  ) VALUES (
    gen_random_uuid(),
    p_activity_id,
    'UPDATE',
    to_jsonb(v_activity),
    v_actor,
    now()
  );

  RETURN to_jsonb(v_activity);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."f1_complete_activity_with_dates_atomic"(
  p_activity_id uuid,
  p_actual_start_date date,
  p_completed_date date
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT "private"."f1_complete_activity_with_dates_core"($1, $2, $3)
$$;

REVOKE ALL ON FUNCTION "private"."f1_assert_actor"() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_start_activity_on_date_core"(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION "private"."f1_complete_activity_with_dates_core"(uuid, date, date) FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA "private" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION "public"."f1_start_activity_on_date_atomic"(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."f1_complete_activity_with_dates_atomic"(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."f1_start_activity_on_date_atomic"(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."f1_complete_activity_with_dates_atomic"(uuid, date, date) TO authenticated;

-- Re-assert the sealed A27 direct mutation boundary.
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."activity", "public"."activity_logs"
FROM PUBLIC, anon, authenticated;
