-- 104_rls_and_missing_rpcs.sql
--
-- Findings from an audit of every table and RPC the two clients touch
-- (39 tables, 12 functions), probed against the live database on 2026-09-22.
--
-- What was actually wrong:
--
--  1. SECURITY: `profiles` was readable in full by anonymous callers. Every row
--     of every role came back, including `email`, `grade`, `student_stage` and
--     teachers' `shamcash_account_name` / `shamcash_account_number`. The anon
--     key is public by design — it ships inside the APK and the web bundle —
--     so this was world-readable. Verified by querying with the anon key alone.
--
--  2. Five functions the UI calls do not exist, so those buttons always fail:
--       request_certificate, admin_approve_certificate, admin_revoke_certificate,
--       get_admin_enrollments, get_admin_enrollment_detail
--
--  3. `teacher_evaluations` does not exist; src/lib/teacherEvaluationService.ts
--     reads and upserts it.
--
-- What was NOT wrong, so this migration leaves it alone: writes are correctly
-- refused for anonymous callers on all 33 other tables. `teacher_applications`
-- accepts anonymous INSERT by design (the public /apply/teacher form) and keeps
-- doing so.
--
-- HOW TO APPLY: paste into the Supabase SQL editor and run.
-- Do NOT use `supabase db push` on this project — 100_clean_rewrite.sql is still
-- in the migrations folder and would drop the entire public schema.
--
-- Re-runnable: every statement is guarded or uses CREATE OR REPLACE.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- 0. Preflight — make sure this is the right database
-- ═══════════════════════════════════════════════════════════════════════
--
-- This account has several Supabase projects. Running this against the wrong
-- one would create policies and functions in a database they do not belong to,
-- which is far worse than failing. Stop immediately unless the core tables of
-- the Ayman Academy schema are present.
--
-- Expected project ref: lkdbinrwojvrchunzqfq  ("Ayman Academy")
-- Dashboard: https://supabase.com/dashboard/project/lkdbinrwojvrchunzqfq/sql/new

DO $preflight$
DECLARE
    v_missing text[] := ARRAY[]::text[];
    v_table   text;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'public.profiles', 'public.subjects', 'public.lessons',
        'public.stages', 'public.certificates', 'public.student_subjects'
    ] LOOP
        IF to_regclass(v_table) IS NULL THEN
            v_missing := array_append(v_missing, v_table);
        END IF;
    END LOOP;

    IF array_length(v_missing, 1) > 0 THEN
        RAISE EXCEPTION
            'Wrong database: % missing. This migration belongs to the Ayman Academy project (ref lkdbinrwojvrchunzqfq). Open that project''s SQL editor and run it there.',
            array_to_string(v_missing, ', ');
    END IF;
END
$preflight$;

-- ═══════════════════════════════════════════════════════════════════════
-- 0b. Housekeeping
-- ═══════════════════════════════════════════════════════════════════════

-- The RLS audit inserted one canary row while proving that anonymous INSERT is
-- accepted here. Anonymous callers cannot read this table, so it could not be
-- verified or removed from the client side.
--
-- Guarded by to_regclass: teacher_applications is a later addition and is not
-- present in every copy of this schema, and a cosmetic cleanup must never be
-- what stops the security fix from applying.
DO $cleanup$
BEGIN
    IF to_regclass('public.teacher_applications') IS NOT NULL THEN
        DELETE FROM public.teacher_applications
         WHERE email = 'rls-probe@example.invalid';
    END IF;
END
$cleanup$;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. profiles — lock down reads
-- ═══════════════════════════════════════════════════════════════════════

-- Role lookup helper. SECURITY DEFINER so that a policy ON profiles can ask
-- "what role is the caller?" without re-entering profiles' own RLS — that
-- recursion is what 013_fix_rls_recursion.sql had to clean up once already.
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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_public_teachers ON profiles;
DROP POLICY IF EXISTS profiles_select_self            ON profiles;
DROP POLICY IF EXISTS profiles_select_staff           ON profiles;
DROP POLICY IF EXISTS profiles_select_students_staff  ON profiles;
DROP POLICY IF EXISTS profiles_update_self            ON profiles;
DROP POLICY IF EXISTS profiles_update_admin           ON profiles;
DROP POLICY IF EXISTS profiles_insert_self            ON profiles;

-- Public teacher pages (instructors list, teacher profile, course preview)
-- need teacher rows without a login. Only active teachers, nothing else.
CREATE POLICY profiles_select_public_teachers ON profiles
    FOR SELECT TO anon
    USING (role = 'teacher' AND COALESCE(is_active, true));

-- Everyone signed in can read their own row.
CREATE POLICY profiles_select_self ON profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- Signed-in users can read teacher and admin rows: teacher listings, messaging
-- contacts, and checkout (which reads the teacher's Sham Cash details to show
-- the student where to send payment).
CREATE POLICY profiles_select_staff ON profiles
    FOR SELECT TO authenticated
    USING (role IN ('teacher', 'super_admin'));

-- Teachers and admins can read student rows (orders, enrollments, messages,
-- certificates). Students cannot read each other.
CREATE POLICY profiles_select_students_staff ON profiles
    FOR SELECT TO authenticated
    USING (
        role = 'student'
        AND public.current_profile_role() IN ('teacher', 'super_admin')
    );

CREATE POLICY profiles_update_self ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_admin ON profiles
    FOR UPDATE TO authenticated
    USING (public.current_profile_role() = 'super_admin');

-- The signup trigger runs as definer, but keep the self-insert path working.
CREATE POLICY profiles_insert_self ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- Row policies alone would still hand a teacher's email and payment account to
-- any anonymous visitor, because public teacher pages are allowed to read those
-- rows. Column privileges close that: anon may read a teacher's public-facing
-- fields and nothing else.
-- NOTE: this makes `select('*')` fail for anonymous callers, which is why
-- TeacherPublicProfile.tsx now lists its columns explicitly.
REVOKE SELECT ON profiles FROM anon;
GRANT SELECT (
    id, full_name, avatar_url, bio_ar, bio_en, role, is_active,
    social_links, expertise_tags_ar, expertise_tags_en,
    home_order, show_on_home, created_at
) ON profiles TO anon;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. teacher_evaluations — table referenced by the app but never created
-- ═══════════════════════════════════════════════════════════════════════

-- Depends on subjects, which the preflight has already confirmed.
CREATE TABLE IF NOT EXISTS teacher_evaluations (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id               uuid NOT NULL UNIQUE REFERENCES subjects(id) ON DELETE CASCADE,
    quality_score            numeric,
    difficulty_balance_score numeric,
    engagement_score         numeric,
    dropout_risk             text,
    detected_issues          jsonb DEFAULT '[]'::jsonb,
    recommendations          jsonb DEFAULT '[]'::jsonb,
    evaluated_at             timestamptz DEFAULT now(),
    created_at               timestamptz DEFAULT now()
);

ALTER TABLE teacher_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_evaluations_rw ON teacher_evaluations;

-- The evaluation of a course is for its own teacher and for admins.
CREATE POLICY teacher_evaluations_rw ON teacher_evaluations
    FOR ALL TO authenticated
    USING (
        public.current_profile_role() = 'super_admin'
        OR EXISTS (
            SELECT 1 FROM subjects s
             WHERE s.id = teacher_evaluations.subject_id
               AND s.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        public.current_profile_role() = 'super_admin'
        OR EXISTS (
            SELECT 1 FROM subjects s
             WHERE s.id = teacher_evaluations.subject_id
               AND s.teacher_id = auth.uid()
        )
    );

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Certificate functions the UI calls but which do not exist
-- ═══════════════════════════════════════════════════════════════════════

-- Student taps "Request certificate" (Flutter CertificateService).
-- Returns {status, ...} the way the existing issue_certificate does.
CREATE OR REPLACE FUNCTION public.request_certificate(p_subject_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id uuid := auth.uid();
    v_existing   certificates%ROWTYPE;
    v_new_id     uuid;
BEGIN
    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'error', 'Not authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM subjects WHERE id = p_subject_id) THEN
        RETURN jsonb_build_object('status', 'error', 'error', 'Subject not found');
    END IF;

    SELECT * INTO v_existing
      FROM certificates
     WHERE student_id = v_student_id
       AND subject_id = p_subject_id
     ORDER BY created_at DESC
     LIMIT 1;

    IF FOUND THEN
        -- Already issued, or a request is already in flight: say so rather
        -- than stacking duplicate rows.
        IF v_existing.status IN ('issued', 'valid') THEN
            RETURN jsonb_build_object('status', 'already_exists', 'certificate_id', v_existing.id);
        END IF;
        IF v_existing.status = 'pending_approval' THEN
            RETURN jsonb_build_object('status', 'pending', 'certificate_id', v_existing.id);
        END IF;
        IF v_existing.status = 'revoked' THEN
            RETURN jsonb_build_object('status', 'error', 'error', 'Certificate was revoked');
        END IF;

        UPDATE certificates
           SET status = 'pending_approval'
         WHERE id = v_existing.id;

        RETURN jsonb_build_object('status', 'pending', 'certificate_id', v_existing.id);
    END IF;

    INSERT INTO certificates (student_id, subject_id, status)
    VALUES (v_student_id, p_subject_id, 'pending_approval')
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('status', 'pending', 'certificate_id', v_new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_certificate(uuid) TO authenticated;

-- Teacher/admin approves a pending certificate.
CREATE OR REPLACE FUNCTION public.admin_approve_certificate(p_certificate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role    text := public.current_profile_role();
    v_subject uuid;
    v_owner   uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'error', 'Not authenticated');
    END IF;

    SELECT c.subject_id, s.teacher_id
      INTO v_subject, v_owner
      FROM certificates c
      JOIN subjects s ON s.id = c.subject_id
     WHERE c.id = p_certificate_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'error', 'Certificate not found');
    END IF;

    -- A teacher may only approve certificates for their own course.
    IF v_role <> 'super_admin' AND v_owner IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('status', 'error', 'error', 'Not allowed');
    END IF;

    UPDATE certificates
       SET status            = 'issued',
           issued_at         = COALESCE(issued_at, now()),
           verification_code = COALESCE(
               verification_code,
               upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
           )
     WHERE id = p_certificate_id;

    RETURN jsonb_build_object('status', 'issued', 'certificate_id', p_certificate_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_certificate(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revoke_certificate(p_certificate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role    text := public.current_profile_role();
    v_owner   uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'error', 'Not authenticated');
    END IF;

    SELECT s.teacher_id
      INTO v_owner
      FROM certificates c
      JOIN subjects s ON s.id = c.subject_id
     WHERE c.id = p_certificate_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'error', 'error', 'Certificate not found');
    END IF;

    IF v_role <> 'super_admin' AND v_owner IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('status', 'error', 'error', 'Not allowed');
    END IF;

    UPDATE certificates
       SET status = 'revoked'
     WHERE id = p_certificate_id;

    RETURN jsonb_build_object('status', 'revoked', 'certificate_id', p_certificate_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_revoke_certificate(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Admin "Enrollments Explorer" functions
--    Shapes match src/pages/admin/EnrollmentsExplorer.tsx exactly:
--    the list returns { data: [...], total: n }; the detail returns an array.
-- ═══════════════════════════════════════════════════════════════════════

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
    IF public.current_profile_role() <> 'super_admin' THEN
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
                    SELECT MAX(lp.updated_at)
                      FROM lesson_progress lp
                     WHERE lp.user_id = p.id
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
        -- 'subject' and 'course' are the same entity here; 'subject' also
        -- reports the stage and average progress.
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

GRANT EXECUTE ON FUNCTION public.get_admin_enrollments(text, text, uuid, int, int) TO authenticated;

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
    IF public.current_profile_role() <> 'super_admin' THEN
        RAISE EXCEPTION 'Not allowed';
    END IF;

    IF p_view = 'teacher' THEN
        -- The teacher's courses.
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
        -- The courses this student is enrolled in.
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
        -- Students enrolled in this course.
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

GRANT EXECUTE ON FUNCTION public.get_admin_enrollment_detail(text, uuid) TO authenticated;

COMMIT;
