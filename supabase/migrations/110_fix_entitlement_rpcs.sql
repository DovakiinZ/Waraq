-- 110_fix_entitlement_rpcs.sql
--
-- Apply AFTER 109 (reuses public.subject_entitlement_reason, created there).
-- Rollback: 110_ROLLBACK.sql, which restores the exact live bodies and ACLs
-- captured with pg_get_functiondef on 2026-09-29.
--
-- ═══════════════════════════════════════════════════════════════════════
-- SCOPE: SECURITY AND THE is_paid RULE ONLY
-- ═══════════════════════════════════════════════════════════════════════
--
-- Everything else matches the live bodies byte-for-byte in behaviour. Things
-- that look like bugs but are LEFT ALONE on purpose, because changing them
-- would be a silent behaviour change smuggled in behind a security fix:
--   • The subscription path checks only `status IN ('active','trialing')`.
--     `subscriptions.ends_at` and `trial_ends_at` exist and are ignored. An
--     expired subscription still grants access. Not fixed here.
--   • The path-4 label is 'organization'. The web client tests for 'org'
--     (MySubjects.tsx:168), so that badge has never rendered — a CLIENT bug,
--     fixed on the client side, not by changing the label here.
--   • Progress uses integer division: (completed * 100 / total)::integer.
--     99/100 lessons reads as 99%, 1/3 reads as 33%. Preserved exactly.
--   • ORDER BY d.priority, s.sort_order. Preserved.
--
-- ═══════════════════════════════════════════════════════════════════════
-- THE FOUR DEFECTS THIS FIXES
-- ═══════════════════════════════════════════════════════════════════════
--
-- (1) NEITHER CHECKS is_paid. Paths 5 and 6 grant entitlement on visibility
--     alone, so a paid course visible to a stage is "entitled" for every
--     student in that stage with no order and no payment.
--     THE RULE: access_type = who may SEE a subject; is_paid = whether it
--     opens for free. Paths 5 and 6 now require NOT is_paid.
--
-- (2) NO AUTH GUARD AT ALL, AND p_student_id IS HONOURED.
--     Measured on live: check_subject_access(null, <public subject id>)
--     returns a row. get_student_subjects has no guard either — 046 in this
--     folder shows one, but 046 is not what is deployed. So any caller could
--     ask for any other student's entitled subjects and receive their
--     total_lessons / completed_lessons / progress_percent with them. Those
--     students are children. Both now ignore p_student_id unless the caller
--     is super_admin, and read auth.uid().
--
-- (3) NEITHER SETS search_path. A SECURITY DEFINER function without it
--     resolves unqualified names against the CALLER's search_path, so anyone
--     able to create objects in an earlier schema could shadow `profiles` or
--     `subjects` and have the definer read their table. Both now pin it.
--
-- (4) EXECUTE IS GRANTED TO PUBLIC **AND** anon, explicitly. Measured:
--     acl = =X/postgres , postgres=X/postgres , anon=X/postgres ,
--           authenticated=X/postgres , service_role=X/postgres
--     `REVOKE ... FROM PUBLIC` alone leaves anon holding it — the same trap
--     that made 104's lockdown fail until 105.
--
-- ═══════════════════════════════════════════════════════════════════════
-- CLIENT SCREENS THAT CHANGE BEHAVIOUR
-- ═══════════════════════════════════════════════════════════════════════
--
-- Paid courses stop appearing as owned:
--   MySubjects.tsx, StudentSubjects.tsx, StudentDashboard.tsx (useMySubjects);
--   StudentLessons.tsx (useCheckSubjectAccess);
--   Flutter my_subjects_screen.dart, student_dashboard_screen.dart,
--   subject_detail_screen.dart.
-- Unaffected — they read student_subjects directly: StudentMarketplace.tsx,
-- CoursePreview.tsx, TeacherOrders (web + Flutter, both upsert
-- student_subjects.status='active' on confirm).

BEGIN;

DO $preflight$
BEGIN
    IF to_regprocedure('public.subject_entitlement_reason(uuid, uuid)') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: subject_entitlement_reason missing — apply 109 first.';
    END IF;
    IF to_regprocedure('public.get_student_subjects(uuid)') IS NULL
    OR to_regprocedure('public.check_subject_access(uuid, uuid)') IS NULL
    OR to_regprocedure('public.is_super_admin()') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: expected functions not found.';
    END IF;
END
$preflight$;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. get_student_subjects
-- ═══════════════════════════════════════════════════════════════════════

-- RETURNS TABLE reproduced from the live definition exactly — 18 columns,
-- no is_active, no created_at, progress columns last. If CREATE OR REPLACE
-- fails with "cannot change return type", the live signature has moved; dump
-- it and reconcile rather than guessing.
CREATE OR REPLACE FUNCTION public.get_student_subjects(p_student_id uuid)
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

-- ═══════════════════════════════════════════════════════════════════════
-- 2. check_subject_access
-- ═══════════════════════════════════════════════════════════════════════

-- OUTPUT VOCABULARY IS THE LIVE ONE, EXACTLY:
--   granted → (true,  <the entitlement reason>, subjects.access_type)
--   denied  → (false, 'no_access',              ''::text)
-- Never NULL in either text column — StudentLessons.tsx:131,133 compares
-- access_type against 'subscription' / 'invite_only', and useAcademyData.ts:354
-- defaults to reason 'no_access'. A NULL would change what those render.
--
-- It now reads subject_entitlement_reason (109) instead of wrapping
-- get_student_subjects: same labels, the is_paid rule applied, and no
-- progress computation for what is a yes/no question.
CREATE OR REPLACE FUNCTION public.check_subject_access(
    p_student_id uuid,
    p_subject_id uuid
)
RETURNS TABLE(has_access boolean, reason text, access_type text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public                                          -- defect (3)
AS $function$
DECLARE
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_reason text;
BEGIN
  -- defect (2). No session: the live denial shape, not an exception — the
  -- clients render this, they do not catch it.
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'no_access'::text, ''::text;
    RETURN;
  END IF;

  -- A non-admin asking about someone else is answered about THEMSELVES rather
  -- than refused, so no existing caller breaks.
  IF public.is_super_admin() THEN
    v_target := COALESCE(p_student_id, v_uid);
  ELSE
    v_target := v_uid;
  END IF;

  v_reason := public.subject_entitlement_reason(v_target, p_subject_id);

  IF v_reason IS NOT NULL THEN
    RETURN QUERY
      SELECT true, v_reason, s.access_type
        FROM subjects s
       WHERE s.id = p_subject_id;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, 'no_access'::text, ''::text;
END;
$function$;

REVOKE ALL ON FUNCTION public.check_subject_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_subject_access(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT 'Migration 110 (entitlement RPCs) completed' AS result;
