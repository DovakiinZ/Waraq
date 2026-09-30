-- 112_subject_pricing_in_rpcs.sql
--
-- Apply AFTER 111. Rollback: 112_ROLLBACK.sql.
--
-- ═══════════════════════════════════════════════════════════════════════
-- THE BUG: every course in the mobile app was labelled FREE
-- ═══════════════════════════════════════════════════════════════════════
--
-- `get_student_subjects` and `get_discover_subjects` never returned `is_paid`,
-- `price_amount` or `price_currency`. The Flutter `Subject` model therefore
-- parsed `isPaid` as NULL, and `SubjectCard` read `isPaid != true` as "free" —
-- so a 100,000 SYP course rendered with a green «مجاني / FREE» chip.
--
-- Measured on the live data (2026-09-30): رياضيات is 100,000 SYP and جغرافيا
-- is 10,000 SYP; both showed FREE on the app's dashboard.
--
-- This predates the entitlement work, but migration 110 made it far more
-- visible: unpurchased paid courses now correctly surface in DISCOVER instead
-- of being silently counted as entitled, so more mislabelled cards are on
-- screen at once.
--
-- The client has been hardened separately — `isPaid == null` now renders NO
-- badge rather than claiming "free" — so the two fixes are independent and
-- either alone removes the false claim. This one restores the actual data.
--
-- ═══════════════════════════════════════════════════════════════════════
-- WHY DROP AND RECREATE
-- ═══════════════════════════════════════════════════════════════════════
--
-- Adding columns changes the return type, and `CREATE OR REPLACE FUNCTION`
-- refuses that. Both functions are dropped and recreated inside ONE
-- transaction, so no caller ever observes them missing.
--
-- `get_discover_subjects` calls `get_student_subjects`; PostgreSQL does not
-- track that as a hard dependency, so the drop order does not matter, but both
-- are recreated below regardless.
--
-- Everything else is carried over from 110/111 unchanged: the is_paid
-- entitlement rule, caller-scoping via auth.uid(), SET search_path, the
-- 'organization' label, integer-division progress, ORDER BY priority, and the
-- REVOKE from PUBLIC and anon.

BEGIN;

DO $preflight$
BEGIN
    IF to_regprocedure('public.subject_entitlement_reason(uuid, uuid)') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: subject_entitlement_reason missing — apply 109 first.';
    END IF;
    IF to_regprocedure('public.get_student_subjects(uuid)') IS NULL
    OR to_regprocedure('public.get_discover_subjects(uuid)') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: entitlement RPCs not found — apply 110 and 111 first.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='subjects' AND column_name='price_amount'
    ) THEN
        RAISE EXCEPTION 'Preflight failed: subjects.price_amount is missing.';
    END IF;
END
$preflight$;

DROP FUNCTION IF EXISTS public.get_discover_subjects(uuid);
DROP FUNCTION IF EXISTS public.get_student_subjects(uuid);

-- ═══════════════════════════════════════════════════════════════════════
-- 1. get_student_subjects — + is_paid, price_amount, price_currency
-- ═══════════════════════════════════════════════════════════════════════

CREATE FUNCTION public.get_student_subjects(p_student_id uuid)
RETURNS TABLE(
    id uuid, title_ar text, title_en text, description_ar text, description_en text,
    slug text, stage_id uuid, access_type text, sort_order integer, show_on_home boolean,
    teaser_ar text, teaser_en text, entitlement_reason text, stage_title_ar text,
    stage_title_en text, total_lessons bigint, completed_lessons bigint,
    progress_percent integer,
    -- New. Appended at the END so positional consumers are unaffected; both
    -- clients read by name anyway.
    is_paid boolean, price_amount numeric, price_currency text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_stage  text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.is_super_admin() THEN
    v_target := COALESCE(p_student_id, v_uid);
  ELSE
    v_target := v_uid;
  END IF;

  SELECT student_stage INTO v_stage FROM profiles WHERE profiles.id = v_target;

  RETURN QUERY
  WITH entitled AS (
    SELECT s.id AS sid, 'assigned'::text AS reason, 1 AS priority
    FROM student_subjects ss
    JOIN subjects s ON s.id = ss.subject_id
    WHERE ss.student_id = v_target AND ss.status = 'active' AND s.is_active

    UNION
    SELECT s.id, 'invite', 2
    FROM subject_invites si
    JOIN subjects s ON s.id = si.subject_id
    WHERE si.student_id = v_target AND si.status = 'active' AND s.is_active
      AND (si.expires_at IS NULL OR si.expires_at > now())

    UNION
    SELECT ps.subject_id, 'subscription', 3
    FROM subscriptions sub
    JOIN plan_subjects ps ON ps.plan_id = sub.plan_id
    JOIN subjects s ON s.id = ps.subject_id
    WHERE (sub.student_id = v_target OR sub.owner_user_id = v_target)
      AND sub.status IN ('active','trialing')
      AND s.is_active

    UNION
    SELECT os.subject_id, 'organization', 4
    FROM org_members om
    JOIN org_subjects os ON os.organization_id = om.organization_id
    JOIN subjects s ON s.id = os.subject_id
    WHERE om.student_id = v_target AND om.status = 'active' AND os.status = 'active' AND s.is_active

    UNION
    -- FREE subjects only (the is_paid rule from 110).
    SELECT s.id, 'stage', 5
    FROM subjects s
    JOIN stages st ON st.id = s.stage_id
    WHERE st.slug = v_stage AND s.is_active AND s.access_type IN ('public','stage')
      AND COALESCE(s.is_paid, false) = false

    UNION
    SELECT s.id, 'public', 6
    FROM subjects s
    WHERE s.access_type = 'public' AND s.is_active
      AND COALESCE(s.is_paid, false) = false
  ),
  deduped AS (
    SELECT DISTINCT ON (sid) sid, reason, priority
    FROM entitled ORDER BY sid, priority
  ),
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
         CASE WHEN COALESCE(lc.total, 0) > 0
              THEN (COALESCE(lc.completed, 0) * 100 / lc.total)::integer
              ELSE 0
         END,
         COALESCE(s.is_paid, false), s.price_amount, s.price_currency
  FROM deduped d
  JOIN subjects s ON s.id = d.sid
  LEFT JOIN stages st ON st.id = s.stage_id
  LEFT JOIN lesson_counts lc ON lc.sid = s.id
  ORDER BY d.priority, s.sort_order;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_student_subjects(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_subjects(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. get_discover_subjects — + the same three columns
-- ═══════════════════════════════════════════════════════════════════════
--
-- This one matters MORE than the entitled list: discover is exactly where a
-- student decides whether to buy, so a wrong price is a wrong purchase
-- decision.

CREATE FUNCTION public.get_discover_subjects(p_student_id uuid)
RETURNS TABLE(
    id uuid, title_ar text, title_en text, description_ar text, description_en text,
    slug text, stage_id uuid, access_type text, sort_order integer, show_on_home boolean,
    teaser_ar text, teaser_en text, lock_reason text, stage_title_ar text,
    stage_title_en text,
    is_paid boolean, price_amount numeric, price_currency text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_target uuid;
BEGIN
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
         st.title_ar, st.title_en,
         COALESCE(s.is_paid, false), s.price_amount, s.price_currency
  FROM subjects s
  LEFT JOIN stages st ON st.id = s.stage_id
  WHERE s.is_active AND s.id NOT IN (SELECT * FROM entitled_ids)
  ORDER BY s.sort_order;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_discover_subjects(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_discover_subjects(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT 'Migration 112 (subject pricing in RPCs) completed' AS result;
