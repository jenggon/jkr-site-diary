


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."msp_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "revision_id" "uuid" NOT NULL,
    "task_uid" "text" NOT NULL,
    "resource_uid" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."msp_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."msp_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "revision_id" "uuid" NOT NULL,
    "resource_uid" "text" NOT NULL,
    "resource_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."msp_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."msp_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "revision_id" "uuid" NOT NULL,
    "uid" "text" NOT NULL,
    "wbs" "text",
    "task_name" "text" NOT NULL,
    "summary_path" "text",
    "resource_names" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "outline_number" "text",
    "outline_level" integer,
    "start_date" timestamp with time zone,
    "finish_date" timestamp with time zone,
    "summary" boolean DEFAULT false,
    "task_uid" "text"
);


ALTER TABLE "public"."msp_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."programme_revisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "revision_name" "text" NOT NULL,
    "revision_date" "date",
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."programme_revisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_code" "text",
    "project_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_diary" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "weather" "text",
    "ahi" "text",
    "subtask" "text",
    "work_status" "text",
    "activity_date" "date",
    "manpower" "jsonb",
    "notes" "text",
    "submitted_by" "text",
    "updated_at" timestamp with time zone,
    "actual_start_date" "date"
);


ALTER TABLE "public"."site_diary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_diary_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_diary_id" "uuid",
    "action" "text" NOT NULL,
    "ahi" "text",
    "ahi_name" "text",
    "subtask" "text",
    "subtask_name" "text",
    "work_status" "text",
    "activity_date" "date",
    "actual_start_date" "date",
    "weather" "text",
    "notes" "text",
    "manpower" "jsonb",
    "submitted_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."site_diary_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trade_library" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trade_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trade_library" OWNER TO "postgres";


ALTER TABLE ONLY "public"."msp_assignments"
    ADD CONSTRAINT "msp_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."msp_resources"
    ADD CONSTRAINT "msp_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."msp_tasks"
    ADD CONSTRAINT "msp_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."programme_revisions"
    ADD CONSTRAINT "programme_revisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_diary_logs"
    ADD CONSTRAINT "site_diary_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_diary"
    ADD CONSTRAINT "site_diary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_library"
    ADD CONSTRAINT "trade_library_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_library"
    ADD CONSTRAINT "trade_library_trade_name_key" UNIQUE ("trade_name");



CREATE UNIQUE INDEX "idx_msp_resource_uid" ON "public"."msp_resources" USING "btree" ("revision_id", "resource_uid");



CREATE UNIQUE INDEX "idx_msp_task_uid" ON "public"."msp_tasks" USING "btree" ("revision_id", "task_uid");



ALTER TABLE ONLY "public"."site_diary_logs"
    ADD CONSTRAINT "fk_site_diary_logs" FOREIGN KEY ("site_diary_id") REFERENCES "public"."site_diary"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."msp_assignments"
    ADD CONSTRAINT "msp_assignments_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "public"."programme_revisions"("id");



ALTER TABLE ONLY "public"."msp_resources"
    ADD CONSTRAINT "msp_resources_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "public"."programme_revisions"("id");



ALTER TABLE ONLY "public"."msp_tasks"
    ADD CONSTRAINT "msp_tasks_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "public"."programme_revisions"("id");



ALTER TABLE ONLY "public"."programme_revisions"
    ADD CONSTRAINT "programme_revisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."site_diary"
    ADD CONSTRAINT "site_diary_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."msp_assignments" TO "anon";
GRANT ALL ON TABLE "public"."msp_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."msp_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."msp_resources" TO "anon";
GRANT ALL ON TABLE "public"."msp_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."msp_resources" TO "service_role";



GRANT ALL ON TABLE "public"."msp_tasks" TO "anon";
GRANT ALL ON TABLE "public"."msp_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."msp_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."programme_revisions" TO "anon";
GRANT ALL ON TABLE "public"."programme_revisions" TO "authenticated";
GRANT ALL ON TABLE "public"."programme_revisions" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."site_diary" TO "anon";
GRANT ALL ON TABLE "public"."site_diary" TO "authenticated";
GRANT ALL ON TABLE "public"."site_diary" TO "service_role";



GRANT ALL ON TABLE "public"."site_diary_logs" TO "anon";
GRANT ALL ON TABLE "public"."site_diary_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."site_diary_logs" TO "service_role";



GRANT ALL ON TABLE "public"."trade_library" TO "anon";
GRANT ALL ON TABLE "public"."trade_library" TO "authenticated";
GRANT ALL ON TABLE "public"."trade_library" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







