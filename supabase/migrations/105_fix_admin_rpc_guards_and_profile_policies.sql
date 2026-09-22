-- 105_fix_admin_rpc_guards_and_profile_policies.sql
--
-- ############ RUN THIS NOW — 104 LEFT A LIVE HOLE ############
--
-- Two defects found by probing the database after 104 was applied.
--
-- (1) URGENT. get_admin_enrollments / get_admin_enrollment_detail are callable
--     by ANYONE, and return every student's and teacher's email address.
--     Measured with nothing but the public anon key:
--         p_view='student' -> 3 rows incl. email
--         p_view='teacher' -> 5 rows incl. email
--     Because these are SECURITY DEFINER they run as the owner, so they walk
--     straight past the RLS that 104 added. This is worse than the leak 104
--     set out to close, and it is my bug, introduced in 104.
--
--     Two causes, both fixed here:
--       a. The guard read `IF current_profile_role() <> 'super_admin' THEN
--          RAISE`. For an anonymous caller that function returns NULL, and
--          `NULL <> 'super_admin'` is NULL, which IF treats as false — so the
--          exception never fired. Now uses IS DISTINCT FROM plus an explicit
--          auth.uid() check.
--       b. `GRANT EXECUTE ... TO authenticated` does not exclude anyone:
--          Supabase's default privileges already grant EXECUTE on new
--          functions to PUBLIC, which includes anon. Now revoked explicitly.
--
-- (2) The row half of 104's profiles lockdown did not take. The column grants
--     worked (anon gets 401 on email / grade / shamcash_account_number) but
--     anon could still see all 3 student rows and the super_admin row and read
--     full_name. Cause: 104 dropped only the policies it was about to create,
--     by name. Postgres OR-s permissive policies together, so an older policy
--     left over from an earlier migration keeps granting everything. This drops
--     every policy on profiles whatever it is named, then recreates the
--     intended set — which is the complete access model for the table.
--
-- HOW TO APPLY: Supabase SQL editor, Ayman Academy project
-- (ref lkdbinrwojvrchunzqfq). Never `supabase db push` on this project.

BEGIN;

DO $preflight$
BEGIN
    IF to_regclass('public.profiles') IS NULL OR to_regclass('public.subjects') IS NULL THEN
        RAISE EXCEPTION
            'Wrong database: core tables missing. This belongs to the Ayman Academy project (ref lkdbinrwojvrchunzqfq).';
    END IF;
END
$preflight$;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. URGENT — close the admin RPC hole
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role::text FROM profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated, anon;

-- A single place to express "the caller is an admin", written so that a NULL
-- role (no session at all) is false rather than NULL.
CREATE OR REPLACE FUNCTION public.is_admin_caller()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
       AND COALESCE(public.current_profile_role(), '') = 'super_admin';
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_caller() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_caller() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_admin_enrollments(
    p_view     text DEFAULT 'subject',
    p_search   text DEFAULT '',
    p_stage_id uuid DEFAULT NULL,
    p_page     int  DEFAULT 1,
    p_limit    int  DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offset int := GREATEST(p_page - 1, 0) * GREATEST(p_limit, 1);
    v_search text := '%' || COALESCE(NULLIF(trim(p_search), ''), '') || '%';
    v_rows   jsonb;
    v_total  int;
BEGIN
    -- NOT `<> 'super_admin'`: that is NULL for an anonymous caller and IF
    -- treats NULL as false, which is exactly how this leaked.
    IF NOT public.is_admin_caller() THEN
        RAISE EXCEPTION 'Not allowed';
    END IF;

    IF p_view = 'teacher' THEN
        SELECT COUNT(*) INTO v_total
          FROM profiles p
         WHERE p.role = 'teacher'
           AND (p.full_name ILIKE v_search OR p.email ILIKE v_search);

        SELECT COALESCE(jsonb_agg(r ORDER BY r->>'full_name'), '[]'::jsonb) INTO v_rows
        FROM (
            SELECT jsonb_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'email', p.email,
                'student_count', (
                    SELECT COUNT(DISTINCT ss.student_id)
                      FROM student_subjects ss
                      JOIN subjects s ON s.id = ss.subject_id
                     WHERE s.teacher_id = p.id
                ),
                'lesson_count', (
                    SELECT COUNT(*)
                      FROM lessons l
                      JOIN subjects s ON s.id = l.subject_id
                     WHERE s.teacher_id = p.id
                ),
                'created_at', p.created_at
            ) AS r
              FROM profiles p
             WHERE p.role = 'teacher'
               AND (p.full_name ILIKE v_search OR p.email ILIKE v_search)
             ORDER BY p.full_name
             LIMIT GREATEST(p_limit, 1) OFFSET v_offset
        ) sub;

    ELSIF p_view = 'student' THEN
        SELECT COUNT(*) INTO v_total
          FROM profiles p
         WHERE p.role = 'student'
           AND (p.full_name ILIKE v_search OR p.email ILIKE v_search);

        SELECT COALESCE(jsonb_agg(r ORDER BY r->>'full_name'), '[]'::jsonb) INTO v_rows
        FROM (
            SELECT jsonb_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'email', p.email,
                'subject_count', (
                    SELECT COUNT(*) FROM student_subjects ss WHERE ss.student_id = p.id
                ),
                'last_activity', (
                    SELECT MAX(lp.updated_at) FROM lesson_progress lp WHERE lp.user_id = p.id
                ),
                'created_at', p.created_at
            ) AS r
              FROM profiles p
             WHERE p.role = 'student'
               AND (p.full_name ILIKE v_search OR p.email ILIKE v_search)
             ORDER BY p.full_name
             LIMIT GREATEST(p_limit, 1) OFFSET v_offset
        ) sub;

    ELSE
        SELECT COUNT(*) INTO v_total
          FROM subjects s
         WHERE (p_stage_id IS NULL OR s.stage_id = p_stage_id)
           AND (s.title_ar ILIKE v_search OR COALESCE(s.title_en, '') ILIKE v_search);

        SELECT COALESCE(jsonb_agg(r ORDER BY r->>'title_ar'), '[]'::jsonb) INTO v_rows
        FROM (
            SELECT jsonb_build_object(
                'id', s.id,
                'title_ar', s.title_ar,
                'title_en', s.title_en,
                'stage_title', (SELECT st.title_ar FROM stages st WHERE st.id = s.stage_id),
                'student_count', (
                    SELECT COUNT(*) FROM student_subjects ss WHERE ss.subject_id = s.id
                ),
                'avg_progress', COALESCE((
                    SELECT ROUND(AVG(lp.progress_percent)::numeric, 0)
                      FROM lesson_progress lp
                      JOIN lessons l ON l.id = lp.lesson_id
                     WHERE l.subject_id = s.id
                ), 0),
                'created_at', s.created_at
            ) AS r
              FROM subjects s
             WHERE (p_stage_id IS NULL OR s.stage_id = p_stage_id)
               AND (s.title_ar ILIKE v_search OR COALESCE(s.title_en, '') ILIKE v_search)
             ORDER BY s.title_ar
             LIMIT GREATEST(p_limit, 1) OFFSET v_offset
        ) sub;
    END IF;

    RETURN jsonb_build_object('data', COALESCE(v_rows, '[]'::jsonb), 'total', COALESCE(v_total, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_enrollment_detail(
    p_view text,
    p_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rows jsonb;
BEGIN
    IF NOT public.is_admin_caller() THEN
        RAISE EXCEPTION 'Not allowed';
    END IF;

    IF p_view = 'teacher' THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', s.id,
            'title_ar', s.title_ar,
            'title_en', s.title_en,
            'student_count', (SELECT COUNT(*) FROM student_subjects ss WHERE ss.subject_id = s.id),
            'created_at', s.created_at
        )), '[]'::jsonb) INTO v_rows
          FROM subjects s
         WHERE s.teacher_id = p_id;

    ELSIF p_view = 'student' THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', s.id,
            'title_ar', s.title_ar,
            'title_en', s.title_en,
            'created_at', ss.created_at
        )), '[]'::jsonb) INTO v_rows
          FROM student_subjects ss
          JOIN subjects s ON s.id = ss.subject_id
         WHERE ss.student_id = p_id;

    ELSE
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'email', p.email,
            'created_at', ss.created_at
        )), '[]'::jsonb) INTO v_rows
          FROM student_subjects ss
          JOIN profiles p ON p.id = ss.student_id
         WHERE ss.subject_id = p_id;
    END IF;

    RETURN COALESCE(v_rows, '[]'::jsonb);
END;
$$;

-- Supabase grants EXECUTE on new functions to PUBLIC by default, so granting
-- to `authenticated` never excluded anon. Revoke explicitly, then re-grant.
REVOKE EXECUTE ON FUNCTION public.get_admin_enrollments(text, text, uuid, int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_enrollment_detail(text, uuid)            FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_admin_enrollments(text, text, uuid, int, int)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_admin_enrollment_detail(text, uuid)            TO authenticated;

-- The certificate functions already refuse anonymous callers (they check
-- auth.uid() first), but anon has no reason to reach them at all.
REVOKE EXECUTE ON FUNCTION public.request_certificate(uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_certificate(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_certificate(uuid)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.request_certificate(uuid)       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_approve_certificate(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_revoke_certificate(uuid)  TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. profiles — drop leftover policies, then set the intended model
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $wipe$
DECLARE
    v_policy record;
BEGIN
    FOR v_policy IN
        SELECT policyname FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', v_policy.policyname);
        RAISE NOTICE 'dropped leftover policy % on profiles', v_policy.policyname;
    END LOOP;
END
$wipe$;

-- Logged-out visitors: active teachers only, for the public instructors list,
-- teacher pages and course previews. 104's column grants additionally keep
-- email and the Sham Cash account out of reach.
CREATE POLICY profiles_select_public_teachers ON public.profiles
    FOR SELECT TO anon
    USING (role = 'teacher' AND COALESCE(is_active, true));

CREATE POLICY profiles_select_self ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- Teacher and admin rows: needed for listings, messaging contacts, and
-- checkout, which shows the teacher's Sham Cash details to the student.
CREATE POLICY profiles_select_staff ON public.profiles
    FOR SELECT TO authenticated
    USING (role IN ('teacher', 'super_admin'));

-- Teachers and admins may read student rows (orders, enrollments, messages,
-- certificates). Students cannot read one another.
CREATE POLICY profiles_select_students_staff ON public.profiles
    FOR SELECT TO authenticated
    USING (
        role = 'student'
        AND COALESCE(public.current_profile_role(), '') IN ('teacher', 'super_admin')
    );

CREATE POLICY profiles_update_self ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_admin ON public.profiles
    FOR UPDATE TO authenticated
    USING (COALESCE(public.current_profile_role(), '') = 'super_admin');

CREATE POLICY profiles_insert_self ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

COMMIT;

-- ── Check the result ─────────────────────────────────────────────────────
--   SELECT relrowsecurity AS rls_enabled
--     FROM pg_class WHERE oid = 'public.profiles'::regclass;
--
--   SELECT policyname, cmd, roles FROM pg_policies
--    WHERE schemaname='public' AND tablename='profiles' ORDER BY policyname;
--
-- Expect rls_enabled = true and exactly the seven policies above.
