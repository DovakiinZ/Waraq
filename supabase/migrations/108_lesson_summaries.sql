-- 108_lesson_summaries.sql
--
-- ############ APPLIED — run manually by the owner on 2026-09-29 ############
--
-- Do not re-run without reading 109 first: 109 REPLACES the
-- `lesson_summaries_select_student` policy created below with one calling
-- `can_read_lesson_content()`. Re-running this file would silently revert that
-- to the inline form and let the summary rule drift from the lesson-body rule.
--
-- The AI summary feature ("AI summary" / "الملخص الذكي").
--
-- A teacher generates a summary + slide outline for one of their lessons from
-- the lesson's own content, edits it, and approves it. Students see approved
-- rows only, and only for lessons they may actually open.
--
-- NOT related to `lessons.summary_ar` / `lessons.summary_en`, which already
-- exist and hold a short teacher-written blurb shown on course listings. Those
-- are deliberately untouched by this feature.
--
-- Depends on: lessons, subjects, profiles, public.is_super_admin() (049),
--             public.check_subject_access(uuid, uuid) (046, live signature
--             RETURNS TABLE(has_access boolean, reason text, access_type text)).

-- ═══════════════════════════════════════════════════════════════════════
-- 0. Preflight — abort loudly if pointed at the wrong database
-- ═══════════════════════════════════════════════════════════════════════

DO $preflight$
BEGIN
    IF to_regclass('public.lessons')  IS NULL
    OR to_regclass('public.subjects') IS NULL
    OR to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: core tables missing. Wrong database?';
    END IF;

    IF to_regprocedure('public.is_super_admin()') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.is_super_admin() is missing (expected from 049).';
    END IF;

    IF to_regprocedure('public.check_subject_access(uuid, uuid)') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.check_subject_access(uuid,uuid) is missing (expected from 046).';
    END IF;

    -- `sort_order` is the live ordering column; `order_index` does not exist.
    -- If this fires, the database is older than the client expects.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'lesson_blocks'
           AND column_name = 'sort_order'
    ) THEN
        RAISE EXCEPTION 'Preflight failed: lesson_blocks.sort_order is missing.';
    END IF;
END
$preflight$;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.lesson_summaries (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- One summary per lesson. The generator upserts on this key.
    lesson_id      uuid NOT NULL UNIQUE REFERENCES public.lessons(id) ON DELETE CASCADE,

    -- Prose summary, plain text. NOT markdown and NOT HTML: the renderer for
    -- this platform's lesson text is a `whitespace-pre-wrap` <p> with no
    -- markdown parser and no sanitiser anywhere in the dependency tree, so
    -- anything else would be shown to students as literal syntax.
    summary_ar     text,
    summary_en     text,

    -- [{ "title": string, "bullets": string[] }]
    slides_ar      jsonb,
    slides_en      jsonb,

    -- string[] — the takeaways, shown above the summary and as the lead slide.
    key_points_ar  jsonb,
    key_points_en  jsonb,

    -- draft      → generated, never seen by a student
    -- approved   → visible to entitled students
    -- rejected   → teacher dismissed it; not visible
    -- pending_review → RESERVED, NOT USED BY ANY UI TODAY. The teacher flow is
    --   deliberately draft → approved only, because the teacher is also the
    --   reviewer; there is no second approver to hand off to. The value is kept
    --   in the constraint so that adding an admin moderation queue later is a
    --   UI change and not a migration. Do not start writing it without building
    --   the queue that drains it.
    status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),

    -- SHA-256 of the canonicalised lesson content this was generated from.
    -- Recomputed client-side on every view; a mismatch raises the "lesson
    -- changed since this summary" warning. See _shared/lessonSummaryCore.ts —
    -- that one file computes it for both the browser and the edge function.
    source_hash    text,
    model          text,

    generated_at   timestamptz,
    generated_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

    reviewed_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at    timestamptz,
    review_note    text,

    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- The student policy filters on status before anything else.
CREATE INDEX IF NOT EXISTS idx_lesson_summaries_status ON public.lesson_summaries(status);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. updated_at trigger
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.touch_lesson_summaries_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lesson_summaries_updated_at ON public.lesson_summaries;
CREATE TRIGGER trg_lesson_summaries_updated_at
    BEFORE UPDATE ON public.lesson_summaries
    FOR EACH ROW EXECUTE FUNCTION public.touch_lesson_summaries_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Ownership helper
-- ═══════════════════════════════════════════════════════════════════════

-- Who may generate, edit and approve a lesson's summary.
--
-- SECURITY DEFINER so the policy can read `lessons` and `subjects` without
-- re-entering their own RLS — the same reason 104 defined current_profile_role().
--
-- Accepts BOTH ownership paths, matching 057's lessons policy and migration
-- 107's lessons_teacher_update USING clause: the lesson's creator, or the
-- teacher who owns the subject it sits in. LessonEditor.tsx gates on
-- `created_by` alone, so requiring only the subject owner here would lock a
-- teacher out of a lesson the UI still lets them open.
CREATE OR REPLACE FUNCTION public.can_edit_lesson_summary(p_lesson_id uuid)
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

REVOKE ALL ON FUNCTION public.can_edit_lesson_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_lesson_summary(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. RLS
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.lesson_summaries ENABLE ROW LEVEL SECURITY;

-- Supabase's defaults grant new tables to anon and authenticated. anon has no
-- business here at all, so take the table privilege away rather than relying
-- on RLS alone. (1001_anon_permissions.sql ran GRANT SELECT ON ALL TABLES to
-- anon; that was a one-time grant and does not reach this table, but being
-- explicit costs nothing and survives someone re-running it.)
REVOKE ALL ON public.lesson_summaries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_summaries TO authenticated;

DROP POLICY IF EXISTS lesson_summaries_rw             ON public.lesson_summaries;
DROP POLICY IF EXISTS lesson_summaries_select_student ON public.lesson_summaries;

-- The lesson's teacher (or a super_admin) owns the row outright: generate,
-- edit, approve, reject, delete. This is also what lets the editor preview a
-- draft before approving it.
CREATE POLICY lesson_summaries_rw ON public.lesson_summaries
    FOR ALL TO authenticated
    USING      (public.can_edit_lesson_summary(lesson_id))
    WITH CHECK (public.can_edit_lesson_summary(lesson_id));

-- Students read approved rows only, and only for a lesson they may open:
-- the lesson is published AND (it is a free preview OR they have access to
-- its subject).
--
-- NOTE: there is no `check_lesson_access` function in this database despite
-- src/types/database.ts having once declared one. This is the intended
-- lesson-level gate, expressed directly.
--
-- `check_subject_access` returns a TABLE, so it is selected FROM, not called
-- as a scalar. 046_subject_access_control.sql declares jsonb; the live
-- signature is the one used here.
CREATE POLICY lesson_summaries_select_student ON public.lesson_summaries
    FOR SELECT TO authenticated
    USING (
        status = 'approved'
        AND EXISTS (
            SELECT 1
              FROM public.lessons l
             WHERE l.id = lesson_summaries.lesson_id
               AND l.is_published = true
               AND (
                    l.is_free_preview = true
                    OR EXISTS (
                        SELECT 1
                          FROM public.check_subject_access(auth.uid(), l.subject_id) a
                         WHERE a.has_access
                    )
               )
        )
    );

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Reload PostgREST's schema cache
-- ═══════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

SELECT 'Migration 108 (lesson_summaries) completed' AS result;
