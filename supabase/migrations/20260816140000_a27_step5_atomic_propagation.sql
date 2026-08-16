-- A27 Option 2 Step 5: propagate the reviewed DB-INVARIANT atomic boundary.
-- Public wrappers are exact-grant authenticated APIs. Private cores are never exposed.

ALTER TABLE "public"."programme" ADD COLUMN IF NOT EXISTS "is_locked" boolean NOT NULL DEFAULT false;

-- Preserve the sealed trigger logic while making its existing unqualified references deterministic.
ALTER FUNCTION "public"."trg_enforce_revision_operational"() SET search_path = 'public';
ALTER FUNCTION "public"."trg_enforce_site_diary_revision_operational"() SET search_path = 'public';

CREATE TABLE IF NOT EXISTS "public"."trade_library" (
  "trade_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trade_code" varchar(50) NOT NULL UNIQUE,
  "trade_name" text NOT NULL,
  "trade_category" text,
  "description" text,
  "display_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL,
  "updated_at" timestamptz,
  "updated_by" uuid
);

CREATE TABLE IF NOT EXISTS "public"."workforce" (
  "workforce_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "programme_id" uuid NOT NULL REFERENCES "public"."programme"("programme_id"),
  "revision_id" uuid NOT NULL REFERENCES "public"."programme_revision"("revision_id"),
  "activity_id" uuid NOT NULL REFERENCES "public"."activity"("activity_id"),
  "site_diary_id" uuid NOT NULL REFERENCES "public"."site_diary"("site_diary_id"),
  "trade_id" uuid NOT NULL REFERENCES "public"."trade_library"("trade_id"),
  "trade_name" text,
  "bumiputera_count" integer NOT NULL DEFAULT 0 CHECK ("bumiputera_count" >= 0),
  "non_bumiputera_count" integer NOT NULL DEFAULT 0 CHECK ("non_bumiputera_count" >= 0),
  "foreign_count" integer NOT NULL DEFAULT 0 CHECK ("foreign_count" >= 0),
  "total_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz,
  CONSTRAINT "workforce_total_count_check" CHECK ("total_count" = "bumiputera_count" + "non_bumiputera_count" + "foreign_count")
);

ALTER TABLE "public"."trade_library" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workforce" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "a27_authenticated_trade_library_read" ON "public"."trade_library";
CREATE POLICY "a27_authenticated_trade_library_read" ON "public"."trade_library" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "a27_authenticated_workforce_read" ON "public"."workforce";
CREATE POLICY "a27_authenticated_workforce_read" ON "public"."workforce" FOR SELECT TO authenticated USING (true);

DO $a27$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['programme','programme_revision','task','activity','activity_logs','site_diary','site_diary_logs','workforce','approval','progress','audit'] LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);
    END IF;
  END LOOP;
END $a27$;

REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."trade_library" FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA "private" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "private" FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION "private"."a27_write_audit"(
  p_audit_id uuid, p_programme_id uuid, p_revision_id uuid, p_entity_name text,
  p_entity_id uuid, p_event "public"."audit_event_type", p_actor_id uuid,
  p_old jsonb DEFAULT NULL, p_new jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO "public"."audit" (audit_id,programme_id,revision_id,entity_name,entity_id,event_type,event_timestamp,performed_by,user_role,old_value,new_value,change_reason)
  VALUES (p_audit_id,p_programme_id,p_revision_id,p_entity_name,p_entity_id,p_event,now(),p_actor_id,'authenticated',p_old::text,p_new::text,'A27 DB-INVARIANT atomic command');
END $$;

CREATE OR REPLACE FUNCTION "private"."a27_create_programme_core"(p_payload jsonb,p_actor_id uuid,p_programme_id uuid,p_revision_id uuid,p_audit_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_programme "public"."programme";
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);
  IF coalesce(trim(p_payload->>'programme_code'),'')='' OR coalesce(trim(p_payload->>'programme_name'),'')='' THEN RAISE EXCEPTION 'A27_PROGRAMME_INVALID' USING ERRCODE='P0001'; END IF;
  INSERT INTO "public"."programme" (programme_id,programme_code,programme_name,employer_name,contractor_name,supervising_officer,contract_start_date,contract_completion_date,defect_liability_end,current_revision_id,status,is_locked,created_at,created_by)
  VALUES (p_programme_id,p_payload->>'programme_code',p_payload->>'programme_name',p_payload->>'employer_name',p_payload->>'contractor_name',p_payload->>'supervising_officer',nullif(p_payload->>'contract_start_date','')::date,nullif(p_payload->>'contract_completion_date','')::date,nullif(p_payload->>'defect_liability_end','')::date,NULL,'Approved',false,now(),p_actor_id)
  RETURNING * INTO v_programme;
  INSERT INTO "public"."programme_revision" (revision_id,programme_id,revision_no,revision_name,status,created_at,created_by)
  VALUES (p_revision_id,p_programme_id,1,'Baseline Revision','Draft',now(),p_actor_id);
  UPDATE "public"."programme" SET current_revision_id=p_revision_id WHERE programme_id=p_programme_id RETURNING * INTO v_programme;
  IF v_programme.current_revision_id IS DISTINCT FROM p_revision_id THEN RAISE EXCEPTION 'A27_PROGRAMME_POINTER_INVALID' USING ERRCODE='P0001'; END IF;
  PERFORM "private"."a27_write_audit"(p_audit_id,p_programme_id,p_revision_id,'PROGRAMME',p_programme_id,'Create',p_actor_id,NULL,to_jsonb(v_programme));
  RETURN to_jsonb(v_programme);
END $$;

CREATE OR REPLACE FUNCTION "public"."a27_create_programme_atomic"(p_payload jsonb,p_actor_id uuid,p_programme_id uuid,p_revision_id uuid,p_audit_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT "private"."a27_create_programme_core"($1,$2,$3,$4,$5) $$;

CREATE OR REPLACE FUNCTION "private"."a27_approve_revision_core"(p_revision_id uuid,p_actor_id uuid,p_audit_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_target "public"."programme_revision"; v_programme "public"."programme"; v_previous uuid;
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);
  SELECT * INTO v_target FROM "public"."programme_revision" WHERE revision_id=p_revision_id FOR UPDATE;
  IF NOT FOUND OR v_target.status NOT IN ('Draft','UnderReview') THEN RAISE EXCEPTION 'A27_REVISION_TRANSITION_INVALID' USING ERRCODE='P0001'; END IF;
  SELECT * INTO v_programme FROM "public"."programme" WHERE programme_id=v_target.programme_id FOR UPDATE;
  IF NOT FOUND OR v_programme.status='Archived' THEN RAISE EXCEPTION 'A27_PROGRAMME_NOT_OPERATIONAL' USING ERRCODE='P0001'; END IF;
  v_previous:=v_programme.current_revision_id;
  IF v_previous IS NOT NULL AND v_previous<>p_revision_id THEN
    UPDATE "public"."programme_revision" SET status='Superseded' WHERE revision_id=v_previous AND programme_id=v_target.programme_id AND status='Approved';
  END IF;
  UPDATE "public"."programme_revision" SET status='Approved',approved_at=now(),approved_by=p_actor_id WHERE revision_id=p_revision_id RETURNING * INTO v_target;
  UPDATE "public"."programme" SET current_revision_id=p_revision_id,updated_at=now(),updated_by=p_actor_id WHERE programme_id=v_target.programme_id;
  IF (SELECT count(*) FROM "public"."programme_revision" WHERE programme_id=v_target.programme_id AND status='Approved')<>1 THEN RAISE EXCEPTION 'A27_REVISION_CURRENT_CARDINALITY' USING ERRCODE='P0001'; END IF;
  PERFORM "private"."a27_write_audit"(p_audit_id,v_target.programme_id,p_revision_id,'PROGRAMME_REVISION',p_revision_id,'Approve',p_actor_id,jsonb_build_object('previous_revision_id',v_previous),to_jsonb(v_target));
  RETURN to_jsonb(v_target);
END $$;

CREATE OR REPLACE FUNCTION "public"."a27_approve_revision_atomic"(p_revision_id uuid,p_actor_id uuid,p_audit_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT "private"."a27_approve_revision_core"($1,$2,$3) $$;

CREATE OR REPLACE FUNCTION "private"."a27_ingest_msp_core"(p_revision jsonb,p_tasks jsonb,p_actor_id uuid,p_audit_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_revision "public"."programme_revision"; v_task jsonb; v_programme uuid:=(p_revision->>'programme_id')::uuid; v_revision_id uuid:=(p_revision->>'revision_id')::uuid;
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);
  IF jsonb_typeof(p_tasks)<>'array' OR jsonb_array_length(p_tasks)=0 THEN RAISE EXCEPTION 'A27_MSP_TASKS_INVALID' USING ERRCODE='P0001'; END IF;
  PERFORM 1 FROM "public"."programme" WHERE programme_id=v_programme AND status<>'Archived' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A27_PROGRAMME_NOT_OPERATIONAL' USING ERRCODE='P0001'; END IF;
  IF EXISTS (SELECT 1 FROM "public"."programme_revision" WHERE programme_id=v_programme AND msp_file_hash=p_revision->>'msp_file_hash') THEN RAISE EXCEPTION 'A27_MSP_DUPLICATE' USING ERRCODE='23505'; END IF;
  INSERT INTO "public"."programme_revision" (revision_id,programme_id,revision_no,revision_name,msp_file_name,msp_file_hash,msp_imported_at,msp_imported_by,status,created_at,created_by)
  VALUES (v_revision_id,v_programme,(p_revision->>'revision_no')::integer,p_revision->>'revision_name',p_revision->>'msp_file_name',p_revision->>'msp_file_hash',now(),p_actor_id,(p_revision->>'status')::"public"."programme_lifecycle_status",now(),p_actor_id) RETURNING * INTO v_revision;
  FOR v_task IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
    IF (v_task->>'programme_id')::uuid<>v_programme OR (v_task->>'revision_id')::uuid<>v_revision_id OR coalesce(trim(v_task->>'task_name'),'')='' THEN RAISE EXCEPTION 'A27_MSP_TASK_CONTEXT_INVALID' USING ERRCODE='P0001'; END IF;
    INSERT INTO "public"."task" (task_id,programme_id,revision_id,task_uid,task_guid,wbs,task_name,parent_task_uid,outline_level,display_order,planned_start,planned_finish,planned_duration_days,is_milestone,is_critical,is_summary,constraint_type,constraint_date,created_at,created_by,outline_number,trade_code,trade_name)
    VALUES ((v_task->>'task_id')::uuid,v_programme,v_revision_id,(v_task->>'task_uid')::integer,nullif(v_task->>'task_guid','')::uuid,v_task->>'wbs',v_task->>'task_name',nullif(v_task->>'parent_task_uid','')::integer,nullif(v_task->>'outline_level','')::integer,nullif(v_task->>'display_order','')::integer,nullif(v_task->>'planned_start','')::date,nullif(v_task->>'planned_finish','')::date,nullif(v_task->>'planned_duration_days','')::numeric,coalesce((v_task->>'is_milestone')::boolean,false),coalesce((v_task->>'is_critical')::boolean,false),coalesce((v_task->>'is_summary')::boolean,false),v_task->>'constraint_type',nullif(v_task->>'constraint_date','')::date,now(),p_actor_id,v_task->>'outline_number',v_task->>'trade_code',v_task->>'trade_name');
  END LOOP;
  PERFORM "private"."a27_write_audit"(p_audit_id,v_programme,v_revision_id,'PROGRAMME_REVISION',v_revision_id,'Import',p_actor_id,NULL,jsonb_build_object('task_count',jsonb_array_length(p_tasks)));
  RETURN to_jsonb(v_revision);
END $$;

CREATE OR REPLACE FUNCTION "public"."a27_ingest_msp_atomic"(p_revision jsonb,p_tasks jsonb,p_actor_id uuid,p_audit_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT "private"."a27_ingest_msp_core"($1,$2,$3,$4) $$;

CREATE OR REPLACE FUNCTION "private"."a27_create_activity_core"(p_payload jsonb,p_actor_id uuid,p_activity_id uuid,p_log_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_activity "public"."activity";
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);
  PERFORM "private"."a27_assert_activity_context"((p_payload->>'programme_id')::uuid,(p_payload->>'revision_id')::uuid,(p_payload->>'activity_id')::uuid);
  -- For creation the Activity does not exist yet, so validate revision/task directly.
EXCEPTION WHEN no_data_found THEN NULL;
END $$;

-- Replace the creation core above with creation-specific context checks.
CREATE OR REPLACE FUNCTION "private"."a27_create_activity_core"(p_payload jsonb,p_actor_id uuid,p_activity_id uuid,p_log_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_activity "public"."activity"; v_programme uuid:=(p_payload->>'programme_id')::uuid; v_revision uuid:=(p_payload->>'revision_id')::uuid; v_task uuid:=(p_payload->>'task_id')::uuid;
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);
  PERFORM "private"."a27_assert_revision_operational"(v_programme,v_revision);
  PERFORM 1 FROM "public"."task" WHERE task_id=v_task AND programme_id=v_programme AND revision_id=v_revision;
  IF NOT FOUND OR coalesce(trim(p_payload->>'subtask'),'')='' THEN RAISE EXCEPTION 'A27_ACTIVITY_CONTEXT_INVALID' USING ERRCODE='P0001'; END IF;
  INSERT INTO "public"."activity" (activity_id,programme_id,revision_id,task_id,activity_uid,ahi,ahi_display_name,subtask,subtask_display_name,activity_date,actual_start_date,completed_date,status,weather,notes,submitted_by,created_at,updated_at)
  VALUES (p_activity_id,v_programme,v_revision,v_task,p_activity_id,p_payload->>'ahi',p_payload->>'ahi_display_name',p_payload->>'subtask',p_payload->>'subtask_display_name',(p_payload->>'activity_date')::date,NULL,NULL,'New',NULL,coalesce(p_payload->>'notes',''),p_actor_id,now(),NULL) RETURNING * INTO v_activity;
  INSERT INTO "public"."activity_logs" (log_id,activity_id,event_type,snapshot_data,logged_by,logged_at) VALUES (p_log_id,p_activity_id,'NEW',to_jsonb(v_activity),p_actor_id,now());
  RETURN to_jsonb(v_activity);
END $$;

CREATE OR REPLACE FUNCTION "private"."a27_mutate_activity_core"(p_activity_id uuid,p_payload jsonb,p_actor_id uuid,p_log_id uuid,p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_activity "public"."activity"; v_target "public"."activity_operational_status";
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);
  SELECT * INTO v_activity FROM "public"."activity" WHERE activity_id=p_activity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A27_ACTIVITY_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  PERFORM "private"."a27_assert_revision_operational"(v_activity.programme_id,v_activity.revision_id);
  IF p_action='UPDATE' THEN
    UPDATE "public"."activity" SET subtask=coalesce(nullif(p_payload->>'subtask',''),subtask),notes=coalesce(p_payload->>'notes',notes),weather=coalesce((p_payload->>'weather')::"public"."activity_weather_session",weather),updated_at=now() WHERE activity_id=p_activity_id RETURNING * INTO v_activity;
  ELSE
    v_target:=CASE p_action WHEN 'START' THEN 'In Progress'::"public"."activity_operational_status" WHEN 'COMPLETE' THEN 'Completed'::"public"."activity_operational_status" ELSE NULL END;
    IF v_target IS NULL OR (v_activity.status='New' AND v_target<>'In Progress') OR (v_activity.status='In Progress' AND v_target<>'Completed') OR v_activity.status='Completed' THEN RAISE EXCEPTION 'A27_ACTIVITY_TRANSITION_INVALID' USING ERRCODE='P0001'; END IF;
    UPDATE "public"."activity" SET status=v_target,actual_start_date=CASE WHEN v_target='In Progress' THEN current_date ELSE actual_start_date END,completed_date=CASE WHEN v_target='Completed' THEN current_date ELSE completed_date END,updated_at=now() WHERE activity_id=p_activity_id RETURNING * INTO v_activity;
  END IF;
  INSERT INTO "public"."activity_logs" (log_id,activity_id,event_type,snapshot_data,logged_by,logged_at) VALUES (p_log_id,p_activity_id,'UPDATE',to_jsonb(v_activity),p_actor_id,now());
  RETURN to_jsonb(v_activity);
END $$;

CREATE OR REPLACE FUNCTION "public"."a27_create_activity_atomic"(p_payload jsonb,p_actor_id uuid,p_activity_id uuid,p_log_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT "private"."a27_create_activity_core"($1,$2,$3,$4) $$;
CREATE OR REPLACE FUNCTION "public"."a27_update_activity_atomic"(p_activity_id uuid,p_payload jsonb,p_actor_id uuid,p_log_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT "private"."a27_mutate_activity_core"($1,$2,$3,$4,'UPDATE') $$;
CREATE OR REPLACE FUNCTION "public"."a27_start_activity_atomic"(p_activity_id uuid,p_actor_id uuid,p_log_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT "private"."a27_mutate_activity_core"($1,'{}'::jsonb,$2,$3,'START') $$;
CREATE OR REPLACE FUNCTION "public"."a27_complete_activity_atomic"(p_activity_id uuid,p_actor_id uuid,p_log_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT "private"."a27_mutate_activity_core"($1,'{}'::jsonb,$2,$3,'COMPLETE') $$;

CREATE OR REPLACE FUNCTION "private"."a27_mutate_workforce_core"(p_workforce_id uuid,p_payload jsonb,p_actor_id uuid,p_audit_id uuid,p_create boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_workforce "public"."workforce"; v_diary "public"."site_diary"; v_trade "public"."trade_library"; v_b integer; v_n integer; v_f integer;
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);
  IF p_create THEN
    SELECT * INTO v_diary FROM "public"."site_diary" WHERE site_diary_id=(p_payload->>'site_diary_id')::uuid FOR SHARE;
    IF NOT FOUND OR v_diary.programme_id<>(p_payload->>'programme_id')::uuid OR v_diary.revision_id<>(p_payload->>'revision_id')::uuid OR v_diary.activity_id<>(p_payload->>'activity_id')::uuid THEN RAISE EXCEPTION 'A27_WORKFORCE_CONTEXT_INVALID' USING ERRCODE='P0001'; END IF;
    PERFORM "private"."a27_assert_revision_operational"(v_diary.programme_id,v_diary.revision_id);
    SELECT * INTO v_trade FROM "public"."trade_library" WHERE trade_id=(p_payload->>'trade_id')::uuid AND is_active=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'A27_WORKFORCE_TRADE_INVALID' USING ERRCODE='P0001'; END IF;
    v_b:=coalesce((p_payload->>'bumiputera_count')::integer,0); v_n:=coalesce((p_payload->>'non_bumiputera_count')::integer,0); v_f:=coalesce((p_payload->>'foreign_count')::integer,0);
    INSERT INTO "public"."workforce" (workforce_id,programme_id,revision_id,activity_id,site_diary_id,trade_id,trade_name,bumiputera_count,non_bumiputera_count,foreign_count,total_count,created_at)
    VALUES (p_workforce_id,v_diary.programme_id,v_diary.revision_id,v_diary.activity_id,v_diary.site_diary_id,v_trade.trade_id,v_trade.trade_name,v_b,v_n,v_f,v_b+v_n+v_f,now()) RETURNING * INTO v_workforce;
    PERFORM "private"."a27_write_audit"(p_audit_id,v_workforce.programme_id,v_workforce.revision_id,'WORKFORCE',p_workforce_id,'Create',p_actor_id,NULL,to_jsonb(v_workforce));
  ELSE
    SELECT * INTO v_workforce FROM "public"."workforce" WHERE workforce_id=p_workforce_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A27_WORKFORCE_NOT_FOUND' USING ERRCODE='P0001'; END IF;
    PERFORM "private"."a27_assert_revision_operational"(v_workforce.programme_id,v_workforce.revision_id);
    SELECT * INTO v_trade FROM "public"."trade_library" WHERE trade_id=coalesce((p_payload->>'trade_id')::uuid,v_workforce.trade_id) AND is_active=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'A27_WORKFORCE_TRADE_INVALID' USING ERRCODE='P0001'; END IF;
    v_b:=coalesce((p_payload->>'bumiputera_count')::integer,v_workforce.bumiputera_count); v_n:=coalesce((p_payload->>'non_bumiputera_count')::integer,v_workforce.non_bumiputera_count); v_f:=coalesce((p_payload->>'foreign_count')::integer,v_workforce.foreign_count);
    UPDATE "public"."workforce" SET trade_id=v_trade.trade_id,trade_name=v_trade.trade_name,bumiputera_count=v_b,non_bumiputera_count=v_n,foreign_count=v_f,total_count=v_b+v_n+v_f,updated_at=now() WHERE workforce_id=p_workforce_id RETURNING * INTO v_workforce;
    PERFORM "private"."a27_write_audit"(p_audit_id,v_workforce.programme_id,v_workforce.revision_id,'WORKFORCE',p_workforce_id,'Update',p_actor_id,NULL,to_jsonb(v_workforce));
  END IF;
  RETURN to_jsonb(v_workforce);
END $$;

CREATE OR REPLACE FUNCTION "public"."a27_create_workforce_atomic"(p_payload jsonb,p_actor_id uuid,p_workforce_id uuid,p_audit_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT "private"."a27_mutate_workforce_core"($3,$1,$2,$4,true) $$;
CREATE OR REPLACE FUNCTION "public"."a27_update_workforce_atomic"(p_workforce_id uuid,p_payload jsonb,p_actor_id uuid,p_audit_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT "private"."a27_mutate_workforce_core"($1,$2,$3,$4,false) $$;

CREATE OR REPLACE FUNCTION "private"."a27_mutate_site_diary_core"(p_site_diary_id uuid,p_payload jsonb,p_actor_id uuid,p_log_id uuid,p_audit_id uuid,p_create boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_diary "public"."site_diary"; v_activity "public"."activity";
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);
  IF p_create THEN
    SELECT * INTO v_activity FROM "public"."activity" WHERE activity_id=(p_payload->>'activity_id')::uuid FOR SHARE;
    IF NOT FOUND OR v_activity.programme_id<>(p_payload->>'programme_id')::uuid OR v_activity.revision_id<>(p_payload->>'revision_id')::uuid OR v_activity.status='Completed' AND coalesce(p_payload->>'carry_forward','false')::boolean THEN RAISE EXCEPTION 'A27_SITE_DIARY_CONTEXT_INVALID' USING ERRCODE='P0001'; END IF;
    PERFORM "private"."a27_assert_revision_operational"(v_activity.programme_id,v_activity.revision_id);
    INSERT INTO "public"."site_diary" (site_diary_id,programme_id,revision_id,activity_id,activity_date,weather,notes,status,manpower,submitted_by,submitted_at,updated_at)
    VALUES (p_site_diary_id,v_activity.programme_id,v_activity.revision_id,v_activity.activity_id,(p_payload->>'activity_date')::date,nullif(p_payload->>'weather','')::"public"."activity_weather_session",coalesce(p_payload->>'notes',''),v_activity.status,p_payload->'manpower',p_actor_id,now(),NULL) RETURNING * INTO v_diary;
    INSERT INTO "public"."site_diary_logs" (log_id,site_diary_id,event_type,snapshot_data,logged_by,logged_at) VALUES (p_log_id,p_site_diary_id,'NEW',to_jsonb(v_diary),p_actor_id,now());
    PERFORM "private"."a27_write_audit"(p_audit_id,v_diary.programme_id,v_diary.revision_id,'SITE_DIARY',p_site_diary_id,CASE WHEN coalesce((p_payload->>'carry_forward')::boolean,false) THEN 'Carry Forward'::"public"."audit_event_type" ELSE 'Create'::"public"."audit_event_type" END,p_actor_id,NULL,to_jsonb(v_diary));
  ELSE
    SELECT * INTO v_diary FROM "public"."site_diary" WHERE site_diary_id=p_site_diary_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A27_SITE_DIARY_NOT_FOUND' USING ERRCODE='P0001'; END IF;
    PERFORM "private"."a27_assert_revision_operational"(v_diary.programme_id,v_diary.revision_id);
    UPDATE "public"."site_diary" SET weather=CASE WHEN p_payload ? 'weather' THEN nullif(p_payload->>'weather','')::"public"."activity_weather_session" ELSE weather END,notes=CASE WHEN p_payload ? 'notes' THEN p_payload->>'notes' ELSE notes END,manpower=CASE WHEN p_payload ? 'manpower' THEN p_payload->'manpower' ELSE manpower END,updated_at=now() WHERE site_diary_id=p_site_diary_id RETURNING * INTO v_diary;
    INSERT INTO "public"."site_diary_logs" (log_id,site_diary_id,event_type,snapshot_data,logged_by,logged_at) VALUES (p_log_id,p_site_diary_id,'UPDATE',to_jsonb(v_diary),p_actor_id,now());
    PERFORM "private"."a27_write_audit"(p_audit_id,v_diary.programme_id,v_diary.revision_id,'SITE_DIARY',p_site_diary_id,'Update',p_actor_id,NULL,to_jsonb(v_diary));
  END IF;
  RETURN to_jsonb(v_diary);
END $$;

CREATE OR REPLACE FUNCTION "public"."a27_create_site_diary_atomic"(p_payload jsonb,p_actor_id uuid,p_site_diary_id uuid,p_log_id uuid,p_audit_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT "private"."a27_mutate_site_diary_core"($3,$1,$2,$4,$5,true) $$;
CREATE OR REPLACE FUNCTION "public"."a27_update_site_diary_atomic"(p_site_diary_id uuid,p_payload jsonb,p_actor_id uuid,p_log_id uuid,p_audit_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT "private"."a27_mutate_site_diary_core"($1,$2,$3,$4,$5,false) $$;

CREATE OR REPLACE FUNCTION "private"."a27_archive_programme_core"(p_programme_id uuid,p_actor_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_programme "public"."programme";
BEGIN PERFORM "private"."a27_assert_actor"(p_actor_id); UPDATE "public"."programme" SET status='Archived',archived_at=now(),archived_by=p_actor_id,updated_at=now(),updated_by=p_actor_id WHERE programme_id=p_programme_id AND status<>'Archived' RETURNING * INTO v_programme; IF NOT FOUND THEN RAISE EXCEPTION 'A27_PROGRAMME_ARCHIVE_INVALID' USING ERRCODE='P0001'; END IF; RETURN to_jsonb(v_programme); END $$;
CREATE OR REPLACE FUNCTION "public"."a27_archive_programme"(p_programme_id uuid,p_actor_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT "private"."a27_archive_programme_core"($1,$2) $$;

CREATE OR REPLACE FUNCTION "private"."a27_update_task_core"(p_task_id uuid,p_payload jsonb,p_actor_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_task "public"."task";
BEGIN PERFORM "private"."a27_assert_actor"(p_actor_id); SELECT * INTO v_task FROM "public"."task" WHERE task_id=p_task_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'A27_TASK_NOT_FOUND' USING ERRCODE='P0001'; END IF; PERFORM "private"."a27_assert_revision_operational"(v_task.programme_id,v_task.revision_id); UPDATE "public"."task" SET task_name=coalesce(nullif(p_payload->>'task_name',''),task_name),wbs=CASE WHEN p_payload?'wbs' THEN p_payload->>'wbs' ELSE wbs END,trade_code=CASE WHEN p_payload?'trade_code' THEN p_payload->>'trade_code' ELSE trade_code END,trade_name=CASE WHEN p_payload?'trade_name' THEN p_payload->>'trade_name' ELSE trade_name END WHERE task_id=p_task_id RETURNING * INTO v_task; RETURN to_jsonb(v_task); END $$;
CREATE OR REPLACE FUNCTION "public"."a27_update_task"(p_task_id uuid,p_payload jsonb,p_actor_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT "private"."a27_update_task_core"($1,$2,$3) $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "private" FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA "private" FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION "public"."a27_create_programme_atomic"(jsonb,uuid,uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_approve_revision_atomic"(uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_ingest_msp_atomic"(jsonb,jsonb,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_create_activity_atomic"(jsonb,uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_update_activity_atomic"(uuid,jsonb,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_start_activity_atomic"(uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_complete_activity_atomic"(uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_create_workforce_atomic"(jsonb,uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_update_workforce_atomic"(uuid,jsonb,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_create_site_diary_atomic"(jsonb,uuid,uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_update_site_diary_atomic"(uuid,jsonb,uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_archive_programme"(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION "public"."a27_update_task"(uuid,jsonb,uuid) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION "public"."a27_create_programme_atomic"(jsonb,uuid,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_approve_revision_atomic"(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_ingest_msp_atomic"(jsonb,jsonb,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_create_activity_atomic"(jsonb,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_activity_atomic"(uuid,jsonb,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_start_activity_atomic"(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_complete_activity_atomic"(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_create_workforce_atomic"(jsonb,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_workforce_atomic"(uuid,jsonb,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_create_site_diary_atomic"(jsonb,uuid,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_site_diary_atomic"(uuid,jsonb,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_archive_programme"(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."a27_update_task"(uuid,jsonb,uuid) TO authenticated;
