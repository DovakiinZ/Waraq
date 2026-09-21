-- ============================================================
-- Migration 102: gaps left open by 100_clean_rewrite.sql
-- ------------------------------------------------------------
-- 100_clean_rewrite.sql drops every object in the public schema
-- and then rebuilds 41 tables. It does NOT rebuild the tables that
-- migration 066 added, and it omits several columns that both the
-- Flutter app and the web portal read and write. Running 100
-- without this file leaves the marketplace, checkout, teacher
-- orders, quiz submission and XP flows broken at runtime.
--
-- Run this IMMEDIATELY AFTER 100_clean_rewrite.sql.
-- Safe to re-run (idempotent).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Shared updated_at trigger helper (100 drops all functions)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $FN$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$FN$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 2. ORDERS  (marketplace / Sham Cash checkout)
--    Referenced by 6 call sites in the Flutter app:
--    marketplace_provider, checkout_screen, teacher_orders_screen
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id               UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'pending_payment'
                             CHECK (status IN ('pending_payment', 'paid', 'rejected', 'cancelled')),
  amount                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency                 TEXT NOT NULL DEFAULT 'SYP',
  student_full_name        TEXT,
  student_payment_account  TEXT,
  teacher_notes            TEXT,
  paid_at                  TIMESTAMPTZ,
  reviewed_by              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_student ON public.orders(student_id);
CREATE INDEX IF NOT EXISTS idx_orders_teacher ON public.orders(teacher_id);
CREATE INDEX IF NOT EXISTS idx_orders_subject ON public.orders(subject_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON public.orders(status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_student_insert" ON public.orders;
CREATE POLICY "orders_student_insert" ON public.orders
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "orders_student_select" ON public.orders;
CREATE POLICY "orders_student_select" ON public.orders
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "orders_student_update" ON public.orders;
CREATE POLICY "orders_student_update" ON public.orders
  FOR UPDATE USING (student_id = auth.uid() AND status = 'pending_payment');

DROP POLICY IF EXISTS "orders_teacher_select" ON public.orders;
CREATE POLICY "orders_teacher_select" ON public.orders
  FOR SELECT USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "orders_teacher_update" ON public.orders;
CREATE POLICY "orders_teacher_update" ON public.orders
  FOR UPDATE USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (public.is_super_admin());

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 3. TEACHER APPLICATIONS  (public Teach-with-Us form)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  bio            TEXT,
  profession     TEXT,
  major          TEXT,
  grades_taught  TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes    TEXT,
  reviewed_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_apps_status ON public.teacher_applications(status);
CREATE INDEX IF NOT EXISTS idx_teacher_apps_email  ON public.teacher_applications(email);

ALTER TABLE public.teacher_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_apps_public_insert" ON public.teacher_applications;
CREATE POLICY "teacher_apps_public_insert" ON public.teacher_applications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "teacher_apps_admin_all" ON public.teacher_applications;
CREATE POLICY "teacher_apps_admin_all" ON public.teacher_applications
  FOR ALL USING (public.is_super_admin());

DROP TRIGGER IF EXISTS trg_teacher_apps_updated_at ON public.teacher_applications;
CREATE TRIGGER trg_teacher_apps_updated_at
  BEFORE UPDATE ON public.teacher_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ------------------------------------------------------------
-- 4. Sham Cash payout details on teacher profiles
--    Read by checkout_screen (to show the student where to pay)
--    and written by teacher_profile_screen.
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shamcash_account_name   TEXT,
  ADD COLUMN IF NOT EXISTS shamcash_account_number TEXT,
  ADD COLUMN IF NOT EXISTS shamcash_qr_url         TEXT;

-- 100_clean_rewrite also dropped expertise_tags_en, which the web
-- portal still selects on the public teacher profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expertise_tags_en TEXT[];

-- ------------------------------------------------------------
-- 5. quiz_attempts.passed
--    quiz_provider.dart writes this on every submission and
--    achievements_screen.dart filters on it. Without the column
--    the INSERT fails outright and no student can submit a quiz.
-- ------------------------------------------------------------
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS passed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student
  ON public.quiz_attempts(student_id, quiz_id);

-- ------------------------------------------------------------
-- 6. student_levels  (student profile header / XP level)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_levels (
  student_id   UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp     INTEGER NOT NULL DEFAULT 0,
  level        INTEGER NOT NULL DEFAULT 1,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_levels_own_select" ON public.student_levels;
CREATE POLICY "student_levels_own_select" ON public.student_levels
  FOR SELECT USING (student_id = auth.uid() OR public.is_super_admin());

COMMIT;
