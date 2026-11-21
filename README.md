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


<div align="center">

© Waraq Academy · ورق أكاديمي — proprietary. All rights reserved.

</div>
