-- ============================================================
-- Migration 066: orders + teacher_applications
-- ------------------------------------------------------------
-- Creates the two marketplace/onboarding tables that the app
-- code already reads/writes but were never provisioned:
--   * orders                -> student checkout (Sham Cash flow)
--   * teacher_applications   -> public "Teach with Us" form
-- Shapes match the Order / TeacherApplication interfaces in
-- src/types/database.ts.
-- ============================================================

-- ============================================================
-- 1. ORDERS
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_orders_student  ON public.orders(student_id);
CREATE INDEX IF NOT EXISTS idx_orders_teacher  ON public.orders(teacher_id);
CREATE INDEX IF NOT EXISTS idx_orders_subject  ON public.orders(subject_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON public.orders(status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Students manage/read their own orders
DROP POLICY IF EXISTS "orders_student_insert" ON public.orders;
CREATE POLICY "orders_student_insert" ON public.orders
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "orders_student_select" ON public.orders;
CREATE POLICY "orders_student_select" ON public.orders
  FOR SELECT USING (student_id = auth.uid());

-- Students may cancel their own still-pending orders
DROP POLICY IF EXISTS "orders_student_update" ON public.orders;
CREATE POLICY "orders_student_update" ON public.orders
  FOR UPDATE USING (student_id = auth.uid() AND status = 'pending_payment');

-- Teachers read + review orders on their own subjects
DROP POLICY IF EXISTS "orders_teacher_select" ON public.orders;
CREATE POLICY "orders_teacher_select" ON public.orders
  FOR SELECT USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "orders_teacher_update" ON public.orders;
CREATE POLICY "orders_teacher_update" ON public.orders
  FOR UPDATE USING (teacher_id = auth.uid());

-- Super admins: full access
DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 2. TEACHER APPLICATIONS
-- ============================================================
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

-- Anyone (public form) may submit an application
DROP POLICY IF EXISTS "teacher_apps_public_insert" ON public.teacher_applications;
CREATE POLICY "teacher_apps_public_insert" ON public.teacher_applications
  FOR INSERT WITH CHECK (true);

-- Only super admins can read / review / manage applications
DROP POLICY IF EXISTS "teacher_apps_admin_all" ON public.teacher_applications;
CREATE POLICY "teacher_apps_admin_all" ON public.teacher_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 3. updated_at auto-touch trigger (shared)
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_teacher_apps_updated_at ON public.teacher_applications;
CREATE TRIGGER trg_teacher_apps_updated_at
  BEFORE UPDATE ON public.teacher_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
