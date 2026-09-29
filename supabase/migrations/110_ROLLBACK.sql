-- 110_ROLLBACK.sql
--
-- Emergency undo for 110. Restores the EXACT live bodies and ACLs of
-- get_student_subjects and check_subject_access as captured from
-- pg_get_functiondef and pg_proc.proacl on 2026-09-29, before 110 was applied.
-- The bodies below are verbatim copies of that dump, not reconstructions.
--
-- SCOPE: these two functions only. 109's has_subject_access,
-- subject_entitlement_reason, can_read_lesson_content and the content-table
-- policies are left alone — 110 did not touch them, and reverting 110 must not
-- re-open the lesson bodies.
--
-- ⚠ WHAT THIS RE-OPENS:
--   • Paid subjects become entitled again for anyone whose stage matches or
--     whose access_type is 'public' — free access to paid courses.
--   • No auth guard and p_student_id honoured, so any caller can read another
--     student's entitled subjects with their lesson counts and progress.
--     Those students are minors.
--   • search_path unpinned on two SECURITY DEFINER functions.
--   • anon and PUBLIC regain EXECUTE on both.
-- Run only to unbreak production, and treat it as temporary.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. get_student_subjects — verbatim pre-110 live body
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_student_subjects(p_student_id uuid)
 RETURNS TABLE(id uuid, title_ar text, title_en text, description_ar text, description_en text, slug text, stage_id uuid, access_type text, sort_order integer, show_on_home boolean, teaser_ar text, teaser_en text, entitlement_reason text, stage_title_ar text, stage_title_en text, total_lessons bigint, completed_lessons bigint, progress_percent integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_stage text;
BEGIN
  SELECT student_stage INTO v_stage FROM profiles WHERE profiles.id = p_student_id;

  RETURN QUERY
  WITH entitled AS (
    -- 1. Directly assigned
    SELECT s.id AS sid, 'assigned'::text AS reason, 1 AS priority
    FROM student_subjects ss
    JOIN subjects s ON s.id = ss.subject_id
    WHERE ss.student_id = p_student_id AND ss.status = 'active' AND s.is_active

    UNION
    -- 2. Invited
    SELECT s.id, 'invite', 2
    FROM subject_invites si
    JOIN subjects s ON s.id = si.subject_id
    WHERE si.student_id = p_student_id AND si.status = 'active' AND s.is_active
      AND (si.expires_at IS NULL OR si.expires_at > now())

    UNION
    -- 3. Subscription
    SELECT ps.subject_id, 'subscription', 3
    FROM subscriptions sub
    JOIN plan_subjects ps ON ps.plan_id = sub.plan_id
    JOIN subjects s ON s.id = ps.subject_id
    WHERE (sub.student_id = p_student_id OR sub.owner_user_id = p_student_id)
      AND sub.status IN ('active','trialing')
      AND s.is_active

    UNION
    -- 4. Organization
    SELECT os.subject_id, 'organization', 4
    FROM org_members om
    JOIN org_subjects os ON os.organization_id = om.organization_id
    JOIN subjects s ON s.id = os.subject_id
    WHERE om.student_id = p_student_id AND om.status = 'active' AND os.status = 'active' AND s.is_active

    UNION
    -- 5. Stage match
    SELECT s.id, 'stage', 5
    FROM subjects s
    JOIN stages st ON st.id = s.stage_id
    WHERE st.slug = v_stage AND s.is_active AND s.access_type IN ('public','stage')

    UNION
    -- 6. Public subjects
    SELECT s.id, 'public', 6
    FROM subjects s
    WHERE s.access_type = 'public' AND s.is_active
  ),
  deduped AS (
    SELECT DISTINCT ON (sid) sid, reason, priority
    FROM entitled
    ORDER BY sid, priority
  ),
  lesson_counts AS (
    SELECT l.subject_id AS sid,
           count(*) AS total,
           count(*) FILTER (WHERE lp.completed_at IS NOT NULL) AS completed
    FROM lessons l
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = p_student_id
    WHERE l.is_published = true
    GROUP BY l.subject_id
  )
  SELECT s.id, s.title_ar, s.title_en,
         s.description_ar, s.description_en,
         s.slug, s.stage_id, s.access_type,
         s.sort_order, s.show_on_home,
         s.teaser_ar, s.teaser_en,
         d.reason,
         st.title_ar, st.title_en,
         COALESCE(lc.total, 0),
         COALESCE(lc.completed, 0),
         CASE WHEN COALESCE(lc.total, 0) > 0
              THEN (COALESCE(lc.completed, 0) * 100 / lc.total)::integer
              ELSE 0
         END
  FROM deduped d
  JOIN subjects s ON s.id = d.sid
  LEFT JOIN stages st ON st.id = s.stage_id
  LEFT JOIN lesson_counts lc ON lc.sid = s.id
  ORDER BY d.priority, s.sort_order;
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. check_subject_access — verbatim pre-110 live body
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_subject_access(p_student_id uuid, p_subject_id uuid)
 RETURNS TABLE(has_access boolean, reason text, access_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT true, e.entitlement_reason, s.access_type
  FROM get_student_subjects(p_student_id) e
  JOIN subjects s ON s.id = e.id
  WHERE e.id = p_subject_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'no_access'::text, ''::text;
  END IF;
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Exact pre-110 ACLs
-- ═══════════════════════════════════════════════════════════════════════

-- Measured before 110:
--   acl = {=X/postgres, postgres=X/postgres, anon=X/postgres,
--          authenticated=X/postgres, service_role=X/postgres}
-- `=X/postgres` is PUBLIC EXECUTE. CREATE OR REPLACE preserves the existing
-- ACL, so these are belt-and-braces for the case where 110's REVOKEs ran and
-- only the bodies are being reverted.
GRANT EXECUTE ON FUNCTION public.get_student_subjects(uuid)
  TO PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.check_subject_access(uuid, uuid)
  TO PUBLIC, anon, authenticated, service_role, postgres;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT '110 rolled back — paid subjects are entitled by stage/public again' AS result;
