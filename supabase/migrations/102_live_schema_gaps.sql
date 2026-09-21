-- ============================================================
-- Migration 102: close the gaps between the live schema and the apps
-- ------------------------------------------------------------
-- Verified on 2026-09-21 against the LIVE database via PostgREST,
-- after the Supabase project was resumed. Everything here is
-- idempotent and safe to run on the current production schema.
--
-- What is actually missing live (confirmed by column probes):
--   * quiz_attempts.passed  -> quiz_provider.dart writes this on EVERY
--     submission, so the INSERT fails and no student can submit a quiz.
--   * student_levels        -> studentLevelProvider queries it; the
--     provider swallows the error, so the student profile silently
--     shows a default level instead of real XP.
--
-- Deliberately NOT included:
--   * orders / teacher_applications / profiles.shamcash_* /
--     profiles.expertise_tags_en already EXIST live (migration 066 and
--     friends were applied). No need to recreate them.
--   * quiz_questions.options / correct_answer are intentionally absent.
--     The live schema normalises answers into quiz_options
--     (text_ar, text_en, is_correct, sort_order), which is what the web
--     portal uses. The Flutter quiz layer must be rewritten to match --
--     do NOT add denormalised columns here, that would fork web/mobile.
--
-- NOTE on 100_clean_rewrite.sql: it drops the entire public schema and
-- does not recreate what 066 added. It has NOT been applied to this
-- database and should not be, or the marketplace, checkout and teacher
-- orders all disappear.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. quiz_attempts.passed
--    Written by quiz_provider.dart on submit and filtered on by
--    achievements_screen.dart. Without it, quiz submission is broken.
-- ------------------------------------------------------------
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS passed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student
  ON public.quiz_attempts(student_id, quiz_id);

-- Backfill for any attempts recorded before the column existed.
UPDATE public.quiz_attempts a
   SET passed = (a.score_percent >= COALESCE(q.passing_score, 60))
  FROM public.quizzes q
 WHERE q.id = a.quiz_id
   AND a.passed IS DISTINCT FROM (a.score_percent >= COALESCE(q.passing_score, 60));

-- ------------------------------------------------------------
-- 2. student_levels
--    Read by studentLevelProvider for the student profile header.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_levels (
  student_id  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp    INTEGER NOT NULL DEFAULT 0,
  level       INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_levels ENABLE ROW LEVEL SECURITY;

-- is_super_admin() is confirmed to exist live.
DROP POLICY IF EXISTS "student_levels_own_select" ON public.student_levels;
CREATE POLICY "student_levels_own_select" ON public.student_levels
  FOR SELECT USING (student_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "student_levels_own_upsert" ON public.student_levels;
CREATE POLICY "student_levels_own_upsert" ON public.student_levels
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_levels_own_update" ON public.student_levels;
CREATE POLICY "student_levels_own_update" ON public.student_levels
  FOR UPDATE USING (student_id = auth.uid());

-- Seed a row for every existing student so the profile header has data.
INSERT INTO public.student_levels (student_id, total_xp, level)
SELECT p.id,
       COALESCE(x.total, 0),
       GREATEST(1, (COALESCE(x.total, 0) / 500) + 1)
  FROM public.profiles p
  LEFT JOIN (
        SELECT student_id, SUM(amount) AS total
          FROM public.student_xp
         GROUP BY student_id
       ) x ON x.student_id = p.id
 WHERE p.role = 'student'
ON CONFLICT (student_id) DO NOTHING;

COMMIT;
