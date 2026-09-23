# CLAUDE.md — Waraq Academy Flutter App

> **This file is the project brain.** Read it fully before every task. It contains the system prompt, project knowledge, architecture, conventions, and the roadmap. Update it when things change.

---

## System Prompt — How to Handle Every Request

You are a **senior project manager and full-stack developer** working on Waraq Academy Flutter App. You are the technical lead — you own architecture decisions, code quality, and UX.

### On every user message, follow this workflow:

1. **Read CLAUDE.md fully** — understand the current state before touching anything.
2. **Interpret the request** — even a short message like "fix the login screen" means: understand the full context from this file, identify the relevant files, plan the fix, implement it properly, and verify it works.
3. **Check the Plan section** — see if the request relates to a planned task. If so, follow the plan. If not, assess whether it should be added.
4. **Implement with these principles:**
   - Always consider the **marketplace model** (teachers sell, students buy, platform facilitates).
   - Always support **bilingual AR/EN** — every user-facing string needs `t('عربي', 'English')` via `LanguageNotifier`.
   - Always consider **mobile-first** — this IS the mobile app, optimize for touch and small screens.
   - Use existing patterns (Riverpod providers, GoRouter, Supabase client, CacheService).
   - Don't over-engineer. Ship working code, iterate later.
   - When touching UI, make it feel **polished and intentional**, not generic.
5. **After implementing:**
   - Update the **Plan section** if a task was completed or new tasks were discovered.
   - Update the **Known Issues** section if you found/fixed bugs.
   - Update **Architecture** sections if you changed something structural.

### Rules:
- **Never guess database schema** — check `shared/models/` and the web app's `src/types/database.ts`.
- **Never skip bilingual support** — all UI text must use `t()` from `LanguageNotifier`. DB fields use `_ar`/`_en` suffixes.
- **Never break existing features** — test related flows when changing shared code.
- **Always use package imports** — `import 'package:ayman_academy_app/...'`, never relative `../` beyond same directory.
- **Always use Riverpod** for state — never raw `setState` for shared/async state.
- **When adding screens** — add route in `core/router/routes.dart` + `core/router/router.dart`, add nav item in the appropriate shell.
- **When adding features** — follow the feature-first folder structure: `features/<role>/<feature>/screens/`, `providers/`, `data/`.

---

## Project Overview

### What Is This?
**Waraq Academy Flutter App** — The mobile companion to the Waraq Academy web portal. An educational marketplace for Arab school students.

- **Teachers**: Manage courses, verify orders, communicate with students, view analytics.
- **Students**: Browse courses, learn lessons, take quizzes, earn certificates, message teachers.
- **Admins**: Full control panel inside the app — the web CMS embedded in a WebView with the session handed over, so no second login.

### Target Audience
- **Students**: School-age, Arabic-speaking. On Android phones. Need supplementary learning for school subjects.
- **Teachers**: Want to manage their courses and students on the go. Verify payments, post announcements.

### Business Model
- Courses organized by **stage** (educational level) and **subject** (school subject).
- Students pay per-course via **Sham Cash** (manual QR payment verification by teacher).
- Access types: `public | stage | subscription | invite_only | org_only`.

### Current Status: **In Development**
- Not yet published to Play Store.
- Shares the same **Supabase** backend as the web app.
- Mirrors web app features for student and teacher roles.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Flutter 3.41+ / Dart 3.11+ |
| State Management | flutter_riverpod 2.x (StateNotifier + Provider) |
| Routing | go_router 13.x (with StatefulShellRoute for bottom nav) |
| Backend | Supabase (supabase_flutter 2.x — auth, PostgreSQL, storage) |
| Local Cache | Hive (hive_flutter) — settings, subjects, lessons, progress |
| Video | youtube_player_flutter |
| Content Rendering | flutter_markdown |
| Charts | fl_chart |
| Certificates | qr_flutter + pdf + share_plus |
| Notifications | onesignal_flutter |
| Connectivity | connectivity_plus |
| Admin panel | webview_flutter (embeds the web CMS) |
| Images | cached_network_image + shimmer loading |

### Dev Commands
```bash
flutter pub get              # Install dependencies
flutter run                  # Run on connected device/emulator
flutter run -d chrome        # Run as web app
flutter build apk            # Build Android APK
flutter build apk --release  # Build release APK
flutter analyze              # Static analysis
flutter test                 # Run tests
```

### Environment Variables
Passed at build time via `--dart-define`:
```bash
flutter run \
  --dart-define=SUPABASE_URL=<your-url> \
  --dart-define=SUPABASE_ANON_KEY=<your-key> \
  --dart-define=WEB_APP_URL=https://aymanacademy.com \
  --dart-define=ONESIGNAL_APP_ID=<your-id>
```
Defined in `lib/core/env.dart` using `String.fromEnvironment()`.

### Package Name
`ayman_academy_app` — all imports use `package:ayman_academy_app/...`

---

## Architecture

### Directory Structure
```
lib/
├── main.dart                          # App entry point — init Hive, Supabase, OneSignal
├── core/                              # Core setup & configuration
│   ├── env.dart                       # Environment variables (Supabase keys, OneSignal)
│   ├── supabase_client.dart           # Supabase client singleton + init
│   ├── router/
│   │   ├── router.dart                # GoRouter config with auth redirect logic
│   │   └── routes.dart                # Route path constants (Routes class)
│   ├── theme/
│   │   ├── app_colors.dart            # Color palette (navy primary, gold accent, warm ivory bg)
│   │   └── app_theme.dart             # Light & dark ThemeData
│   └── utils/
│       ├── date_formatter.dart        # Date formatting helpers
│       ├── validators.dart            # Form validation
│       └── youtube_utils.dart         # YouTube URL/ID parsing
├── features/                          # Feature modules organized by role
│   ├── auth/                          # Authentication
│   │   ├── data/auth_repository.dart  # Supabase auth calls
│   │   ├── providers/auth_provider.dart # AuthNotifier + AuthState
│   │   └── screens/                   # Login, Register, ResetPassword, AdminWebOnly
│   ├── admin/
│   │   └── screens/admin_panel_screen.dart   # Web CMS in a WebView + session handoff
│   ├── onboarding/
│   │   └── screens/student_onboarding_screen.dart
│   ├── student/                       # All student features
│   │   ├── dashboard/screens/         # StudentDashboard, Achievements
│   │   ├── subjects/screens/          # MySubjects, SubjectDetail, Discover, Teachers
│   │   ├── subjects/providers/        # SubjectsProvider
│   │   ├── lessons/screens/           # LessonPlayer, LessonNotes
│   │   ├── lessons/providers/         # LessonProvider
│   │   ├── quiz/screens/              # QuizScreen
│   │   ├── quiz/providers/            # QuizProvider
│   │   ├── marketplace/screens/       # Marketplace, Checkout
│   │   ├── marketplace/providers/     # MarketplaceProvider
│   │   ├── certificates/screens/      # MyCertificates, CertificateDetail
│   │   ├── certificates/providers/    # CertificatesProvider
│   │   ├── messages/screens/          # MessagesContacts, Chat
│   │   ├── messages/providers/        # MessagesProvider
│   │   └── profile/screens/           # StudentProfile
│   └── teacher/                       # All teacher features
│       ├── dashboard/screens/         # TeacherDashboard
│       ├── subjects/screens/          # TeacherSubjects, CourseEditor, TeacherReviews
│       ├── lessons/screens/           # LessonEditor, TeacherLessons
│       ├── quizzes/screens/           # Quiz management
│       ├── orders/screens/            # TeacherOrders (payment verification)
│       ├── certificates/screens/      # TeacherCertificates
│       ├── announcements/screens/     # TeacherAnnouncements
│       ├── messages/screens/          # TeacherMessages
│       └── profile/screens/           # TeacherProfile
└── shared/                            # Shared across all features
    ├── models/                        # Dart data classes
    │   ├── profile.dart               # User profile model
    │   ├── subject.dart               # Course/subject model
    │   ├── lesson.dart                # Lesson model
    │   ├── lesson_block.dart          # Content block model
    │   ├── lesson_section.dart        # Section model
    │   ├── lesson_progress.dart       # Progress tracking model
    │   ├── stage.dart                 # Educational stage model
    │   ├── student_level.dart         # Student level model
    │   ├── quiz.dart                  # Quiz + questions + options
    │   ├── quiz_attempt.dart          # Quiz attempt model
    │   ├── order.dart                 # Purchase order model
    │   ├── certificate.dart           # Certificate model
    │   ├── announcement.dart          # Announcement model
    │   └── message.dart               # Chat message model
    ├── providers/                     # Global state providers
    │   ├── language_provider.dart     # AR/EN toggle (persisted in Hive)
    │   ├── theme_provider.dart        # Dark/light mode (persisted in Hive)
    │   └── connectivity_provider.dart # Online/offline status
    ├── services/                      # Utility services
    │   ├── cache_service.dart         # Hive-based cache with TTL
    │   ├── cached_provider_helpers.dart # Cache-aware data fetching
    │   ├── notification_service.dart  # OneSignal push notifications
    │   └── pdf_service.dart           # Certificate PDF generation
    └── widgets/                       # Reusable UI components
        ├── subject_card.dart          # Course card widget
        ├── avatar_widget.dart         # User avatar with fallback
        ├── empty_state.dart           # Empty list placeholder
        ├── loading_shimmer.dart       # Shimmer loading skeleton
        ├── connectivity_banner.dart   # Offline warning banner
        ├── lesson_block_renderer.dart # Renders lesson content blocks
        ├── xp_progress_bar.dart       # XP/progress indicator
        └── shells/
            ├── student_shell.dart     # Student bottom navigation layout
            └── teacher_shell.dart     # Teacher bottom navigation layout
```

### User Roles & Access

| Role | Routes | Access |
|------|--------|--------|
| `super_admin` | `/admin` | Full admin CMS, embedded in a WebView (`AdminPanelScreen`) |
| `teacher` | `/teacher/*` | Own courses, lessons, orders, certificates, messaging |
| `student` | `/student/*` | Enrolled courses, marketplace, quiz, certificates, messaging |

- Auth redirect logic is in `router.dart` — auto-routes by role after login.
- Students without a stage selection are redirected to `/onboarding`.
- Teachers cannot access `/student/*` routes and vice versa.

### Navigation Structure

**Student Shell** (bottom nav — 5 tabs):
1. Home (Dashboard)
2. My Subjects
3. Certificates
4. Messages
5. Profile

**Teacher Shell** (bottom nav — 5 tabs):
1. Home (Dashboard)
2. My Subjects
3. Announcements
4. Messages
5. Profile

Standalone routes (no bottom nav): Marketplace, Checkout, Discover, Achievements, Teachers, Orders, Course Editor, Reviews.

### Authentication Flow
1. Login via Supabase Auth (email/password, PKCE flow)
2. `AuthNotifier` listens to `onAuthStateChange` stream
3. Profile fetched from `profiles` table on auth state change
4. GoRouter `redirect` auto-navigates by role (student/teacher/admin)
5. Students without `studentStage` redirected to onboarding
6. Logout clears session, state resets to unauthenticated

### Key Patterns

**Bilingual Support:**
```dart
final lang = ref.watch(languageProvider);
final langNotifier = ref.read(languageProvider.notifier);
Text(langNotifier.t('مرحبا', 'Welcome'));
// DB fields: title_ar, title_en — pick based on langNotifier.isArabic
```

**Riverpod State Management:**
```dart
// Define provider
final myProvider = StateNotifierProvider<MyNotifier, MyState>((ref) {
  return MyNotifier(ref);
});

// Use in widget
class MyScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(myProvider);
    // ...
  }
}
```

**Supabase Queries:**
```dart
import 'package:ayman_academy_app/core/supabase_client.dart';
final data = await supabase.from('subjects').select().eq('is_active', true);
```

**Caching with Hive:**
```dart
// TTL-based cache: subjects (24h), lessons (24h), progress (5m)
final cached = CacheService.get<List>(box, 'key');
if (cached != null) return cached;
final fresh = await fetchFromSupabase();
await CacheService.set(box, 'key', fresh, CacheService.subjectsTtl);
```

**GoRouter Navigation:**
```dart
context.go(Routes.studentHome);               // Replace
context.push('/student/subjects/subject/$id'); // Push
```

### Database Schema
The Flutter app shares the same Supabase database as the web app. Key tables used by the mobile app:

- `profiles` — User data (role, full_name, avatar_url, student_stage, grade, bio_ar/en)
- `stages` — Educational levels (title_ar/en, sort_order, is_active)
- `subjects` — Courses (stage_id, teacher_id, title_ar/en, access_type, is_paid, price_amount)
- `lessons` — Units within subjects (title_ar/en, sort_order, is_published, duration_minutes)
- `lesson_sections` + `lesson_blocks` — Structured lesson content
- `quizzes` + `quiz_questions` + `quiz_options` — Quiz system
- `quiz_attempts` — Student quiz attempts and scores
- `lesson_progress` — Per-student per-lesson progress tracking
- `orders` — Purchase orders (status: pending_payment/paid/rejected/cancelled)
- `certificates` — Certificate status workflow
- `messages` — Direct messaging between users
- `announcements` — Teacher broadcast messages
- `ratings` — Unified ratings (lesson/subject/teacher)

### Brand — Waraq Academy (ورق أكاديمي)

Source of truth: `waraq_brand_kit.md`. Brand tokens live in **`lib/brand/brand_colors.dart`** (`BrandColors` + `BrandStrings`); keep them in sync with the web's `src/styles/brand.css`.

| Token | Hex | Use |
|---|---|---|
| `deep` | `#0B3B2C` | text, borders, logo leaf on light |
| `green` | `#1E6B52` | primary brand green, app-icon background |
| `mint` | `#9FD3BE` | folded corner of the mark |
| `paper` | `#F7F2E8` | cream surfaces, logo on dark |
| `sun` | `#F4A340` | CTA highlight, Primary stage |
| `coral` / `sky` | `#EE6C4D` / `#3A8FB7` | Kindergarten / Middle stage |

Stage colours: kindergarten coral · primary sun · middle sky · secondary green.

**Font — do not regress this.** IBM Plex Sans Arabic is **bundled** in `assets/fonts` and referenced as the family name `IBMPlexSansArabic` in `AppTheme._ff`. It previously used `GoogleFonts.cairo()`, which fetches over the network on first use while the bundled 1.2 MB went unused — bad on the weak connections this app targets. `google_fonts` has been removed from `pubspec.yaml`. Two brand rules are enforced in `_textTheme`: weights cap at **700** (the heaviest face the family ships), and **Arabic text carries no letterSpacing** (tracking breaks the joined letterforms).

**Assets** in `assets/brand/`: `mark.svg`, `mark-on-dark.svg`, `app-icon.{svg,png}` (1024), `icon-foreground.png` (adaptive foreground, mark inside the central safe zone), `icon-monochrome.png` (Android 13+ themed icons), `splash-mark.png`.

**Icon and splash** are configured in `pubspec.yaml` but **not yet generated** — run both once a Flutter toolchain is available:
```bash
dart run flutter_launcher_icons
dart run flutter_native_splash:create
```

**Technical names are intentionally unchanged.** The Dart package stays `ayman_academy_app`, the folder stays `ayman_academy_flutter/`, and the Android `applicationId` is untouched — renaming any of them breaks `package:` imports and stops the app updating over installed versions. Only display strings carry the new brand (`android:label`, `MaterialApp(title:)`, UI copy).

**Still outstanding:** 52 hard-coded `Color(0x…)` values across 7 files (worst: `xp_progress_bar.dart` 15, `lesson_editor_screen.dart` 10) still need moving onto the theme, the `lib/brand/widgets/` set (`BrandButton`, `BrandCard`, `LevelChip`, `LogoMark`, `BrandLogo`) is not built yet, and there is **no OneSignal notification small icon** (`ic_stat_onesignal_default`), so Android renders the colored app icon as a white square.

### Color Palette (legacy, being replaced by the brand tokens above)
- **Primary**: Deep Navy (`#1E3A5F`)
- **Accent**: Gold (`#AE944F`)
- **Background**: Warm Ivory (`#F7F4EF`) / Dark (`#131921`)
- **Surface**: Off-white (`#FAF8F5`) / Dark (`#1A2332`)
- See `core/theme/app_colors.dart` for the complete palette.

### Key Services

| File | Purpose |
|------|---------|
| `core/supabase_client.dart` | Supabase client singleton + initialization |
| `core/env.dart` | Environment variables via `--dart-define` |
| `core/router/router.dart` | GoRouter config with auth guards |
| `core/router/routes.dart` | Route path constants |
| `shared/services/cache_service.dart` | Hive-based TTL cache |
| `shared/services/notification_service.dart` | OneSignal push notification setup |
| `shared/services/pdf_service.dart` | Certificate PDF generation |
| `shared/providers/language_provider.dart` | AR/EN language switching |
| `shared/providers/theme_provider.dart` | Dark/light theme toggle |
| `shared/providers/connectivity_provider.dart` | Network status monitoring |

---

## Implemented Features

### Fully Working
- [x] Authentication (login, register, reset password)
- [x] Role-based routing (student, teacher, admin redirect)
- [x] Student onboarding (stage/grade selection)
- [x] Bilingual UI (Arabic RTL / English LTR)
- [x] Student dashboard with progress overview
- [x] My Subjects list + Subject detail page
- [x] Lesson player with block content rendering
- [x] Quiz taking with scoring
- [x] Marketplace browsing + checkout (Sham Cash)
- [x] Certificate viewing + PDF generation
- [x] Direct messaging (contacts list + chat)
- [x] Student profile management
- [x] Teacher dashboard with analytics
- [x] Teacher subject management + course editor
- [x] Teacher orders (payment verification)
- [x] Teacher announcements
- [x] Teacher certificates management
- [x] Teacher messaging
- [x] Teacher profile
- [x] Dark mode support
- [x] Offline detection with connectivity banner
- [x] Local caching (Hive) for offline-first UX
- [x] Achievements screen
- [x] Discover courses screen
- [x] Teachers listing screen
- [x] Teacher reviews screen

### Not Working / Placeholder
- [ ] Push notifications (OneSignal initialized, not fully wired)
- [ ] Real-time messaging (no Supabase Realtime)
- [ ] Lesson notes screen (UI exists, may need polish)
- [ ] Image picker for profile/content uploads
- [ ] Deep linking
- [ ] App store deployment

---

## Known Issues

### Schema reality check (verified live 2026-09-21)
The Supabase project was paused and has since been **resumed**; it is
reachable and holds real data. The live schema was probed column-by-column
through PostgREST, so the notes below are measured, not inferred.

**Do NOT trust these two files as the schema source of truth:**
- `schema.json` (repo root) is a stale pre-066 PostgREST dump.
- `migrations/100_clean_rewrite.sql` drops the entire `public` schema and
  rebuilds it. It has **not** been applied to this database and must not be —
  it would delete `orders`, `teacher_applications` and the Sham Cash columns.
  It also renames `order_index` -> `sort_order`; the live DB already uses
  `sort_order`, so the app is correct as written.

**Confirmed present live:** `orders`, `teacher_applications`,
`profiles.shamcash_account_name/number`, `profiles.expertise_tags_ar/en`,
`subjects.is_paid`, `ratings.comment`, `quizzes.passing_score`,
`quiz_options.text_ar`, `lessons.sort_order`, `lesson_blocks.sort_order`,
and the RPCs `get_student_subjects`, `get_discover_subjects`,
`check_subject_access`, `is_super_admin`, `get_user_role`.

**Confirmed missing live — fixed by `migrations/102_live_schema_gaps.sql`:**
- `quiz_attempts.passed` — written on every quiz submission, so the INSERT
  fails and **no student can submit a quiz**. This is the highest-impact gap.
- `student_levels` — queried by the student profile; the provider swallows
  the error and silently shows a default level.

**Fixed — quiz layer rewritten onto `quiz_options` (2026-09-22):**
`shared/models/quiz.dart`, `quiz_provider.dart`, `quiz_screen.dart`,
`quiz_builder_screen.dart` and `teacher_quizzes_screen.dart` previously assumed
denormalised `quiz_questions.options` (JSON array) + `quiz_questions.correct_answer`.
Neither column exists live. They now read and write the normalised
`quiz_options` table (`text_ar`, `text_en`, `is_correct`, `sort_order`), and
`multi_select` questions are supported alongside `mcq` and `true_false`.
Attempt answers are stored as `{question_id: [option_id, ...]}`.
Do **not** add the denormalised columns — that would fork web and mobile.

The **web portal was broken too**, on a *different* set of nonexistent columns
(`question_text_ar`, `question_type`, `correct_option_index`) and its student
player never wrote a `quiz_attempts` row at all. Both were rewritten in the same
pass — see the web CLAUDE.md.

**Grading — `submit_quiz_attempt` RPC (needs applying).**
`QuizService.submitQuiz` now calls the `submit_quiz_attempt` RPC so the score is
computed in the database and cannot be forged from the device. While the
function is absent PostgREST answers `PGRST202`, and the service falls back to
the previous local grading path — so the app works before and after the
migration, with no rebuild needed. Apply
`supabase/migrations/103_submit_quiz_attempt.sql` through the Supabase SQL
editor (**not** `supabase db push`).

**Open — answers are still readable from the API.** `quiz_options.is_correct`
is sent to the device so the review screen can show the correct answer. Hiding
it needs a student-facing fetch RPC that omits the flag, plus RLS on
`quiz_options`.

**Keep-alive:** the free tier pauses after 7 days idle. Add a daily scheduled
request against the REST API so this cannot recur.

### Other
- **Admin panel is the web CMS in a WebView** — `features/admin/screens/admin_panel_screen.dart`. The app opens `<WEB_APP_URL>/auth/bridge#at=…&rt=…&redirect=/admin`; the web `AuthBridge` page calls `supabase.auth.setSession()` with those tokens and forwards to `/admin`, so the admin is not asked to sign in twice. Tokens ride in the URL **fragment**, which is never sent to a server. The params are named `at`/`rt` rather than `access_token`/`refresh_token` on purpose — the web client runs with `detectSessionInUrl`, and supabase-js would try to consume the standard names itself and throw on the missing `expires_in`. WebView navigation is pinned to the portal's own origin, so a stray link cannot carry the session elsewhere. This requires `WEB_APP_URL` to be a reachable deployment; `/admin-web-only` is kept as the fallback screen. A native Flutter port of the 15 admin pages is the long-term alternative.
- **Sham Cash QR is placeholder** — Checkout shows a dashed QR placeholder, same as web app.
- **Environment variables** — Must be passed via `--dart-define` at build time. `main.dart` now guards on `Env.isConfigured` and shows a config-error screen if `SUPABASE_URL`/`SUPABASE_ANON_KEY` are missing (instead of failing cryptically).
- **Shared backend** — Any database schema changes in the web app affect this app. Keep models in `shared/models/` in sync.
- **Release signing requires a local keystore** — `android/app/build.gradle.kts` reads `android/key.properties` (gitignored) and signs release builds with the real upload key when present; without it, release falls back to the debug key (which the Play Store rejects). See `android/key.properties.example`.

### Recently fixed (release-readiness pass)
- Access control now **fails closed** — `checkSubjectAccessProvider` returns `has_access: false` on RPC error/non-Map (previously granted access on failure).
- **OneSignal** `login(userId)`/`logout()` now wired into `AuthNotifier` (session restore, sign-in, sign-out) so push targets the right user.
- **AndroidManifest**: removed `usesCleartextTraffic`, added `POST_NOTIFICATIONS` (Android 13+).
- **Release signing** config wired to `key.properties` (keystore still must be generated by the owner).

---

## Plan — Roadmap & Tasks

> Update this section as tasks are completed or new ones are discovered.

### Phase 0: Unblock (do these first)
- [ ] **Restore the Supabase project** — restore from the dashboard if it is only
      paused; otherwise create a new project and run `100_clean_rewrite.sql`
      then `102_post_rewrite_app_gaps.sql`.
- [ ] **Add a keep-alive** — a daily scheduled request against the REST API so
      the free tier never auto-pauses again.
- [ ] **Repoint both clients** — new `SUPABASE_URL` / anon key in the web `.env`
      and in the Flutter `--dart-define` build args.
- [x] **Rewrite the quiz layer onto `quiz_options`** — done 2026-09-22, mobile
      and web. `flutter analyze`: 0 errors.
- [x] **Move quiz grading server-side** — `submit_quiz_attempt` RPC written and
      wired into both clients (migration 103 still needs applying).
- [ ] **Hide `is_correct` from students** — needs a fetch RPC + RLS on
      `quiz_options`.
- [x] **Lint clean** — `flutter analyze` reports no issues (was 19).
- [ ] **Retire the `20260207*` migrations** so they cannot run after 100.

### Phase 1: Polish & Bug Fixes (Current Priority)
- [x] **Android release blockers** — `targetSdk` raised 34 → 36 (Play rejects 34),
      Gradle heap cut from 8G/4G metaspace to 4G/1G (failed to start on normal machines).
- [x] **Router no longer rebuilt on every auth change** — `routerProvider` watched
      `authProvider`, recreating the whole `GoRouter` (and leaking a stream
      subscription) on every auth event. Now built once, refreshed via a listenable.
- [x] **Cold-start splash** — added `/splash`; the app no longer flashes the login
      screen on every launch while the stored session is restored.
- [x] **Silent login failure fixed** — a missing/unreadable `profiles` row used to
      bounce the user back to login with no message; now raises `ProfileMissingException`.
      A transient network failure no longer signs an authenticated user out.
- [x] **Offline detection on cold start** — `connectivityProvider` now seeds with
      `checkConnectivity()`; `onConnectivityChanged` alone only fires on transitions.
- [x] **Offline banner insets** — banner consumed no status-bar inset and drew under
      the system icons once edge-to-edge kicked in at targetSdk 35+.
- [x] **Notification permission timing** — no longer prompted on first launch before
      sign-in (one-shot prompt on Android 13+, usually denied); now asked after login.
- [x] **Lesson resume position** — `saveProgress` wrote `last_position_seconds: 0` on
      every tick, so no lesson ever resumed where the student left off.
- [x] **XP awards / lesson ratings** — were writing columns that do not exist
      (`student_xp.points/event_type/source_id`, `ratings.comment`); corrected to
      `amount`/`reason`/`entity_id` and `feedback`.
- [ ] **Test all screens end-to-end** — Verify every feature works against live Supabase.
- [ ] **Fix any broken Supabase queries** — Ensure models match current DB schema.
- [ ] **Lesson notes polish** — Make notes screen fully functional.
- [ ] **Profile image upload** — Wire up image_picker for avatar uploads.
- [ ] **Error handling** — Add user-friendly error messages across all screens.

### Phase 2: Notifications & Real-time
- [x] **OneSignal push notifications** — User association wired into auth (login/logout). Server-side send triggers still needed for order/message/announcement events.
- [ ] **Supabase Realtime** — Live messaging updates.
- [ ] **Pull-to-refresh** — Add refresh indicators on all list screens.

### Phase 3: Offline & Performance
- [ ] **Expand Hive caching** — Cache more data for offline reading.
- [ ] **Image caching optimization** — Tune cached_network_image settings.
- [ ] **Lazy loading** — Paginate long lists (subjects, lessons, messages).

### Phase 4: Release
- [ ] **Play Store assets** — Screenshots, description, icon, feature graphic.
- [ ] **Release build** — Signing, ProGuard, version bumps.
- [ ] **Deep linking** — Handle web URLs opening in app.
- [x] **Admin panel in the app** — web CMS embedded with session handoff.
- [ ] **Analytics** — Firebase Analytics or equivalent.

### Backlog (Ideas / Later)
- iOS support
- PWA / web build
- Biometric login
- Video download for offline viewing
- Parent dashboard (if web app implements it)

---

## Common Tasks Reference

### Adding a New Screen
1. Create screen in `lib/features/<role>/<feature>/screens/ScreenName.dart`
2. Add route constant in `lib/core/router/routes.dart`
3. Add GoRoute in `lib/core/router/router.dart` (inside shell or standalone)
4. If it needs bottom nav: add as a `StatefulShellBranch` in the appropriate shell
5. Use `ref.watch(languageProvider.notifier)` for all text via `t('عربي', 'English')`

### Adding a New Provider
1. Create notifier in `lib/features/<role>/<feature>/providers/<name>_provider.dart`
2. Extend `StateNotifier<YourState>` with Riverpod
3. Define provider: `final myProvider = StateNotifierProvider<MyNotifier, MyState>((ref) => ...);`
4. Use in widgets via `ref.watch(myProvider)` and `ref.read(myProvider.notifier)`

### Adding a New Data Model
1. Create model in `lib/shared/models/<name>.dart`
2. Add `fromJson(Map<String, dynamic>)` factory constructor
3. Add `toJson()` method if needed for writes
4. Model fields should match Supabase column names (snake_case)

### Adding a Shared Widget
1. Create in `lib/shared/widgets/<widget_name>.dart`
2. Make it accept bilingual text or use `LanguageNotifier` internally
3. Support both light and dark theme via `Theme.of(context)`
