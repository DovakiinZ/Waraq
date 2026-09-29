---
type: note
date: 2026-09-29
project: waraq-academy-portal
status: active
tags: [lesson-summaries, ai, phase-0, investigation, rls, print]
---

# Lesson Summaries & Slides — PHASE 0 Report

**Goal being scoped:** teachers generate an AI summary + slide outline per lesson, edit it, and approve it. Students see only approved content, can print it to PDF, and view it as slides.

**Status:** investigation only. No files changed, nothing run against the live project.

**Sources read:** `CLAUDE.md` (533 lines), `src/components/shared/LessonContentRenderer.tsx`, `supabase/functions/ai-assist/index.ts`, `supabase/migrations/` + its `README.md`, `src/hooks/useQueryHooks.ts`, `src/components/admin/lessons/LessonEditor.tsx`, `src/pages/student/LessonPlayer.tsx`, `src/pages/LessonPage.tsx`, `src/lib/adminDb.ts`, `src/lib/aiService.ts`, `src/components/arcade/theme.ts`, `src/App.tsx`, `.smoke/`.

---

## 1. `LessonContentRenderer` — how each block renders

`src/components/shared/LessonContentRenderer.tsx`

**Structure:** filters `is_published !== false`, then splits blocks into *unsectioned* (rendered first) and *grouped by `section_id`* (rendered in `lesson.sections` array order — the caller does the `sort_order` sorting, `useQueryHooks.ts:181-182`). Each block is wrapped in `TrackedBlock`, an IntersectionObserver at 0.4 threshold that drives progress and applies `opacity-90 → opacity-100`. Every string goes through `t(ar, en || ar)` — **English silently falls back to Arabic**.

| type | rendering | print/slide consequence |
|---|---|---|
| `rich_text` | `<p className="whitespace-pre-wrap">` inside `.prose` | **Plain text, not rich text.** No markdown parser, no HTML, no sanitizer in the dep tree. |
| `tip` / `warning` / `example` / `exercise` | coloured callout: `border-s-4` + icon + AR/EN label + `whitespace-pre-wrap` body | `border-s-4` is logical → flips correctly in RTL. Background colours need `print-color-adjust: exact` or they vanish. |
| `equation` | indigo bordered box, optional `title_*` caption, body centred in **`font-mono`** | **No KaTeX/MathJax installed.** An equation is stored and displayed as literal characters — `\frac{a}{b}` would print as that string. Equations must be passed to the model as-is and reproduced verbatim, never "rendered". |
| `qa` | `Q:` from `title_*`, `A:` from `content_*` | Q/A labels are hard-coded Latin letters, not `t()`. |
| `video` | YouTube id → `<iframe>` embed; otherwise an `<a>` showing the raw URL | Iframes do not print. |
| `image` | bare `<img src={block.url}>`, `alt="Lesson Content"` hard-coded, no width/height, no `loading`/`decoding` | No intrinsic size → **layout shifts during print**; must await `img.decode()` before `window.print()`. The hard-coded alt is an a11y gap worth fixing on the print page (fall back to `title_ar/en`). |
| `file` / `link` | **`default: return null` — not rendered at all** | `LessonPage`/`LessonPlayer` render these separately as a "resources" list. The renderer drops them; the "link URLs printed" requirement has to be satisfied by the print page itself, not by reusing this component. |

`isPublicPreview` additionally skips `file`, `link`, `video`.

**Conclusion for the print page: do not reuse `LessonContentRenderer`.** It carries progress-tracking side effects, an opacity transition, and it drops `file`/`link`. The print page renders the *approved summary*, not the lesson blocks — the blocks only feed the generator.

---

## 2. `ai-assist` edge function

`supabase/functions/ai-assist/index.ts` — Deno, deployed `--no-verify-jwt`, Groq `openai/gpt-oss-20b`.

**Auth:** `verifyAuth()` reads the `Authorization` header, builds an anon client with it, calls `auth.getUser()`. That is the *only* check — **it proves "someone is logged in" and nothing more. No role check, no resource ownership check.** Any student session can currently invoke any action. The constraint "only the lesson's subject teacher or super_admin" is new work, not a tightening of something existing.

**Actions:** `expand`, `simplify`, `improve_language`, `generate_example`, `generate_summary`, `generate_quiz`, `translate_ar_en`, `translate_en_ar`, `translate`. Note `generate_summary` already exists — it is a *free-text* single-language summariser driven by `options.summaryLength`, unrelated to what is wanted here. The new action needs its own name.

**Input:** `{ action, content, language?, targetLanguage?, subject?, gradeLevel?, options:{summaryLength} }`. `content` is required and non-empty. **`content` comes from the client** — the function never reads the database.

**Output:** `{ success:true, result, action, model }`. `result` is a string for every action except `generate_quiz`, where it regex-extracts `\[[\s\S]*\]` and `JSON.parse`s it, silently falling back to the raw string on failure.

**Error handling — the important gotcha:** only two paths return a non-200 status (401 missing/invalid auth, 405 non-POST). **Every other failure returns HTTP 200 with `{success:false, error}`** — missing `GROQ_API_KEY`, invalid action, Groq error, empty completion, thrown exception. So `supabase.functions.invoke()` gives `error === null` and the caller must branch on `data.success`. `src/lib/aiService.ts:56-70` does this correctly; any new client code must too.

**Model call:** `temperature` (0.3 for translate/quiz/improve, else 0.7), `max_tokens` (3000 expand / 2000 quiz / 1000 summary / 1500 default). **No `response_format`, no JSON mode, no retry, no timeout.** One global `SYSTEM_PROMPT` for all actions that instructs "do not use markdown".

**Live state:** per `CLAUDE.md`, `GROQ_API_KEY` is set but Groq answers `{"success":false,"error":"Invalid API Key"}` on every call. Generation therefore cannot be proven end-to-end today.

---

## 3. Live columns — NOT CONFIRMED, needs a probe

This is the one item that could not be closed. The evidence conflicts:

- `.smoke/columns.json` says `lessons` / `lesson_sections` / `lesson_blocks` all use **`order_index`** and have no `sort_order`. But `.smoke/02-parse-schema.mjs` generates that file **from `schema.json`** — the file `CLAUDE.md` and `supabase/migrations/README.md` both mark stale. So `columns.json` and `rpcs.json` are stale by inheritance.
- `supabase/migrations/20260207140000_lesson_blocks.sql` creates both tables with `order_index`.
- All working code uses **`sort_order`** (`LessonEditor.tsx:288,339,363`, `useQueryHooks.ts:181-182,198-199`), and `CLAUDE.md` records that the teacher panel — including section and block creation — was smoke-tested green against live on 2026-09-26.

The working code wins on evidence, but that is not good enough to write a migration and an RLS policy against. Two things must be probed live:

1. The real column list on `lessons`, `lesson_sections`, `lesson_blocks`.
2. **`check_lesson_access`** — it appears in `src/types/database.ts:803` as `(p_user_id uuid, p_lesson_id uuid) → boolean`, and in the stale `rpcs.json`, but **it is defined in no migration in this repo and called by no code**. The RLS spec depends on it. Its existence, argument names, and return type must be confirmed (`boolean` vs the `jsonb` that its sibling `check_subject_access` returns — `046_subject_access_control.sql:654` returns jsonb, so the typed `boolean` is suspect).

**Proposed probe (needs approval):** a throwaway read-only script in the scratchpad (not in `.smoke/`) doing `select=<column>&limit=1` per column and an RPC call with a nil UUID — no inserts, no updates, no deletes. It would sign in with the teacher account `.smoke/00-login.mjs` uses. Alternative: paste the output of two `information_schema` queries from the Supabase SQL editor.

---

## 4. Plan

### Migration — one file, `supabase/migrations/107_lesson_summaries.sql`

`106` is taken twice already (`106_admin_reissue_certificate.sql` and `106_email_notifications.sql`), so `107` is the next free number. Written and left for manual application. Follows the `104`/`105` house style: preflight abort block, `DROP POLICY IF EXISTS` before each `CREATE POLICY`, explicit `TO authenticated` / `TO anon`, `SECURITY DEFINER SET search_path = public` helpers, closing `NOTIFY pgrst, 'reload schema'`.

```
lesson_summaries
  id uuid pk, lesson_id uuid UNIQUE → lessons(id) ON DELETE CASCADE
  summary_ar text, summary_en text
  slides_ar jsonb, slides_en jsonb          -- [{title, bullets[]}]
  key_points_ar jsonb, key_points_en jsonb  -- see deviation below
  status text CHECK IN (draft,pending_review,approved,rejected) DEFAULT 'draft'
  source_hash text, model text
  generated_at timestamptz, generated_by uuid → profiles
  reviewed_by uuid → profiles, reviewed_at timestamptz, review_note text
  updated_at timestamptz  (trigger-maintained)
```

RLS, with a `SECURITY DEFINER` helper `is_lesson_editor(uuid)` (super_admin, **or** `subjects.teacher_id = auth.uid()`, **or** `lessons.created_by = auth.uid()` — both paths, because `057`'s own lessons policy accepts both and `LessonEditor.tsx:129` only checks `created_by`):

- `lesson_summaries_rw` — `FOR ALL TO authenticated USING/WITH CHECK (is_lesson_editor(lesson_id))`
- `lesson_summaries_select_student` — `FOR SELECT TO authenticated USING (status = 'approved' AND check_lesson_access(auth.uid(), lesson_id))`
- `REVOKE ALL ON lesson_summaries FROM anon;` — no anon grant at all.

### Generation — new action in `ai-assist`

`generate_lesson_summary`, input `{ lessonId }` only:

1. `verifyAuth` (existing), then **ownership**: read the lesson + its subject's `teacher_id` + the caller's `profiles.role` **using the caller's JWT**; reject with 403 unless subject teacher / `created_by` / super_admin. Using the caller's client rather than the service role means RLS is a second line of defence.
2. **Read the lesson content server-side** — title, sections, blocks in order. The client never supplies the text, so `source_hash` is trustworthy. Media URLs stripped; `image`/`video`/`file`/`link` contribute their titles only.
3. One Groq call, both languages, `temperature: 0.3`, `max_tokens ≈ 4000`, `response_format: {type:'json_object'}`, schema `{ ar: {summary, key_points[], slides[{title,bullets[]}]}, en: {...} }`. System prompt: summarise only from supplied content, no outside facts, age-appropriate to the lesson's stage (fetched via `subject → stage`), natural MSA for Arabic. One repair re-ask if the shape is wrong, then give up.
4. Upsert `status='draft'` with `source_hash`, `model`, `generated_at`, `generated_by`. **Never `approved`.**
5. Failures keep the existing contract (HTTP 200 + `success:false`), and the client renders a bilingual message.

Shape validated with **Zod on the client** (`src/lib/lessonSummary.ts`), and shape-checked again in the function before writing.

**`source_hash` must be computed identically on both sides**, so the canonicaliser + SHA-256 is duplicated in `supabase/functions/_shared/lessonSummary.ts` and `src/lib/lessonSummary.ts` with a keep-in-sync comment — the same convention this repo already uses for `index.css` ↔ `arcade.dart` and the email templates. Web Crypto `crypto.subtle.digest` exists in both runtimes.

### Files

| File | Change |
|---|---|
| `supabase/migrations/107_lesson_summaries.sql` | new — **written, not applied** |
| `supabase/functions/ai-assist/index.ts` | new action + ownership check + server-side content read (**not deployed** without approval) |
| `supabase/functions/_shared/lessonSummary.ts` | new — canonicaliser + hash + prompt |
| `src/lib/lessonSummary.ts` | new — mirror + Zod schemas |
| `src/types/database.ts` | `LessonSummary` interface + `Tables` entry |
| `src/lib/queryKeys.ts` | `lessons.summary(id)` |
| `src/hooks/useLessonSummary.ts` | new — query + generate/save/approve/reject via `verifiedInsert`/`verifiedUpdate` |
| `src/components/admin/lessons/LessonSummaryPanel.tsx` | new — RHF+Zod, AR/EN tabs, stale-hash banner, regenerate-confirm |
| `src/components/admin/lessons/LessonEditor.tsx` | toolbar button → `Sheet`, matching the existing Outline/Settings sheet pattern |
| `src/components/student/LessonSummaryCard.tsx` | new — approved-only, links to print + slides |
| `src/pages/student/LessonSummaryPrint.tsx` | new — `/student/lesson/:id/summary` |
| `src/pages/student/LessonSlides.tsx` | new — `/student/lesson/:id/slides` |
| `src/styles/print.css` | new — `@page`, break rules, `a[href]::after` URL printing |
| `src/pages/student/LessonPlayer.tsx` | mount the summary card |
| `src/App.tsx` | 2 routes, **top-level, outside `StudentLayout`** (nesting them under `/student` inherits the sidebar shell, which would print) |
| `CLAUDE.md` | updated at the end |

**Print specifics:** fonts via `await document.fonts.ready` + explicit `document.fonts.load('700 1rem "IBM Plex Sans Arabic"')` (already `@import`ed at `index.css:1-8`, but `@font-face` loads lazily), images via `Promise.allSettled(imgs.map(i => i.decode()))`, then `window.print()`. `break-inside: avoid` on blocks, `break-after: avoid` on headings, `dir` from `useLanguage()`. No `html-to-image` / `jsPDF`.

---

## Open decisions (blocking Phase 1)

1. **Live probe** — approval to run the read-only probe described in §3. Without it, `sort_order` vs `order_index` and `check_lesson_access`'s signature stay unconfirmed, and both go straight into the migration.

2. **One deviation from the specified column list:** the generator returns `key_points`, but the spec has nowhere to put it (`summary_*` is text, `slides_*` is the deck). Proposal: add **`key_points_ar jsonb, key_points_en jsonb`** rather than smuggle it inside the slides JSON.

3. **Two routes instead of one.** The spec asks for `/student/lesson/:id/summary` with a slide mode. Document print is portrait and slide print is `@page { size: landscape }` — one `@page` rule per document, so a single route cannot cleanly do both. Proposal: `/student/lesson/:id/slides` as a second route with a toggle button linking the two.

## Risk flagged now

**`GROQ_API_KEY` is rejected live**, so "generation produces a valid draft" is not testable until a working key is set. The work can be built, the failure path verified to render the bilingual error properly, and the Zod validation unit-tested against recorded model output — but that acceptance item will be reported as *unverified*, not passing.
