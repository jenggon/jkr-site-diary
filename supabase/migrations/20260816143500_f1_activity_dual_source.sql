-- F1 — Activity dual-source amendment
-- Authority: ADR-F1-001 / DB-014 v1.1 / DM-005 v1.1
-- Locked rule: Activity has exactly one operational source: MSP Task OR VO Item.

DO $$
BEGIN
  CREATE TYPE public.activity_source_type AS ENUM ('MSP', 'VO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.vo_item (
  vo_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES public.programme(programme_id),
  revision_id uuid NOT NULL REFERENCES public.programme_revision(revision_id),
  vo_reference text NOT NULL,
  line_item text NOT NULL,
  description text,
  is_omission boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vo_item_reference_line_unique UNIQUE (revision_id, vo_reference, line_item)
);

CREATE INDEX IF NOT EXISTS idx_vo_item_programme_revision
  ON public.vo_item(programme_id, revision_id);

ALTER TABLE public.activity
  ALTER COLUMN task_id DROP NOT NULL;

ALTER TABLE public.activity
  ADD COLUMN IF NOT EXISTS source_type public.activity_source_type;

ALTER TABLE public.activity
  ADD COLUMN IF NOT EXISTS vo_item_id uuid;

UPDATE public.activity
SET source_type = 'MSP'
WHERE source_type IS NULL;

ALTER TABLE public.activity
  ALTER COLUMN source_type SET DEFAULT 'MSP';

ALTER TABLE public.activity
  ALTER COLUMN source_type SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.activity
    ADD CONSTRAINT activity_vo_item_id_fkey
    FOREIGN KEY (vo_item_id) REFERENCES public.vo_item(vo_item_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.activity
    ADD CONSTRAINT activity_exactly_one_source_check
    CHECK (
      (source_type = 'MSP' AND task_id IS NOT NULL AND vo_item_id IS NULL)
      OR
      (source_type = 'VO' AND task_id IS NULL AND vo_item_id IS NOT NULL)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_vo_item_id
  ON public.activity(vo_item_id);

-- Mutations remain behind authenticated RPC boundaries.
REVOKE INSERT, UPDATE, DELETE ON public.vo_item FROM anon, authenticated;
GRANT SELECT ON public.vo_item TO authenticated;

CREATE OR REPLACE FUNCTION public.f1_create_vo_item_atomic(
  p_programme_id uuid,
  p_revision_id uuid,
  p_vo_reference text,
  p_line_item text,
  p_description text,
  p_is_omission boolean,
  p_actor_id uuid,
  p_vo_item_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_item public.vo_item;
BEGIN
  PERFORM private.a27_assert_actor(p_actor_id);
  PERFORM private.a27_assert_revision_operational(p_programme_id, p_revision_id);

  IF coalesce(trim(p_vo_reference), '') = '' THEN
    RAISE EXCEPTION 'F1_VO_REFERENCE_REQUIRED' USING ERRCODE='P0001';
  END IF;
  IF coalesce(trim(p_line_item), '') = '' THEN
    RAISE EXCEPTION 'F1_VO_LINE_ITEM_REQUIRED' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.vo_item(
    vo_item_id, programme_id, revision_id, vo_reference, line_item,
    description, is_omission, created_by, created_at
  ) VALUES (
    p_vo_item_id, p_programme_id, p_revision_id, trim(p_vo_reference), trim(p_line_item),
    nullif(trim(coalesce(p_description, '')), ''), coalesce(p_is_omission, false), p_actor_id, now()
  )
  RETURNING * INTO v_item;

  RETURN to_jsonb(v_item);
END
$$;

REVOKE ALL ON FUNCTION public.f1_create_vo_item_atomic(uuid,uuid,text,text,text,boolean,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.f1_create_vo_item_atomic(uuid,uuid,text,text,text,boolean,uuid,uuid) TO authenticated;

-- Replace the A27 Activity core so the existing atomic trust boundary understands
-- both locked source modes while remaining backward compatible with MSP payloads.
CREATE OR REPLACE FUNCTION private.a27_create_activity_core(
  p_payload jsonb,
  p_actor_id uuid,
  p_activity_id uuid,
  p_log_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_activity public.activity;
  v_programme uuid := (p_payload->>'programme_id')::uuid;
  v_revision uuid := (p_payload->>'revision_id')::uuid;
  v_source public.activity_source_type := coalesce(nullif(p_payload->>'source_type',''), 'MSP')::public.activity_source_type;
  v_task uuid := nullif(p_payload->>'task_id','')::uuid;
  v_vo uuid := nullif(p_payload->>'vo_item_id','')::uuid;
BEGIN
  PERFORM private.a27_assert_actor(p_actor_id);
  PERFORM private.a27_assert_revision_operational(v_programme, v_revision);

  IF coalesce(trim(p_payload->>'subtask'),'') = '' THEN
    RAISE EXCEPTION 'A27_ACTIVITY_CONTEXT_INVALID' USING ERRCODE='P0001';
  END IF;

  IF v_source = 'MSP' THEN
    IF v_task IS NULL OR v_vo IS NOT NULL THEN
      RAISE EXCEPTION 'F1_ACTIVITY_SOURCE_INVALID' USING ERRCODE='P0001';
    END IF;
    PERFORM 1 FROM public.task
      WHERE task_id=v_task AND programme_id=v_programme AND revision_id=v_revision;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A27_ACTIVITY_CONTEXT_INVALID' USING ERRCODE='P0001';
    END IF;
  ELSIF v_source = 'VO' THEN
    IF v_vo IS NULL OR v_task IS NOT NULL THEN
      RAISE EXCEPTION 'F1_ACTIVITY_SOURCE_INVALID' USING ERRCODE='P0001';
    END IF;
    PERFORM 1 FROM public.vo_item
      WHERE vo_item_id=v_vo
        AND programme_id=v_programme
        AND revision_id=v_revision
        AND is_omission=false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'F1_VO_ACTIVITY_CONTEXT_INVALID' USING ERRCODE='P0001';
    END IF;
  ELSE
    RAISE EXCEPTION 'F1_ACTIVITY_SOURCE_INVALID' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.activity (
    activity_id,programme_id,revision_id,source_type,task_id,vo_item_id,
    activity_uid,ahi,ahi_display_name,subtask,subtask_display_name,
    activity_date,actual_start_date,completed_date,status,weather,notes,
    submitted_by,created_at,updated_at
  ) VALUES (
    p_activity_id,v_programme,v_revision,v_source,v_task,v_vo,
    p_activity_id,p_payload->>'ahi',p_payload->>'ahi_display_name',p_payload->>'subtask',p_payload->>'subtask_display_name',
    (p_payload->>'activity_date')::date,NULL,NULL,'New',NULL,coalesce(p_payload->>'notes',''),
    p_actor_id,now(),NULL
  ) RETURNING * INTO v_activity;

  INSERT INTO public.activity_logs(log_id,activity_id,event_type,snapshot_data,logged_by,logged_at)
  VALUES (p_log_id,p_activity_id,'NEW',to_jsonb(v_activity),p_actor_id,now());

  RETURN to_jsonb(v_activity);
END
$$;
