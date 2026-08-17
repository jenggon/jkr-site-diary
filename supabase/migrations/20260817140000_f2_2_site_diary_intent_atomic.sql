-- ============================================================================
-- F2.2 Database-Authoritative Continuation Safety & Operation Intent Contract
-- Specs: DB-014 (Activity canonical owner), DB-015 (Site Diary daily execution owner)
-- Hardens atomic Site Diary persistence against concurrent state interleaving by evaluating
-- the caller's explicit operation_intent against the live canonical Activity state under FOR SHARE row lock.
-- ============================================================================

CREATE OR REPLACE FUNCTION "private"."a27_mutate_site_diary_core"(
  p_site_diary_id uuid,
  p_payload jsonb,
  p_actor_id uuid,
  p_log_id uuid,
  p_audit_id uuid,
  p_create boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_diary "public"."site_diary";
  v_activity "public"."activity";
  v_intent text;
  v_act_date date;
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);
  IF p_create THEN
    -- 1. Acquire Activity row lock
    SELECT * INTO v_activity FROM "public"."activity" WHERE activity_id=(p_payload->>'activity_id')::uuid FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A27_ACTIVITY_NOT_FOUND' USING ERRCODE='P0001';
    END IF;

    -- 2. Verify Programme and Revision IDs match Activity
    IF v_activity.programme_id<>(p_payload->>'programme_id')::uuid OR v_activity.revision_id<>(p_payload->>'revision_id')::uuid THEN
      RAISE EXCEPTION 'A27_SITE_DIARY_CONTEXT_INVALID' USING ERRCODE='P0001';
    END IF;

    -- 3. Carry forward cannot run against Completed activity
    IF v_activity.status='Completed' AND coalesce((p_payload->>'carry_forward')::boolean, false) THEN
      RAISE EXCEPTION 'A27_SITE_DIARY_CONTEXT_INVALID' USING ERRCODE='P0001';
    END IF;

    -- 4. Revalidate current authorised Programme Revision
    PERFORM "private"."a27_assert_revision_operational"(v_activity.programme_id, v_activity.revision_id);

    -- 5. Atomic Operation Intent Authority Validation
    v_intent := coalesce(p_payload->>'operation_intent', 'IN_PROGRESS_DIARY');
    v_act_date := (p_payload->>'activity_date')::date;

    IF v_intent = 'IN_PROGRESS_DIARY' THEN
      IF v_activity.status NOT IN ('In Progress', 'New') THEN
        RAISE EXCEPTION 'A27_INTENT_IN_PROGRESS_INVALID_ACTIVITY_STATUS: %', v_activity.status USING ERRCODE='P0001';
      END IF;
    ELSIF v_intent = 'FINAL_COMPLETION_DIARY' THEN
      IF v_activity.status <> 'Completed' THEN
        RAISE EXCEPTION 'A27_INTENT_COMPLETION_ACTIVITY_NOT_COMPLETED: %', v_activity.status USING ERRCODE='P0001';
      END IF;
      IF v_activity.completed_date IS NULL THEN
        RAISE EXCEPTION 'A27_INTENT_COMPLETION_MISSING_COMPLETED_DATE' USING ERRCODE='P0001';
      END IF;
      IF v_activity.completed_date <> v_act_date THEN
        RAISE EXCEPTION 'A27_INTENT_COMPLETION_DATE_MISMATCH: completed_date % vs activity_date %', v_activity.completed_date, v_act_date USING ERRCODE='P0001';
      END IF;
    ELSE
      RAISE EXCEPTION 'A27_UNKNOWN_OPERATION_INTENT: %', v_intent USING ERRCODE='P0001';
    END IF;

    -- 6. Insert Site Diary row
    INSERT INTO "public"."site_diary" (
      site_diary_id,
      programme_id,
      revision_id,
      activity_id,
      activity_date,
      weather,
      notes,
      status,
      manpower,
      submitted_by,
      submitted_at,
      updated_at
    ) VALUES (
      p_site_diary_id,
      v_activity.programme_id,
      v_activity.revision_id,
      v_activity.activity_id,
      v_act_date,
      nullif(p_payload->>'weather','')::"public"."activity_weather_session",
      coalesce(p_payload->>'notes',''),
      v_activity.status,
      p_payload->'manpower',
      p_actor_id,
      now(),
      NULL
    ) RETURNING * INTO v_diary;

    INSERT INTO "public"."site_diary_logs" (log_id, site_diary_id, event_type, snapshot_data, logged_by, logged_at)
    VALUES (p_log_id, p_site_diary_id, 'NEW', to_jsonb(v_diary), p_actor_id, now());

    PERFORM "private"."a27_write_audit"(
      p_audit_id,
      v_diary.programme_id,
      v_diary.revision_id,
      'SITE_DIARY',
      p_site_diary_id,
      CASE WHEN coalesce((p_payload->>'carry_forward')::boolean,false) THEN 'Carry Forward'::"public"."audit_event_type" ELSE 'Create'::"public"."audit_event_type" END,
      p_actor_id,
      NULL,
      to_jsonb(v_diary)
    );
  ELSE
    SELECT * INTO v_diary FROM "public"."site_diary" WHERE site_diary_id=p_site_diary_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE='P0001'; END IF;
    PERFORM "private"."a27_assert_revision_operational"(v_diary.programme_id,v_diary.revision_id);
    UPDATE "public"."site_diary"
    SET weather=CASE WHEN p_payload ? 'weather' THEN nullif(p_payload->>'weather','')::"public"."activity_weather_session" ELSE weather END,
        notes=CASE WHEN p_payload ? 'notes' THEN p_payload->>'notes' ELSE notes END,
        manpower=CASE WHEN p_payload ? 'manpower' THEN p_payload->'manpower' ELSE manpower END,
        updated_at=now()
    WHERE site_diary_id=p_site_diary_id
    RETURNING * INTO v_diary;
    INSERT INTO "public"."site_diary_logs" (log_id,site_diary_id,event_type,snapshot_data,logged_by,logged_at)
    VALUES (p_log_id,p_site_diary_id,'UPDATE',to_jsonb(v_diary),p_actor_id,now());
    PERFORM "private"."a27_write_audit"(p_audit_id,v_diary.programme_id,v_diary.revision_id,'SITE_DIARY',p_site_diary_id,'Update',p_actor_id,NULL,to_jsonb(v_diary));
  END IF;
  RETURN to_jsonb(v_diary);
END $$;
