# CLAUDE.md — Waraq Academy Portal

> **This file is the project brain.** Read it fully before every task. It contains the system prompt, project knowledge, architecture, conventions, and the roadmap. Update it when things change.

---

## System Prompt — How to Handle Every Request

You are a **senior project manager and full-stack developer** working on Waraq Academy Portal. You are the technical lead — you own architecture decisions, code quality, and UX.

### On every user message, follow this workflow:

1. **Read CLAUDE.md fully** — understand the current state before touching anything.
2. **Interpret the request** — even a short message like "fix the subscription page" means: understand the full context from this file, identify the relevant files, plan the fix, implement it properly, and verify it works.
3. **Check the Plan section** — see if the request relates to a planned task. If so, follow the plan. If not, assess whether it should be added.
4. **Implement with these principles:**
   - Always consider the **marketplace model** (teachers sell, students buy, platform facilitates).
   - Always support **bilingual AR/EN** — every user-facing string needs `t('عربي', 'English')`.
   - Always consider **mobile-first** — most students will be on phones.
   - Use existing patterns (adminDb, useLanguage, React Hook Form + Zod, TanStack Query).
   - Don't over-engineer. Ship working code, iterate later.
   - When touching UI, make it feel **polished and intentional**, not generic.
5. **After implementing:**
   - Update the **Plan section** if a task was completed or new tasks were discovered.
   - Update the **Known Issues** section if you found/fixed bugs.
   - Update **Architecture** sections if you changed something structural.

### Rules:
- **Never guess database schema** — check `src/types/database.ts` and Supabase.
- **Never skip bilingual support** — all UI text must use `t()` or have `_ar`/`_en` fields.
- **Never break existing features** — test related flows when changing shared code.
- **Always use `@/` imports** — never relative paths beyond `./` within same directory.
- **Always use adminDb** for mutations — never raw `supabase.from().update()` in page components.
- **When creating forms** — use React Hook Form + Zod, with AR/EN tabs pattern.
- **When adding pages** — add route in App.tsx, add nav item in `src/config/nav.ts`.

---

## Project Overview

### What Is This?
**Waraq Academy Portal** — An educational marketplace platform (like Udemy but for Arab school students).

- **Teachers** sign up → create courses for school subjects → sell them to students.
- **Students** sign up → browse courses by their grade/stage → subscribe and learn.
- **Platform** provides the audience, tools, and infrastructure.

### Target Audience
- **Teachers**: Want to monetize teaching. Need easy course creation tools (lesson editor, quiz builder, etc.).
- **Students**: School-age, Arabic-speaking. Need supplementary learning for school subjects they struggle with. Subscribe to individual courses or plans.

### Business Model
- Courses organized by **stage** (educational level) → **subject** (school subject).
- Students select their stage/grade during onboarding.
- Access types: `public | stage | subscription | invite_only | org_only`.
- Payment/subscription system is **planned but not built yet**.

### Current Status: **In Development**
- Not yet live / not in production.
- Deployed on **Vercel** (vercel.json configured).
- Backend: **Supabase** (auth + PostgreSQL + storage + Edge Functions).
- AI services: Supabase Edge Function (`ai-assist`) calls Groq API with `openai/gpt-oss-20b`. Needs `GROQ_API_KEY` set in Supabase secrets.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5.8 + Vite 5.4 |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| Backend | Supabase (auth, PostgreSQL, storage, RPC) |
| State | TanStack Query 5 (React Query) with localStorage persistence |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod validation |
| Icons | Lucide React |
| Toasts | Sonner |
| DnD | @dnd-kit |
| PDF | html-to-image + jsPDF |
| Charts | recharts (installed, not yet used) |
| Carousel | Embla Carousel |

### Dev Server
```bash
npm run dev          # http://localhost:8080
npm run build        # Production build
npm run build:dev    # Dev build
npm run preview      # Preview production build
npm run lint         # ESLint
```

### Environment Variables
```env
VITE_SUPABASE_URL=<required>
VITE_SUPABASE_ANON_KEY=<required>
# AI is handled server-side via Supabase Edge Function.
# Set GROQ_API_KEY in Supabase secrets: supabase secrets set GROQ_API_KEY=gsk_...
```

### Path Alias
All imports use `@/` → `src/`:
```tsx
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
```

---

## Architecture

### Directory Structure
```
src/
├── pages/                    # Route page components
│   ├── admin/                # 15 pages — full CMS
│   ├── teacher/              # 11 pages — course management
│   ├── student/              # 13 pages — learning interface
│   ├── auth/                 # Login, Register, ResetPassword, AcceptInvite
│   └── legal/                # Terms, Privacy, RefundPolicy, CertificatePolicy
├── components/
│   ├── ui/                   # shadcn/ui (auto-generated, don't edit manually)
│   ├── admin/                # Admin components + lesson editor
│   ├── teacher/              # Teacher dashboard layout
│   ├── student/              # Student learning + mobile layout
│   ├── home/                 # Public homepage sections
│   ├── layout/               # Header, Footer, Layout
│   ├── auth/                 # ProtectedRoute, RoleRoutes
│   ├── certificate/          # Certificate display & verification
│   └── shared/               # LessonContentRenderer, common UI
├── contexts/                 # Auth, Language, Settings, Template providers
├── hooks/                    # Query hooks, mutation hooks, draft persistence
├── lib/                      # Services (supabase, adminDb, AI, certificates, etc.)
├── types/                    # database.ts — all TypeScript interfaces
├── config/                   # nav.ts — navigation config per role
└── assets/                   # Images, logos
```

### Landing Page Design Variants (`src/pages/landing/`)

Ten competing homepage directions live side by side for selection. They are **preview-only** and do not affect `/`, which still renders `LandingPreview`.

- Chooser at `/landing`, each variant at `/landing/1` … `/landing/10` (routes in `App.tsx`).
- `useLandingData.ts` — all variants pull the **same live data** (`useHomeStages`, `useFeaturedTeachers`, `useFeaturedSubjects`) so they differ only in art direction. Also exports `VARIANTS` (the registry driving the index + switcher) and legacy `BRAND` navy/gold tokens used by V1 to V6.
- `useReveal.tsx` — `<Reveal>`, an IntersectionObserver scroll-reveal that respects `prefers-reduced-motion`. **Use this instead of adding an animation library**; the project has no Motion/GSAP dependency.
- `VariantSwitcher.tsx` — floating variant hopper on every variant. Preview tool, delete when a winner is picked.
- `palettes.ts` + `PaletteSwitcher.tsx` — four complete palettes (Cobalt & Citrus, Teal & Coral, Plum & Lime, Midnight & Aqua) switchable live in the browser and persisted to `localStorage` under `ayman-academy-palette`. Used by V9 only. Also exports `R`, the one radius scale for V9 (pill interactive / 20px cards / 14px chips).

Directions: 1 Bold Editorial · 2 Quiet Minimal · 3 Playful · 4 Premium Dark · 5 Conversion · 6 Premium Marketplace · 7 Thmanyah Editorial · 8 Wijha Refined · **9 Colorful** (Pikbest-style illustration-led, the 4 live palettes) · **10 Pixel Arcade** (Young&&Yandex-inspired: radius 0, 2px borders, hard offset shadows, grades framed as levels). **Two colours only, white plus one green scale** — deep green `#07301F` carries text/borders/shadows, electric green `#22DE7C` is the only fill, and a dark-half green gradient appears on exactly two full-bleed bands. Text on electric green is always deep green, never white (electric green is light).

**Conventions to keep when adding a variant:** every user-facing string through `t()`; real routes only (`/register`, `/marketplace`, `/course/:id`, `/stages/:slug`, `/t/:id`, `/apply/teacher`, `/plans`); logical RTL properties (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`) and a direction-flipped arrow icon; loading skeletons and empty states for every data-backed section. **Never invent stats** — `useFeaturedTeachers`/`useFeaturedSubjects` are capped by `.limit()`, so their lengths are not totals; only `stages.length` is a real count.

### Brand — Waraq Academy (ورق أكاديمي)

Renamed from Ayman Academy. Source of truth: `C:\Users\yaman\Downloads\waraq_brand_kit.md`.

- **Names:** AR `ورق أكاديمي` · EN `Waraq Academy` · short `ورق` / `Waraq`
- **Tagline:** `ورقة بعد ورقة.. نكبر` / `Page by page, we grow.`
- **Concept:** «ورق» means both book pages and tree leaves. The mark is a leaf with a folded page corner; its veins point upward for progress through the stages.
- **Font:** IBM Plex Sans Arabic (fallback Tajawal), self-hosted via `@fontsource`. **It tops out at weight 700** — `font-black`/`font-extrabold` resolve to 700. The 700 face is now imported; without it browsers synthesised the weight. **Never add letter-spacing to Arabic text.**

**Files:** marks in `public/brand/` (`mark.svg`, `mark-on-dark.svg`, `mark-mono.svg` via `currentColor`, `logo-stacked.svg`, `app-icon.svg`) · `public/favicon.svg` · generated PNGs `public/brand/apple-touch-icon.png` (180), `public/favicon-32.png` (32), `ayman_academy_flutter/assets/brand/app-icon.png` (1024). Regenerate PNGs with `npx sharp-cli --input <svg> --output <dir> --format png resize <w> <h>` (**always pass `--format png` and a different output dir, or it overwrites the source SVG with PNG bytes**).

**Components:** `src/components/brand/Logo.tsx` exports `LogoMark` and `Logo` (brand-kit spec, colours hard-coded). Public arcade surfaces use **`ArcadeBrand`** from `arcade/primitives` instead — `Logo` hard-codes its text as `#0B3B2C`, invisible on the arcade dark theme, so `ArcadeBrand` pairs `LogoMark` with a themed wordmark and puts the mark on a fixed brand-paper plate (the mark's palette does not follow dark mode).

**Tokens:** `src/styles/brand.css` (`--brand-*`, HSL triplets) imported by `index.css`; Tailwind exposes `brand.*` and `stage.*` colours plus `font-brand`. Stage accents: kindergarten coral, primary sun, middle sky, secondary green.

**Deliberately NOT renamed** (renaming these breaks builds, sessions, or store identity):
| Kept as `ayman*` | Why |
|---|---|
| `package.json` name `ayman-academy-portal` | repo/package identity |
| Dart package `ayman_academy_app` + all `package:` imports | breaks every import, Android applicationId, iOS bundle id |
| folder `ayman_academy_flutter/` | same |
| `ayman-academy-auth` (`lib/supabase.ts`) | localStorage auth key — renaming signs every user out |
| `ayman-academy-theme` (`useDarkMode.ts`), `ayman-academy-cache` (`queryConfig.ts`) | persisted client keys |
| Supabase tables/buckets/env vars, Vercel project, GitHub repo | out of scope per the kit |

**Flutter:** `lib/brand/brand_colors.dart` holds `BrandColors` + `BrandStrings` (keep in sync with `brand.css`). **There is no `ios/` directory**, so no `Info.plist` to update. Launcher icons and the splash are generated (`dart run flutter_launcher_icons`, `dart run flutter_native_splash:create`).

The **launcher label is locale-aware**: `android:label="@string/app_name"`, with `Waraq Academy` in `res/values/strings.xml` and `ورق أكاديمي` in `res/values-ar/strings.xml`. It was hard-coded to the English name in the manifest, which showed the wrong name to the Arabic-first majority. `MaterialApp(title:)` carries the Arabic name.

**The app now shares the web's arcade design language.** `ayman_academy_flutter/lib/brand/arcade.dart` is the Dart mirror of the `--arc-*` variables in `src/index.css` — **`src/index.css` stays the source of truth for the hex values**, and the Dart side must be updated to match when they change. `lib/brand/widgets/` holds the Flutter counterparts of `src/components/arcade/primitives.tsx` (`ArcadeButton`, `ArcadeCard`, `ArcadeChip`, `ArcadeField`, `ArcadeSkeleton`, `ArcadeEmpty`, `PixelDivider`, plus `LogoMark`/`BrandLogo`). The same rules apply on both sides: radius 0, 2px borders, hard offset shadows, text on accent is `onAccent` and never white, focus rings and spinners use `mid`. See `ayman_academy_flutter/CLAUDE.md` for the Flutter specifics and the test map.

The **certificate PDF** (`lib/shared/services/pdf_service.dart`) is the one surface that deliberately keeps rounded corners — it is a printed document, not app chrome, so the arcade's radius-0 rule does not apply to it. Its palette is the brand's (`deep`/`green`/`sun`/`paper`), no longer the pre-rebrand navy and gold.

### Arcade Theme — the green + white public design language

The V10 landing style is now the shared look for **all public-facing pages**. Three layers, in order:

1. **`src/index.css`** — `--arc-*` CSS variables define the palette, once in `:root` and again under `.dark`. **This is the only file containing arcade hex values.** Tune colours here and every surface follows.
2. **`src/components/arcade/theme.ts`** — exports `A` (tokens as `var(--arc-*)` strings), `hard(n)` (the offset shadow), `PIXEL_STRIP`, `RADIUS`.
3. **`src/components/arcade/primitives.tsx`** — `ArcadeButton`, `ArcadeLink`, `ArcadeCard`, `ArcadeChip`, `ArcadeField`, `ArcadeSkeleton`, `ArcadeEmpty`, `PixelDivider`.

Interactive states (`:hover`, `:focus-visible`, `:active`, `::placeholder`) live in `@layer components` in `index.css` as `.arc-press`, `.arc-press-sm`, `.arc-focus`, `.arc-input`, `.arc-link` — they cannot be expressed as inline styles.

**Rules that are easy to get wrong:**
- **`ink` is a TEXT colour, `line` is a BORDER colour, `band` is a deep-green FILL.** They coincide in light mode and diverge in dark. Never use `A.ink` as a background or a border, or dark mode breaks.
- **Text on `A.accent` is always `A.onAccent`, never white** — electric green is light (white on it fails contrast; `onAccent` gives 8.4:1).
- **Never set `boxShadow` inline on a `.arc-press` element.** Inline styles beat the `:hover`/`:active` rules and the press effect silently dies. To recolour it, set the `--arc-press-color` custom property instead (that's what `variant="onDark"` does).
- Focus rings use `A.mid`, not `A.accent` — accent only reaches 1.9:1 against white, below the 3:1 floor for focus indicators.
- Radius is **0 everywhere**, borders are **2px**. Error text is the one non-green colour, via the existing semantic `hsl(var(--destructive))` token, because an error rendered in the brand green would not read as an error.

**Surfaces using it:** `layout/Header`, `layout/Footer`, `layout/Layout` (so all 21 pages that wrap in `Layout` inherit it), `auth/Register`, `auth/Login`, `PublicMarketplace`, `TeacherApplication`, `landing/LandingV10`. Dark mode still works throughout via the Header toggle. Admin/teacher/student shells do **not** use `Layout` and are untouched.

### AI summary — "الملخص الذكي" (added 2026-09-29)

A teacher generates a summary + slide outline for one of their lessons **from that lesson's own content**, edits it in AR/EN tabs, and approves it. Students see approved content only, can print it, and can view it as slides.

**Not `lessons.summary_ar` / `lessons.summary_en`.** Those already existed and hold a short teacher-written blurb shown on course listings (8 call sites on web, 3 in Flutter). They are untouched. Everything in this feature is named *AI summary* / *الملخص الذكي* to keep the two apart.

- **Table `lesson_summaries`** (migration `108_lesson_summaries.sql`, **APPLIED 2026-09-29**; do not re-run — 109 replaces its student SELECT policy): one row per lesson, `summary_ar/en` text, `slides_ar/en` jsonb (`[{title, bullets[]}]`), `key_points_ar/en` jsonb (`string[]`), `status`, `source_hash`, `model`, `generated_*`, `reviewed_*`.
- **`status` is `draft → approved` only.** `pending_review` and `rejected` are in the CHECK constraint; `rejected` is reachable, `pending_review` is **reserved and written by nothing** — the teacher is the reviewer, so there is no queue. Don't start writing it without building the queue that drains it.
- **Editing an approved summary keeps it approved** and refreshes `reviewed_at`; a teacher fixing a typo should not have to re-approve, and students should not lose the summary meanwhile. Regenerating *does* reset to `draft` — the approved text no longer exists.
- **`supabase/functions/_shared/lessonSummaryCore.ts` is ONE file imported by two runtimes** — the browser (via the `@shared` Vite alias + tsconfig path) and the `ai-assist` edge function (`../_shared/lessonSummaryCore.ts`). It must stay dependency-free: no `Deno.*`, no `npm:`/`https://` imports, **no Zod** (the Zod schemas live in `src/lib/lessonSummary.ts`). `crypto.subtle` and `TextEncoder` are the only globals used. Adding an import breaks one of the two callers. Verify with `node --experimental-strip-types scripts/verify-lesson-hash.mts`, which pins the canonical format against a fixture — **changing the canonicaliser invalidates every stored `source_hash`**.
- **Stale detection:** the browser recomputes the hash and shows a "lesson changed since this summary" warning when it differs. It never regenerates automatically.
- **Groq specifics** (checked against Groq's docs, 2026-09-29): `openai/gpt-oss-20b` supports **strict `json_schema`** structured output — strict mode requires every property in `required` and `additionalProperties:false`. `reasoning_effort` accepts `low|medium|high`. **`reasoning_format` must be `parsed` or `hidden` with JSON mode — `raw` returns 400.** AR and EN are **two separate calls** at `reasoning_effort: 'low'`: hidden reasoning tokens are widely reported to bill against the completion budget (Groq's docs don't say either way), which shows up as an empty or mid-sentence answer. `finish_reason === 'length'` is caught and reported as a distinct "too long" error.
- **`ai-assist` now requires `teacher` or `super_admin` on EVERY action**, not just a login. Verified first: no student-facing caller exists — all 14 web call sites are under `pages/admin`, `pages/teacher` or the shared editor components, and Flutter's only call is the teacher lesson editor. **Deployed live 2026-09-29** (`supabase functions deploy ai-assist --no-verify-jwt --use-api --workdir "$PWD" --project-ref lkdbinrwojvrchunzqfq` — the repo has no `supabase/config.toml`, so `--project-ref` is required; the deploy correctly bundled `_shared/lessonSummaryCore.ts`). Verified after deploy: anon → `401 Missing authorization header`; teacher → passes the gate and reaches Groq (`{"success":false,"code":"AI_ERROR","error":"Invalid API Key"}`); the role lookup works fine under 104's `profiles_select_self`. **Still unverified: a student session returning 403** — no student test credential available.
- **Routes `/student/lesson/:id/summary` (portrait) and `/student/lesson/:id/slides` (landscape)** are **top-level in `App.tsx`, outside `StudentLayout`** — nesting them would print the sidebar. They are guarded by `ProtectedRoute allowedRoles={['student','teacher','super_admin']}` so the lesson's teacher can preview a draft; RLS still limits students to approved rows. Two routes rather than one because `@page` is document-level and cannot be portrait and landscape at once.
- **The Flutter app ships the student half of this feature as of v1.2.0+120** — summary card above the lesson body and a slides screen at `/student/subjects/lesson/:lessonId/slides`, both approved-only, with the same English-falls-back-to-Arabic rule and the same direction-follows-content rule. **The printable handout is web-only**: the phone equivalent is a PDF, and `pdf_service.dart` loads no Arabic font, so that is blocked on fixing a pre-existing certificate bug. See `ayman_academy_flutter/CLAUDE.md`.
- **Printing is `window.print()` on real text — never `html-to-image`/`jsPDF` here.** Rasterising would give an unselectable, unsearchable image of Arabic. `src/lib/printing.ts` awaits `document.fonts.load()` for the three IBM Plex Sans Arabic weights and `img.decode()` for every image first, both with a 3s timeout so a wedged request can't disable the button.

### User Roles & Access

| Role | Routes | Access |
|------|--------|--------|
| `super_admin` | `/admin/*` + `/teacher/*` | Everything |
| `teacher` | `/teacher/*` | Own courses, lessons, quizzes |
| `student` | `/student/*` | Enrolled courses + discovery |

- `AdminRoute` = super_admin only
- `TeacherRoute` = teacher OR super_admin
- `StudentRoute` = student only (with onboarding check — redirects to `/student/onboarding` if no stage selected)

### Context Providers (wrapped in App.tsx)
1. `PersistQueryClientProvider` — Cache persistence
2. `BrowserRouter` — Routing
3. `AuthProvider` — Auth + profile (5s timeout, 1 retry)
4. `SettingsProvider` — Feature toggles
5. `LanguageProvider` — AR/EN with RTL/LTR
6. `TemplateProvider` — Dynamic text templates
7. `TooltipProvider` + `Toaster` + `Sonner` — UI utilities

### Authentication Flow
1. Login via Supabase Auth → session stored in localStorage (`ayman-academy-auth`)
2. Profile fetched with 5s timeout + 1 retry
3. Auto-redirect by role after login
4. Protected routes via `<ProtectedRoute allowedRoles={['role']}>`
5. Logout clears cache + query state

### Key Patterns

**Bilingual Support:**
```tsx
const { t, language, direction } = useLanguage();
<h1>{t('مرحبا', 'Welcome')}</h1>
// DB fields: title_ar, title_en
```

**Database Operations (adminDb.ts):**
```tsx
import { verifiedInsert, verifiedUpdate, verifiedDelete } from '@/lib/adminDb';
await verifiedUpdate('subjects', id, { title_ar: 'new' });
// Auto-verifies, auto-toasts, auto-auth-checks
```

**Forms:**
```tsx
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {...}
});
// Pattern: AR/EN tabs, active toggle, sort_order, toast feedback
```

**React Query:**
- Stale times: STATIC (24h), SEMI_STATIC (1h), DYNAMIC (5m), CONTENT (30m)
- No refetch on window focus/reconnect (intentional)
- localStorage persistence with 24h max age
- Query keys in `src/lib/queryKeys.ts`

### Database Schema — Key Tables

**Core Content:**
- `profiles` — Users (id, email, full_name, role, avatar_url, student_stage, grade, gender, bio_ar/en)
- `stages` — Educational levels (title_ar/en, sort_order, is_active, show_on_home)
- `subjects` — Courses (stage_id, teacher_id, title_ar/en, access_type, is_paid, price_amount)
- `lessons` — Units within subjects (title_ar/en, sort_order, is_published, duration_minutes)

**Lesson Content (section/block model):**
- `lesson_sections` — Groups of blocks within a lesson
- `lesson_blocks` — Content blocks (type: rich_text|video|image|file|link|tip|warning|example|exercise|qa|equation)
- Each block: type, title_ar/en, content_ar/en, url, metadata JSONB, sort_order

**Quiz System:**
- `quizzes` — Linked to lesson OR subject (passing_score, attempts_allowed)
- `quiz_questions` — Types: mcq, true_false, multi_select (question_ar/en, explanation_ar/en)
- `quiz_options` — Answer choices (text_ar/en, is_correct)
- `quiz_attempts` — Student attempts (score_percent, answers, timestamps)

**Progress & Learning:**
- `lesson_progress` — Per-student per-lesson (progress_percent, last_position_seconds, completed_at)
- `lesson_notes` — Timestamped student notes
- `lesson_comments` — Discussion on lessons
- `ratings` — Unified ratings (entity_type: lesson|subject|teacher, stars 1-5)

**Certificates:**
- `certificates` — Status workflow: draft → eligible → pending_approval → issued → revoked
- `certificate_rules` — Eligibility criteria per subject (rule_json tree with AND/OR/progress/exam conditions)
- `templates` — Dynamic text with {{token}} interpolation

**Access & Commerce:**
- `plans` — Subscription tiers (billing: monthly|yearly|lifetime, price_cents)
- `subscriptions` — Student subs (status: trialing|active|past_due|expired|cancelled)
- `student_subjects` — Explicit enrollment
- `subject_invites` — Invite-only access
- `organizations` + `org_members` + `org_subjects` — Org-based access
- `coupons` + `coupon_redemptions` — Discount codes

**Communication:**
- `messages` — Direct messages (sender_id, receiver_id, content, read_at)
- `announcements` — Teacher broadcasts (bilingual)
- `audit_logs` — Activity tracking

**RPC Functions (Postgres):**
- `get_student_subjects()` — Returns enrolled subjects with entitlement_reason + progress
- `get_discover_subjects()` — Returns discoverable subjects with lock_reason
- `check_subject_access()` / `check_lesson_access()` — Access verification
- `request_certificate()` — Student initiates certificate request
- `admin_approve_certificate()` / `admin_reissue_certificate()` / `admin_revoke_certificate()`

### Key Services

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Supabase client singleton |
| `lib/adminDb.ts` | Verified CRUD (insert/update/delete with confirmation) |
| `lib/queryConfig.ts` | React Query setup, stale times, cache persistence |
| `lib/queryKeys.ts` | Centralized query key management |
| `lib/aiService.ts` | AI content generation via Supabase Edge Function (Groq + openai/gpt-oss-20b) |
| `lib/translation.ts` | AR↔EN translation via Supabase Edge Function (Groq + openai/gpt-oss-20b) |
| `lib/certificateGenerator.ts` | PDF generation (QR + html-to-image + jsPDF) |
| `lib/eligibilityService.ts` | Certificate rule evaluation engine |
| `lib/templateRenderer.ts` | Safe {{token}} interpolation with HTML escaping |
| `lib/draftManager.ts` | Lesson draft persistence (localStorage, 48h expiry) |
| `lib/motivationMessages.ts` | Gamification encouragement messages |
| `config/nav.ts` | Navigation items per role |

### TypeScript Configuration
- `noImplicitAny: false` — relaxed type enforcement
- `strictNullChecks: false` — relaxed null checks
- Types defined in `src/types/database.ts` (~800 lines, 50+ interfaces)

---

## Implemented Features

### Fully Working
- [x] Authentication (login, register, reset password, role-based redirect)
- [x] Role-based routing (admin, teacher, student)
- [x] Student onboarding (stage/grade selection)
- [x] Bilingual UI (Arabic RTL / English LTR)
- [x] Admin CRUD for stages, subjects, lessons, teachers
- [x] Teacher invite system (token-based)
- [x] Lesson editor (block-based with sections, drag-and-drop, draft persistence)
- [x] Lesson player (block rendering, progress tracking, notes, comments, ratings)
- [x] Quiz system (creation, taking, scoring, attempts history)
- [x] Certificate generation (eligibility rules, PDF, QR verification)
- [x] Template system (dynamic text with token interpolation)
- [x] Homepage builder (admin configurable sections)
- [x] Dark mode support
- [x] Responsive design (desktop + mobile layouts)
- [x] Direct messaging (basic)
- [x] Public pages (stages, subjects, teacher profiles, legal pages)

### Built But Needs Supabase Table
- [~] Marketplace system (UI complete, needs `orders` table created in Supabase — see Known Issues for SQL)

### Not Working / Placeholder
- [ ] AI content assistance (Edge Function ready, needs GROQ_API_KEY in Supabase secrets)
- [ ] Translation service (Edge Function ready, needs GROQ_API_KEY in Supabase secrets)
- [ ] Payment processing (DB schema exists, no UI or integration)
- [ ] Real-time messaging (no Supabase Realtime)
- [~] Email via Resend (code + functions deployed; needs Resend login, verified domain, secrets, hook, migration 106 — see Known Issues)
- [ ] Push notifications
- [ ] Analytics dashboard (recharts installed, no visualizations)
- [ ] Parent dashboard (route exists, minimal UI)
- [ ] Announcement delivery (CRUD exists, no broadcast mechanism)

---

## Known Issues

- **Subject pricing must come from the RPCs, not be inferred.** `get_student_subjects` / `get_discover_subjects` did not return `is_paid`, so the Flutter `Subject.isPaid` parsed as NULL and `SubjectCard` read `isPaid != true` as free — **every course, including a 100,000 SYP one, rendered a green «مجاني / FREE» chip.** Fixed twice over on 2026-09-30: migration `112_subject_pricing_in_rpcs.sql` (**applied**) adds `is_paid`, `price_amount`, `price_currency` to both RPCs, and `subject_card.dart` now treats NULL as *unknown* and renders **no badge** rather than claiming free. Keep both: the client guard is what stops a future RPC change silently lying again. Predates the entitlement work, but migration 110 made it far more visible by correctly surfacing unpurchased paid courses in discover.
- **Progress is weighted and time-gated, not `blocksSeen / totalBlocks`** (`src/lib/progressModel.ts`, 2026-09-30). The old model let a one-block lesson jump 0→100% on render, counted a one-line tip the same as six paragraphs, and completed a ten-minute lesson for anyone who flicked to the bottom. Now each block's weight is its word count (clamped 10–400 so one wall of text cannot swamp a lesson, media counts as 40), and the reported percentage is capped by elapsed time against `duration_minutes` when the teacher set one, else a 300 wpm estimate at 60%. Progress stays monotonic — scrolling back up never lowers it. Change the constants there, not in `LessonPlayer`.

- **🔴 Gemini free tier: Google uses your content to improve its products.** `https://ai.google.dev/gemini-api/docs/pricing` marks free-tier rows **"Content used to improve our products: Yes"**, and the paid tier **"No"**. Every lesson body sent for summarisation or translation, and every generated summary, leaves the platform under those terms — **including pupils' course material**. If that is not acceptable, move to the paid tier (same API, same code, just billing enabled) or switch `AI_PROVIDER` back to `groq`. Nothing in the code can mitigate this; it is a tier property.
- **Gemini free-tier quota is the real constraint on the AI summary feature, not the model.** Measured 2026-09-30: `gemini-3.8-flash` returns 429 `generate_content_free_tier_requests` after only a handful of calls, while a trivial "say OK" call against the same key at the same moment succeeds — so the binding limit behaves like **tokens per minute**, driven by `max_completion_tokens` being reserved, not by request count. Two *parallel* generations (AR + EN) tripped it every time; sequential at `max_completion_tokens: 1800` does not. It also returns transient **503 UNAVAILABLE** ("high demand") on roughly one call in three. Consequences baked into `ai-assist`: generations run **sequentially**, 503 is retried (3 attempts, 700 ms × n) but **429 is never retried** (Gemini says retry in ~35 s, longer than an edge function can wait, and each doomed retry spends more of the exhausted quota), and a 100 s deadline aborts cleanly rather than letting the platform kill the request with an opaque non-2xx. **`AI_MODEL` is currently set to `gemini-3.5-flash-lite`** because `gemini-3.8-flash`'s free quota was exhausted during testing; unset it to return to the default.

- **Email `SITE_URL` now points at the new domain** (`supabase secrets set SITE_URL=https://www.waraq.academy`, 2026-09-30) and `send-auth-email` + `notify` were redeployed so every link in a verification, reset, invite or notification email resolves. `_shared/email.ts`'s hard-coded fallback was updated too, so a missing secret no longer silently points at the old domain. **Still outstanding for email go-live:** `EMAIL_FROM` is unchanged, so the sender is still `onboarding@resend.dev`, which Resend only delivers to the account owner. The domain now exists, so the Resend steps in the go-live checklist below are unblocked.
- **The production domain is `waraq.academy` (canonical `https://www.waraq.academy`), on Vercel.** The apex 308-redirects to `www`. Machine-facing URLs use the `www` form so the mobile admin handoff (`/auth/bridge#at=…`) never crosses a redirect with a fragment attached.
  **`aymanacademy.com` is NOT this project** — it is a different business ("Ayman Academy — English Exam Preparation with Mr. Ayman Mohamed", served from Cloudflare). It was the old domain and the docs kept pointing at it. A Known Issue previously claimed "Vercel deploys never reach the domain"; **that was wrong** — deploys were reaching `waraq.academy` correctly the whole time, and the checks were being run against someone else's site. Verified 2026-09-30: `www.waraq.academy` serves bundle `index-Bx7RZ4Rc.js` containing `get_public_curriculum`, the locked-state copy, the `/slides` route and the corrected `lock_reason` vocabulary. **If a deploy looks missing, check which host answers before concluding anything** — `server:` and `x-vercel-id` headers settle it in one request.
- **Test student account (created 2026-09-29).** `waraq.test.student+20260929@gmail.com`, id `32f8d48d-4437-45dd-87d4-301acd4b3d09`, role `student`, stage `primary`, entitled to nothing paid. Credentials live in **`.smoke/.env`** (`STUDENT_EMAIL` / `STUDENT_PASSWORD` / `STUDENT_ID`), which is gitignored via `.smoke/`. Used by `.smoke/verify-109.mjs` and `.smoke/verify-110.mjs` to prove the paywall from a real student session. Do not delete it, and do not give it entitlements — its value is that it owns nothing.
- **Applying SQL here: no Docker, so use the Management API.** `supabase db push` is banned and `supabase db dump` needs Docker (not installed). The project is linked; `supabase db query --linked` connects as `postgres`. Use `node .smoke/run-sql.mjs -f <file>` (readable output, loud on error) or `-q "<sql>"`. `.smoke/_dump_schema.sql` produces a full DDL snapshot as a `db dump` stand-in — see `.smoke/live_schema_before.sql` / `live_schema_after.sql`.
- **A policy change that "ran fine" in the SQL editor may not have taken.** Migration 107's hotfix was recorded as applied on 2026-09-29 but `pg_policy` showed otherwise days later: `lessons_manage` was still present and `lessons_teacher_own` / `lessons_teacher_update` were still their pre-hotfix bodies. It has since been applied for real and verified. **Always confirm against `pg_policy` / `pg_get_functiondef`, never against a successful-looking run.**
- **Client/SQL vocabulary drifts silently — two dead branches found 2026-09-29.** `MySubjects.tsx` tested `entitlement_reason === 'org'` but the function emits `'organization'`; and both `MySubjects.tsx` and `StudentSubjects.tsx` tested `lock_reason` for `needs_subscription` / `needs_invite` / `wrong_stage` / `locked`, none of which `get_discover_subjects` has ever emitted (it emits `subscription_required` / `invite_required` / `org_required` / `not_available`). Every locked card fell through to a generic "Locked". Both fixed on the client. When you change an RPC's string vocabulary, grep the clients.
- **`subscriptions.ends_at` and `trial_ends_at` are ignored by the entitlement logic.** `get_student_subjects` and `subject_entitlement_reason` check only `status IN ('active','trialing')`, matching the live body exactly — so an expired subscription still grants access. The table is currently empty, so this is latent. Deliberately not fixed inside a security migration; it needs its own change.

- **Video URLs are bearer access — locking the column is a delay, not a fix.** Lesson videos are YouTube links or objects in a public Supabase Storage bucket. Neither is gated per viewer, so **the URL *is* the credential**: anyone holding it can watch, forever, signed in or not, and a URL already harvested stays valid after any RLS change. Migration 109 and the deferred column lockdown below reduce who can *discover* a URL; they cannot revoke one already taken. **The real fix is per-user signed URLs** — short-lived tokens minted server-side for an entitled student, with the bucket made private. That is a hosting change, not an RLS change, so it should be decided **together with the offline video-download work** (Flutter backlog: "Video download for offline viewing") since the two pull in opposite directions: offline playback wants a long-lived fetchable file, signed URLs want a short-lived one. Do not design either in isolation. Until then, treat every published video URL as public.
- **Deferred: lesson video column lockdown — DO NOT do this before the APK step.** Migration 109 gates `lesson_blocks` / `lesson_sections`, so a video stored as a **block** is now protected. A video stored in **`lessons.video_url`** is still readable by any logged-in user for any published lesson, bought or not, because the lesson ROW must stay readable for titles and the video columns ride along. Closing that needs column privileges on `lessons` — and revoking from **`authenticated`** (not just `anon`) is what actually closes it, which makes every `select('*')` on `lessons` fail outright. **Published APKs are never removed**, so an old build stuck on `select('*')` would break permanently for its users. Sequence, in order:
  1. ✅ **Done 2026-09-29** — all four Flutter `select('*')` on `lessons` replaced with `Lesson.columns` / `Lesson.columnsWithContent` (`lesson_provider.dart`, `subjects_provider.dart`, `teacher_lessons_screen.dart`, `lesson_editor_screen.dart`). Web sites converted too: `useLessons` (guest branch now uses the RPC, signed-in branch lists columns) and `TeacherPublicProfile.tsx`.
  2. **Ship a Flutter release containing step 1** and wait until it is widely installed. Check adoption before proceeding — there is no telemetry for this today, so judge from release downloads on `/download`.
  3. **Only then** revoke: `REVOKE SELECT ON lessons FROM authenticated, anon;` then `GRANT SELECT (<every column except video_url, full_video_url>) ...`, keeping `preview_video_url` granted (it is the public trailer).
  4. Re-probe every read site afterwards. A missed `select('*')` returns 401, not a partial row.
- **🔴 CRITICAL — paid lesson content and video URLs are readable without purchase.** `lesson_blocks` and `lesson_sections` both carry `SELECT USING (true)` (`038:51`, `039:80`, `040:107`, `1000:27,32`), reinforced by `GRANT ALL … TO anon` (`050_fix_schema_cache.sql:10-12`) and `GRANT SELECT ON ALL TABLES … TO anon` (`1001_anon_permissions.sql:13`). `lessons` is readable by **anon** when `is_published`, including `full_video_url` / `video_url` / `preview_video_url`, and by **any authenticated user** when unpublished. No client checks access either — `LessonPlayer.tsx`, `LessonPage.tsx` and `CoursePreview.tsx` contain no `check_subject_access` call, so RLS is the only guard and it is open. **Anyone with the anon key — which ships inside the APK — can read the full body of every paid lesson.** **FIXED — migration `109_lock_lesson_content_reads.sql` APPLIED 2026-09-29 and verified** (anon on a paid lesson gets `[]`, on a free-preview lesson gets its blocks; `get_public_curriculum` returns titles with no `video_url`; teacher still loads blocks of their own unpublished lesson; teacher smoke 72/72).
  Detail: 109 drops every SELECT policy on `lesson_sections` / `lesson_blocks` by enumerating `pg_policy` (not by name — Postgres ORs permissive policies, which is how 104's profiles lockdown silently failed), replaces them with one shared `can_read_lesson_content()` predicate — published AND (`is_free_preview` OR entitled via `check_subject_access`) — revokes both tables from `anon`, repoints `lesson_summaries` at the same predicate so the two rules cannot drift, and adds `get_public_curriculum()` so the public pages keep a titles-only table of contents. **STILL OPEN after 109: `lessons.video_url` / `full_video_url`** — see the deferred entry above. Full analysis in `LESSON_READS_BLAST_RADIUS.md`.
- **`npm run lint` does not pass, and did not before this work — 634 errors, 48 warnings (measured 2026-09-29).** Overwhelmingly `@typescript-eslint/no-explicit-any` from the `supabase.from(...) as any` idiom used all over the codebase, plus `react-hooks/exhaustive-deps` warnings. **This is a known pre-existing state, not a task** — do not "fix lint" as a side quest, and do not treat a non-zero lint exit as a regression you caused. Keep NEW files clean and leave touched files no worse; check with `npx eslint <file>` rather than the repo-wide script. `npx tsc -b` and `npm run build` DO pass and are the real gate.
- **🔴 `get_student_subjects` could expose another student's course list and progress — these are minors.** It is `SECURITY DEFINER`, takes an arbitrary `p_student_id`, returns that student's entitled subjects **and computed lesson counts and progress**, and is RPC-callable by every `authenticated` user. **The live body has no authentication guard and no caller/target comparison** — 046 in this folder shows one, but 046 is not what is deployed. `check_subject_access` wraps it and passes `p_student_id` straight through. It also has **no `SET search_path`**, so a caller who can create objects in an earlier schema on their `search_path` could shadow `profiles` or `subjects` and have the definer read their table. **FIXED — `110_fix_entitlement_rpcs.sql` APPLIED 2026-09-29 and verified**: `get_student_subjects`, `check_subject_access` and (via `111`) `get_discover_subjects` all ignore `p_student_id` unless the caller is super_admin, pin `SET search_path = public`, and are revoked from `PUBLIC` **and** `anon` (anon now gets `42501 permission denied`). Progress is still computed — it has real readers — but narrowed to the entitled subject ids. Measured before the fix: the live bodies had **no guard at all**; `check_subject_access(null, <public subject id>)` returned a row.
- **`get_student_subjects` grants access to PAID subjects for free** — paths E and F (stage match, `access_type = 'public'`) never check `is_paid`, so any paid course visible to a student's stage counts as entitled with no order and no payment. That is why "my subjects" lists courses nobody bought. **The rule, decided 2026-09-29: `access_type` = who may SEE a subject; `is_paid` = whether it opens for free.** Paid subjects open only via explicit entitlement (enrolment, invite, subscription, org) or a free-preview lesson. Enforced in `subject_entitlement_reason()` / `has_subject_access()` (migration 109) and retrofitted into `get_student_subjects` by migration 110. **Both applied 2026-09-29.** Consequence seen live: an unpurchased paid subject now correctly appears in *discover* rather than in *my subjects*. Three students who already had lesson progress on a paid `public` subject were grandfathered with explicit `student_subjects` rows before 110 went in, so nobody lost access they were using.
- **`check_subject_access` is `SECURITY DEFINER` and accepts any `p_student_id`.** Live signature: `check_subject_access(p_student_id uuid, p_subject_id uuid) RETURNS TABLE(has_access boolean, reason text, access_type text)`. **The live body has NO guard at all** — measured: `check_subject_access(null, <public subject id>)` returns a row. Any caller can probe another student's entitlement for any subject, and because it wraps `get_student_subjects` the same parameter reaches a function that also returns that student's progress. It should take no `p_student_id` and read `auth.uid()` directly. **Fixed by migration 110 (written, not applied).**
- **Sham Cash QR code is placeholder** — The checkout page shows a dashed QR placeholder. Need to add real QR code image upload via admin settings or teacher profile.
- **Payment model is per-teacher** — Money goes directly to teachers via Sham Cash. Currently using a single platform-level QR. Per-teacher QR codes should be added to teacher profiles.
- **lesson_content vs lesson_blocks**: Old `lesson_content` table referenced in earlier docs, but code uses `lesson_sections` + `lesson_blocks`. Need to verify which is active in Supabase.
- **Quiz schema — fixed 2026-09-22.** `QuizEditor.tsx` was writing `question_text_ar`, `question_text_en`, `question_type`, `options` and `correct_option_index`; none of those columns exist in the live database, so no question ever saved. `QuizPlayer.tsx` read `q.options` / `q.correct_answer` (also nonexistent) and never inserted a `quiz_attempts` row, so results were discarded. Both now use the real schema: `quiz_questions` (`type`, `question_ar/en`, `explanation_ar/en`, `sort_order`) with choices in `quiz_options` (`text_ar/en`, `is_correct`, `sort_order`), and attempts are recorded. `multi_select` is supported alongside `mcq` / `true_false`.
- **`/auth/bridge` is a session handoff endpoint for the mobile app** (`src/pages/auth/AuthBridge.tsx`). The Flutter admin WebView opens `/auth/bridge#at=…&rt=…&redirect=/admin`; the page calls `supabase.auth.setSession()` and forwards. Tokens travel in the fragment (never sent to a server), the params avoid the `access_token`/`refresh_token` names so `detectSessionInUrl` doesn't race it, and `redirect` is restricted to in-app paths so it can't be used as an open redirect. Do not remove this route — the app's admin panel depends on it.
- **`QuizManagement.tsx` — fixed 2026-09-22.** It was a second, full quiz editor writing the denormalised `options: string[]` + `correct_answer` shape, so nothing it saved ever landed. It is now a thin summary card that opens `QuizEditor`, leaving one editor implementation for one schema.
- **Migrations 102-105 are APPLIED and verified** against the live database (2026-09-22). Anonymous callers now get `42501` from the admin enrollment RPCs, see 0 student and 0 admin rows on `profiles`, and 401 on `email` / `grade` / `shamcash_account_number`. Quiz grading runs server-side via `submit_quiz_attempt`. See `supabase/migrations/README.md` for the full state of that folder — **`supabase db push` must never be run here**; the two destructive files are renamed `.DO-NOT-RUN`. Historical detail on what each migration fixed: **104** Findings from auditing all 39 tables and 12 functions the clients touch, probed against the live database on 2026-09-22:
  - **`profiles` was world-readable.** Anonymous callers got every row of every role, including `email`, `grade`, `student_stage` and teachers' `shamcash_account_name`/`shamcash_account_number`. The anon key is public by design (it ships inside the APK), so this was open to anyone. 104 enables RLS with per-role policies and restricts anon to a teacher's public-facing columns only.
  - **Five functions the UI calls do not exist**, so those buttons always failed: `request_certificate` (student "Request certificate"), `admin_approve_certificate` / `admin_revoke_certificate` (teacher certificate actions), `get_admin_enrollments` / `get_admin_enrollment_detail` (the whole admin Enrollments Explorer page). 104 creates all five.
  - **`teacher_evaluations` does not exist** though `src/lib/teacherEvaluationService.ts` reads and upserts it. 104 creates it with RLS.
  - ~~Writes were already correctly guarded on all other tables~~ — **this claim was FALSE for `lessons`, corrected 2026-09-29.** `lessons_manage` was `FOR ALL USING (auth.role() = 'authenticated')` **with no `WITH CHECK`**, and `lessons_teacher_own` allowed INSERT into any subject. So any logged-in user could insert, update or delete *any* lesson — and because there was no `WITH CHECK`, could UPDATE a lesson to set `created_by` to their own uid, which then handed them `blocks_manage` / `sections_manage` over that lesson's content. Hotfixed by hand on 2026-09-29; recorded verbatim in `supabase/migrations/107_fix_lessons_write_policies.sql`. The replacement policies are `lessons_teacher_own` (INSERT: `created_by = auth.uid()` **and** the subject's `teacher_id = auth.uid()`, or super_admin) and `lessons_teacher_update` (UPDATE: same `WITH CHECK`, `USING (created_by = auth.uid() or is_super_admin())`). A pre-check found exactly one lesson whose creator did not own its subject — a teacher, not a student, no sign of abuse — and its ownership was corrected manually. **DELETE is fine** — checked against `pg_policies` on 2026-09-29: a separate `lessons_teacher_delete` (`FOR DELETE USING created_by = auth.uid() OR is_super_admin()`) already existed and the hotfix does not touch it. The same check showed 057's `"Teachers can manage own lessons"` does **not** exist live.
  - `teacher_applications` accepts anonymous INSERT by design for `/apply/teacher`.
  - Because anon now has column-level grants, `select('*')` on profiles fails for logged-out visitors — `TeacherPublicProfile.tsx` lists its columns explicitly. Keep public profile queries explicit.
  - `profiles.featured_stages` does not exist in the live database; the branch in `TeacherPublicProfile.tsx` that reads it never runs.
- **`submit_quiz_attempt` is deployed — no action needed** (re-probed live 2026-09-26: it answers `P0001 Quiz not found` for a bogus id, not `PGRST202`). This entry used to read "ACTION REQUIRED — run migration 103"; that was stale. Quizzes are graded in the database, so a student cannot forge a score, and `attempts_allowed` is enforced server-side. `request_certificate` and `get_admin_enrollments` are deployed too. Both clients still carry a local-grading fallback for `PGRST202`, which is now dead code. **Never run `supabase db push` on this project**: the migrations folder still contains `100_clean_rewrite.sql`, which drops the entire public schema.
- **Quiz answers are still readable from the API** — `quiz_options.is_correct` is sent to the client so the review screen can show the right answer. Hiding it needs a student-facing fetch RPC that omits the flag, plus RLS on `quiz_options`. Grading integrity is handled by `submit_quiz_attempt`; this is the remaining half.
- **Teacher panel — smoke-tested end to end 2026-09-26** against the live DB as a real teacher account. Four data-layer defects were found and fixed; the column names below are the live truth and are easy to get wrong:
  - **`announcements` is bilingual: `title_ar/title_en/body_ar/body_en`** — there is no `title` or `body`. `TeacherAnnouncements.tsx` wrote `title`/`body`, so **no announcement could ever be saved** (PGRST204) and the list rendered blank rows. It now writes the four columns and has AR/EN fields with auto-translate, matching the rest of the teacher forms.
  - **`ratings` is polymorphic** (`entity_type` + `entity_id`, no FK to `lessons`) and its columns are **`stars`** and **`comment`** — not `rating`/`feedback`. Embedding `lesson:lessons(...)` on it returns PGRST200, which made `useTeacherFeedback` throw and left **Ratings & Feedback permanently showing zero**. The lesson is attached client-side now. Never embed `lessons` on `ratings`.
  - **`certificates` has no `lesson_id`** — it links to a subject. The same hook filtered on `lesson_id`, which 400'd. It queries by `subject_id` now.
  - **`quiz_attempts` has `started_at` / `completed_at`, not `created_at`** (nor `submitted_at`). `teacherEvaluationService` selected `created_at`, so every quiz attempt silently dropped out of the Course Health scores.
  - `lessons` uses **`sort_order`**, not `order_index`. `quizzes` uses **`passing_score`** + `unlock_after_percent`, and has no `created_by`.
  - `student_subjects` has a unique key on `(student_id, subject_id)` — granting access must **upsert**, or a repeat purchase 23505s while the UI claims success (fixed in `TeacherOrders`).
  - **`messages` has no DELETE policy** — a sender cannot remove their own message from the client. Fine today (no delete UI), but any "delete message" feature needs a policy first.
  - Reusable suite in **`.smoke/`** (untracked): `node .smoke/10-teacher-smoke.mjs` signs in and exercises all 72 teacher queries/mutations against the live DB, cleaning up after itself. `03-columns.mjs` re-probes the live schema — **run it; never read a cached file.** `21-flutter-shapes.mjs` does the same for the Flutter app's 30 teacher-side query shapes (all passing).
  - **`.smoke/columns.json` and `.smoke/rpcs.json` are STALE — do not read them.** `02-parse-schema.mjs` generates both **from `schema.json`**, the pre-`066` dump already marked stale, so they inherit its errors. Concretely, `columns.json` claims `lessons` / `lesson_sections` / `lesson_blocks` use `order_index`; they do not. Same for `schema.json` itself.

### Live schema truths that contradict the repo (verified in the SQL editor, 2026-09-29)

- **`sort_order` is the live ordering column on `lessons`, `lesson_sections` and `lesson_blocks`. `order_index` does not exist on any of them** — despite `20260207140000_lesson_blocks.sql` creating them with `order_index`. All working code already uses `sort_order`; keep it that way.
- **`check_lesson_access` DOES NOT EXIST.** `src/types/database.ts` declared it as `(p_user_id, p_lesson_id) → boolean`; that declaration was removed on 2026-09-29. Nothing called it. Gate lesson access on `check_subject_access` plus `lessons.is_published` / `is_free_preview` instead — that is what `lesson_summaries`' student policy does.
- `check_subject_access` returns **`TABLE(has_access boolean, reason text, access_type text)`**, not the `jsonb` that `046_subject_access_control.sql:654` declares. Call it as `EXISTS (SELECT 1 FROM check_subject_access(uid, sid) a WHERE a.has_access)`.
- `lessons` has `subject_id`, `is_published`, `is_free_preview`, `is_paid`, `created_by`, `objectives_ar/en`, `prerequisites_ar/en`, and **already has `summary_ar` / `summary_en`** (a short teacher-written blurb — unrelated to the AI summary feature, see `lesson_summaries`).
- `lesson_blocks` has `is_published`; **`lesson_sections` does not.**
  - **The Flutter app shared none of these four defects** but had its own: confirming a payment never wrote `student_subjects`, so the student paid and got no access. Fixed in `ayman_academy_flutter/lib/features/teacher/orders/screens/teacher_orders_screen.dart`; see that project's CLAUDE.md. **When a teacher-side data bug is found on one client, check the other** — they diverge more than they look.
- **Email runs on Resend (added 2026-09-27)** — nothing here calls Resend from the browser.
  - **Auth emails** (signup verify, password reset, invite, magic link, email change, reauth) go through the Supabase **Send Email Hook** → `supabase/functions/send-auth-email`. Clients are unchanged: web `AuthContext` and Flutter `auth_repository.dart` still call supabase-js/dart. The hook verifies a Standard Webhooks signature (`SEND_EMAIL_HOOK_SECRET`). If the function errors, the originating `signUp`/`resetPasswordForEmail` call fails with its message.
  - **Notifications** come from **Postgres triggers** (migration `106_email_notifications.sql`) → `pg_net` → `supabase/functions/notify`: new order → teacher; order paid/rejected → student; announcement → enrolled students (one email each, never a shared To:); message → receiver (only the first unread one per sender, so bursts send once); certificate issued → student; teacher application received → applicant + super_admins; decision → applicant; teacher invite → invitee with `/invite/:token`. Triggering from the DB means **both clients notify with no client code**, and a failed send never rolls back the write.
  - The trigger's secret lives in **Vault** as `notify_webhook_secret` and must equal the function secret `NOTIFY_WEBHOOK_SECRET`. With no Vault secret the triggers are silent no-ops.
  - Shared template/sender in `supabase/functions/_shared/email.ts`: every email is bilingual (AR block then EN), arcade look repeated in hex (email clients ignore CSS vars — keep in sync with `index.css`). Function secrets: `RESEND_API_KEY`, `EMAIL_FROM` (verified Resend domain), `SITE_URL`.
  - **Deploy from the repo root with `--workdir`**: `supabase functions deploy <name> --no-verify-jwt --use-api --workdir "$PWD"`. A stray `Desktop/supabase/config.toml` outside the repo makes the CLI resolve the wrong root otherwise ("Entrypoint path does not exist").
  - Resend CLI (`npm i -g resend-cli`, command `resend`) is installed on the dev machine: `resend domains list`, `resend emails list`, `resend logs` for debugging deliveries.
  - **State on 2026-09-27:** both functions deployed; migration 106 **applied** (9 `trg_email_*` triggers, inert); Supabase secrets set: `SEND_EMAIL_HOOK_SECRET`, `RESEND_API_KEY` (Resend key `waraq-supabase-sending`, sending-only), `NOTIFY_WEBHOOK_SECRET`, `SITE_URL=https://www.waraq.academy`. Send Email hook created in the dashboard (HTTPS → `send-auth-email`) but **left disabled**. Signed test calls delivered signup, recovery and invite emails to `delivered@resend.dev`; a forged signature gets 401.
  - **Go-live checklist** — the domain now exists (`waraq.academy`), so nothing here is blocked:
    1. `resend domains create --name mail.waraq.academy` → add the printed DNS records → `resend domains verify <id>` until `verified`.
    2. `supabase secrets set "EMAIL_FROM=Waraq Academy <no-reply@mail.waraq.academy>"`. `SITE_URL` is already done. Until then the sender is `onboarding@resend.dev`, which Resend only delivers to the account owner.
    3. Arm the triggers: generate a new random secret, `supabase secrets set NOTIFY_WEBHOOK_SECRET=<s>` and run `select vault.create_secret('<s>', 'notify_webhook_secret');` (use `vault.update_secret` if it exists).
    4. Dashboard → Auth → Hooks → enable the Send Email hook; Auth → Providers → Email → enable **Confirm email**.
    5. Optionally rescope the Resend key to the domain: `resend api-keys create --permission sending_access --domain-id <id>`, reset `RESEND_API_KEY`, delete the old key.
- **AI runs on Google Gemini as of 2026-09-30; the provider is one secret away from switching back.** `ai-assist` targets whichever provider `AI_PROVIDER` names (`gemini` default, `groq` supported), reading `GEMINI_API_KEY` or `GROQ_API_KEY` and an optional `AI_MODEL` override. Both speak the OpenAI chat-completions shape, so only the base URL, key, default model and two vendor params differ. Verified against the live endpoint, not assumed:
  - Base URL `https://generativelanguage.googleapis.com/v1beta/openai/` ([docs](https://ai.google.dev/gemini-api/docs/openai)).
  - **`gemini-2.5-flash` is retired** — it 404s with "no longer available to new users". Current free Flash ids: `gemini-3.8-flash` (default in code), `3.7`, `3.6`, `3.5`, plus `3.5-flash-lite` / `3.1-flash-lite`.
  - `response_format: json_schema` with `strict: true` **is** accepted through the compat layer and returns schema-conforming JSON, even though the native structured-output docs describe a different Gemini-specific shape.
  - `reasoning_effort` is accepted (the compat layer maps it to Gemini's `thinking_level`). **`reasoning_format` is Groq-only** — Gemini returns `400 INVALID_ARGUMENT 'Unknown name "reasoning_format"'`, so it is gated behind the provider flag.
  - **Thinking tokens count inside `max_output_tokens`** ([docs](https://ai.google.dev/gemini-api/docs/thinking): "including thought tokens") and cannot be disabled on Flash. Measured: the same prompt costs `total_tokens` 95 at default thinking vs **7** with `reasoning_effort: "low"`, while `completion_tokens` stays 1 — thinking is invisible in `completion_tokens` but real in the budget. Every call therefore sets `reasoning_effort: "low"` and checks `finish_reason === "length"`.
  - The old Groq key is still stored and still returns `Invalid API Key`; it is untouched, so switching back needs a working key first.
- **The pre-rebrand `src/assets/logo.png` is still used by the admin, student and parent shells** plus `AccessDenied`, `AcceptInvite`, `ResetPassword` and `LandingIndex`. The teacher shell and `MobileLayout` now render `<Logo>` from `@/components/brand/Logo` instead — note it hard-codes its text colour, so `variant` must follow dark mode (`variant={isDark ? 'dark' : 'light'}`).

---

## Android Release Policy

**Every update ships an APK, and old versions are never removed.** Publishing the GitHub release is also what updates the website: the `/download` page (تحميل) reads GitHub Releases live, so no website deploy is needed.

### How to release a new Android version

1. **Bump the version** in `ayman_academy_flutter/pubspec.yaml`, e.g. `1.1.0+110` → `1.2.0+120`. The `+N` build number (Android `versionCode`) must increase, or the new APK will not install over the old one.
2. **Build** from `ayman_academy_flutter/`:
   ```bash
   flutter build apk --release      --dart-define=SUPABASE_URL=<url>      --dart-define=SUPABASE_ANON_KEY=<key>      --dart-define=WEB_APP_URL=https://www.waraq.academy      --dart-define=ONESIGNAL_APP_ID=<id>   # omit and push is disabled
   ```
3. **Verify the binary contains the change**: unzip `lib/arm64-v8a/libapp.so` from `build/app/outputs/flutter-apk/app-release.apk` and grep for a string the change introduced. A build that overlapped a `git checkout` cannot be trusted otherwise.
4. **Rename the file** to `waraq-academy-vX.Y.Z.apk`. The asset's *file name* is what GitHub serves and where `/download` reads the version; the `#label` suffix on `gh release create` only changes the display text, it does not rename the file.
   ```bash
   cp build/app/outputs/flutter-apk/app-release.apk waraq-academy-vX.Y.Z.apk
   ```
5. **Publish a NEW release** tagged `vX.Y.Z-android`:
   ```bash
   gh release create vX.Y.Z-android --repo DovakiinZ/Waraq --target main --latest      --title "Waraq Academy — Android vX.Y.Z"      --notes-file notes.md      "waraq-academy-vX.Y.Z.apk#Waraq Academy vX.Y.Z (Android APK)"
   ```
   - `notes.md` becomes "What's new" on `/download`, shown as plain text. Write it for students, in Arabic and English.
   - A test build gets `--prerelease` instead of `--latest`. It is listed under previous versions but never becomes the main download button.
6. **Check the site**: open `/download` (or the landing page's app band). It should show the new version and size within 5 minutes, which is the query's stale time.
7. **Never delete or overwrite a previous release or its APK.** Every version stays downloadable at its own permanent URL and is listed on `/download` under previous versions.

### How `/download` stays in sync

`src/pages/Download.tsx` + `src/hooks/useAndroidRelease.ts` call the GitHub API for `DovakiinZ/Waraq` (renamed from `ayman-academy-portal`; GitHub redirects the old name). The **newest non-draft, non-prerelease release that has an `.apk` asset** is the main download; tag names and the `Latest` marker are ignored because they have been inconsistent (`v1.0.3-android` vs `design/arcade-green-v1`). If the API fails, the button falls back to `https://github.com/DovakiinZ/Waraq/releases/latest`. Linked from the Header (تحميل), the Footer ("Android app") and a band on the landing page. If the repo is renamed again, update `GITHUB_REPO` in the hook.

The only rules a release must follow for the page to work: **the APK is attached as a `.apk` file** and **its file name contains `vX.Y.Z`**.

Published so far: `v1.0.0-android` (prerelease), `v1.0.1-android`, `v1.0.2-android`, `v1.0.3-android`, `design/arcade-green-v1` (v1.1.0, `waraq-academy-v1.1.0.apk`).

---

## Plan — Roadmap & Tasks

> Update this section as tasks are completed or new ones are discovered. Mark completed items with [x].

### Phase 1: Marketplace & Payment Workflow (Current Priority)
- [x] **Marketplace page** (`/student/marketplace`) — Students browse subjects filtered by stage, see teacher + price + lesson count, add to cart.
- [x] **Checkout page** (`/student/checkout`) — 3-step flow: order summary → Sham Cash payment (QR + student name/account input) → confirmation.
- [x] **Teacher orders page** (`/teacher/orders`) — Teachers see pending orders, verify Sham Cash payment, confirm (grants access) or reject.
- [x] **Order type + DB schema** — `orders` table with status workflow: pending_payment → paid/rejected/cancelled.
- [x] **Navigation updates** — Marketplace in student nav, Orders in teacher nav.
- [x] **Dashboard CTA** — New students directed to marketplace instead of old browse page.
- [ ] **Sham Cash QR code configuration** — Admin needs UI to upload/configure the Sham Cash QR code (currently placeholder).
- [ ] **Teacher profile payment info** — Teachers should set their Sham Cash account in profile (for per-teacher payments later).
- [x] **Admin students page** (`/admin/students`) — all students with stage, grade, gender, contact, enrolled subjects, orders, certificates, XP/level and last activity, with search and stage filter.
- [x] **Teacher application flow** — Public form at `/apply/teacher`, admin review at `/admin/applications`, approve → creates invite link.
- [x] **Landing page "Teach with Us" section** — CTA section on homepage linking to teacher application.
- [ ] **Create `teacher_applications` table in Supabase** — Run the SQL migration (see Known Issues).
- [ ] **Registration flow polish** — Make role selection, onboarding, and first-time experience feel smooth and intentional.
- [ ] **General UI/UX polish** — Fix vague screens, improve navigation clarity, ensure consistent design language.
- [ ] **Create `orders` table in Supabase** — Run the SQL migration (see below in Known Issues).

### Phase 2: Marketplace Enhancements
- [x] **Course preview page** (`/student/course/:subjectId`) — Udemy-style detail page: hero with title/description/stats, curriculum with free preview lessons, teacher bio, sticky enroll CTA.
- [x] **Marketplace → course preview** — Cards in marketplace are now clickable, linking to the course detail page.
- [ ] **Per-subject ratings display** — Show average rating on marketplace cards.
- [ ] **Coupon system UI** — Apply discount codes during checkout.
- [ ] **Order notifications** — Notify student when teacher confirms/rejects payment.
- [ ] **Admin orders dashboard** — Admin can see all orders across all teachers.

### Phase 3: AI & Smart Features
- [ ] **Connect AI service** — Get Gemini or alternative working for content assistance.
- [ ] **Supabase Edge Functions** — Deploy edge functions for AI processing.
- [ ] **Translation API** — Connect real AR↔EN translation service.
- [ ] **Smart recommendations** — Suggest subjects based on student progress/grade.
- [~] **AI summary / الملخص الذكي** — built 2026-09-29. Teacher generates → edits → approves; students get a printable handout and a slide deck. Migration 108 **applied**, `ai-assist` **deployed** and its role gate verified live. **Pending only a working `GROQ_API_KEY`** — generation cannot be verified end to end until Groq stops answering `Invalid API Key`.
- [ ] **Lock down lesson content reads** — `lesson_blocks` / `lesson_sections` are `SELECT USING (true)`; see the CRITICAL entry in Known Issues and the blast-radius report in `LESSON_READS_BLAST_RADIUS.md`.

### Phase 4: Communication & Engagement
- [ ] **Real-time messaging** — Supabase Realtime for instant messages.
- [~] **Email notifications** — Resend-backed auth emails + event notifications built (`send-auth-email`, `notify`, migration 106). Pending: go-live setup. Lesson reminders not built.
- [ ] **Announcement delivery** — Push teacher announcements to enrolled students.
- [ ] **Analytics dashboard** — Student progress analytics for teachers, platform analytics for admin.

### Phase 5: Advanced Features
- [ ] **Parent dashboard** — Multi-child account management.
- [ ] **Organization enrollment** — Bulk school/org enrollment.
- [ ] **SEO optimization** — Public pages, meta tags, structured data.
- [ ] **Performance optimization** — Code splitting, lazy loading, image optimization.

### Backlog (Ideas / Later)
- Gamification system (badges, streaks, leaderboards)
- Live classes / webinar integration
- Mobile app (React Native or PWA)
- Teacher payout system
- Referral program

---

## Common Tasks Reference

### Adding a New Page
1. Create component in `src/pages/<role>/PageName.tsx`
2. Add route in `src/App.tsx` under appropriate role section
3. Add nav item in `src/config/nav.ts`
4. Use `useLanguage()` for all text

### Adding a New Lesson Block Type
1. Add type to block types in `src/types/database.ts`
2. Update `BlockEditor.tsx` to render it
3. Add creation UI in lesson editor
4. Update `LessonContentRenderer` for student view

### Creating Admin CRUD Pages
1. Use `verifiedInsert/Update/Delete` from `adminDb.ts`
2. TanStack Query for fetching with cache invalidation
3. Bilingual fields (AR/EN tabs)
4. Include `is_active` toggle and `sort_order`

### Adding shadcn/ui Components
```bash
npx shadcn@latest add <component-name>
```
