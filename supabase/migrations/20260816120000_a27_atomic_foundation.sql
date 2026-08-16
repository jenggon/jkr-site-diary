-- A27 Option 2 Step 2: canonical Site Diary history and representative atomic workflows.
-- activity_logs is Activity lifecycle history. site_diary_logs is intentionally distinct.

CREATE SCHEMA IF NOT EXISTS "private";

-- The sealed REM-004 trigger used unqualified relations. A27 functions intentionally use an
-- empty search_path, so preserve the same trigger rules with explicit canonical qualification.
CREATE OR REPLACE FUNCTION "public"."trg_enforce_activity_revision_operational"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE v_status varchar; v_current_revision_id uuid;
BEGIN
    SELECT pr.status, p.current_revision_id INTO v_status, v_current_revision_id
      FROM "public"."programme_revision" pr
      JOIN "public"."programme" p ON p.programme_id = pr.programme_id
      WHERE pr.revision_id = NEW.revision_id FOR SHARE OF pr;
    IF NOT FOUND THEN RETURN NEW; END IF;
    IF v_status <> 'Approved' THEN
        RAISE EXCEPTION 'ACTIVITY_REVISION_SUPERSEDED: Activity revision % is no longer operationally current (status: %)', NEW.revision_id, v_status USING ERRCODE = 'P0001';
    END IF;
    IF v_current_revision_id <> NEW.revision_id THEN
        RAISE EXCEPTION 'ACTIVITY_REVISION_MISMATCH: Activity revision % is not the current programme revision', NEW.revision_id USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TABLE "public"."site_diary_logs" (
    "log_id"        uuid                     NOT NULL DEFAULT gen_random_uuid(),
    "site_diary_id" uuid                     NOT NULL,
    "event_type"    character varying(20)    NOT NULL,
    "snapshot_data" jsonb                    NOT NULL,
    "logged_by"     uuid                     NOT NULL,
    "logged_at"     timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "site_diary_logs_pkey" PRIMARY KEY ("log_id"),
    CONSTRAINT "site_diary_logs_site_diary_id_fkey"
        FOREIGN KEY ("site_diary_id") REFERENCES "public"."site_diary" ("site_diary_id") ON DELETE RESTRICT,
    CONSTRAINT "site_diary_logs_event_type_check" CHECK ("event_type" IN ('NEW', 'UPDATE'))
);

CREATE INDEX "idx_site_diary_logs_site_diary_id"
    ON "public"."site_diary_logs" ("site_diary_id", "logged_at");

ALTER TABLE "public"."site_diary_logs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."site_diary_logs" FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE "public"."site_diary_logs" TO authenticated;
CREATE POLICY "authenticated_read_site_diary_history"
    ON "public"."site_diary_logs" FOR SELECT TO authenticated USING (true);

-- Existing baseline tables predate comprehensive RLS. A27 narrows their mutation surface
-- without changing read behavior required by sealed services.
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."approval" FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."progress" FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."audit" FROM anon, authenticated;

CREATE OR REPLACE FUNCTION "private"."a27_assert_actor"("p_actor_id" uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_actor_id THEN
        RAISE EXCEPTION 'A27_AUTH_ACTOR_MISMATCH' USING ERRCODE = '42501';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_create_approval_atomic"(
    "p_payload" jsonb, "p_actor_id" uuid, "p_approval_id" uuid, "p_audit_id" uuid
) RETURNS "public"."approval"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_row "public"."approval";
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);

    INSERT INTO "public"."approval" (
        approval_id, programme_id, revision_id, activity_id, site_diary_id, progress_id,
        approval_level, approval_status, approval_date, approval_comment, approved_by,
        requested_by, requested_at, created_at, updated_at
    ) VALUES (
        p_approval_id, (p_payload->>'programme_id')::uuid, (p_payload->>'revision_id')::uuid,
        (p_payload->>'activity_id')::uuid, NULLIF(p_payload->>'site_diary_id', '')::uuid,
        NULLIF(p_payload->>'progress_id', '')::uuid, COALESCE((p_payload->>'approval_level')::integer, 1),
        'Pending'::"public"."approval_status_type", NULL, NULLIF(p_payload->>'approval_comment', ''), NULL,
        p_actor_id, COALESCE((p_payload->>'requested_at')::timestamptz, now()),
        COALESCE((p_payload->>'created_at')::timestamptz, now()), NULL
    ) RETURNING * INTO v_row;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id, event_type,
        event_timestamp, performed_by, user_role, field_name, old_value, new_value, change_reason
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'APPROVAL', v_row.approval_id,
        'Create'::"public"."audit_event_type", now(), p_actor_id, 'submitter',
        'approval_status', NULL, 'Pending', COALESCE(v_row.approval_comment, 'Approval Request Created')
    );
    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_update_approval_atomic"(
    "p_approval_id" uuid, "p_payload" jsonb, "p_actor_id" uuid, "p_audit_id" uuid
) RETURNS "public"."approval"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_old "public"."approval"; v_row "public"."approval"; v_event "public"."audit_event_type";
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    SELECT * INTO STRICT v_old FROM "public"."approval" WHERE approval_id = p_approval_id FOR UPDATE;

    UPDATE "public"."approval" SET
        approval_status = (p_payload->>'approval_status')::"public"."approval_status_type",
        approved_by = p_actor_id,
        approval_date = CASE WHEN p_payload->>'approval_status' = 'Approved'
            THEN COALESCE((p_payload->>'approval_date')::timestamptz, now()) ELSE approval_date END,
        approval_comment = CASE WHEN p_payload ? 'approval_comment'
            THEN NULLIF(p_payload->>'approval_comment', '') ELSE approval_comment END,
        updated_at = COALESCE((p_payload->>'updated_at')::timestamptz, now())
    WHERE approval_id = p_approval_id RETURNING * INTO v_row;

    v_event := CASE v_row.approval_status
        WHEN 'Approved' THEN 'Approve'::"public"."audit_event_type"
        WHEN 'Rejected' THEN 'Reject'::"public"."audit_event_type"
        ELSE 'Update'::"public"."audit_event_type" END;

    INSERT INTO "public"."audit" (
        audit_id, programme_id, revision_id, entity_name, entity_id, event_type,
        event_timestamp, performed_by, user_role, field_name, old_value, new_value, change_reason
    ) VALUES (
        p_audit_id, v_row.programme_id, v_row.revision_id, 'APPROVAL', v_row.approval_id,
        v_event, now(), p_actor_id, 'approver', 'approval_status', v_old.approval_status::text,
        v_row.approval_status::text, COALESCE(v_row.approval_comment, 'Approval status updated to ' || v_row.approval_status::text)
    );
    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_create_progress_atomic"(
    "p_payload" jsonb, "p_actor_id" uuid, "p_progress_id" uuid, "p_audit_id" uuid,
    "p_complete_activity" boolean, "p_activity_log_id" uuid
) RETURNS "public"."progress"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_row "public"."progress"; v_activity "public"."activity";
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    SELECT * INTO STRICT v_activity FROM "public"."activity"
      WHERE activity_id = (p_payload->>'activity_id')::uuid FOR UPDATE;

    INSERT INTO "public"."progress" (
        progress_id, programme_id, revision_id, activity_id, site_diary_id, measurement_date,
        progress_type, planned_quantity, actual_quantity, unit, progress_percentage,
        measurement_status, verified_by, verified_at, approved_by, approved_at, created_at, updated_at
    ) VALUES (
        p_progress_id, (p_payload->>'programme_id')::uuid, (p_payload->>'revision_id')::uuid,
        (p_payload->>'activity_id')::uuid, (p_payload->>'site_diary_id')::uuid,
        (p_payload->>'measurement_date')::date,
        NULLIF(p_payload->>'progress_type', '')::"public"."progress_measurement_type",
        NULLIF(p_payload->>'planned_quantity', '')::numeric, (p_payload->>'actual_quantity')::numeric,
        NULLIF(p_payload->>'unit', ''), NULLIF(p_payload->>'progress_percentage', '')::numeric,
        COALESCE(NULLIF(p_payload->>'measurement_status', '')::"public"."progress_measurement_status", 'Draft'),
        CASE WHEN p_payload->>'measurement_status' = 'Verified' THEN p_actor_id ELSE NULL END,
        CASE WHEN p_payload->>'measurement_status' = 'Verified' THEN now() ELSE NULL END,
        CASE WHEN p_payload->>'measurement_status' = 'Approved' THEN p_actor_id ELSE NULL END,
        CASE WHEN p_payload->>'measurement_status' = 'Approved' THEN now() ELSE NULL END,
        COALESCE((p_payload->>'created_at')::timestamptz, now()), NULL
    ) RETURNING * INTO v_row;

    IF p_complete_activity THEN
        UPDATE "public"."activity" SET status = 'Completed', completed_date = CURRENT_DATE, updated_at = now()
          WHERE activity_id = v_row.activity_id RETURNING * INTO v_activity;
        INSERT INTO "public"."activity_logs" (log_id, activity_id, event_type, snapshot_data, logged_by, logged_at)
          VALUES (p_activity_log_id, v_activity.activity_id, 'UPDATE', to_jsonb(v_activity), p_actor_id, now());
    END IF;

    INSERT INTO "public"."audit" (audit_id, programme_id, revision_id, entity_name, entity_id,
        event_type, event_timestamp, performed_by)
      VALUES (p_audit_id, v_row.programme_id, v_row.revision_id, 'Progress', v_row.progress_id,
        'Create', now(), p_actor_id);
    RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."a27_update_progress_atomic"(
    "p_progress_id" uuid, "p_payload" jsonb, "p_actor_id" uuid, "p_audit_id" uuid,
    "p_complete_activity" boolean, "p_activity_log_id" uuid
) RETURNS "public"."progress"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_row "public"."progress"; v_existing "public"."progress"; v_activity "public"."activity";
BEGIN
    PERFORM "private"."a27_assert_actor"(p_actor_id);
    SELECT * INTO STRICT v_existing FROM "public"."progress" WHERE progress_id = p_progress_id;
    SELECT * INTO STRICT v_activity FROM "public"."activity" WHERE activity_id = v_existing.activity_id FOR UPDATE;
    SELECT * INTO STRICT v_existing FROM "public"."progress" WHERE progress_id = p_progress_id FOR UPDATE;

    UPDATE "public"."progress" SET
        actual_quantity = CASE WHEN p_payload ? 'actual_quantity' THEN (p_payload->>'actual_quantity')::numeric ELSE actual_quantity END,
        progress_percentage = CASE WHEN p_payload ? 'progress_percentage' THEN (p_payload->>'progress_percentage')::numeric ELSE progress_percentage END,
        measurement_status = CASE WHEN p_payload ? 'measurement_status' THEN (p_payload->>'measurement_status')::"public"."progress_measurement_status" ELSE measurement_status END,
        verified_by = CASE WHEN p_payload->>'measurement_status' = 'Verified' THEN p_actor_id ELSE verified_by END,
        verified_at = CASE WHEN p_payload->>'measurement_status' = 'Verified' THEN COALESCE((p_payload->>'verified_at')::timestamptz, now()) ELSE verified_at END,
        approved_by = CASE WHEN p_payload->>'measurement_status' = 'Approved' THEN p_actor_id ELSE approved_by END,
        approved_at = CASE WHEN p_payload->>'measurement_status' = 'Approved' THEN COALESCE((p_payload->>'approved_at')::timestamptz, now()) ELSE approved_at END,
        updated_at = COALESCE((p_payload->>'updated_at')::timestamptz, now())
      WHERE progress_id = p_progress_id RETURNING * INTO v_row;

    IF p_complete_activity THEN
        UPDATE "public"."activity" SET status = 'Completed', completed_date = CURRENT_DATE, updated_at = now()
          WHERE activity_id = v_row.activity_id RETURNING * INTO v_activity;
        INSERT INTO "public"."activity_logs" (log_id, activity_id, event_type, snapshot_data, logged_by, logged_at)
          VALUES (p_activity_log_id, v_activity.activity_id, 'UPDATE', to_jsonb(v_activity), p_actor_id, now());
    END IF;

    INSERT INTO "public"."audit" (audit_id, programme_id, revision_id, entity_name, entity_id,
        event_type, event_timestamp, performed_by)
      VALUES (p_audit_id, v_row.programme_id, v_row.revision_id, 'Progress', v_row.progress_id,
        'Update', now(), p_actor_id);
    RETURN v_row;
END;
$$;

-- Data API wrappers: invoker security, authenticated JWT required, no caller-selected actor.
CREATE OR REPLACE FUNCTION "public"."a27_create_approval_atomic"(p_payload jsonb, p_actor_id uuid, p_approval_id uuid, p_audit_id uuid)
RETURNS "public"."approval" LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT "private"."a27_create_approval_atomic"($1,$2,$3,$4) $$;
CREATE OR REPLACE FUNCTION "public"."a27_update_approval_atomic"(p_approval_id uuid, p_payload jsonb, p_actor_id uuid, p_audit_id uuid)
RETURNS "public"."approval" LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT "private"."a27_update_approval_atomic"($1,$2,$3,$4) $$;
CREATE OR REPLACE FUNCTION "public"."a27_create_progress_atomic"(p_payload jsonb, p_actor_id uuid, p_progress_id uuid, p_audit_id uuid, p_complete_activity boolean, p_activity_log_id uuid)
RETURNS "public"."progress" LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT "private"."a27_create_progress_atomic"($1,$2,$3,$4,$5,$6) $$;
CREATE OR REPLACE FUNCTION "public"."a27_update_progress_atomic"(p_progress_id uuid, p_payload jsonb, p_actor_id uuid, p_audit_id uuid, p_complete_activity boolean, p_activity_log_id uuid)
RETURNS "public"."progress" LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT "private"."a27_update_progress_atomic"($1,$2,$3,$4,$5,$6) $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "private" FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."a27_create_approval_atomic"(jsonb,uuid,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."a27_update_approval_atomic"(uuid,jsonb,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."a27_create_progress_atomic"(jsonb,uuid,uuid,uuid,boolean,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION "public"."a27_update_progress_atomic"(uuid,jsonb,uuid,uuid,boolean,uuid) FROM PUBLIC, anon;
-- Fail closed. The following corrective A27 migration installs invariant-enforcing
-- public boundaries and grants only their exact signatures. Private helpers are
-- never directly executable by Data API roles.
REVOKE USAGE ON SCHEMA "private" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "private" FROM PUBLIC, anon, authenticated;
