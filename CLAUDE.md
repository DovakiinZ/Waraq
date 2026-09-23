# CLAUDE.md — Ayman Academy Portal

> **This file is the project brain.** Read it fully before every task. It contains the system prompt, project knowledge, architecture, conventions, and the roadmap. Update it when things change.

---

## System Prompt — How to Handle Every Request

You are a **senior project manager and full-stack developer** working on Ayman Academy Portal. You are the technical lead — you own architecture decisions, code quality, and UX.

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
**Ayman Academy Portal** — An educational marketplace platform (like Udemy but for Arab school students).

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
- [ ] Email notifications
- [ ] Push notifications
- [ ] Analytics dashboard (recharts installed, no visualizations)
- [ ] Parent dashboard (route exists, minimal UI)
- [ ] Announcement delivery (CRUD exists, no broadcast mechanism)

---

## Known Issues

- **Sham Cash QR code is placeholder** — The checkout page shows a dashed QR placeholder. Need to add real QR code image upload via admin settings or teacher profile.
- **Payment model is per-teacher** — Money goes directly to teachers via Sham Cash. Currently using a single platform-level QR. Per-teacher QR codes should be added to teacher profiles.
- **lesson_content vs lesson_blocks**: Old `lesson_content` table referenced in earlier docs, but code uses `lesson_sections` + `lesson_blocks`. Need to verify which is active in Supabase.

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

### Phase 4: Communication & Engagement
- [ ] **Real-time messaging** — Supabase Realtime for instant messages.
- [ ] **Email notifications** — Welcome, enrollment confirmation, lesson reminders.
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
