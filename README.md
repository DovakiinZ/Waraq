<div align="center">

<img src="public/brand/logo-stacked.svg" alt="Waraq Academy — ورق أكاديمي" width="180" />

# Waraq Academy · ورق أكاديمي

**ورقة بعد ورقة.. نكبر** — *Page by page, we grow.*

An Arabic-first learning marketplace where school teachers publish courses and students learn them, on the web and on Android.

[**www.waraq.academy**](https://www.waraq.academy) · [**Download the Android app**](https://www.waraq.academy/download)

</div>

---

## What it is

Waraq is a marketplace for supplementary school education in the Arab world, organised the way school is: **stage → subject → lesson**.

- **Teachers** apply, build courses with a block-based lesson editor, attach quizzes and certificates, and sell them.
- **Students** pick their stage at sign-up, browse courses for it, buy them, and learn — with progress tracking, notes, quizzes and certificates.
- **The platform** handles the audience, the tooling, access control and payments verification.

Everything is bilingual. Arabic (RTL) is the default; English (LTR) is a first-class alternative, in the UI and in every piece of content.

## Features

| | For students | For teachers | For admins |
|---|---|---|---|
| **Learning** | Lesson player with weighted, time-gated progress · notes · comments · ratings | Block editor (text, video, image, file, tip, exercise, Q&A, equations…) with drag-and-drop | Full CMS for stages, subjects, lessons, home page |
| **Authoring** | — | Lesson wizard · paste-a-lesson → blocks · photo/file upload from the phone · publish-readiness checks | Template system with `{{token}}` interpolation |
| **Assessment** | Quizzes graded server-side · attempt history | Quiz builder (MCQ, true/false, multi-select) | Certificate rules (AND/OR trees over progress and exams) |
| **Certificates** | Request, download as PDF, QR verification | Approve / revoke | Approve / re-issue / revoke |
| **Commerce** | Marketplace · course preview · checkout with Sham Cash | Order verification grants access | Students, enrolments, applications |
| **AI** | Approved lesson summaries · printable handout · slide view | Generate → edit → approve a summary from the lesson's own content · AR↔EN translation | — |

## Repository layout

This is a monorepo with three deployable parts.

```
.
├── src/                       Web app — React 18 + TypeScript + Vite (deployed on Vercel)
│   ├── pages/                 Route components: admin/, teacher/, student/, auth/, legal/
│   ├── components/            UI — ui/ (shadcn), arcade/ (design system), brand/, feature folders
│   ├── contexts/              Auth, Language (AR/EN + RTL/LTR), Settings, Templates
│   ├── hooks/                 TanStack Query hooks and mutations
│   ├── lib/                   Services — supabase client, adminDb, AI, certificates, progress model
│   └── types/database.ts      Typed schema
├── ayman_academy_flutter/     Android app — Flutter (student + teacher)
├── supabase/
│   ├── migrations/            SQL migrations (applied by hand — see below)
│   └── functions/             Edge functions: ai-assist, notify, send-auth-email, admin-user-ops
├── api/                       Vercel serverless functions
├── scripts/                   Verification scripts (pure logic, exit non-zero on failure)
├── docs/                      Design specs and implementation plans
└── .github/workflows/         CI — Android release pipeline
```

> The Flutter folder and Dart package keep their original `ayman_*` names on purpose: renaming them would change the Android application id and break updates for installed users.

## Tech stack

| Layer | Web | Android |
|---|---|---|
| UI | React 18, TypeScript 5.8, Tailwind CSS 3.4, shadcn/ui (Radix) | Flutter 3.41.6 (Dart 3.11) |
| Data | TanStack Query 5 with persisted cache | Riverpod · go_router |
| Forms | React Hook Form + Zod | — |
| Backend | Supabase — Postgres with Row-Level Security, Auth, Storage, Edge Functions (Deno) | same project |
| AI | Google Gemini (OpenAI-compatible endpoint) via the `ai-assist` edge function; Groq supported | — |
| Email | Resend, via a Supabase Send Email hook and Postgres-triggered notifications | — |
| Hosting | Vercel | GitHub Releases ([waraq-releases](https://github.com/DovakiinZ/waraq-releases)) |

## Getting started — web

**Requirements:** Node.js 20+ and access to the Supabase project.

```bash
npm install
cp .env.example .env        # then fill in the two values
npm run dev                 # http://localhost:8080
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 8080 |
| `npm run build` | Production build — **this and `npx tsc -b` are the real quality gate** |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint (the repo has known pre-existing errors; keep new files clean with `npx eslint <file>`) |

Pure-logic modules are verified by scripts rather than a test runner:

```bash
node --experimental-strip-types scripts/verify-lesson-import.mts
node --experimental-strip-types scripts/verify-lesson-readiness.mts
node --experimental-strip-types scripts/verify-lesson-hash.mts
```

### Environment

The browser needs only two values, both public by design — security is enforced by Postgres RLS, not by hiding keys:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

**Never put a `service_role` / `sb_secret_` key in `.env` or under `src/`** — every `VITE_*` variable is compiled into the public bundle. Server-side secrets (`GEMINI_API_KEY`, `RESEND_API_KEY`, …) live in Supabase: `supabase secrets set NAME=value`.

## Getting started — Android

See [`ayman_academy_flutter/CLAUDE.md`](ayman_academy_flutter/CLAUDE.md) for architecture and the test map. In short:

```bash
cd ayman_academy_flutter
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=sb_publishable_...
flutter test
```

## Releasing the Android app

Releases are built and published by CI. Every version stays downloadable forever, and [`/download`](https://www.waraq.academy/download) picks up a new release automatically within about five minutes — no website deploy needed.

1. Bump `version:` in `ayman_academy_flutter/pubspec.yaml` — the `+N` build number must increase.
2. Optionally write student-facing notes, Arabic and English, in `ayman_academy_flutter/release_notes/X.Y.Z.md`.
3. Commit and push a tag:

   ```bash
   git tag v1.5.0-android      && git push origin v1.5.0-android       # release
   git tag v1.5.0-android-test && git push origin v1.5.0-android-test  # test build (prerelease)
   ```

The [Android release workflow](.github/workflows/android-release.yml) builds the APK and publishes it to the public [`waraq-releases`](https://github.com/DovakiinZ/waraq-releases) repository. It refuses to publish if the tag and `pubspec.yaml` disagree, if the release already exists, if the build number did not increase, or if the APK is not signed with the key every previous version carries — a differently signed APK will not install as an update. Run it manually from the Actions tab for a **dry run** that builds without publishing.

## Backend

- **Migrations are applied by hand, one file at a time** (SQL editor or the Management API). **Never run `supabase db push`** — the folder contains historical files that would drop the schema. See [`supabase/migrations/README.md`](supabase/migrations/README.md).
- **After any policy or function change, verify against `pg_policy` / `pg_get_functiondef`**, not against a successful-looking run.
- **Deploy edge functions from the repo root:**

  ```bash
  supabase functions deploy <name> --no-verify-jwt --use-api --workdir "$PWD" --project-ref <project-ref>
  ```

## Conventions

- **Bilingual, always.** Every user-facing string goes through `t('عربي', 'English')`; every content column has `_ar` / `_en` twins. Use logical CSS properties (`ms-`, `pe-`, `start-`) so layouts mirror correctly.
- **Mobile-first.** Most students are on phones.
- **Arcade design system** for public pages: radius 0, 2px borders, hard offset shadows, green + white. Colours live only in `src/index.css` (`--arc-*`); components in `src/components/arcade/`. Text on the accent green is always the deep green, never white. Never add letter-spacing to Arabic.
- **`@/` imports** everywhere; React Hook Form + Zod for forms; TanStack Query with keys from `src/lib/queryKeys.ts`.
- **Access control lives in the database.** The client is never the guard — every rule that matters is an RLS policy, a trigger, or a `SECURITY DEFINER` function with a pinned `search_path`.

## Documentation

| File | What's in it |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | The project brain — architecture, live-schema truths, known issues, roadmap. Read it before making changes. |
| [`ayman_academy_flutter/CLAUDE.md`](ayman_academy_flutter/CLAUDE.md) | Android specifics and test map |
| [`docs/superpowers/specs/`](docs/superpowers/specs) | Design specs |
| [`supabase/migrations/README.md`](supabase/migrations/README.md) | Which migrations are applied and which must never run |

---

<div align="center">

© Waraq Academy · ورق أكاديمي — proprietary. All rights reserved.

</div>
