-- 109_lock_lesson_content_reads.sql
--
-- ############ NOT APPLIED — paste into the SQL editor to run ############
--   https://supabase.com/dashboard/project/lkdbinrwojvrchunzqfq/sql/new
--
-- Apply AFTER 108_lesson_summaries.sql. Section 4 replaces a policy 108
-- creates, so applying 109 alone fails there.
-- Rollback: 109_ROLLBACK.sql restores the exact pre-109 state of these two
-- tables.
--
-- ═══════════════════════════════════════════════════════════════════════
-- WHAT THIS FIXES
-- ═══════════════════════════════════════════════════════════════════════
--
-- `lesson_sections` and `lesson_blocks` each carried TWO unconditional
-- `SELECT USING (true)` policies. Combined with the anon table grants from
-- 050 and 1001, the full body of every paid lesson was readable by anyone
-- holding the public anon key — which ships inside the Android APK. No client
-- checked access either: LessonPlayer.tsx, LessonPage.tsx and CoursePreview.tsx
-- make no access call, so RLS was the only guard and it was open.
--
-- ═══════════════════════════════════════════════════════════════════════
-- THE EIGHT POLICIES THIS REPLACES (read from live pg_policies, pre-109)
-- ═══════════════════════════════════════════════════════════════════════
--
-- lesson_blocks:
--   "Admins full access lesson_blocks"  ALL    TO public  USING (super_admin), no WITH CHECK
--   "blocks_manage"                     ALL    TO public  USING (lesson creator OR is_super_admin())
--   "blocks_select"                     SELECT            USING (true)
--   "Anyone can read published blocks"  SELECT            USING (true)
-- lesson_sections: the same four shapes
--   "Admins full access lesson_sections", "sections_manage",
--   "sections_select", "Anyone can read lesson_sections"
--
-- So live WRITE access was **creator-or-super_admin**, NOT the
-- `check_user_role(ARRAY['super_admin','teacher'])` that migrations 038/039/040
-- in this folder suggest. Those files were never the live state.
--
-- `can_edit_lesson_content()` below therefore SLIGHTLY WIDENS writes: it adds
-- the subject's owning teacher (`subjects.teacher_id = auth.uid()`) alongside
-- the lesson's creator and super_admin. Deliberate and approved — a teacher who
-- owns a course but did not personally create a lesson row in it could
-- otherwise not edit its content, which is the exact mismatch migration 107
-- had to reconcile on `lessons` itself.
--
-- ═══════════════════════════════════════════════════════════════════════
-- WHAT THIS DELIBERATELY DOES NOT FIX
-- ═══════════════════════════════════════════════════════════════════════
--
-- `lessons.video_url` and `lessons.full_video_url` stay readable by any
-- logged-in user for any published lesson, bought or not: the lesson ROW must
-- stay readable for titles, and the video columns ride along. A video stored
-- as a `lesson_blocks` row IS now closed; one stored in `lessons.video_url` is
-- not. Both shapes are in live use.
--
-- And note that these URLs are BEARER credentials — YouTube links or objects
-- in a public Storage bucket. Locking the column stops discovery, not replay.
-- See "Video URLs are bearer access" in CLAUDE.md.
--
-- Depends on: public.is_super_admin() (049), public.lesson_summaries (108),
--             public.has_subject_access(uuid) — created below.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- 0. Preflight
-- ═══════════════════════════════════════════════════════════════════════

DO $preflight$
BEGIN
    IF to_regclass('public.lessons')          IS NULL
    OR to_regclass('public.lesson_sections')  IS NULL
    OR to_regclass('public.lesson_blocks')    IS NULL
    OR to_regclass('public.subjects')         IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: lesson content tables missing. Wrong database?';
    END IF;

    IF to_regclass('public.lesson_summaries') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: lesson_summaries missing — apply 108 first.';
    END IF;

    IF to_regprocedure('public.is_super_admin()') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.is_super_admin() is missing (expected from 049).';
    END IF;
END
$preflight$;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. The entitlement predicate, rebuilt from the LIVE function
-- ═══════════════════════════════════════════════════════════════════════

-- Everything here is derived from the live body of get_student_subjects
-- (pg_get_functiondef, 2026-09-29), NOT from 046_subject_access_control.sql in
-- this folder, which has diverged. Two differences that matter and are easy to
-- reintroduce from the stale file:
--   • the live subscription path checks ONLY `status IN ('active','trialing')`.
--     It does NOT look at ends_at or trial_ends_at. Those columns exist, but
--     the function ignores them and the table is empty; adding the conditions
--     would be a silent behaviour change dressed up as a security fix.
--   • the live label for path 4 is 'organization', not 'org'.
--
-- Why not just call check_subject_access from the RLS policies?
-- Because it wraps get_student_subjects, which materialises EVERY entitled
-- subject and counts lessons and progress across all published lessons. In a
-- policy that fires once per row scanned: 40 blocks, 40 full sweeps.

-- Returns the entitlement label for one student on one subject, or NULL.
-- Single source of truth: has_subject_access (below) and 110's
-- check_subject_access both read it, so the boolean and the label can never
-- disagree.
--
-- Checks run in the live priority order (1..6) and return the first match, so
-- the label matches what live's `DISTINCT ON (sid) ORDER BY sid, priority`
-- would have picked.
--
-- THE is_paid RULE — the one deliberate behaviour change:
--   access_type = who may SEE a subject.
--   is_paid     = whether it opens for free.
-- Paths 5 and 6 (stage match, public) therefore require NOT is_paid. A paid
-- subject opens only through paths 1-4, or a free-preview lesson. The live
-- function applies no such rule, which is why "my subjects" lists paid courses
-- nobody bought.
CREATE OR REPLACE FUNCTION public.subject_entitlement_reason(
    p_student_id uuid,
    p_subject_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_access_type   text;
    v_is_paid       boolean;
    v_stage_id      uuid;
    v_student_stage text;
BEGIN
    IF p_subject_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Cheapest check first: one primary-key lookup that also settles both
    -- free paths without touching another table. `s.is_active` bare, matching
    -- live (the column has no NULLs — checked 2026-09-29).
    SELECT s.access_type, COALESCE(s.is_paid, false), s.stage_id
      INTO v_access_type, v_is_paid, v_stage_id
      FROM subjects s
     WHERE s.id = p_subject_id
       AND s.is_active;

    IF NOT FOUND THEN
        RETURN NULL;                    -- no such subject, or inactive
    END IF;

    -- Without a session only path 6 can apply.
    IF p_student_id IS NULL THEN
        IF NOT v_is_paid AND v_access_type = 'public' THEN
            RETURN 'public';
        END IF;
        RETURN NULL;
    END IF;

    -- 1) Directly assigned — what a confirmed Sham Cash order writes, so the
    -- hot path for every paying student. Unique (student_id, subject_id).
    IF EXISTS (
        SELECT 1 FROM student_subjects ss
         WHERE ss.student_id = p_student_id
           AND ss.subject_id = p_subject_id
           AND ss.status = 'active'
    ) THEN
        RETURN 'assigned';
    END IF;

    -- 2) Invited
    IF EXISTS (
        SELECT 1 FROM subject_invites si
         WHERE si.student_id = p_student_id
           AND si.subject_id = p_subject_id
           AND si.status = 'active'
           AND (si.expires_at IS NULL OR si.expires_at > now())
    ) THEN
        RETURN 'invite';
    END IF;

    -- 3) Subscription. Status only — see the note at the top of this section.
    IF EXISTS (
        SELECT 1
          FROM subscriptions sub
          JOIN plan_subjects ps ON ps.plan_id = sub.plan_id
         WHERE ps.subject_id = p_subject_id
           AND (sub.student_id = p_student_id OR sub.owner_user_id = p_student_id)
           AND sub.status IN ('active', 'trialing')
    ) THEN
        RETURN 'subscription';
    END IF;

    -- 4) Organization. Live label, not 'org'.
    IF EXISTS (
        SELECT 1
          FROM org_members om
          JOIN org_subjects os ON os.organization_id = om.organization_id
         WHERE om.student_id = p_student_id
           AND os.subject_id = p_subject_id
           AND om.status = 'active'
           AND os.status = 'active'
    ) THEN
        RETURN 'organization';
    END IF;

    -- 5) Stage match — FREE subjects only.  ◄── the is_paid rule
    IF NOT v_is_paid AND v_access_type IN ('public', 'stage') THEN
        SELECT p.student_stage INTO v_student_stage
          FROM profiles p WHERE p.id = p_student_id;

        IF v_student_stage IS NOT NULL AND EXISTS (
            SELECT 1 FROM stages st
             WHERE st.id = v_stage_id AND st.slug = v_student_stage
        ) THEN
            RETURN 'stage';
        END IF;
    END IF;

    -- 6) Public — FREE subjects only.  ◄── the is_paid rule
    IF NOT v_is_paid AND v_access_type = 'public' THEN
        RETURN 'public';
    END IF;

    RETURN NULL;
END;
$$;

-- Only ever reached from inside SECURITY DEFINER functions
-- (can_read_lesson_content here, check_subject_access in 110), where
-- current_user is the definer and the end user's own EXECUTE is never
-- consulted. `auth.uid()` still reads the request's JWT claim, so the answer
-- is still about the real end user.
-- Supabase grants EXECUTE to anon and authenticated EXPLICITLY on new
-- functions, not only through PUBLIC, so all three must be named.
REVOKE ALL ON FUNCTION public.subject_entitlement_reason(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- "May I, right now, open this subject?" Takes no student id at all, so there
-- is no parameter to abuse.
CREATE OR REPLACE FUNCTION public.has_subject_access(p_subject_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.subject_entitlement_reason(auth.uid(), p_subject_id) IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.has_subject_access(uuid) FROM PUBLIC, anon;
-- `authenticated` keeps it: a safe, cheap, client-callable check that can only
-- ever answer about the caller.
GRANT EXECUTE ON FUNCTION public.has_subject_access(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. The two lesson-content predicates
-- ═══════════════════════════════════════════════════════════════════════

-- "May the caller read this lesson's content?"
--
-- ONE definition, used by lesson_sections, lesson_blocks AND lesson_summaries,
-- so the three rules cannot drift apart.
--
-- NOTE the asymmetry with the block policy further down, which is deliberate:
--   HERE, on `lessons`, `is_published = true` — DEFAULT false, so a NULL is a
--   draft, and publishing a draft by accident is the worse failure.
--   THERE, on `lesson_blocks`, `is_published IS NOT FALSE` — DEFAULT true, so
--   a NULL is published, and hiding live content is the worse failure.
-- Live data has no NULLs in either column today (checked 2026-09-29).
CREATE OR REPLACE FUNCTION public.can_read_lesson_content(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.lessons l
         WHERE l.id = p_lesson_id
           AND l.is_published = true
           AND (
                -- A lesson the teacher flagged as a free sample opens for
                -- everyone, including logged-out visitors.
                COALESCE(l.is_free_preview, false)
                OR public.has_subject_access(l.subject_id)
           )
    );
$$;

REVOKE ALL ON FUNCTION public.can_read_lesson_content(uuid) FROM PUBLIC;
-- anon DOES need EXECUTE here, unlike has_subject_access above: this function
-- is named directly in the lesson_sections / lesson_blocks SELECT policies,
-- and a policy expression is evaluated as the QUERYING role, not as a definer.
-- Without the grant an anonymous read fails with "permission denied for
-- function" instead of simply returning no rows.
GRANT EXECUTE ON FUNCTION public.can_read_lesson_content(uuid) TO anon, authenticated;

-- Editor check. Mirrors can_edit_lesson_summary in 108 and the
-- lessons_teacher_update policy in 107: the lesson's creator, the teacher who
-- owns its subject, or a super_admin.
CREATE OR REPLACE FUNCTION public.can_edit_lesson_content(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
       AND (
            public.is_super_admin()
            OR EXISTS (
                SELECT 1
                  FROM public.lessons l
                  LEFT JOIN public.subjects s ON s.id = l.subject_id
                 WHERE l.id = p_lesson_id
                   AND (l.created_by = auth.uid() OR s.teacher_id = auth.uid())
            )
       );
$$;

REVOKE ALL ON FUNCTION public.can_edit_lesson_content(uuid) FROM PUBLIC;
-- anon needs EXECUTE too, and this is easy to get wrong. The policies below
-- read `can_read_lesson_content(...) OR can_edit_lesson_content(...)`, and SQL
-- does NOT guarantee short-circuit evaluation of OR — nor would it help: for a
-- PAID lesson the left side is false, so the right side is always reached. An
-- anonymous visitor would then get "permission denied for function
-- can_edit_lesson_content" instead of an empty result.
-- Granting it is safe: the body returns false whenever auth.uid() IS NULL.
GRANT EXECUTE ON FUNCTION public.can_edit_lesson_content(uuid) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Replace every SELECT-capable policy on the two content tables
-- ═══════════════════════════════════════════════════════════════════════

-- Postgres ORs permissive policies together, so one surviving `USING (true)`
-- makes every other policy on the table irrelevant. Migration 104 dropped
-- policies by name, missed one, and its profiles lockdown silently did nothing
-- until 105 cleaned up. This block enumerates pg_policy instead of trusting
-- any list of names — including the list in this file's header.
--
-- polcmd 'r' = SELECT, '*' = ALL. ALL policies are dropped too because an ALL
-- policy also grants SELECT; both live ALL policies are recreated below as
-- the _edit policies.
DO $drop_selects$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT c.relname AS tbl, p.polname AS name, p.polcmd AS cmd
          FROM pg_policy p
          JOIN pg_class c ON c.oid = p.polrelid
         WHERE c.relnamespace = 'public'::regnamespace
           AND c.relname IN ('lesson_sections', 'lesson_blocks')
           AND p.polcmd IN ('r', '*')
    LOOP
        RAISE NOTICE 'dropping policy %.% (polcmd=%)', pol.tbl, pol.name, pol.cmd;
        EXECUTE format('DROP POLICY %I ON public.%I', pol.name, pol.tbl);
    END LOOP;
END
$drop_selects$;

ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_blocks   ENABLE ROW LEVEL SECURITY;

-- anon keeps SELECT — the public /lesson/:id page is unauthenticated and must
-- still render free-preview lessons. The POLICY is what gates it; the grant
-- only decides whether the statement is allowed to be attempted at all.
-- Writes are taken away outright: nothing anonymous has any business writing
-- lesson content, and 1001_anon_permissions.sql was indiscriminate.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.lesson_sections FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.lesson_blocks   FROM anon;
GRANT SELECT ON public.lesson_sections TO anon;
GRANT SELECT ON public.lesson_blocks   TO anon;

-- ── lesson_sections ────────────────────────────────────────────────────
-- No is_published column on this table.
--
-- The `OR can_edit_lesson_content(...)` is spelled out even though the _edit
-- policy below is FOR ALL and would already contribute its USING to SELECT.
-- Relying on that is too subtle: the day someone splits _edit into separate
-- INSERT/UPDATE/DELETE policies, editor SELECT dies silently and unpublished
-- lessons render blank in the editor.
CREATE POLICY lesson_sections_select ON public.lesson_sections
    FOR SELECT TO anon, authenticated
    USING (
        public.can_read_lesson_content(lesson_id)
        OR public.can_edit_lesson_content(lesson_id)
    );

CREATE POLICY lesson_sections_edit ON public.lesson_sections
    FOR ALL TO authenticated
    USING      (public.can_edit_lesson_content(lesson_id))
    WITH CHECK (public.can_edit_lesson_content(lesson_id));

-- ── lesson_blocks ──────────────────────────────────────────────────────
-- `is_published IS NOT FALSE`, not `= true`, and this is the opposite choice
-- from `lessons.is_published` above — on purpose:
--   lesson_blocks.is_published DEFAULT true  → NULL means "published"
--   lessons.is_published       DEFAULT false → NULL means "draft"
-- Treating a NULL block as hidden would blank out content the teacher
-- considers live. This also matches the client exactly: every renderer filters
-- `b.is_published !== false`, never `=== true`.
CREATE POLICY lesson_blocks_select ON public.lesson_blocks
    FOR SELECT TO anon, authenticated
    USING (
        (is_published IS NOT FALSE AND public.can_read_lesson_content(lesson_id))
        OR public.can_edit_lesson_content(lesson_id)
    );

CREATE POLICY lesson_blocks_edit ON public.lesson_blocks
    FOR ALL TO authenticated
    USING      (public.can_edit_lesson_content(lesson_id))
    WITH CHECK (public.can_edit_lesson_content(lesson_id));

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Point lesson_summaries at the shared predicate
-- ═══════════════════════════════════════════════════════════════════════

-- 108 inlined the same conditions. Calling the shared function instead means a
-- future change to "who may read a lesson" lands in one place and cannot leave
-- the summary and the lesson body disagreeing.
--
-- Stays TO authenticated and does NOT include can_edit_lesson_content here:
-- 108's lesson_summaries_rw is FOR ALL and already gives the editor full
-- access to the row, including drafts. Adding the OR would be redundant, and
-- unlike the content tables there is no risk of it being split later without
-- noticing — the editor has no other way in.
DROP POLICY IF EXISTS lesson_summaries_select_student ON public.lesson_summaries;

CREATE POLICY lesson_summaries_select_student ON public.lesson_summaries
    FOR SELECT TO authenticated
    USING (
        status = 'approved'
        AND public.can_read_lesson_content(lesson_id)
    );

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Titles-only curriculum for the public pages
-- ═══════════════════════════════════════════════════════════════════════

-- The marketplace course page, the public subject page and the teacher's
-- public profile all list a lesson table of contents to people who have not
-- bought anything — including logged-out visitors. They need titles and
-- metadata, never bodies.
--
-- HEADER NOTE — what this function is and is not:
--   • It is SECURITY DEFINER and applies NO entitlement check. That is the
--     point: the curriculum of a PAID course is the shop window, and hiding it
--     would stop anyone deciding to buy. Every column it returns is already
--     public information.
--   • It therefore MUST NOT be extended with a column that is not safe to show
--     a stranger. Specifically: never add `video_url` or `full_video_url`, and
--     never add block content. `preview_video_url` is returned because it is
--     the marketing trailer.
--   • A view was rejected: a view would still need its own grants and could not
--     make the "hide unpublished" decision itself.
CREATE OR REPLACE FUNCTION public.get_public_curriculum(p_subject_id uuid)
RETURNS TABLE (
    id                uuid,
    title_ar          text,
    title_en          text,
    summary_ar        text,
    summary_en        text,
    sort_order        int,
    duration_minutes  int,
    duration_seconds  int,
    is_paid           boolean,
    is_free_preview   boolean,
    preview_video_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT l.id, l.title_ar, l.title_en, l.summary_ar, l.summary_en,
           l.sort_order, l.duration_minutes, l.duration_seconds,
           COALESCE(l.is_paid, false), COALESCE(l.is_free_preview, false),
           l.preview_video_url
      FROM public.lessons l
      JOIN public.subjects s ON s.id = l.subject_id
     WHERE l.subject_id = p_subject_id
       AND l.is_published = true
       AND s.is_active
     ORDER BY l.sort_order NULLS LAST, l.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_curriculum(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_curriculum(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT 'Migration 109 (lock lesson content reads) completed' AS result;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFY AFTER APPLYING — see the checklist in LESSON_READS_BLAST_RADIUS.md
-- ═══════════════════════════════════════════════════════════════════════
