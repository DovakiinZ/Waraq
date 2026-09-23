-- ============================================================
-- SEED DATA — Test/Demo content for Ayman Academy
-- Run AFTER 100_clean_rewrite.sql
-- ============================================================

-- ─────────────────────────────────────────────
-- 0. CREATE AUTH USERS FIRST (profiles FK → auth.users)
-- ─────────────────────────────────────────────
-- All users get password: Test123456!

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, is_super_admin, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@ayman-academy.com', crypt('Test123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"أيمن المدير","role":"super_admin"}', now(), now(), '', false, null),
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'khalid@ayman-academy.com', crypt('Test123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"خالد العلي","role":"teacher"}', now(), now(), '', false, null),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fatima@ayman-academy.com', crypt('Test123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"فاطمة الزهراء","role":"teacher"}', now(), now(), '', false, null),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ahmed@ayman-academy.com', crypt('Test123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"أحمد محمد","role":"teacher"}', now(), now(), '', false, null),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sara@ayman-academy.com', crypt('Test123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"سارة القحطاني","role":"teacher"}', now(), now(), '', false, null),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'omar@student.com', crypt('Test123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"عمر الشمري","role":"student"}', now(), now(), '', false, null),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'layla@student.com', crypt('Test123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"ليلى الحربي","role":"student"}', now(), now(), '', false, null),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'yusuf@student.com', crypt('Test123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"يوسف السالم","role":"student"}', now(), now(), '', false, null),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nora@student.com', crypt('Test123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"نورة العتيبي","role":"student"}', now(), now(), '', false, null),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ali@student.com', crypt('Test123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"علي الدوسري","role":"student"}', now(), now(), '', false, null);

-- Identity entries (required for email/password login)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@ayman-academy.com"}', 'email', '00000000-0000-0000-0000-000000000001', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '{"sub":"00000000-0000-0000-0000-000000000010","email":"khalid@ayman-academy.com"}', 'email', '00000000-0000-0000-0000-000000000010', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000011', '{"sub":"00000000-0000-0000-0000-000000000011","email":"fatima@ayman-academy.com"}', 'email', '00000000-0000-0000-0000-000000000011', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000012', '{"sub":"00000000-0000-0000-0000-000000000012","email":"ahmed@ayman-academy.com"}', 'email', '00000000-0000-0000-0000-000000000012', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000013', '{"sub":"00000000-0000-0000-0000-000000000013","email":"sara@ayman-academy.com"}', 'email', '00000000-0000-0000-0000-000000000013', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000020', '{"sub":"00000000-0000-0000-0000-000000000020","email":"omar@student.com"}', 'email', '00000000-0000-0000-0000-000000000020', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000021', '{"sub":"00000000-0000-0000-0000-000000000021","email":"layla@student.com"}', 'email', '00000000-0000-0000-0000-000000000021', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000022', '{"sub":"00000000-0000-0000-0000-000000000022","email":"yusuf@student.com"}', 'email', '00000000-0000-0000-0000-000000000022', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000023', '{"sub":"00000000-0000-0000-0000-000000000023","email":"nora@student.com"}', 'email', '00000000-0000-0000-0000-000000000023', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000024', '{"sub":"00000000-0000-0000-0000-000000000024","email":"ali@student.com"}', 'email', '00000000-0000-0000-0000-000000000024', now(), now(), now());

-- ─────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────

-- The auth trigger already created bare profiles, so we UPDATE them with full data

-- Super Admin
UPDATE profiles SET full_name = 'أيمن المدير', role = 'super_admin', bio_ar = 'مدير أكاديمية أيمن', bio_en = 'Ayman Academy Administrator', expertise_tags_ar = ARRAY['إدارة']
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Teachers
UPDATE profiles SET full_name = 'خالد العلي', role = 'teacher',
  bio_ar = 'معلم لغة عربية بخبرة ١٥ سنة في تدريس النحو والصرف والبلاغة. حاصل على ماجستير في اللغة العربية.',
  bio_en = 'Arabic language teacher with 15 years of experience in grammar, morphology and rhetoric.',
  show_on_home = true, home_order = 1, expertise_tags_ar = ARRAY['النحو', 'الصرف', 'البلاغة']
WHERE id = '00000000-0000-0000-0000-000000000010';

UPDATE profiles SET full_name = 'فاطمة الزهراء', role = 'teacher',
  bio_ar = 'معلمة رياضيات متخصصة في تبسيط المفاهيم الرياضية. حاصلة على بكالوريوس رياضيات.',
  bio_en = 'Math teacher specializing in simplifying mathematical concepts.',
  show_on_home = true, home_order = 2, expertise_tags_ar = ARRAY['الجبر', 'الهندسة', 'الحساب']
WHERE id = '00000000-0000-0000-0000-000000000011';

UPDATE profiles SET full_name = 'أحمد محمد', role = 'teacher',
  bio_ar = 'معلم علوم طبيعية يستخدم التجارب العملية في الشرح. خبرة ١٠ سنوات.',
  bio_en = 'Science teacher using hands-on experiments. 10 years experience.',
  show_on_home = true, home_order = 3, expertise_tags_ar = ARRAY['الفيزياء', 'الكيمياء', 'الأحياء']
WHERE id = '00000000-0000-0000-0000-000000000012';

UPDATE profiles SET full_name = 'سارة القحطاني', role = 'teacher',
  bio_ar = 'معلمة تربية إسلامية وتلاوة قرآن. متخصصة في أحكام التجويد.',
  bio_en = 'Islamic education and Quran recitation teacher. Tajweed specialist.',
  expertise_tags_ar = ARRAY['التجويد', 'التفسير', 'الفقه']
WHERE id = '00000000-0000-0000-0000-000000000013';

-- Students (with onboarding data)
UPDATE profiles SET full_name = 'عمر الشمري',  student_stage = 'primary',      grade = 4, gender = 'male'   WHERE id = '00000000-0000-0000-0000-000000000020';
UPDATE profiles SET full_name = 'ليلى الحربي',  student_stage = 'primary',      grade = 5, gender = 'female' WHERE id = '00000000-0000-0000-0000-000000000021';
UPDATE profiles SET full_name = 'يوسف السالم',  student_stage = 'middle',       grade = 7, gender = 'male'   WHERE id = '00000000-0000-0000-0000-000000000022';
UPDATE profiles SET full_name = 'نورة العتيبي',  student_stage = 'middle',       grade = 8, gender = 'female' WHERE id = '00000000-0000-0000-0000-000000000023';
UPDATE profiles SET full_name = 'علي الدوسري',  student_stage = 'kindergarten', grade = 1, gender = 'male'   WHERE id = '00000000-0000-0000-0000-000000000024';

-- ─────────────────────────────────────────────
-- 2. SUBJECTS (across stages)
-- ─────────────────────────────────────────────

-- Get stage IDs
DO $$
DECLARE
  v_kg   uuid;
  v_pri  uuid;
  v_mid  uuid;
  v_high uuid;
BEGIN
  SELECT id INTO v_kg   FROM stages WHERE slug = 'kindergarten';
  SELECT id INTO v_pri  FROM stages WHERE slug = 'primary';
  SELECT id INTO v_mid  FROM stages WHERE slug = 'middle';
  SELECT id INTO v_high FROM stages WHERE slug = 'high';

  -- ── Kindergarten subjects ──
  INSERT INTO subjects (id, stage_id, teacher_id, slug, title_ar, title_en, description_ar, description_en, access_type, sort_order, is_active, is_published, show_on_home, home_order) VALUES
    ('10000000-0000-0000-0000-000000000001', v_kg, '00000000-0000-0000-0000-000000000013', 'kg-quran',
     'القرآن الكريم - تمهيدي', 'Quran - Kindergarten',
     'تعلم الحروف العربية والآيات القصيرة للأطفال', 'Learn Arabic letters and short verses for children',
     'public', 1, true, true, true, 1),

    ('10000000-0000-0000-0000-000000000002', v_kg, '00000000-0000-0000-0000-000000000010', 'kg-arabic',
     'اللغة العربية - تمهيدي', 'Arabic - Kindergarten',
     'أساسيات القراءة والكتابة للمبتدئين', 'Reading and writing basics for beginners',
     'public', 2, true, true, false, 0);

  -- ── Primary subjects ──
  INSERT INTO subjects (id, stage_id, teacher_id, slug, title_ar, title_en, description_ar, description_en, access_type, sort_order, is_active, is_published, show_on_home, home_order) VALUES
    ('10000000-0000-0000-0000-000000000010', v_pri, '00000000-0000-0000-0000-000000000010', 'pri-arabic',
     'اللغة العربية - ابتدائي', 'Arabic - Primary',
     'النحو والصرف والقراءة والتعبير للمرحلة الابتدائية', 'Grammar, reading and writing for primary stage',
     'stage', 1, true, true, true, 2),

    ('10000000-0000-0000-0000-000000000011', v_pri, '00000000-0000-0000-0000-000000000011', 'pri-math',
     'الرياضيات - ابتدائي', 'Mathematics - Primary',
     'الأعداد والعمليات الحسابية والهندسة الأساسية', 'Numbers, arithmetic operations and basic geometry',
     'stage', 2, true, true, true, 3),

    ('10000000-0000-0000-0000-000000000012', v_pri, '00000000-0000-0000-0000-000000000012', 'pri-science',
     'العلوم - ابتدائي', 'Science - Primary',
     'استكشاف العلوم الطبيعية والتجارب البسيطة', 'Explore natural sciences and simple experiments',
     'stage', 3, true, true, false, 0),

    ('10000000-0000-0000-0000-000000000013', v_pri, '00000000-0000-0000-0000-000000000013', 'pri-islamic',
     'التربية الإسلامية - ابتدائي', 'Islamic Education - Primary',
     'القرآن الكريم والسيرة النبوية والأخلاق', 'Quran, Prophet biography and ethics',
     'stage', 4, true, true, false, 0);

  -- ── Middle school subjects ──
  INSERT INTO subjects (id, stage_id, teacher_id, slug, title_ar, title_en, description_ar, description_en, access_type, sort_order, is_active, is_published, show_on_home, home_order) VALUES
    ('10000000-0000-0000-0000-000000000020', v_mid, '00000000-0000-0000-0000-000000000010', 'mid-arabic',
     'اللغة العربية - متوسط', 'Arabic - Middle',
     'النحو المتقدم والبلاغة والأدب العربي', 'Advanced grammar, rhetoric and Arabic literature',
     'stage', 1, true, true, true, 4),

    ('10000000-0000-0000-0000-000000000021', v_mid, '00000000-0000-0000-0000-000000000011', 'mid-math',
     'الرياضيات - متوسط', 'Mathematics - Middle',
     'الجبر والهندسة والإحصاء', 'Algebra, geometry and statistics',
     'stage', 2, true, true, false, 0),

    ('10000000-0000-0000-0000-000000000022', v_mid, '00000000-0000-0000-0000-000000000012', 'mid-science',
     'العلوم - متوسط', 'Science - Middle',
     'الفيزياء والكيمياء والأحياء للمرحلة المتوسطة', 'Physics, chemistry and biology for middle school',
     'stage', 3, true, true, false, 0);

  -- ── High school subjects ──
  INSERT INTO subjects (id, stage_id, teacher_id, slug, title_ar, title_en, description_ar, description_en, access_type, sort_order, is_active, is_published, show_on_home, home_order) VALUES
    ('10000000-0000-0000-0000-000000000030', v_high, '00000000-0000-0000-0000-000000000010', 'high-arabic',
     'اللغة العربية - ثانوي', 'Arabic - High School',
     'الأدب والنقد والبلاغة المتقدمة', 'Literature, criticism and advanced rhetoric',
     'subscription', 1, true, true, false, 0),

    ('10000000-0000-0000-0000-000000000031', v_high, '00000000-0000-0000-0000-000000000011', 'high-math',
     'الرياضيات - ثانوي', 'Mathematics - High School',
     'التفاضل والتكامل والمصفوفات', 'Calculus and matrices',
     'subscription', 2, true, true, false, 0);

  -- ─────────────────────────────────────────────
  -- 3. LESSONS
  -- ─────────────────────────────────────────────

  -- ── Primary Arabic Lessons (6 lessons) ──
  INSERT INTO lessons (id, subject_id, slug, title_ar, title_en, summary_ar, summary_en, sort_order, is_published, created_by, duration_minutes, video_url) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000010', 'pri-arabic-1',
     'أقسام الكلام', 'Parts of Speech',
     'تعرف على الاسم والفعل والحرف', 'Learn about nouns, verbs and particles',
     1, true, '00000000-0000-0000-0000-000000000010', 30, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),

    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000010', 'pri-arabic-2',
     'الجملة الاسمية', 'Nominal Sentence',
     'المبتدأ والخبر وأنواعهما', 'Subject and predicate and their types',
     2, true, '00000000-0000-0000-0000-000000000010', 25, null),

    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000010', 'pri-arabic-3',
     'الجملة الفعلية', 'Verbal Sentence',
     'الفعل والفاعل والمفعول به', 'Verb, subject and object',
     3, true, '00000000-0000-0000-0000-000000000010', 35, null),

    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000010', 'pri-arabic-4',
     'أنواع الفعل', 'Types of Verbs',
     'الفعل الماضي والمضارع والأمر', 'Past, present and imperative verbs',
     4, true, '00000000-0000-0000-0000-000000000010', 30, null),

    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000010', 'pri-arabic-5',
     'الضمائر', 'Pronouns',
     'الضمائر المتصلة والمنفصلة', 'Connected and separate pronouns',
     5, true, '00000000-0000-0000-0000-000000000010', 25, null),

    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000010', 'pri-arabic-6',
     'المراجعة الشاملة', 'Comprehensive Review',
     'مراجعة شاملة لجميع المواضيع السابقة', 'Full review of all previous topics',
     6, true, '00000000-0000-0000-0000-000000000010', 40, null);

  -- ── Primary Math Lessons (5 lessons) ──
  INSERT INTO lessons (id, subject_id, slug, title_ar, title_en, summary_ar, summary_en, sort_order, is_published, created_by, duration_minutes) VALUES
    ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000011', 'pri-math-1',
     'الأعداد الصحيحة', 'Whole Numbers',
     'مقدمة في الأعداد الصحيحة وخط الأعداد', 'Introduction to whole numbers and number line',
     1, true, '00000000-0000-0000-0000-000000000011', 30),

    ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', 'pri-math-2',
     'الجمع والطرح', 'Addition and Subtraction',
     'عمليات الجمع والطرح مع أعداد كبيرة', 'Addition and subtraction with large numbers',
     2, true, '00000000-0000-0000-0000-000000000011', 35),

    ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000011', 'pri-math-3',
     'الضرب والقسمة', 'Multiplication and Division',
     'جدول الضرب وعمليات القسمة', 'Multiplication tables and division operations',
     3, true, '00000000-0000-0000-0000-000000000011', 40),

    ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000011', 'pri-math-4',
     'الكسور', 'Fractions',
     'مقدمة في الكسور والعمليات عليها', 'Introduction to fractions and operations',
     4, true, '00000000-0000-0000-0000-000000000011', 35),

    ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000011', 'pri-math-5',
     'الأشكال الهندسية', 'Geometric Shapes',
     'المربع والمستطيل والمثلث والدائرة', 'Square, rectangle, triangle and circle',
     5, true, '00000000-0000-0000-0000-000000000011', 30);

  -- ── Primary Science Lessons (4 lessons) ──
  INSERT INTO lessons (id, subject_id, slug, title_ar, title_en, summary_ar, summary_en, sort_order, is_published, created_by, duration_minutes) VALUES
    ('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000012', 'pri-sci-1',
     'الكائنات الحية', 'Living Organisms',
     'خصائص الكائنات الحية والتصنيف', 'Characteristics and classification of living organisms',
     1, true, '00000000-0000-0000-0000-000000000012', 30),

    ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000012', 'pri-sci-2',
     'الماء والهواء', 'Water and Air',
     'أهمية الماء والهواء في حياتنا', 'Importance of water and air in our lives',
     2, true, '00000000-0000-0000-0000-000000000012', 25),

    ('20000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000012', 'pri-sci-3',
     'الطاقة والحركة', 'Energy and Motion',
     'مفهوم الطاقة وأنواع الحركة', 'Concept of energy and types of motion',
     3, true, '00000000-0000-0000-0000-000000000012', 35),

    ('20000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000012', 'pri-sci-4',
     'النباتات', 'Plants',
     'أجزاء النبات وعملية البناء الضوئي', 'Plant parts and photosynthesis',
     4, true, '00000000-0000-0000-0000-000000000012', 30);

  -- ── Middle Arabic Lessons (4 lessons) ──
  INSERT INTO lessons (id, subject_id, slug, title_ar, title_en, summary_ar, summary_en, sort_order, is_published, created_by, duration_minutes) VALUES
    ('20000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000020', 'mid-arabic-1',
     'المعرب والمبني', 'Inflected and Uninflected',
     'الفرق بين الأسماء المعربة والمبنية', 'Difference between inflected and uninflected nouns',
     1, true, '00000000-0000-0000-0000-000000000010', 40),

    ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000020', 'mid-arabic-2',
     'إعراب الفعل المضارع', 'Parsing Present Tense',
     'حالات رفع ونصب وجزم الفعل المضارع', 'Cases of present tense verb parsing',
     2, true, '00000000-0000-0000-0000-000000000010', 45),

    ('20000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000020', 'mid-arabic-3',
     'الحال والتمييز', 'Haal and Tamyeez',
     'شرح مفصل للحال والتمييز مع أمثلة', 'Detailed explanation with examples',
     3, true, '00000000-0000-0000-0000-000000000010', 40),

    ('20000000-0000-0000-0000-000000000033', '10000000-0000-0000-0000-000000000020', 'mid-arabic-4',
     'البلاغة: التشبيه', 'Rhetoric: Simile',
     'أركان التشبيه وأنواعه', 'Components and types of simile',
     4, true, '00000000-0000-0000-0000-000000000010', 35);

  -- ── Middle Math Lessons (3 lessons) ──
  INSERT INTO lessons (id, subject_id, slug, title_ar, title_en, summary_ar, summary_en, sort_order, is_published, created_by, duration_minutes) VALUES
    ('20000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000021', 'mid-math-1',
     'المعادلات الخطية', 'Linear Equations',
     'حل المعادلات من الدرجة الأولى', 'Solving first-degree equations',
     1, true, '00000000-0000-0000-0000-000000000011', 45),

    ('20000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000021', 'mid-math-2',
     'النسبة والتناسب', 'Ratio and Proportion',
     'مفهوم النسبة والتناسب وتطبيقاتها', 'Concept and applications of ratio and proportion',
     2, true, '00000000-0000-0000-0000-000000000011', 40),

    ('20000000-0000-0000-0000-000000000042', '10000000-0000-0000-0000-000000000021', 'mid-math-3',
     'المساحة والمحيط', 'Area and Perimeter',
     'حساب مساحة ومحيط الأشكال الهندسية', 'Computing area and perimeter of geometric shapes',
     3, true, '00000000-0000-0000-0000-000000000011', 35);

  -- ─────────────────────────────────────────────
  -- 4. LESSON BLOCKS (content for some lessons)
  -- ─────────────────────────────────────────────

  -- Blocks for "أقسام الكلام" (Parts of Speech)
  INSERT INTO lesson_blocks (lesson_id, type, title_ar, title_en, content_ar, content_en, sort_order) VALUES
    ('20000000-0000-0000-0000-000000000001', 'rich_text', null, null,
     'الكلام في اللغة العربية ينقسم إلى ثلاثة أقسام رئيسية: الاسم والفعل والحرف. في هذا الدرس سنتعرف على كل قسم وخصائصه.',
     'Speech in Arabic is divided into three main parts: nouns, verbs and particles. In this lesson we will learn about each type and its characteristics.',
     1),

    ('20000000-0000-0000-0000-000000000001', 'tip', 'نصيحة مهمة', 'Important Tip',
     'أسهل طريقة للتمييز بين الأقسام: الاسم يقبل "ال" التعريف، والفعل يقبل "قد"، والحرف لا يقبل أياً منهما.',
     'Easiest way to distinguish: nouns accept "al" prefix, verbs accept "qad", particles accept neither.',
     2),

    ('20000000-0000-0000-0000-000000000001', 'example', 'مثال', 'Example',
     'الاسم: كتاب، مدرسة، طالب\nالفعل: كتبَ، يكتبُ، اكتبْ\nالحرف: في، على، من، إلى',
     'Noun: book, school, student\nVerb: wrote, writes, write\nParticle: in, on, from, to',
     3),

    ('20000000-0000-0000-0000-000000000001', 'exercise', 'تمرين', 'Exercise',
     'صنّف الكلمات التالية إلى اسم أو فعل أو حرف:\nسماء - ذهب - هل - جميل - يلعب - مع',
     'Classify the following words into noun, verb or particle:\nsky - went - is - beautiful - plays - with',
     4),

    ('20000000-0000-0000-0000-000000000001', 'warning', 'تنبيه', 'Warning',
     'لا تخلط بين الاسم الذي يدل على حدث (مثل: كتابة) والفعل. الاسم يقبل التنوين والفعل لا يقبله.',
     'Do not confuse nouns that indicate events (like: writing) with verbs.',
     5);

  -- Blocks for "الأعداد الصحيحة" (Whole Numbers)
  INSERT INTO lesson_blocks (lesson_id, type, title_ar, title_en, content_ar, content_en, sort_order) VALUES
    ('20000000-0000-0000-0000-000000000010', 'rich_text', null, null,
     'الأعداد الصحيحة هي الأعداد التي ليس لها كسور أو أجزاء عشرية. تشمل الأعداد الموجبة والسالبة والصفر.',
     'Whole numbers are numbers without fractions or decimals. They include positive, negative numbers and zero.',
     1),

    ('20000000-0000-0000-0000-000000000010', 'equation', 'خط الأعداد', 'Number Line',
     '... -3  -2  -1  0  +1  +2  +3 ...',
     '... -3  -2  -1  0  +1  +2  +3 ...',
     2),

    ('20000000-0000-0000-0000-000000000010', 'example', 'أمثلة', 'Examples',
     'أعداد صحيحة: 0, 1, 2, 3, -1, -2\nليست أعداد صحيحة: 1.5, ⅓, 0.7',
     'Whole numbers: 0, 1, 2, 3, -1, -2\nNot whole numbers: 1.5, ⅓, 0.7',
     3),

    ('20000000-0000-0000-0000-000000000010', 'exercise', 'تمرين', 'Exercise',
     'رتب الأعداد التالية من الأصغر إلى الأكبر:\n5, -3, 0, 8, -1, 2',
     'Order these numbers from smallest to largest:\n5, -3, 0, 8, -1, 2',
     4);

  -- ─────────────────────────────────────────────
  -- 5. QUIZZES + QUESTIONS + OPTIONS
  -- ─────────────────────────────────────────────

  -- Quiz for Parts of Speech lesson
  INSERT INTO quizzes (id, lesson_id, title_ar, title_en, is_enabled, passing_score, unlock_after_percent) VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
     'اختبار أقسام الكلام', 'Parts of Speech Quiz', true, 70, 80);

  INSERT INTO quiz_questions (id, quiz_id, type, question_ar, question_en, sort_order) VALUES
    ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'mcq',
     'ما هو القسم الذي يقبل "ال" التعريف؟', 'Which part accepts the definite article "al"?', 1),
    ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'mcq',
     'أي من الكلمات التالية فعل؟', 'Which of the following is a verb?', 2),
    ('31000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'true_false',
     'الحرف يدل على معنى في نفسه', 'A particle has meaning on its own', 3);

  INSERT INTO quiz_options (question_id, text_ar, text_en, is_correct, sort_order) VALUES
    -- Q1 options
    ('31000000-0000-0000-0000-000000000001', 'الاسم', 'Noun', true, 1),
    ('31000000-0000-0000-0000-000000000001', 'الفعل', 'Verb', false, 2),
    ('31000000-0000-0000-0000-000000000001', 'الحرف', 'Particle', false, 3),
    ('31000000-0000-0000-0000-000000000001', 'جميع ما سبق', 'All of the above', false, 4),
    -- Q2 options
    ('31000000-0000-0000-0000-000000000002', 'كتاب', 'Book', false, 1),
    ('31000000-0000-0000-0000-000000000002', 'جميل', 'Beautiful', false, 2),
    ('31000000-0000-0000-0000-000000000002', 'يكتب', 'Writes', true, 3),
    ('31000000-0000-0000-0000-000000000002', 'في', 'In', false, 4),
    -- Q3 options (true/false)
    ('31000000-0000-0000-0000-000000000003', 'صح', 'True', false, 1),
    ('31000000-0000-0000-0000-000000000003', 'خطأ', 'False', true, 2);

  -- Quiz for Whole Numbers lesson
  INSERT INTO quizzes (id, lesson_id, title_ar, title_en, is_enabled, passing_score) VALUES
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000010',
     'اختبار الأعداد الصحيحة', 'Whole Numbers Quiz', true, 70);

  INSERT INTO quiz_questions (id, quiz_id, type, question_ar, question_en, sort_order) VALUES
    ('31000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000002', 'mcq',
     'أي من الأعداد التالية ليس عدداً صحيحاً؟', 'Which is NOT a whole number?', 1),
    ('31000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000002', 'mcq',
     'ما ناتج: -3 + 5 = ؟', 'What is: -3 + 5 = ?', 2);

  INSERT INTO quiz_options (question_id, text_ar, text_en, is_correct, sort_order) VALUES
    ('31000000-0000-0000-0000-000000000010', '٧', '7', false, 1),
    ('31000000-0000-0000-0000-000000000010', '-٤', '-4', false, 2),
    ('31000000-0000-0000-0000-000000000010', '٢.٥', '2.5', true, 3),
    ('31000000-0000-0000-0000-000000000010', '٠', '0', false, 4),
    ('31000000-0000-0000-0000-000000000011', '٨', '8', false, 1),
    ('31000000-0000-0000-0000-000000000011', '٢', '2', true, 2),
    ('31000000-0000-0000-0000-000000000011', '-٨', '-8', false, 3),
    ('31000000-0000-0000-0000-000000000011', '-٢', '-2', false, 4);

  -- ─────────────────────────────────────────────
  -- 6. LESSON PROGRESS (simulate student activity)
  -- ─────────────────────────────────────────────

  -- Omar (primary student) has progress on Arabic lessons
  INSERT INTO lesson_progress (user_id, lesson_id, progress_percent, last_position_seconds, completed_at) VALUES
    ('00000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000001', 100, 1800, now() - interval '5 days'),
    ('00000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000002', 100, 1500, now() - interval '4 days'),
    ('00000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000003', 75, 1200, null),
    ('00000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000010', 100, 1800, now() - interval '3 days'),
    ('00000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000011', 50, 900, null);

  -- Layla (primary student) has progress on Math and Science
  INSERT INTO lesson_progress (user_id, lesson_id, progress_percent, last_position_seconds, completed_at) VALUES
    ('00000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000010', 100, 1800, now() - interval '7 days'),
    ('00000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000011', 100, 2100, now() - interval '6 days'),
    ('00000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000012', 100, 2400, now() - interval '5 days'),
    ('00000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000013', 60, 1200, null),
    ('00000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000020', 100, 1800, now() - interval '2 days');

  -- Yusuf (middle student) has progress on Middle Arabic
  INSERT INTO lesson_progress (user_id, lesson_id, progress_percent, last_position_seconds, completed_at) VALUES
    ('00000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000030', 100, 2400, now() - interval '3 days'),
    ('00000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000031', 100, 2700, now() - interval '2 days'),
    ('00000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000032', 40, 1000, null);

  -- ─────────────────────────────────────────────
  -- 7. RATINGS
  -- ─────────────────────────────────────────────

  INSERT INTO ratings (user_id, entity_type, entity_id, stars, comment) VALUES
    ('00000000-0000-0000-0000-000000000020', 'lesson', '20000000-0000-0000-0000-000000000001', 5, 'درس ممتاز وشرح واضح جداً!'),
    ('00000000-0000-0000-0000-000000000020', 'lesson', '20000000-0000-0000-0000-000000000002', 4, 'جيد لكن يحتاج مزيد من الأمثلة'),
    ('00000000-0000-0000-0000-000000000021', 'lesson', '20000000-0000-0000-0000-000000000010', 5, 'شرح الرياضيات بطريقة سهلة ومبسطة'),
    ('00000000-0000-0000-0000-000000000021', 'lesson', '20000000-0000-0000-0000-000000000011', 4, null),
    ('00000000-0000-0000-0000-000000000022', 'lesson', '20000000-0000-0000-0000-000000000030', 5, 'أفضل معلم نحو على الإطلاق'),
    ('00000000-0000-0000-0000-000000000022', 'lesson', '20000000-0000-0000-0000-000000000031', 3, 'الدرس صعب قليلاً'),
    -- Teacher ratings
    ('00000000-0000-0000-0000-000000000020', 'teacher', '00000000-0000-0000-0000-000000000010', 5, 'أستاذ خالد معلم رائع'),
    ('00000000-0000-0000-0000-000000000021', 'teacher', '00000000-0000-0000-0000-000000000011', 5, 'أفضل معلمة رياضيات');

  -- ─────────────────────────────────────────────
  -- 8. MESSAGES (sample conversations)
  -- ─────────────────────────────────────────────

  INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'السلام عليكم أستاذ خالد، عندي سؤال عن درس أقسام الكلام', now() - interval '2 days'),
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', 'وعليكم السلام عمر، تفضل اسأل', now() - interval '2 days' + interval '30 minutes'),
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'كيف أفرق بين الاسم والصفة؟', now() - interval '2 days' + interval '1 hour'),
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', 'الصفة هي نوع من الاسم، تصف اسماً قبلها. مثلاً: الكتاب الجديد - "الجديد" صفة', now() - interval '1 day'),

    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000010', 'أستاذ خالد، متى موعد الاختبار القادم؟', now() - interval '1 day'),
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000022', 'الاختبار يوم الأحد القادم إن شاء الله، راجع دروس الإعراب', now() - interval '12 hours');

  -- ─────────────────────────────────────────────
  -- 9. ANNOUNCEMENTS
  -- ─────────────────────────────────────────────

  INSERT INTO announcements (teacher_id, subject_id, title_ar, title_en, body_ar, body_en, is_active) VALUES
    ('00000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000010',
     'تم إضافة دروس جديدة', 'New Lessons Added',
     'تم إضافة درسين جديدين في موضوع الضمائر والمراجعة الشاملة. يرجى مراجعتها.',
     'Two new lessons on pronouns and comprehensive review have been added. Please review them.',
     true),

    ('00000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011',
     'اختبار الرياضيات الأسبوع القادم', 'Math Test Next Week',
     'سيكون هناك اختبار شامل في الرياضيات يوم الأحد. يرجى مراجعة جميع الدروس.',
     'There will be a comprehensive math test on Sunday. Please review all lessons.',
     true),

    ('00000000-0000-0000-0000-000000000012', null,
     'مرحباً بكم في مادة العلوم', 'Welcome to Science',
     'أهلاً وسهلاً بجميع الطلاب. ستكون رحلتنا ممتعة في عالم العلوم!',
     'Welcome all students. Our journey in the world of science will be exciting!',
     true);

  -- ─────────────────────────────────────────────
  -- 10. PLANS & SUBSCRIPTIONS
  -- ─────────────────────────────────────────────

  INSERT INTO plans (id, name_ar, name_en, description_ar, description_en, billing, price_cents, currency, stage_id, is_active, sort_order) VALUES
    ('40000000-0000-0000-0000-000000000001', 'الخطة الشهرية - ابتدائي', 'Monthly Plan - Primary',
     'وصول كامل لجميع مواد المرحلة الابتدائية لمدة شهر', 'Full access to all primary subjects for one month',
     'monthly', 4900, 'SAR', v_pri, true, 1),

    ('40000000-0000-0000-0000-000000000002', 'الخطة السنوية - ابتدائي', 'Yearly Plan - Primary',
     'وصول كامل لجميع مواد المرحلة الابتدائية لمدة سنة', 'Full access to all primary subjects for one year',
     'yearly', 39900, 'SAR', v_pri, true, 2),

    ('40000000-0000-0000-0000-000000000003', 'الخطة الشهرية - متوسط', 'Monthly Plan - Middle',
     'وصول كامل لجميع مواد المرحلة المتوسطة لمدة شهر', 'Full access to all middle subjects for one month',
     'monthly', 5900, 'SAR', v_mid, true, 3);

  -- Link plans to subjects
  INSERT INTO plan_subjects (plan_id, subject_id) VALUES
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000010'),
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000011'),
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000012'),
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000013'),
    ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000010'),
    ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000011'),
    ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000012'),
    ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000013'),
    ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000020'),
    ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000021'),
    ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000022');

  -- ─────────────────────────────────────────────
  -- 11. STUDENT SUBJECTS (direct assignments)
  -- ─────────────────────────────────────────────

  INSERT INTO student_subjects (student_id, subject_id, status, assigned_by, assigned_reason) VALUES
    ('00000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000010', 'active', 'admin', 'مسجل في الفصل'),
    ('00000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000011', 'active', 'admin', 'مسجل في الفصل'),
    ('00000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000011', 'active', 'admin', 'مسجلة في الفصل'),
    ('00000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000012', 'active', 'admin', 'مسجلة في الفصل'),
    ('00000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000020', 'active', 'admin', 'مسجل في الفصل'),
    ('00000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000021', 'active', 'admin', 'مسجل في الفصل');

  -- ─────────────────────────────────────────────
  -- 12. BADGES
  -- ─────────────────────────────────────────────

  INSERT INTO badges (key, title_ar, title_en, description_ar, description_en) VALUES
    ('first_lesson',   'الدرس الأول',      'First Lesson',      'أكمل أول درس لك',            'Complete your first lesson'),
    ('five_lessons',   'خمسة دروس',       'Five Lessons',      'أكمل ٥ دروس',                'Complete 5 lessons'),
    ('perfect_quiz',   'علامة كاملة',      'Perfect Score',     'احصل على علامة كاملة في اختبار', 'Get a perfect quiz score'),
    ('fast_learner',   'متعلم سريع',       'Fast Learner',      'أكمل ٣ دروس في يوم واحد',    'Complete 3 lessons in one day'),
    ('subject_master', 'خبير المادة',       'Subject Master',    'أكمل جميع دروس مادة واحدة',   'Complete all lessons in a subject');

END $$;

-- Final schema reload
NOTIFY pgrst, 'reload schema';
