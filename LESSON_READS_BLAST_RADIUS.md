---
type: note
date: 2026-09-29
project: waraq-academy-portal
status: active
tags: [security, rls, lessons, blast-radius, report-only]
---

# Locking lesson reads — blast-radius report

**Report only. No code was changed for this.** Scope: every web and Flutter read of
`lessons`, `lesson_sections`, `lesson_blocks`, what each needs, and the smallest fix.

## The current state

| Table | SELECT policy | Effective audience |
|---|---|---|
| `lessons` | `lessons_select_published` (`1000:6`) | **anon** when `is_published`, any authenticated user otherwise |
| `lesson_sections` | `sections_read_all` — `USING (true)` (`1000:27`) | **everyone, always** |
| `lesson_blocks` | `blocks_read_all` — `USING (true)` (`1000:32`, also `038:51`, `039:80`, `040:107`) | **everyone, always** |

Plus `GRANT ALL … TO anon` on all three (`050_fix_schema_cache.sql:10-12`) and
`GRANT SELECT ON ALL TABLES … TO anon` (`1001_anon_permissions.sql:13`).

**No client checks access.** `LessonPlayer.tsx`, `LessonPage.tsx` and `CoursePreview.tsx`
contain no `check_subject_access` call. RLS is the only guard and it is open, so
`GET /rest/v1/lesson_blocks?lesson_id=eq.<id>` with the public anon key returns the full
body of any paid lesson. `is_free_preview` exists on `lessons` and is the intended public
flag — nothing enforces it.

### Duplicate policies

Postgres **OR**s permissive policies, so the most permissive wins and dropping one by name
does nothing while a sibling survives. The same trap that made migration 104's profiles
lockdown fail (see `105`'s header). Candidates by name on `lesson_blocks`:
`blocks_read_all` (038, 039, 1000), `blocks_read` (040), `Public read published blocks`
(20260207140000). **Enumerate with `pg_policy` before writing the fix — do not drop by
guessed name.**

```sql
select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr
  from pg_policy
 where polrelid in ('public.lessons'::regclass,
                    'public.lesson_sections'::regclass,
                    'public.lesson_blocks'::regclass);
```

## Every read site

### Must keep working for anon / non-purchasers

| # | Site | Table | Columns needed |
|---|---|---|---|
| 1 | `useSubjectLessons` (`useQueryHooks.ts:111`) — public subject page, guest branch filters `is_published` | `lessons` | `id, title_ar/en, sort_order, duration_*, is_paid, is_free_preview, is_published` |
| 2 | `useFeaturedLessons` (`useQueryHooks.ts:549`) — landing page | `lessons` | `id, title_ar/en, summary_ar/en, duration_seconds, **preview_video_url**` |
| 3 | `useTeacherPublicProfile` (`useQueryHooks.ts:781`) — `/t/:id` | `lessons` | `id, title_ar/en, duration_*, is_paid, **preview_video_url**, subject_id` |
| 4 | `useTeacherPublicSubjects` (`useQueryHooks.ts:710`) | `lessons` | `subject_id` only (a join to derive subjects) |
| 5 | `TeacherPublicProfile.tsx:58` — free lessons by teacher | `lessons` | `*` + subject titles |
| 6 | `CoursePreview.tsx:86` — marketplace curriculum | `lessons` | `id, title_ar/en, summary_ar/en, duration_*, is_paid, is_free_preview, is_published, sort_order, video_url, preview_video_url` |
| 7 | `Lessons.tsx:303`, `useAcademyData.ts:93` — public listings | `lessons` | titles + `summary_ar/en` |
| 8 | `LessonPage.tsx` (`/lesson/:id`, public) | `lessons` + **`lesson_sections`** + **`lesson_blocks`** | full content — **this is the one that must change** |

Sites 1–7 need **titles and metadata only**. Only site 8 needs block bodies.

### Must be gated (currently are not)

| # | Site | Table | Note |
|---|---|---|---|
| 9 | `useLesson` (`useQueryHooks.ts:167`) — powers both `LessonPlayer` **and** public `LessonPage` | `lessons`, `lesson_sections`, `lesson_blocks` | one hook, two audiences — the core problem |
| 10 | Flutter `lessonDetailProvider` (`lesson_provider.dart:9`) | `lessons` + embedded sections/blocks | same shape |
| 11 | Flutter `lessonBlocksProvider` (`lesson_provider.dart:19`) | `lesson_blocks` | already filters `is_published` |
| 12 | Flutter `subjectLessonsProvider` (`subjects_provider.dart:101`) | `lessons` | metadata only |
| 13 | `useSidebarLessons` (`useQueryHooks.ts:652`) | `lessons` | metadata only, authenticated |

### Teacher/admin (unaffected — their own rows)

`TeacherLessons.tsx:92`, `TeacherSubjects.tsx:106,160`, `TeacherQuizzes.tsx:68,94`,
`LessonsManagement.tsx:129`, `LessonEditor.tsx:143,152`, Flutter
`teacher_lessons_screen.dart:14`, `lesson_editor_screen.dart:44,60`,
`teacher_dashboard_screen.dart:27`, `teacher_reviews_screen.dart:25`,
`teacher_quizzes_screen.dart:13`, `teacher_subjects_screen.dart:29`.

## Video URLs specifically

Three columns, all on `lessons`, all reachable by anon today:

- **`preview_video_url`** — genuinely public. Sites 2, 3 and 6 render it as the marketing trailer. **Must stay anon-readable.**
- **`video_url`** — the real lesson video. Read by `CoursePreview.tsx:86` (marketplace, **before purchase**) and by `useLesson`. `LessonPlayer` picks `videoBlock?.url || lesson.video_url || full_video_url || preview_video_url`. **Must be gated.** Note `CoursePreview` selects it but only renders `preview_video_url`, so gating it is a query edit, not a UX loss.
- **`full_video_url`** — legacy, same fallback chain. **Must be gated.**

Gating the row is not enough: if a lesson row stays anon-readable for its title, the video
columns ride along. That needs **column privileges**, the technique 104 used on `profiles`
(`REVOKE SELECT … FROM anon; GRANT SELECT (col, …) TO anon`). Same caveat as then:
`select('*')` then fails for anon, so sites 1–7 must list columns explicitly. **Site 5
(`TeacherPublicProfile.tsx:58`) uses `select('*')` and would break** — that file was
already converted once for exactly this reason on `profiles`.

## Smallest fix

**Three steps, in this order. Steps 1–2 are safe alone; step 3 is the breaking one.**

**1. Gate the content tables.** Replace every SELECT policy on `lesson_sections` and
`lesson_blocks` (enumerate first) with one that mirrors the `lesson_summaries` rule
already written in migration 108 — one predicate, one place to reason about:

```sql
create policy lesson_blocks_select on public.lesson_blocks
for select to authenticated
using (
  exists (
    select 1 from public.lessons l
     where l.id = lesson_blocks.lesson_id
       and l.is_published = true
       and ( l.is_free_preview = true
             or exists (select 1 from public.check_subject_access(auth.uid(), l.subject_id) a
                        where a.has_access) )
  )
);
-- plus the teacher/admin policy, and REVOKE ALL ... FROM anon.
```

Worth extracting as `public.can_read_lesson_content(uuid)` (SECURITY DEFINER, same shape as
`can_edit_lesson_summary` in 108) so the three tables and the summary share one definition.

**2. Give the public pages a titles-only path.** A `SECURITY DEFINER` RPC is better than a
view here — a view still needs its own grants and cannot take the "hide unpublished"
decision:

```sql
create function public.get_public_curriculum(p_subject_id uuid)
returns table (id uuid, title_ar text, title_en text, sort_order int,
               duration_minutes int, is_paid boolean, is_free_preview boolean,
               preview_video_url text)
language sql stable security definer set search_path = public as $$
  select l.id, l.title_ar, l.title_en, l.sort_order, l.duration_minutes,
         l.is_paid, l.is_free_preview, l.preview_video_url
    from lessons l where l.subject_id = p_subject_id and l.is_published = true
   order by l.sort_order;
$$;
grant execute on function public.get_public_curriculum(uuid) to anon, authenticated;
```

Note it returns **no `video_url`, no `full_video_url`, no block content** — that is the
whole point. Point sites 1, 6, 7 at it.

**3. Gate the video columns on `lessons`.** Column grants as above. Do this last: it is
what breaks `select('*')`.

**Client changes required:** `LessonPage.tsx` must handle an empty-blocks result with a
"purchase to view" state instead of rendering a blank lesson; `CoursePreview.tsx:86` and
`TeacherPublicProfile.tsx:58` must list columns; the Flutter `lessonDetailProvider` needs
the same empty-state handling.

**Estimated blast radius:** 3 web files, 1 Flutter file, 1 migration. The risk is not the
size — it is step 3 silently 401-ing a `select('*')` somewhere I have not found. Probe anon
reads before and after.

---

# Addendum — 2026-09-29: steps 1+2 implemented, step 3 deferred

Steps 1 and 2 are written as **`supabase/migrations/109_lock_lesson_content_reads.sql`
(not applied)** plus the client changes below. Step 3 is deferred behind an APK release.

## (a) Every Flutter `lessons` query

| File | select | Reads a video column? | Audience |
|---|---|---|---|
| `student/lessons/providers/lesson_provider.dart:10` | ~~`'*, lesson_sections(*), lesson_blocks(*)'`~~ → **`Lesson.columnsWithContent`** | yes — `video_url` via `Lesson.fromJson` | **student** |
| `student/subjects/providers/subjects_provider.dart:102` | ~~`'*'`~~ → **`Lesson.columns`** | yes — `video_url` | **student** |
| `student/subjects/providers/subjects_provider.dart:115` | `'id'` | no | student |
| `teacher/lessons/screens/teacher_lessons_screen.dart:15` | ~~`'*'`~~ → **`Lesson.columns`** | yes — `video_url` | teacher |
| `teacher/lessons/screens/lesson_editor_screen.dart:46` | ~~`'*'`~~ → **`'${Lesson.columns}, objectives_ar'`** | yes — `video_url` (it is an editable field) | teacher |
| `teacher/lessons/screens/lesson_editor_screen.dart:102` | `'sort_order'` | no | teacher |
| `teacher/dashboard/screens/teacher_dashboard_screen.dart:27` | `'id'` | no | teacher |
| `teacher/quizzes/screens/teacher_quizzes_screen.dart:14` | `'id'` | no | teacher |
| `teacher/subjects/screens/teacher_reviews_screen.dart:25` | `'id'` | no | teacher |
| `teacher/subjects/screens/teacher_subjects_screen.dart:29` | `'id'` | no | teacher |

**Four `select('*')`, two of them on student screens — all four now replaced.** The Dart
`Lesson` model reads exactly one video column, `video_url`; it never touches
`full_video_url` or `preview_video_url`. The column lists live on the model as
`Lesson.columns` / `Lesson.columnsWithContent` so there is one place to update.
`flutter analyze`: no issues. `flutter test`: 180 passed.

## (b) Why step 3 must wait for a release

Revoking from `anon` alone would be safe for Flutter — but it would not close anything
that matters, because **students are logged in**, and a logged-in non-purchaser would
still read `video_url`. Closing it means revoking from **`authenticated`**, and that is
what makes `select('*')` fail for *every* user including old APKs, which are never
removed. Hence: ship the explicit columns first, wait for adoption, then revoke.

## How a non-purchaser reaches lesson video TODAY

Three paths, and steps 1+2 close only some of them:

| Path | Before | After 109 |
|---|---|---|
| `lesson_blocks` row of type `video`, URL in `.url` | open to **anon** | **CLOSED** — blocks now require published + (free-preview OR entitled) |
| `lessons.video_url` | open to anon (published) and to every authenticated user | **STILL OPEN to authenticated.** Closed for anon only if step 3 runs |
| `lessons.full_video_url` (legacy fallback) | same | **STILL OPEN**, same |
| `lessons.preview_video_url` | open | **still open — intended**, it is the trailer |

Both storage shapes are in live use: the Flutter editor writes `lessons.video_url`, the
web block editor writes video blocks. So the exposure is genuinely reduced, not removed.

Worth stating plainly: the URL *is* the access. These point at YouTube or a Supabase
Storage object, neither of which is gated per-user — so leaking the URL leaks the video.

## What steps 1+2 DO close

- The **written body** of every paid lesson (`lesson_blocks.content_ar/en`), previously
  readable by anyone with the anon key that ships inside the APK. This was the largest
  exposure and it is fully closed.
- Section structure (`lesson_sections`).
- Video, image and file blocks' URLs, since they are block rows.
- Unpublished blocks are now editor-only even for entitled students.
- The public pages keep working via `get_public_curriculum()`, which structurally cannot
  return a body or a `video_url`.

## What they do NOT close

- `lessons.video_url` / `full_video_url` for logged-in non-purchasers — deferred step 3.
- Lesson **titles and metadata** remain public. That is intended; it is the shop window.
- `check_subject_access` is still `SECURITY DEFINER` taking any `p_student_id` (separate
  Known Issue).
- Any video URL already harvested before the fix. If that matters, the URLs must be
  rotated — locking the table does not un-leak what is already out.

## Client changes made

| File | Change |
|---|---|
| `src/pages/student/CoursePreview.tsx` | curriculum via `get_public_curriculum` RPC; no longer selects `video_url` on a pre-purchase page |
| `src/hooks/useQueryHooks.ts` (`useLessons`) | guest → RPC; signed-in → explicit column list instead of `select('*')` |
| `src/pages/TeacherPublicProfile.tsx` | explicit column list (was `select('*')`) |
| `src/types/database.ts` | `get_public_curriculum` added to the typed RPC map |
| 4 Flutter files + `shared/models/lesson.dart` | `Lesson.columns` / `columnsWithContent`; all four `select('*')` replaced |

`npx tsc -b` clean, `npm run build` passes, `flutter analyze` clean, 180 Flutter tests pass.

## What I could not verify

Everything above is read from the migrations folder, which its own README says is not a
truthful history, plus the client source. **I have not probed the live database** — that
needs your go-ahead. Two things specifically deserve a live check before anyone writes the
fix:

1. The actual `pg_policy` rows on all three tables (the `USING (true)` policies may or may
   not be the surviving ones).
2. Whether anon can in fact read `lesson_blocks` right now:
   `curl "$URL/rest/v1/lesson_blocks?select=content_ar&limit=1" -H "apikey: $ANON"` with no
   Authorization header.
