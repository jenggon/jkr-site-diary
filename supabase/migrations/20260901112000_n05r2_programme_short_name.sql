-- N05R.2 — Programme Short Name authority
-- User-defined compact project identity used by NGAMSOI mobile chrome.
-- Existing programmes remain nullable for migration compatibility; new API creation requires a value.

ALTER TABLE "public"."programme"
  ADD COLUMN IF NOT EXISTS "programme_short_name" varchar(20);

ALTER TABLE "public"."programme"
  DROP CONSTRAINT IF EXISTS "programme_short_name_format_check";

ALTER TABLE "public"."programme"
  ADD CONSTRAINT "programme_short_name_format_check" CHECK (
    "programme_short_name" IS NULL OR (
      char_length("programme_short_name") BETWEEN 3 AND 20
      AND "programme_short_name" = btrim("programme_short_name")
      AND "programme_short_name" ~ '^[A-Za-z0-9]+([ -][A-Za-z0-9]+)*$'
      AND upper("programme_short_name") NOT IN ('SYSTEM', 'ADMIN', 'NULL', 'TEMP', 'NGAMSOI')
    )
  );

-- Current schema has no tenant/workspace key. Keep identity collision-safe globally
-- until workspace authority is introduced; this is stricter than future scoped uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS "programme_short_name_unique_ci"
  ON "public"."programme" (lower("programme_short_name"))
  WHERE "programme_short_name" IS NOT NULL;

COMMENT ON COLUMN "public"."programme"."programme_short_name" IS
  'User-defined 3-20 character project nickname for compact NGAMSOI identity chrome.';

-- Propagate the new field through the reviewed atomic Programme creation boundary.
CREATE OR REPLACE FUNCTION "private"."a27_create_programme_core"(
  p_payload jsonb,
  p_actor_id uuid,
  p_programme_id uuid,
  p_revision_id uuid,
  p_audit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_programme "public"."programme";
  v_short_name text := p_payload->>'programme_short_name';
BEGIN
  PERFORM "private"."a27_assert_actor"(p_actor_id);

  IF coalesce(trim(p_payload->>'programme_code'),'') = ''
     OR coalesce(trim(p_payload->>'programme_name'),'') = ''
     OR coalesce(trim(v_short_name),'') = '' THEN
    RAISE EXCEPTION 'A27_PROGRAMME_INVALID' USING ERRCODE='P0001';
  END IF;

  IF char_length(v_short_name) NOT BETWEEN 3 AND 20
     OR v_short_name <> btrim(v_short_name)
     OR v_short_name !~ '^[A-Za-z0-9]+([ -][A-Za-z0-9]+)*$'
     OR upper(v_short_name) IN ('SYSTEM', 'ADMIN', 'NULL', 'TEMP', 'NGAMSOI') THEN
    RAISE EXCEPTION 'N05R2_PROGRAMME_SHORT_NAME_INVALID' USING ERRCODE='P0001';
  END IF;

  INSERT INTO "public"."programme" (
    programme_id,
    programme_code,
    programme_name,
    programme_short_name,
    employer_name,
    contractor_name,
    supervising_officer,
    contract_start_date,
    contract_completion_date,
    defect_liability_end,
    current_revision_id,
    status,
    is_locked,
    created_at,
    created_by
  )
  VALUES (
    p_programme_id,
    p_payload->>'programme_code',
    p_payload->>'programme_name',
    v_short_name,
    p_payload->>'employer_name',
    p_payload->>'contractor_name',
    p_payload->>'supervising_officer',
    nullif(p_payload->>'contract_start_date','')::date,
    nullif(p_payload->>'contract_completion_date','')::date,
    nullif(p_payload->>'defect_liability_end','')::date,
    NULL,
    'Approved',
    false,
    now(),
    p_actor_id
  )
  RETURNING * INTO v_programme;

  INSERT INTO "public"."programme_revision" (
    revision_id, programme_id, revision_no, revision_name, status, created_at, created_by
  )
  VALUES (p_revision_id, p_programme_id, 1, 'Baseline Revision', 'Draft', now(), p_actor_id);

  UPDATE "public"."programme"
     SET current_revision_id = p_revision_id
   WHERE programme_id = p_programme_id
   RETURNING * INTO v_programme;

  IF v_programme.current_revision_id IS DISTINCT FROM p_revision_id THEN
    RAISE EXCEPTION 'A27_PROGRAMME_POINTER_INVALID' USING ERRCODE='P0001';
  END IF;

  PERFORM "private"."a27_write_audit"(
    p_audit_id,
    p_programme_id,
    p_revision_id,
    'PROGRAMME',
    p_programme_id,
    'Create',
    p_actor_id,
    NULL,
    to_jsonb(v_programme)
  );

  RETURN to_jsonb(v_programme);
END;
$$;

REVOKE ALL ON FUNCTION "private"."a27_create_programme_core"(jsonb, uuid, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- Propagate the field through the existing capability-checked atomic PATCH boundary.
CREATE OR REPLACE FUNCTION "private"."c06_update_programme_core"(
    p_programme_id uuid,
    p_payload jsonb,
    p_actor_id uuid,
    p_audit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_programme "public"."programme";
    v_old_programme "public"."programme";
    v_eff_start date;
    v_eff_comp date;
    v_eff_dle date;
    v_short_name text;
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    PERFORM "private"."assert_capability"(p_actor_id, p_programme_id, 'PROGRAMME_UPDATE');

    SELECT * INTO v_old_programme
      FROM "public"."programme"
     WHERE programme_id = p_programme_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'C06_PROGRAMME_NOT_FOUND' USING ERRCODE = 'PT404';
    END IF;

    IF v_old_programme.status = 'Archived' THEN
        RAISE EXCEPTION 'C06_PROGRAMME_ARCHIVED' USING ERRCODE = 'PT409';
    END IF;

    IF v_old_programme.is_locked = true THEN
        RAISE EXCEPTION 'C06_PROGRAMME_LOCKED' USING ERRCODE = 'PT409';
    END IF;

    IF p_payload ? 'programme_short_name' THEN
      v_short_name := p_payload->>'programme_short_name';
      IF coalesce(v_short_name, '') = ''
         OR char_length(v_short_name) NOT BETWEEN 3 AND 20
         OR v_short_name <> btrim(v_short_name)
         OR v_short_name !~ '^[A-Za-z0-9]+([ -][A-Za-z0-9]+)*$'
         OR upper(v_short_name) IN ('SYSTEM', 'ADMIN', 'NULL', 'TEMP', 'NGAMSOI') THEN
        RAISE EXCEPTION 'C06_PROGRAMME_SHORT_NAME_INVALID' USING ERRCODE = 'PT400';
      END IF;
    END IF;

    BEGIN
        v_eff_start := CASE WHEN p_payload ? 'contract_start_date' THEN nullif(p_payload->>'contract_start_date','')::date ELSE v_old_programme.contract_start_date END;
        v_eff_comp := CASE WHEN p_payload ? 'contract_completion_date' THEN nullif(p_payload->>'contract_completion_date','')::date ELSE v_old_programme.contract_completion_date END;
        v_eff_dle := CASE WHEN p_payload ? 'defect_liability_end' THEN nullif(p_payload->>'defect_liability_end','')::date ELSE v_old_programme.defect_liability_end END;
    EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'C06_MALFORMED_DATE' USING ERRCODE = 'PT400';
    END;

    IF v_eff_start IS NOT NULL AND v_eff_comp IS NOT NULL AND v_eff_comp < v_eff_start THEN
        RAISE EXCEPTION 'C06_COMPLETION_BEFORE_START' USING ERRCODE = 'PT400';
    END IF;

    IF v_eff_comp IS NOT NULL AND v_eff_dle IS NOT NULL AND v_eff_dle < v_eff_comp THEN
        RAISE EXCEPTION 'C06_DEFECT_END_BEFORE_COMPLETION' USING ERRCODE = 'PT400';
    END IF;

    UPDATE "public"."programme"
       SET programme_name = coalesce(nullif(p_payload->>'programme_name', ''), programme_name),
           programme_short_name = CASE WHEN p_payload ? 'programme_short_name' THEN v_short_name ELSE programme_short_name END,
           employer_name = CASE WHEN p_payload ? 'employer_name' THEN p_payload->>'employer_name' ELSE employer_name END,
           contractor_name = CASE WHEN p_payload ? 'contractor_name' THEN p_payload->>'contractor_name' ELSE contractor_name END,
           supervising_officer = CASE WHEN p_payload ? 'supervising_officer' THEN p_payload->>'supervising_officer' ELSE supervising_officer END,
           contract_start_date = v_eff_start,
           contract_completion_date = v_eff_comp,
           defect_liability_end = v_eff_dle,
           updated_at = now(),
           updated_by = p_actor_id
     WHERE programme_id = p_programme_id
 RETURNING * INTO v_programme;

    PERFORM "private"."a27_write_audit"(
        p_audit_id,
        p_programme_id,
        v_programme.current_revision_id,
        'PROGRAMME',
        p_programme_id,
        'Update',
        p_actor_id,
        jsonb_build_object('old', to_jsonb(v_old_programme)),
        to_jsonb(v_programme)
    );

    RETURN to_jsonb(v_programme);
END;
$$;

REVOKE ALL ON FUNCTION "private"."c06_update_programme_core"(uuid, jsonb, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
