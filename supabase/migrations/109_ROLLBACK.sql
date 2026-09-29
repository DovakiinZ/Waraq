-- 109_ROLLBACK.sql
--
-- ############ NOT APPLIED — emergency undo for 109 ############
--
-- Restores `lesson_sections` and `lesson_blocks` to their exact pre-109 state:
-- the eight policies read from live pg_policies on 2026-09-29, and the anon
-- grants that 050_fix_schema_cache.sql / 1001_anon_permissions.sql had left.
--
-- SCOPE: these two tables only.
--   • `lessons` is NOT touched (migration 107's write policies stay).
--   • `lesson_summaries` is NOT touched. NOTE the consequence: 109 replaced
--     108's inline student policy with one calling can_read_lesson_content().
--     This rollback leaves that policy in place and leaves the function
--     installed, so lesson_summaries keeps working exactly as it did under
--     109. Only the CONTENT tables revert. If you also want the summaries
--     policy back to 108's inline form, re-run 108's section 4 by hand.
--
-- Because of that, the three functions 109 creates are deliberately NOT
-- dropped — lesson_summaries_select_student still calls
-- can_read_lesson_content(), and get_public_curriculum() is called by the
-- shipped web client (CoursePreview, useLessons guest branch), which would
-- start throwing PGRST202 the moment it disappeared. Dropping them is a
-- separate, deliberate step; the statements are at the bottom, commented out.
--
-- ⚠ WHAT THIS RE-OPENS: running this restores `USING (true)` on both tables.
-- The full body of every paid lesson becomes readable by anyone holding the
-- anon key again. Only run it to unbreak production, and treat it as
-- temporary.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Remove everything 109 created on these two tables
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS lesson_sections_select ON public.lesson_sections;
DROP POLICY IF EXISTS lesson_sections_edit   ON public.lesson_sections;
DROP POLICY IF EXISTS lesson_blocks_select   ON public.lesson_blocks;
DROP POLICY IF EXISTS lesson_blocks_edit     ON public.lesson_blocks;

-- Names from an earlier draft of 109, in case a partial run left them behind.
DROP POLICY IF EXISTS lesson_sections_select_entitled ON public.lesson_sections;
DROP POLICY IF EXISTS lesson_blocks_select_entitled   ON public.lesson_blocks;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Restore the eight live policies, verbatim
-- ═══════════════════════════════════════════════════════════════════════

-- ── lesson_blocks ──────────────────────────────────────────────────────

-- ALL / TO public / USING (super_admin) / no WITH CHECK.
-- Postgres copies USING into WITH CHECK when WITH CHECK is omitted, which is
-- what the live policy does; leaving it off here reproduces that exactly.
CREATE POLICY "Admins full access lesson_blocks" ON public.lesson_blocks
    FOR ALL TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
             WHERE profiles.id = auth.uid()
               AND profiles.role = 'super_admin'
        )
    );

CREATE POLICY "blocks_manage" ON public.lesson_blocks
    FOR ALL TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons
             WHERE lessons.id = lesson_blocks.lesson_id
               AND (lessons.created_by = auth.uid() OR public.is_super_admin())
        )
    );

CREATE POLICY "blocks_select" ON public.lesson_blocks
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can read published blocks" ON public.lesson_blocks
    FOR SELECT
    USING (true);

-- ── lesson_sections ────────────────────────────────────────────────────

CREATE POLICY "Admins full access lesson_sections" ON public.lesson_sections
    FOR ALL TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
             WHERE profiles.id = auth.uid()
               AND profiles.role = 'super_admin'
        )
    );

CREATE POLICY "sections_manage" ON public.lesson_sections
    FOR ALL TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.lessons
             WHERE lessons.id = lesson_sections.lesson_id
               AND (lessons.created_by = auth.uid() OR public.is_super_admin())
        )
    );

CREATE POLICY "sections_select" ON public.lesson_sections
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can read lesson_sections" ON public.lesson_sections
    FOR SELECT
    USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Restore the grants 109 narrowed
-- ═══════════════════════════════════════════════════════════════════════

-- Pre-109 state came from `GRANT ALL ... TO anon, authenticated, service_role`
-- (050_fix_schema_cache.sql:11-12) plus `GRANT SELECT ON ALL TABLES TO anon`
-- (1001_anon_permissions.sql:13). 109 only ever revoked INSERT/UPDATE/DELETE/
-- TRUNCATE from anon, so that is all there is to give back.
GRANT ALL ON public.lesson_sections TO anon, authenticated, service_role;
GRANT ALL ON public.lesson_blocks   TO anon, authenticated, service_role;

-- RLS was already enabled before 109; 109's ALTER TABLE calls were no-ops.
-- Left enabled deliberately — disabling it is not part of reverting 109.

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT '109 rolled back — lesson content is world-readable again' AS result;

-- ═══════════════════════════════════════════════════════════════════════
-- OPTIONAL: also drop the functions 109 created
-- ═══════════════════════════════════════════════════════════════════════
--
-- Do NOT run these while either is still referenced:
--   • can_read_lesson_content()  — used by lesson_summaries_select_student
--   • get_public_curriculum()    — called by the shipped web client
--                                  (CoursePreview.tsx, useQueryHooks useLessons)
-- Dropping get_public_curriculum without also reverting those two call sites
-- gives every visitor a PGRST202 on the course page.
--
-- DROP FUNCTION IF EXISTS public.get_public_curriculum(uuid);
-- DROP FUNCTION IF EXISTS public.can_edit_lesson_content(uuid);
-- DROP FUNCTION IF EXISTS public.can_read_lesson_content(uuid);
-- DROP FUNCTION IF EXISTS public.has_subject_access(uuid);
--
-- There are no prior grants to restore for these four: all four are NEW in
-- 109. Nothing pre-109 referenced them, so dropping them restores the prior
-- state exactly.
