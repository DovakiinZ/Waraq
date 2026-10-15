---
type: session
date: 2026-10-15
project: waraq-academy-portal
status: completed
tags: [lesson-editor, uploads, storage-rls, usability, flutter, security]
---

# Lesson authoring usability — uploads, paste-to-blocks, readiness

Brief: "what are the core features we can add to enhance usability, for Android and web?
I think there is a challenge with add lessons, it's not easy — how can we make it simple?"
Then: "start on this plan and finish what's unfinished."

## What the diagnosis actually found

The creation *flow* was not the problem — `TeacherLessons.tsx:180` needs only a subject
and an Arabic title, and blocks tolerate `section_id: null`, so sections are optional.
Five real blockers, all measured rather than assumed:

1. **No file upload in the lesson editor on either client.** `grep` for
   `upload|type="file"` across `src/components/admin/lessons/` returned nothing, and the
   Flutter editor had no `image_picker`/`file_picker`. `VideoBlock`/`ImageBlock` were URL
   text inputs. The only storage uploads in the whole codebase were a subject cover
   (`TeacherSubjects.tsx:417`) and a student avatar. A teacher with a photo of a worksheet
   on their phone could not attach it.
2. **Blank canvas with 11 block types**, each authored twice (AR + EN), no bulk path.
3. **Android was a second-class editor** — `if (widget.lessonId == null) return;` and only
   10 of the 11 types (`file` missing from the grid though the edit sheet handled it).
4. **Nothing flagged an unfinished lesson** — `PublishLessonDialog` was three toggles and
   a block count.
5. **`file` and `link` blocks rendered NOTHING to students** — `LessonContentRenderer`
   handled 9 of 11 types and the other two hit `default: return null`.

## The security finding that came first

Before building uploads I probed where they would land. The `public` bucket's UPDATE and
DELETE policies are *named* "Auth users can update/delete own uploads" but their bodies
carry **no ownership predicate** — just `bucket_id = 'public' AND auth.role() =
'authenticated'`.

Proven with `.smoke/32-storage-acl.mjs` (written this session): the **test student**
overwrote a teacher-owned object and the public URL then served the student's bytes, then
deleted it. Anon upload is correctly blocked, so the hole is *any authenticated user* —
every pupil, via the anon key inside the APK.

Third instance of the same shape in this repo: a policy whose name states a rule its body
does not enforce (`lessons_manage` with no `WITH CHECK`, 115's privilege columns).

`117_lock_public_bucket_object_acl.sql` + `117_ROLLBACK.sql` are **written and NOT
APPLIED** — the apply was blocked by the permission classifier, so it is the one thing
handed back to the user. It makes UPDATE/DELETE owner-scoped (`owner = auth.uid()`,
verified populated on all 17 live objects) with a super_admin override, narrows INSERT to
the three prefixes real code writes, and drops policies by enumerating `pg_policy`.

## Built

**Web**
- `src/lib/lessonUploads.ts` — per-kind MIME/size rules, path `lessons/<uid>/<lessonId>/…`
  (a contract: 117's INSERT policy reads segments 1 and 2).
- `components/admin/lessons/AssetUploadField.tsx` — drag-drop, picker, **Take photo** via
  `capture="environment"`, progress, preview, URL demoted to fallback.
- `src/lib/lessonImport.ts` + `ImportLessonDialog.tsx` — paste a lesson → blocks, with a
  preview before writing. Markers map to semantic types; a lone URL becomes
  video/image/link; each paragraph routed to `content_ar`/`content_en` by script.
  **Deliberately not AI** — AI is the unreliable part of this stack and this must be
  deterministic and pinnable.
- `src/lib/lessonReadiness.ts` + publish-dialog checklist. Blockers gate publishing **only
  when `is_published` is true**; Arabic-only is a warning, never a blocker.
- `LessonContentRenderer` — added `file` and `link` cases, fixed the `video` fallback to
  play uploaded clips instead of printing the URL, gave `image` a real caption and `alt`.

**Flutter**
- `features/teacher/lessons/services/lesson_upload_service.dart` + `_ImageUploadRow`
  (camera + gallery), on the **existing** `image_picker` dep — no new package.
- `file` added to the add-block grid.

## Verified

- `npx tsc -b` → 0. `npm run build` → ✓ (chunk-size warning pre-existing).
- `node --experimental-strip-types scripts/verify-lesson-import.mts` → **33/33**.
- `node --experimental-strip-types scripts/verify-lesson-readiness.mts` → **19/19**.
- `node .smoke/33-lesson-upload.mjs` → live round-trip as a real teacher: upload, public
  URL serves identical bytes with correct content-type, replace, remove.
- `flutter analyze` → no issues. `flutter test` → **211 passing**.
- `npx eslint` clean on all six new files. The two pre-existing errors in
  `BlockEditor.tsx`/`LessonContentRenderer.tsx` were confirmed pre-existing against `HEAD`;
  the `no-case-declarations` one was cleaned since the switch was being restructured, the
  repo-wide `any` left alone per CLAUDE.md.

## Still open

1. **Apply migration 117** — `node .smoke/run-sql.mjs -f supabase/migrations/117_lock_public_bucket_object_acl.sql`,
   then re-run `.smoke/32-storage-acl.mjs` (lines 2 and 4 → "blocked") and
   `.smoke/33-lesson-upload.mjs` (line 4 → "blocked").
2. **PDF upload on Android** — needs `file_picker`; `image_picker` cannot pick documents.
3. **Translate a whole lesson** in one action — per-block translate exists today.
4. Nothing was committed; no git write commands were run.

## Unanswered question from the brief

Whether teachers author primarily on phone or desktop. It did not block this work (upload
is required on both either way) but it decides what to prioritise next: a phone-first
answer wants PDF picking and offline drafts, a desktop-first one wants bulk import of a
whole course.
