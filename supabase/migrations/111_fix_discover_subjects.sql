-- 111_fix_discover_subjects.sql
--
-- Apply AFTER 110. Rollback: 111_ROLLBACK.sql, which holds the verbatim live
-- body captured with pg_get_functiondef on 2026-09-29.
--
-- ═══════════════════════════════════════════════════════════════════════
-- WHAT THIS FIXES — the same three defects as 110, on the last RPC
-- ═══════════════════════════════════════════════════════════════════════
--
-- (1) p_student_id honoured with NO guard. get_discover_subjects is the
--     mirror of get_student_subjects: it returns every ACTIVE subject the
--     student is NOT entitled to. Given an arbitrary id it therefore reveals
--     another student's entitlement set by complement — the exact information
--     110 just closed on the other function, reachable the other way round.
--     Now ignores p_student_id unless the caller is super_admin.
--
-- (2) No SET search_path on a SECURITY DEFINER function.
--
-- (3) EXECUTE granted to PUBLIC and anon explicitly
--     (=X/postgres, anon=X/postgres, ... measured 2026-09-29).
--
-- ═══════════════════════════════════════════════════════════════════════
-- THE is_paid RULE APPLIES HERE AUTOMATICALLY — and that is the point
-- ═══════════════════════════════════════════════════════════════════════
--
-- This function computes its result as "every active subject MINUS the
-- entitled ones", by calling get_student_subjects. 110 removed unpurchased
-- paid subjects from that set, so they now correctly appear in DISCOVER —
-- i.e. as something to buy — instead of silently counting as owned. No
-- separate is_paid condition is needed here, and adding one would double-count.
--
-- ═══════════════════════════════════════════════════════════════════════
-- OUTPUT SHAPE AND VOCABULARY ARE UNCHANGED
-- ═══════════════════════════════════════════════════════════════════════
--
-- Same 15 columns. Same lock_reason vocabulary, verbatim:
--   'subscription_required' | 'invite_required' | 'org_required' | 'not_available'
--
-- NOTE A CLIENT BUG THIS DOES NOT FIX: MySubjects.tsx:300-316 and
-- StudentSubjects.tsx:167-169 test lock_reason against 'needs_subscription',
-- 'wrong_stage', 'needs_invite' and 'locked' — none of which this function has
-- ever emitted, so those branches are dead. Fixed on the CLIENT, not by
-- changing the vocabulary here; changing it would be a silent behaviour change
-- smuggled in behind a security fix.
--
-- Also left exactly as live: a paid subject whose access_type is 'public' or
-- 'stage' gets lock_reason 'not_available', which is vague for something the
-- student could simply buy. That is a UX improvement, not a security fix, and
-- belongs in its own change.

BEGIN;

DO $preflight$
BEGIN
    IF to_regprocedure('public.get_discover_subjects(uuid)') IS NULL
    OR to_regprocedure('public.get_student_subjects(uuid)') IS NULL
    OR to_regprocedure('public.is_super_admin()') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: expected functions not found.';
    END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.get_discover_subjects(p_student_id uuid)
 RETURNS TABLE(id uuid, title_ar text, title_en text, description_ar text, description_en text, slug text, stage_id uuid, access_type text, sort_order integer, show_on_home boolean, teaser_ar text, teaser_en text, lock_reason text, stage_title_ar text, stage_title_en text)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path = public                                         -- defect (2)
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_target uuid;
BEGIN
  -- defect (1): the live body had no guard and honoured p_student_id.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.is_super_admin() THEN
    v_target := COALESCE(p_student_id, v_uid);
  ELSE
    v_target := v_uid;
  END IF;

  RETURN QUERY
  WITH entitled_ids AS (
    -- Now excludes unpurchased paid subjects, because 110 removed them from
    -- get_student_subjects. They therefore surface here, as discoverable.
    SELECT e.id FROM public.get_student_subjects(v_target) e
  )
  SELECT s.id, s.title_ar, s.title_en,
         s.description_ar, s.description_en,
         s.slug, s.stage_id, s.access_type,
         s.sort_order, s.show_on_home,
         s.teaser_ar, s.teaser_en,
         CASE s.access_type
           WHEN 'subscription' THEN 'subscription_required'
           WHEN 'invite_only'  THEN 'invite_required'
           WHEN 'org_only'     THEN 'org_required'
           ELSE 'not_available'
         END,
         st.title_ar, st.title_en
  FROM subjects s
  LEFT JOIN stages st ON st.id = s.stage_id
  WHERE s.is_active AND s.id NOT IN (SELECT * FROM entitled_ids)
  ORDER BY s.sort_order;
END;
$function$;

-- defect (3)
REVOKE ALL ON FUNCTION public.get_discover_subjects(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_discover_subjects(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT 'Migration 111 (get_discover_subjects) completed' AS result;
