# Setup guide («ابدأ هنا») — student and teacher, web and Android

Source pattern: an onboarding **checklist**, not a wizard (adapted from the Sadeem
"Setup Guide" note, 2026-11-21). Simplified for Waraq: no side card, no mascot,
no optional steps, nothing stored.

## Rules both clients follow

1. A step is done because **real data says so**. Nothing about progress is stored
   (no table, no column, no localStorage).
2. Each step's work happens on the **normal page** for that task. The guide explains
   why, and has exactly **one primary button** that goes there.
3. One step open at a time. The first not-done step (`current`) opens by itself
   **once**, when data first arrives; a refetch never re-opens or moves anything.
4. A closed step shows one summary line: the result if done, the sub-count if in
   progress, otherwise nothing.
5. **Never a disabled button.** If a step cannot be done yet, say why in text.
6. Counter: `الخطوة N من M` with `N = min(done + 1, M)`, plus a route bar with one
   segment per step (done = full accent, current = partial, todo = empty).
7. When every step is done the page shows a short "done" card with two next
   actions, the list folds, and the dashboard card **disappears**.
8. No forced redirect except the **first arrival** after signup (teacher
   application → teacher guide; student stage pick → student guide).
9. Counts are written label-first («دروس فيها محتوى: 2») so Arabic never needs plural agreement.
10. A failed query hides the guide card on the dashboard (never shows a wrong "not done");
    the guide page itself shows a retry block.

## Teacher — 4 steps

Prerequisite line above the list (not a step, not counted):
- pending (`profiles.is_active = false`): «حسابك قيد المراجعة — ابنِ موادك الآن، والنشر يُفتح بعد الموافقة.» / "Your account is under review — build now; publishing opens once you're approved."
- approved: «حسابك معتمد.» / "Your account is approved."

| # | key | Title AR / EN | Why AR / EN | Done when | Button → | Summary when done |
|---|---|---|---|---|---|---|
| 1 | `profile` | جهّز ملفك للطلاب / Get your profile ready for students | الطلاب يقرؤون نبذتك قبل الشراء، ويدفعون لك على حساب شام كاش. / Students read your bio before buying, and pay you through your Sham Cash account. | `bio_ar` non-blank AND `shamcash_account_name` AND `shamcash_account_number` non-blank. Sub-count: of 2 (bio, Sham Cash). | افتح ملفي الشخصي / Open my profile → `/teacher/profile` | «النبذة وحساب شام كاش: 2 من 2» (in progress: «… : 1 من 2») |
| 2 | `course` | أنشئ مادتك الأولى / Create your first course | الطالب يشتري مادة، والدروس بداخلها. ابدأ بالعنوان والمرحلة والسعر. / Students buy a course; lessons live inside it. Start with a title, stage and price. | ≥1 `subjects` row with `teacher_id = me` | أنشئ مادة / Create a course → `/teacher/subjects` | «موادك: N» |
| 3 | `lesson` | اكتب أول درس / Write your first lesson | الصق درساً كتبته من قبل أو اكتبه مباشرة، ويمكنك نشره لاحقاً. / Paste a lesson you already wrote or type it in; you can publish it later. | ≥1 lesson in one of my subjects that has ≥1 `lesson_blocks` row | اكتب درساً / Write a lesson → web `/teacher/lessons/new`, Android the app's new-lesson screen | «دروس فيها محتوى: N» |
| 4 | `publish` | انشر مادتك للطلاب / Publish your course | تظهر المادة في المتجر عندما تكون منشورة وفيها درس منشور واحد على الأقل. / A course appears in the marketplace once it is published and has at least one published lesson. | ≥1 of my subjects with `is_active = true` that has ≥1 lesson with `is_published = true` | افتح موادي / Open my courses → `/teacher/subjects`. **If pending and not done: no button**, text «يُفتح النشر بعد موافقة الإدارة على حسابك.» / "Publishing opens once an admin approves your account." | «منشورة في المتجر: N» |

Hero: eyebrow «أهلاً بك في ورق» / "Welcome to Waraq"; h1 «ابدأ هنا» / "Start here";
lede «أربع خطوات، نحو 15 دقيقة. بعدها تظهر مادتك في المتجر ويستطيع الطلاب شراءها.» /
"Four steps, about 15 minutes. After that your course is in the marketplace and students can buy it."

Done card: «اكتمل الإعداد» / "Setup complete" — «مادتك في المتجر الآن.» / "Your course is in the marketplace." —
buttons «لوحة التحكم» / "Dashboard" (`/teacher`) and «الطلبات» / "Orders" (`/teacher/orders`).

## Student — 3 steps

Prerequisite line: «مرحلتك: {stage title}» / "Your stage: {stage}" with a «تغيير» / "Change" link → profile.

| # | key | Title AR / EN | Why AR / EN | Done when | Button → | Summary when done |
|---|---|---|---|---|---|---|
| 1 | `choose` | اختر مادتك الأولى / Pick your first course | تصفّح مواد مرحلتك. المجانية تبدأ فوراً، والمدفوعة تدفع ثمنها للمعلّم عبر شام كاش. / Browse your stage's courses. Free ones start right away; for paid ones you pay the teacher through Sham Cash. | any `orders` row for me (status not `rejected`/`cancelled`) OR any `student_subjects` row OR any `lesson_progress` row | افتح المتجر / Open the marketplace → `/student/marketplace` | if the only evidence is a `pending_payment` order: «بانتظار تأكيد المعلّم للدفع» / "Waiting for the teacher to confirm payment"; else «تم» / "Done" |
| 2 | `start` | افتح أول درس / Open your first lesson | ابدأ بالدرس الأول، أو جرّب درس «معاينة مجانية» قبل الشراء. / Start with the first lesson, or try a "Free preview" lesson before buying. | any `lesson_progress` row for me | اذهب إلى موادي / Go to my courses → `/student/subjects` | «تم» / "Done" |
| 3 | `finish` | أكمل درساً حتى النهاية / Finish a lesson | اقرأ الدرس حتى آخره واضغط «إكمال الدرس»، فيُحسب تقدّمك وتقترب من الشهادة. / Read to the end and press "Complete lesson"; your progress counts toward the certificate. | any `lesson_progress` row with `completed_at` not null | تابع التعلّم / Continue learning → the most recently touched lesson (`/student/lesson/:id`), else `/student/subjects` | «دروس مكتملة: N» |

Hero: eyebrow «أهلاً بك في ورق»; h1 «ابدأ هنا»; lede «ثلاث خطوات قصيرة: اختر مادة، افتح درساً، وأكمله.» /
"Three short steps: pick a course, open a lesson, and finish it."

Done card: «أحسنت! أكملت أول درس» / "Well done — you finished your first lesson" — buttons «تابع التعلّم» / "Continue learning"
(`/student/subjects`) and «المتجر» / "Marketplace".

Shared line under every list: «يمكنك المغادرة والعودة في أي وقت؛ تقدّمك محفوظ.» / "You can leave and come back any time; your progress is saved."

## Where it appears

| Surface | Web | Android |
|---|---|---|
| Guide page | `/teacher/start`, `/student/start` | `/teacher/start`, `/student/start` (go_router) |
| Dashboard card | top of teacher/student dashboard: «الإعداد: X من M», the **next step's title** as the headline, segments, one button «تابع الإعداد» / "Continue setup". Hidden when complete. | same, top of each dashboard |
| First arrival | `TeacherApplication` → `/teacher/start`; `StudentOnboarding` → `/student/start` | teacher application → teacher guide; student stage pick → student guide |

## Pending teachers build freely

`profiles.is_active = false` gates **publishing only** (migration 113 trigger). The web
`TeacherLayout` used to redirect a pending teacher away from every page except the
dashboard and profile, which since migration 118 meant a new teacher could not open
«موادي» or «دروسي» at all. That restriction is removed; the client and the database
already refuse publishing. Any equivalent restriction in the Android router must go too.

## Verification

- Web: `node --experimental-strip-types scripts/verify-setup-progress.mts` (pure rules), `npx tsc -b`, `npm run build`.
- Android: `test/.../setup_progress_test.dart` for the pure rules; CI `flutter-check.yml`.
