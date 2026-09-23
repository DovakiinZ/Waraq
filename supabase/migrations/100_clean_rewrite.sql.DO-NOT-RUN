-- ============================================================
-- AYMAN ACADEMY — CLEAN DATABASE REWRITE
-- Run in Supabase SQL Editor as a single transaction.
-- Dev-only: drops ALL existing objects, no data migration.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────
-- 1.1  DROP EVERYTHING
-- ─────────────────────────────────────────────

-- Drop all RPC functions
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT ns.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc p
    JOIN   pg_namespace ns ON ns.oid = p.pronamespace
    WHERE  ns.nspname = 'public'
      AND  p.prokind = 'f'
      AND  p.proname NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Drop all triggers
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', r.trigger_name, r.event_object_table);
  END LOOP;
END $$;

-- Drop all tables (CASCADE handles FKs and policies)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
END $$;

-- Drop custom types/enums if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS invite_status CASCADE;
DROP TYPE IF EXISTS student_stage CASCADE;
DROP TYPE IF EXISTS student_gender CASCADE;
DROP TYPE IF EXISTS subject_access_type CASCADE;
DROP TYPE IF EXISTS template_type CASCADE;
DROP TYPE IF EXISTS certificate_status CASCADE;
DROP TYPE IF EXISTS lesson_block_type CASCADE;
DROP TYPE IF EXISTS quiz_question_type CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS billing_cycle CASCADE;

-- ─────────────────────────────────────────────
-- 1.3  CREATE TABLES (dependency order)
-- ─────────────────────────────────────────────

-- 1. profiles (created FIRST so helper functions can reference it)
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  role        text NOT NULL DEFAULT 'student' CHECK (role IN ('super_admin','teacher','student')),
  avatar_url  text,
  language_pref text DEFAULT 'ar' CHECK (language_pref IN ('ar','en')),
  is_active   boolean NOT NULL DEFAULT true,
  -- Student onboarding
  student_stage text CHECK (student_stage IN ('kindergarten','primary','middle','high')),
  grade       integer,
  gender      text CHECK (gender IN ('male','female','unspecified')),
  -- Teacher fields
  bio_ar      text,
  bio_en      text,
  show_on_home boolean DEFAULT false,
  home_order  integer DEFAULT 0,
  expertise_tags_ar text[],
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 1.2  HELPER FUNCTIONS (after profiles table exists)
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- 2. teacher_invites
CREATE TABLE teacher_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  full_name   text NOT NULL,
  token_hash  text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at  timestamptz NOT NULL,
  created_by  uuid NOT NULL REFERENCES profiles(id),
  accepted_by uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE teacher_invites ENABLE ROW LEVEL SECURITY;

-- 3. stages
CREATE TABLE stages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL UNIQUE,
  title_ar       text NOT NULL,
  title_en       text,
  description_ar text,
  description_en text,
  teaser_ar      text,
  teaser_en      text,
  sort_order     integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  show_on_home   boolean DEFAULT true,
  home_order     integer DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

-- 4. subjects (absorbs courses fields)
CREATE TABLE subjects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id        uuid REFERENCES stages(id) ON DELETE SET NULL,
  teacher_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  slug            text,
  title_ar        text NOT NULL,
  title_en        text,
  description_ar  text,
  description_en  text,
  teaser_ar       text,
  teaser_en       text,
  access_type     text NOT NULL DEFAULT 'public' CHECK (access_type IN ('public','stage','subscription','invite_only','org_only')),
  sort_order      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  is_published    boolean NOT NULL DEFAULT false,
  -- From courses
  cover_image_url text,
  is_paid         boolean DEFAULT false,
  price_amount    numeric(10,2) DEFAULT 0,
  price_currency  text DEFAULT 'SAR',
  -- Homepage
  show_on_home    boolean DEFAULT false,
  home_order      integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- 5. lessons (course_id removed, order_index → sort_order)
CREATE TABLE lessons (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id       uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  slug             text,
  title_ar         text NOT NULL,
  title_en         text,
  summary_ar       text,
  summary_en       text,
  sort_order       integer NOT NULL DEFAULT 0,
  is_paid          boolean NOT NULL DEFAULT false,
  is_published     boolean NOT NULL DEFAULT false,
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- Metadata
  objectives_ar    text,
  objectives_en    text,
  prerequisites_ar text,
  prerequisites_en text,
  duration_minutes integer,
  cover_image_url  text,
  video_url        text,
  -- Legacy compat
  preview_video_url text,
  full_video_url    text,
  duration_seconds  integer,
  is_free_preview   boolean DEFAULT false,
  -- Homepage
  show_on_home      boolean DEFAULT false,
  home_order        integer DEFAULT 0,
  teaser_ar         text,
  teaser_en         text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- 6. lesson_sections (order_index → sort_order)
CREATE TABLE lesson_sections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title_ar   text NOT NULL,
  title_en   text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE lesson_sections ENABLE ROW LEVEL SECURITY;

-- 7. lesson_blocks (order_index → sort_order)
CREATE TABLE lesson_blocks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id    uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  section_id   uuid REFERENCES lesson_sections(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('rich_text','video','image','file','link','tip','warning','example','exercise','qa','equation')),
  title_ar     text,
  title_en     text,
  content_ar   text,
  content_en   text,
  url          text,
  metadata     jsonb,
  sort_order   integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE lesson_blocks ENABLE ROW LEVEL SECURITY;

-- 8. quizzes (replaces lesson_quizzes — supports lesson-level AND subject-level)
CREATE TABLE quizzes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id            uuid REFERENCES lessons(id) ON DELETE CASCADE,
  subject_id           uuid REFERENCES subjects(id) ON DELETE CASCADE,
  title_ar             text,
  title_en             text,
  is_enabled           boolean NOT NULL DEFAULT true,
  is_required          boolean NOT NULL DEFAULT false,
  passing_score        integer NOT NULL DEFAULT 70,
  attempts_allowed     integer NOT NULL DEFAULT 0,
  unlock_after_percent integer DEFAULT 90,
  created_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- 9. quiz_questions (replaces lesson_quiz_questions, order_index → sort_order)
CREATE TABLE quiz_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id         uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type            text NOT NULL DEFAULT 'mcq' CHECK (type IN ('mcq','true_false','multi_select')),
  question_ar     text NOT NULL,
  question_en     text,
  explanation_ar  text,
  explanation_en  text,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- 10. quiz_options (replaces JSONB options in lesson_quiz_questions)
CREATE TABLE quiz_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  text_ar     text NOT NULL,
  text_en     text,
  is_correct  boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0
);
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;

-- 11. quiz_attempts
CREATE TABLE quiz_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score_percent integer NOT NULL DEFAULT 0,
  answers       jsonb,
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 12. lesson_progress
CREATE TABLE lesson_progress (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id             uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  progress_percent      integer NOT NULL DEFAULT 0,
  last_position_seconds integer NOT NULL DEFAULT 0,
  completed_at          timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- 13. lesson_notes
CREATE TABLE lesson_notes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id         uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content           text NOT NULL,
  position_seconds  integer DEFAULT 0,
  scroll_position   integer DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

-- 14. lesson_comments
CREATE TABLE lesson_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id  uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text NOT NULL,
  is_pinned  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE lesson_comments ENABLE ROW LEVEL SECURITY;

-- 15. ratings (unified — replaces lesson_ratings)
CREATE TABLE ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('lesson','subject','teacher')),
  entity_id   uuid NOT NULL,
  stars       integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- 16. messages
CREATE TABLE messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 17. announcements (bilingual)
CREATE TABLE announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id  uuid REFERENCES subjects(id) ON DELETE SET NULL,
  title_ar    text NOT NULL,
  title_en    text,
  body_ar     text,
  body_en     text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 18. audit_logs
CREATE TABLE audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 19. system_settings
CREATE TABLE system_settings (
  key         text PRIMARY KEY,
  value       jsonb,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 20. templates
CREATE TABLE templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  title_ar    text NOT NULL,
  title_en    text NOT NULL,
  description text,
  type        text NOT NULL CHECK (type IN ('certificate','message','email','page_block')),
  content_ar  text NOT NULL,
  content_en  text NOT NULL,
  variables   jsonb NOT NULL DEFAULT '[]',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 21. content_templates (legacy)
CREATE TABLE content_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  category    text,
  description text,
  content_ar  text,
  content_en  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- 22. certificates
CREATE TABLE certificates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id        uuid REFERENCES subjects(id) ON DELETE SET NULL,
  template_id       uuid REFERENCES templates(id) ON DELETE SET NULL,
  student_name      text NOT NULL,
  student_email     text,
  course_name       text NOT NULL,
  subject_name      text,
  score             integer,
  issued_at         timestamptz NOT NULL DEFAULT now(),
  verification_code text NOT NULL UNIQUE,
  pdf_url           text,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','eligible','pending_approval','issued','revoked')),
  version           integer NOT NULL DEFAULT 1,
  reissued_from_id  uuid REFERENCES certificates(id) ON DELETE SET NULL,
  snapshot_json     jsonb,
  template_version  integer NOT NULL DEFAULT 1,
  render_mode       text DEFAULT 'official' CHECK (render_mode IN ('official','live')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 23. certificate_reissue_logs
CREATE TABLE certificate_reissue_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_certificate_id  uuid NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  new_certificate_id  uuid REFERENCES certificates(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE certificate_reissue_logs ENABLE ROW LEVEL SECURITY;

-- 24. certificate_rules
CREATE TABLE certificate_rules (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id                uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  enabled                   boolean NOT NULL DEFAULT true,
  rule_json                 jsonb NOT NULL DEFAULT '{"type":"AND","rules":[]}',
  requires_manual_approval  boolean NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);
ALTER TABLE certificate_rules ENABLE ROW LEVEL SECURITY;

-- 25. student_subjects
CREATE TABLE student_subjects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id      uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  assigned_by     text NOT NULL DEFAULT 'system' CHECK (assigned_by IN ('admin','teacher','system')),
  assigned_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id)
);
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;

-- 26. plans
CREATE TABLE plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar         text NOT NULL,
  name_en         text,
  description_ar  text,
  description_en  text,
  billing         text NOT NULL CHECK (billing IN ('monthly','yearly','lifetime')),
  price_cents     integer NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'SAR',
  stage_id        uuid REFERENCES stages(id) ON DELETE SET NULL,
  is_family       boolean NOT NULL DEFAULT false,
  max_members     integer,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 27. plan_subjects
CREATE TABLE plan_subjects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE (plan_id, subject_id)
);
ALTER TABLE plan_subjects ENABLE ROW LEVEL SECURITY;

-- 28. subscriptions
CREATE TABLE subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  plan_id         uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('trialing','active','past_due','expired','cancelled')),
  starts_at       timestamptz NOT NULL DEFAULT now(),
  ends_at         timestamptz,
  trial_ends_at   timestamptz,
  provider        text NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual','stripe','tap','hyperpay')),
  provider_ref    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 29. family_members
CREATE TABLE family_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, student_id)
);
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 30. subject_invites
CREATE TABLE subject_invites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id        uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  invited_by_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE subject_invites ENABLE ROW LEVEL SECURITY;

-- 31. access_grants (general access control)
CREATE TABLE access_grants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id      uuid REFERENCES subjects(id) ON DELETE CASCADE,
  granted_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason          text,
  expires_at      timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;

-- 32. organizations
CREATE TABLE organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar    text NOT NULL,
  name_en    text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 33. org_members
CREATE TABLE org_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, student_id)
);
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- 34. org_subjects
CREATE TABLE org_subjects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_id      uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, subject_id)
);
ALTER TABLE org_subjects ENABLE ROW LEVEL SECURITY;

-- 35. coupons
CREATE TABLE coupons (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,
  discount_type    text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value   numeric(10,2) NOT NULL,
  max_redemptions  integer,
  redeemed_count   integer NOT NULL DEFAULT 0,
  starts_at        timestamptz,
  ends_at          timestamptz,
  applies_to       text NOT NULL CHECK (applies_to IN ('plan','subject')),
  plan_id          uuid REFERENCES plans(id) ON DELETE SET NULL,
  subject_id       uuid REFERENCES subjects(id) ON DELETE SET NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- 36. coupon_redemptions
CREATE TABLE coupon_redemptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  redeemed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- 37. parent_links
CREATE TABLE parent_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);
ALTER TABLE parent_links ENABLE ROW LEVEL SECURITY;

-- 38. student_badges
CREATE TABLE badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  title_ar    text NOT NULL,
  title_en    text,
  description_ar text,
  description_en text,
  icon_url    text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE TABLE student_badges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id   uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, badge_id)
);
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;

-- 39. student_xp
CREATE TABLE student_xp (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount     integer NOT NULL,
  reason     text NOT NULL,
  entity_id  uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE student_xp ENABLE ROW LEVEL SECURITY;

-- 40. certificate_template_settings
CREATE TABLE certificate_template_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE certificate_template_settings ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 1.4  RLS POLICIES
-- ─────────────────────────────────────────────

-- ── profiles ──
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (is_super_admin());

-- ── teacher_invites ──
CREATE POLICY "invites_admin" ON teacher_invites FOR ALL USING (is_super_admin());
CREATE POLICY "invites_select_own" ON teacher_invites FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ── stages ──
CREATE POLICY "stages_select" ON stages FOR SELECT USING (true);
CREATE POLICY "stages_admin" ON stages FOR ALL USING (is_super_admin());

-- ── subjects ──
CREATE POLICY "subjects_select_active" ON subjects FOR SELECT USING (is_active = true OR is_super_admin() OR teacher_id = auth.uid());
CREATE POLICY "subjects_teacher_own" ON subjects FOR UPDATE USING (teacher_id = auth.uid());
CREATE POLICY "subjects_admin" ON subjects FOR ALL USING (is_super_admin());

-- ── lessons ──
CREATE POLICY "lessons_select_published" ON lessons FOR SELECT USING (is_published = true OR created_by = auth.uid() OR is_super_admin());
CREATE POLICY "lessons_teacher_own" ON lessons FOR INSERT WITH CHECK (created_by = auth.uid() OR is_super_admin());
CREATE POLICY "lessons_teacher_update" ON lessons FOR UPDATE USING (created_by = auth.uid() OR is_super_admin());
CREATE POLICY "lessons_teacher_delete" ON lessons FOR DELETE USING (created_by = auth.uid() OR is_super_admin());

-- ── lesson_sections ──
CREATE POLICY "sections_select" ON lesson_sections FOR SELECT USING (true);
CREATE POLICY "sections_manage" ON lesson_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM lessons WHERE id = lesson_sections.lesson_id AND (created_by = auth.uid() OR is_super_admin()))
);

-- ── lesson_blocks ──
CREATE POLICY "blocks_select" ON lesson_blocks FOR SELECT USING (true);
CREATE POLICY "blocks_manage" ON lesson_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM lessons WHERE id = lesson_blocks.lesson_id AND (created_by = auth.uid() OR is_super_admin()))
);

-- ── quizzes ──
CREATE POLICY "quizzes_select" ON quizzes FOR SELECT USING (true);
CREATE POLICY "quizzes_manage" ON quizzes FOR ALL USING (
  is_super_admin() OR
  EXISTS (SELECT 1 FROM lessons WHERE id = quizzes.lesson_id AND created_by = auth.uid())
);

-- ── quiz_questions ──
CREATE POLICY "quiz_questions_select" ON quiz_questions FOR SELECT USING (true);
CREATE POLICY "quiz_questions_manage" ON quiz_questions FOR ALL USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM quizzes q
    JOIN lessons l ON l.id = q.lesson_id
    WHERE q.id = quiz_questions.quiz_id AND l.created_by = auth.uid()
  )
);

-- ── quiz_options ──
CREATE POLICY "quiz_options_select" ON quiz_options FOR SELECT USING (true);
CREATE POLICY "quiz_options_manage" ON quiz_options FOR ALL USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    JOIN lessons l ON l.id = q.lesson_id
    WHERE qq.id = quiz_options.question_id AND l.created_by = auth.uid()
  )
);

-- ── quiz_attempts ──
CREATE POLICY "attempts_select_own" ON quiz_attempts FOR SELECT USING (student_id = auth.uid() OR is_super_admin());
CREATE POLICY "attempts_insert_own" ON quiz_attempts FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "attempts_admin" ON quiz_attempts FOR ALL USING (is_super_admin());

-- ── lesson_progress ──
CREATE POLICY "progress_select_own" ON lesson_progress FOR SELECT USING (user_id = auth.uid() OR is_super_admin());
CREATE POLICY "progress_upsert_own" ON lesson_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_update_own" ON lesson_progress FOR UPDATE USING (user_id = auth.uid());

-- ── lesson_notes ──
CREATE POLICY "notes_own" ON lesson_notes FOR ALL USING (user_id = auth.uid());
CREATE POLICY "notes_admin_read" ON lesson_notes FOR SELECT USING (is_super_admin());

-- ── lesson_comments ──
CREATE POLICY "comments_select" ON lesson_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON lesson_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_update_own" ON lesson_comments FOR UPDATE USING (user_id = auth.uid() OR is_super_admin());
CREATE POLICY "comments_delete" ON lesson_comments FOR DELETE USING (user_id = auth.uid() OR is_super_admin());

-- ── ratings ──
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_upsert_own" ON ratings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ratings_update_own" ON ratings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "ratings_admin" ON ratings FOR ALL USING (is_super_admin());

-- ── messages ──
CREATE POLICY "messages_own" ON messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_update_receiver" ON messages FOR UPDATE USING (receiver_id = auth.uid());

-- ── announcements ──
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (true);
CREATE POLICY "announcements_teacher" ON announcements FOR ALL USING (teacher_id = auth.uid() OR is_super_admin());

-- ── audit_logs ──
CREATE POLICY "audit_admin" ON audit_logs FOR SELECT USING (is_super_admin());
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (true);

-- ── system_settings ──
CREATE POLICY "settings_select" ON system_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin" ON system_settings FOR ALL USING (is_super_admin());

-- ── templates ──
CREATE POLICY "templates_select" ON templates FOR SELECT USING (true);
CREATE POLICY "templates_admin" ON templates FOR ALL USING (is_super_admin());

-- ── content_templates ──
CREATE POLICY "ctemplates_select" ON content_templates FOR SELECT USING (true);
CREATE POLICY "ctemplates_admin" ON content_templates FOR ALL USING (is_super_admin());

-- ── certificates ──
CREATE POLICY "certs_select_own" ON certificates FOR SELECT USING (student_id = auth.uid() OR is_super_admin());
CREATE POLICY "certs_admin" ON certificates FOR ALL USING (is_super_admin());

-- ── certificate_reissue_logs ──
CREATE POLICY "reissue_select" ON certificate_reissue_logs FOR SELECT USING (student_id = auth.uid() OR is_super_admin());
CREATE POLICY "reissue_admin" ON certificate_reissue_logs FOR ALL USING (is_super_admin());

-- ── certificate_rules ──
CREATE POLICY "cert_rules_select" ON certificate_rules FOR SELECT USING (true);
CREATE POLICY "cert_rules_admin" ON certificate_rules FOR ALL USING (is_super_admin());

-- ── student_subjects ──
CREATE POLICY "ss_select_own" ON student_subjects FOR SELECT USING (student_id = auth.uid() OR is_super_admin());
CREATE POLICY "ss_admin" ON student_subjects FOR ALL USING (is_super_admin());

-- ── plans ──
CREATE POLICY "plans_select" ON plans FOR SELECT USING (true);
CREATE POLICY "plans_admin" ON plans FOR ALL USING (is_super_admin());

-- ── plan_subjects ──
CREATE POLICY "ps_select" ON plan_subjects FOR SELECT USING (true);
CREATE POLICY "ps_admin" ON plan_subjects FOR ALL USING (is_super_admin());

-- ── subscriptions ──
CREATE POLICY "subs_select_own" ON subscriptions FOR SELECT USING (owner_user_id = auth.uid() OR student_id = auth.uid() OR is_super_admin());
CREATE POLICY "subs_admin" ON subscriptions FOR ALL USING (is_super_admin());

-- ── family_members ──
CREATE POLICY "fm_select" ON family_members FOR SELECT USING (
  student_id = auth.uid() OR
  EXISTS (SELECT 1 FROM subscriptions s WHERE s.id = family_members.subscription_id AND s.owner_user_id = auth.uid()) OR
  is_super_admin()
);
CREATE POLICY "fm_admin" ON family_members FOR ALL USING (is_super_admin());

-- ── subject_invites ──
CREATE POLICY "si_select_own" ON subject_invites FOR SELECT USING (student_id = auth.uid() OR invited_by_user_id = auth.uid() OR is_super_admin());
CREATE POLICY "si_admin" ON subject_invites FOR ALL USING (is_super_admin());

-- ── access_grants ──
CREATE POLICY "ag_select_own" ON access_grants FOR SELECT USING (student_id = auth.uid() OR is_super_admin());
CREATE POLICY "ag_admin" ON access_grants FOR ALL USING (is_super_admin());

-- ── organizations ──
CREATE POLICY "orgs_select" ON organizations FOR SELECT USING (true);
CREATE POLICY "orgs_admin" ON organizations FOR ALL USING (is_super_admin());

-- ── org_members ──
CREATE POLICY "om_select" ON org_members FOR SELECT USING (student_id = auth.uid() OR is_super_admin());
CREATE POLICY "om_admin" ON org_members FOR ALL USING (is_super_admin());

-- ── org_subjects ──
CREATE POLICY "os_select" ON org_subjects FOR SELECT USING (true);
CREATE POLICY "os_admin" ON org_subjects FOR ALL USING (is_super_admin());

-- ── coupons ──
CREATE POLICY "coupons_select" ON coupons FOR SELECT USING (is_active = true OR is_super_admin());
CREATE POLICY "coupons_admin" ON coupons FOR ALL USING (is_super_admin());

-- ── coupon_redemptions ──
CREATE POLICY "cr_select_own" ON coupon_redemptions FOR SELECT USING (user_id = auth.uid() OR is_super_admin());
CREATE POLICY "cr_insert_own" ON coupon_redemptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cr_admin" ON coupon_redemptions FOR ALL USING (is_super_admin());

-- ── parent_links ──
CREATE POLICY "pl_select" ON parent_links FOR SELECT USING (parent_id = auth.uid() OR student_id = auth.uid() OR is_super_admin());
CREATE POLICY "pl_admin" ON parent_links FOR ALL USING (is_super_admin());

-- ── badges ──
CREATE POLICY "badges_select" ON badges FOR SELECT USING (true);
CREATE POLICY "badges_admin" ON badges FOR ALL USING (is_super_admin());

-- ── student_badges ──
CREATE POLICY "sb_select_own" ON student_badges FOR SELECT USING (student_id = auth.uid() OR is_super_admin());
CREATE POLICY "sb_admin" ON student_badges FOR ALL USING (is_super_admin());

-- ── student_xp ──
CREATE POLICY "xp_select_own" ON student_xp FOR SELECT USING (student_id = auth.uid() OR is_super_admin());
CREATE POLICY "xp_admin" ON student_xp FOR ALL USING (is_super_admin());

-- ── certificate_template_settings ──
CREATE POLICY "cts_select" ON certificate_template_settings FOR SELECT USING (true);
CREATE POLICY "cts_admin" ON certificate_template_settings FOR ALL USING (is_super_admin());

-- ─────────────────────────────────────────────
-- 1.5  RPC FUNCTIONS
-- ─────────────────────────────────────────────

-- get_student_subjects: entitled subjects for a student
CREATE OR REPLACE FUNCTION get_student_subjects(p_student_id uuid)
RETURNS TABLE (
  id uuid, title_ar text, title_en text,
  description_ar text, description_en text,
  slug text, stage_id uuid, access_type text,
  sort_order integer, show_on_home boolean,
  teaser_ar text, teaser_en text,
  entitlement_reason text,
  stage_title_ar text, stage_title_en text,
  total_lessons bigint, completed_lessons bigint,
  progress_percent integer
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

-- get_discover_subjects: locked subjects for student discovery
CREATE OR REPLACE FUNCTION get_discover_subjects(p_student_id uuid)
RETURNS TABLE (
  id uuid, title_ar text, title_en text,
  description_ar text, description_en text,
  slug text, stage_id uuid, access_type text,
  sort_order integer, show_on_home boolean,
  teaser_ar text, teaser_en text,
  lock_reason text,
  stage_title_ar text, stage_title_en text
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

-- check_subject_access
CREATE OR REPLACE FUNCTION check_subject_access(p_student_id uuid, p_subject_id uuid)
RETURNS TABLE (has_access boolean, reason text, access_type text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

-- get_student_teachers
CREATE OR REPLACE FUNCTION get_student_teachers(student_uuid uuid)
RETURNS TABLE (teacher_id uuid, teacher_name text, subject_title text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.id, p.full_name, s.title_ar
  FROM lesson_progress lp
  JOIN lessons l ON l.id = lp.lesson_id
  JOIN subjects s ON s.id = l.subject_id
  JOIN profiles p ON p.id = l.created_by
  WHERE lp.user_id = student_uuid AND p.role IN ('teacher','super_admin');
END;
$$;

-- is_super_admin (already created above, but keep for reference)

-- get_student_subject_progress
CREATE OR REPLACE FUNCTION get_student_subject_progress(p_student_id uuid, p_subject_id uuid)
RETURNS TABLE (total_lessons bigint, completed_lessons bigint, progress_percent integer)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*)::bigint AS total,
    count(*) FILTER (WHERE lp.completed_at IS NOT NULL)::bigint AS completed,
    CASE WHEN count(*) > 0
         THEN (count(*) FILTER (WHERE lp.completed_at IS NOT NULL) * 100 / count(*))::integer
         ELSE 0
    END AS pct
  FROM lessons l
  LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = p_student_id
  WHERE l.subject_id = p_subject_id AND l.is_published = true;
END;
$$;

-- student_request_reissue
CREATE OR REPLACE FUNCTION student_request_reissue(p_certificate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cert certificates;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_cert FROM certificates WHERE id = p_certificate_id AND student_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF v_cert.status != 'issued' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  v_new_id := gen_random_uuid();

  INSERT INTO certificate_reissue_logs (student_id, old_certificate_id, new_certificate_id)
  VALUES (auth.uid(), p_certificate_id, v_new_id);

  UPDATE certificates SET status = 'revoked' WHERE id = p_certificate_id;

  INSERT INTO certificates (id, student_id, subject_id, template_id, student_name, course_name, subject_name, score, verification_code, status, version, reissued_from_id, snapshot_json, template_version)
  SELECT v_new_id, student_id, subject_id, template_id, student_name, course_name, subject_name, score,
         encode(gen_random_bytes(6), 'hex'), 'pending_approval', version + 1, p_certificate_id, snapshot_json, template_version
  FROM certificates WHERE id = p_certificate_id;

  RETURN jsonb_build_object('success', true, 'new_certificate_id', v_new_id);
END;
$$;

-- ─────────────────────────────────────────────
-- 1.6  AUTH TRIGGER
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- 1.7  INDEXES
-- ─────────────────────────────────────────────

-- FK indexes
CREATE INDEX idx_subjects_stage_id ON subjects(stage_id);
CREATE INDEX idx_subjects_teacher_id ON subjects(teacher_id);
CREATE INDEX idx_lessons_subject_id ON lessons(subject_id);
CREATE INDEX idx_lessons_created_by ON lessons(created_by);
CREATE INDEX idx_lesson_blocks_lesson_id ON lesson_blocks(lesson_id);
CREATE INDEX idx_lesson_blocks_section_id ON lesson_blocks(section_id);
CREATE INDEX idx_lesson_sections_lesson_id ON lesson_sections(lesson_id);
CREATE INDEX idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX idx_quizzes_subject_id ON quizzes(subject_id);
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_options_question_id ON quiz_options(question_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX idx_ratings_entity ON ratings(entity_type, entity_id);
CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_certificates_student_id ON certificates(student_id);
CREATE INDEX idx_certificates_subject_id ON certificates(subject_id);
CREATE INDEX idx_student_subjects_student_id ON student_subjects(student_id);
CREATE INDEX idx_student_subjects_subject_id ON student_subjects(subject_id);
CREATE INDEX idx_subscriptions_owner ON subscriptions(owner_user_id);
CREATE INDEX idx_subscriptions_student ON subscriptions(student_id);
CREATE INDEX idx_plan_subjects_plan_id ON plan_subjects(plan_id);
CREATE INDEX idx_org_members_org_id ON org_members(organization_id);
CREATE INDEX idx_org_subjects_org_id ON org_subjects(organization_id);
CREATE INDEX idx_access_grants_student ON access_grants(student_id);
CREATE INDEX idx_announcements_teacher ON announcements(teacher_id);
CREATE INDEX idx_announcements_subject ON announcements(subject_id);

-- Query pattern indexes
CREATE INDEX idx_lessons_sort ON lessons(subject_id, sort_order) WHERE is_published = true;
CREATE INDEX idx_subjects_sort ON subjects(stage_id, sort_order) WHERE is_active = true;
CREATE INDEX idx_stages_sort ON stages(sort_order) WHERE is_active = true;
CREATE INDEX idx_lesson_progress_updated ON lesson_progress(user_id, updated_at DESC);
CREATE INDEX idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);

-- ─────────────────────────────────────────────
-- 1.8  SEED DATA
-- ─────────────────────────────────────────────

INSERT INTO stages (slug, title_ar, title_en, sort_order) VALUES
  ('kindergarten', 'كتاب تمهيدي', 'Kindergarten', 1),
  ('primary',      'ابتدائي',     'Primary',      2),
  ('middle',       'متوسط',       'Middle School', 3),
  ('high',         'ثانوي',       'High School',   4);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;
