-- 112_ROLLBACK.sql
--
-- Emergency undo for 112. Restores the post-110/111 signatures — i.e. WITHOUT
-- is_paid / price_amount / price_currency.
--
-- ⚠ WHAT THIS RE-OPENS: the Flutter app reads `is_paid` from these RPCs. With
-- the column gone, `Subject.isPaid` is NULL again. The client guard added
-- alongside 112 means a card then shows NO price badge rather than falsely
-- claiming "FREE", so this rollback degrades the UI but does not reintroduce
-- the false claim. Do not also revert `subject_card.dart`.
--
-- Return types change, so both functions are dropped and recreated in one
-- transaction, exactly as 112 did.

BEGIN;

DROP FUNCTION IF EXISTS public.get_discover_subjects(uuid);
DROP FUNCTION IF EXISTS public.get_student_subjects(uuid);

CREATE FUNCTION public.get_student_subjects(p_student_id uuid)
RETURNS TABLE(
    id uuid, title_ar text, title_en text, description_ar text, description_en text,
    slug text, stage_id uuid, access_type text, sort_order integer, show_on_home boolean,
    teaser_ar text, teaser_en text, entitlement_reason text, stage_title_ar text,
    stage_title_en text, total_lessons bigint, completed_lessons bigint,
    progress_percent integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public                                          -- defect (3)
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_stage  text;
BEGIN
  -- defect (2): the live body had no guard at all.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- The parameter is advisory. A normal caller always gets their OWN rows
  -- whatever they pass; only super_admin may target someone else. Structural,
  -- rather than a comparison a later edit could drop.
  IF public.is_super_admin() THEN
    v_target := COALESCE(p_student_id, v_uid);
  ELSE
    v_target := v_uid;
  END IF;

  SELECT student_stage INTO v_stage FROM profiles WHERE profiles.id = v_target;

  RETURN QUERY
  WITH entitled AS (
    -- 1. Directly assigned
    SELECT s.id AS sid, 'assigned'::text AS reason, 1 AS priority
    FROM student_subjects ss
    JOIN subjects s ON s.id = ss.subject_id
    WHERE ss.student_id = v_target AND ss.status = 'active' AND s.is_active

    UNION
    -- 2. Invited
    SELECT s.id, 'invite', 2
    FROM subject_invites si
    JOIN subjects s ON s.id = si.subject_id
    WHERE si.student_id = v_target AND si.status = 'active' AND s.is_active
      AND (si.expires_at IS NULL OR si.expires_at > now())

    UNION
    -- 3. Subscription. Status only — ends_at/trial_ends_at ignored, as live.
    SELECT ps.subject_id, 'subscription', 3
    FROM subscriptions sub
    JOIN plan_subjects ps ON ps.plan_id = sub.plan_id
    JOIN subjects s ON s.id = ps.subject_id
    WHERE (sub.student_id = v_target OR sub.owner_user_id = v_target)
      AND sub.status IN ('active','trialing')
      AND s.is_active

    UNION
    -- 4. Organization
    SELECT os.subject_id, 'organization', 4
    FROM org_members om
    JOIN org_subjects os ON os.organization_id = om.organization_id
    JOIN subjects s ON s.id = os.subject_id
    WHERE om.student_id = v_target AND om.status = 'active' AND os.status = 'active' AND s.is_active

    UNION
    -- 5. Stage match — FREE subjects only.  ◄── defect (1)
    SELECT s.id, 'stage', 5
    FROM subjects s
    JOIN stages st ON st.id = s.stage_id
    WHERE st.slug = v_stage AND s.is_active AND s.access_type IN ('public','stage')
      AND COALESCE(s.is_paid, false) = false

    UNION
    -- 6. Public subjects — FREE only.  ◄── defect (1)
    SELECT s.id, 'public', 6
    FROM subjects s
    WHERE s.access_type = 'public' AND s.is_active
      AND COALESCE(s.is_paid, false) = false
  ),
  deduped AS (
    SELECT DISTINCT ON (sid) sid, reason, priority
    FROM entitled
    ORDER BY sid, priority
  ),
  -- Narrowed to the entitled set. Live swept every published lesson in the
  -- database on every call; this is the one performance change, and it cannot
  -- alter a returned value because non-entitled subjects are not returned.
  lesson_counts AS (
    SELECT l.subject_id AS sid,
           count(*) AS total,
           count(*) FILTER (WHERE lp.completed_at IS NOT NULL) AS completed
    FROM lessons l
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = v_target
    WHERE l.is_published = true
      AND l.subject_id IN (SELECT d.sid FROM deduped d)
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
         -- Live formula, integer division included.
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

-- defect (4): anon holds EXECUTE explicitly, not only through PUBLIC.
REVOKE ALL ON FUNCTION public.get_student_subjects(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_subjects(uuid) TO authenticated;

CREATE FUNCTION public.get_discover_subjects(p_student_id uuid)
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

SELECT '112 rolled back — subject pricing removed from the entitlement RPCs' AS result;
