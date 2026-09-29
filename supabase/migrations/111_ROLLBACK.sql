-- 111_ROLLBACK.sql
--
-- Emergency undo for 111. The body below is the VERBATIM live definition
-- captured with pg_get_functiondef on 2026-09-29, before 111 was applied,
-- together with the exact pre-111 ACL.
--
-- SCOPE: get_discover_subjects only. 109 and 110 are untouched.
--
-- ⚠ WHAT THIS RE-OPENS: p_student_id is honoured with no guard, so any caller
-- can learn another student's entitlement set by complement. search_path is
-- unpinned on a SECURITY DEFINER function, and anon/PUBLIC regain EXECUTE.
--
-- NOTE: this does NOT restore unpurchased paid subjects to "entitled" — that
-- came from 110, which this file does not touch. Roll back 110 as well if you
-- need the pre-110 entitlement behaviour.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_discover_subjects(p_student_id uuid)
 RETURNS TABLE(id uuid, title_ar text, title_en text, description_ar text, description_en text, slug text, stage_id uuid, access_type text, sort_order integer, show_on_home boolean, teaser_ar text, teaser_en text, lock_reason text, stage_title_ar text, stage_title_en text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH entitled_ids AS (
    SELECT e.id FROM get_student_subjects(p_student_id) e
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

-- Exact pre-111 ACL:
--   {=X/postgres, postgres=X/postgres, anon=X/postgres,
--    authenticated=X/postgres, service_role=X/postgres}
GRANT EXECUTE ON FUNCTION public.get_discover_subjects(uuid)
  TO PUBLIC, anon, authenticated, service_role, postgres;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT '111 rolled back' AS result;
