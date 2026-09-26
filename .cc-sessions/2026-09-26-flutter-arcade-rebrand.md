---
type: session
date: 2026-09-26
project: waraq-academy-portal
status: completed
tags: [flutter, brand, arcade, theming, testing, android]
---

# Flutter app — arcade rebrand + test suite

Brief: "read `flutter_rebrand_prompt.md` and `waraq_platform_review.md`, build the
transformation on the Flutter APK app, make the styling, and make sure all the
app works — test every button and every scenario."

## Where things stood

The brand groundwork was already done in earlier sessions: `assets/brand/` marks,
bundled IBM Plex Sans Arabic, generated launcher icons and splash,
`lib/brand/brand_colors.dart`, `MaterialApp(title: 'ورق أكاديمي')`, version
`1.1.0+110`.

What was missing was everything *visual*. `AppColors` was still the iOS-premium
palette (near-black primary, **purple `#5856D6`** accent, old gold `#AE944F`), the
login screen had a purple gradient header with a letter **"A"** for a logo, and
nothing from the web's arcade design language existed in the app. `flutter
analyze` was clean; `test/widget_test.dart` was a `1 + 1 == 2` placeholder.

## Decision taken

The rebrand prompt describes the web as "flat brutalist, deep green + paper". Since
that prompt was written the web moved to the **arcade** system (white + one green
scale, deep green `#07301F` for text/borders/shadows, electric green `#22DE7C` as
the only fill, radius 0, 2px borders, hard offset shadows). Matched the **live web
arcade theme**, because that is what the app has to sit next to.

## What was built

**Brand layer (new)**
- `lib/brand/arcade.dart` — `Arc` `ThemeExtension`, the Dart mirror of `--arc-*` in
  the web's `src/index.css` (which stays the source of truth for the hexes).
  `context.arc` resolves per-brightness, with a safe fallback outside a themed app.
- `lib/brand/widgets/` — `ArcadeButton` (4 variants, 3 sizes, press animation),
  `ArcadeCard`, `ArcadeChip`, `ArcadeField`, `ArcadeSkeleton`, `ArcadeEmpty`,
  `PixelDivider`, `DottedBorder`, `LogoMark`, `BrandLogo`, plus a barrel.
- `shared/widgets/arcade_auth_scaffold.dart` — `ArcadeAuthHeader`, `ArcadeAlert`.
- `shared/widgets/shells/arcade_drawer.dart` — `ArcadeDrawer`, `ArcadeNavBar`. The
  two shells had a byte-identical drawer; it lives in one place now.

**Theme**
- `AppColors` repointed onto the arcade palette, keeping every existing name so
  ~700 `const` call sites moved on-brand in one edit. Documented the split between
  *paired* tokens (`x`/`xDark`, picked with `isDark ?`) and *dual-safe* tokens
  (`inkMuted`, `accent`, `error`, …) which are read unguarded and so are tuned to
  clear ~4:1 on **both** grounds. `accentFill` + `onAccent` added for real fills.
- `AppTheme` rebuilt from a single `_build(Arc, Brightness)` so light and dark
  cannot drift (they were two hand-maintained copies).

**Sweep**
- All 93 hard-coded `Color(0x…)` outside the brand layer removed.
- 131 corner radii flattened to 0 across 23 files.
- Purple gradients replaced by the deep-green band on the login screen, the teacher
  dashboard, teacher subjects and the lesson editor's AI sheet.
- Circular decorative plates/badges squared (the quiz answer marker kept its
  circle-vs-square semantics: circle = pick one, square = pick many).

## Bugs found and fixed along the way

- **`context.canPop()` crashed off-router.** Register and reset-password called
  go_router's extension during `build`; it asserts when no `GoRouter` is in scope.
  Both use `Navigator` now — same answer for a pushed route, works anywhere.
- **Reset-password did nothing on an empty field** — it returned early instead of
  validating, so the button read as broken.
- **`SubjectCard` invented ratings** (`?? 4.5`) for courses nobody had reviewed.
  Stars now need 3+ ratings; below that the card reads "جديد" / "NEW".
- **`StudentLevel` was Arabic-only**, so English users saw Arabic level names.
  Added `nameEn` / `name(lang)` and `levelNumber` for the LEVEL chip.
- **Lesson callouts were unreadable in dark mode** — pale light-mode washes painted
  onto the dark ground. Each block type carries both washes now.
- **The certificate PDF was still pre-rebrand** — navy `#1E3A5F` + gold `#AE944F`
  and the English name "Ayman Educational Academy". Now the brand palette and
  "Waraq Academy". The PDF deliberately keeps rounded corners: it is a printed
  document, not app chrome.
- **`android:label` was hard-coded English** in an Arabic-first app. Now
  `@string/app_name`, with `values/` (Latin) and `values-ar/` (Arabic).

## Tests

180 tests, all passing; `flutter analyze` clean.
`test/brand/` (tokens + contrast, ThemeData invariants, every primitive),
`test/screens/` (auth, onboarding, shell chrome), `test/widgets/` (shared widgets),
`test/support/harness.dart`.

**The trap worth remembering:** `initTestHive` opens boxes with
`bytes: Uint8List(0)` — Hive's **in-memory** backend — and this is load-bearing. A
disk-backed box does real file I/O, and a `testWidgets` body runs in a fake-async
zone where real I/O futures never complete. `LanguageNotifier.toggle()` fires
`box.put(...)` without awaiting it, so that write hangs forever holding Hive's
per-box lock and the next box operation queues behind it. Symptom: the first test
that toggles the language passes, the next one times out after ten minutes with no
useful stack. Cost about 40 minutes to track down.

## Verified

- `flutter analyze` — no issues.
- `flutter test` — 180/180.
- `flutter build apk --release` — 65.8 MB, built clean.
- APK contents checked per the release policy: brand SVGs and both font faces
  packaged; the Dart snapshot contains "Waraq Academy", the Arabic name, the
  tagline, the mark path and `IBMPlexSansArabic`; it does **not** contain "Ayman
  Academy", "Ayman Educational Academy", the old Arabic name, the old navy/gold
  hexes, or any runtime font fetch; `resources.arsc` carries both launcher labels.
  (Note for future probes: Dart stores non-Latin1 literals as UTF-16, and colours
  compile to integers — grepping a snapshot for a hex string proves nothing.)

## Deliberately left alone

- Dart package `ayman_academy_app`, the `ayman_academy_flutter/` folder, Android
  `applicationId`, the `AymanAcademyApp` class name in `main.dart` — renaming any
  of them breaks imports or stops the app updating over installed versions.
- `'أ. أيمن'`, the **default certificate signer name**. That is a real person on a
  signature line, not stale branding; changing it is the owner's call.
- `pdf_service.dart` corner radii — printed document, not app chrome.

## Open / next

- **Not released.** Per the rebrand prompt's Step 7, nothing is published. A real
  release still needs `ONESIGNAL_APP_ID` (omitted from the verification build, so
  push is disabled in it) and the owner's keystore in `android/key.properties`.
- No OneSignal notification small icon (`ic_stat_onesignal_default`), so Android
  renders the coloured app icon as a white square in the status bar.
- `shimmer` is now unused in `pubspec.yaml` and can be dropped.
- The `waraq_platform_review.md` P0/P1 items (destructive migrations, quiz answers
  readable from the API, the payment path, the platform's revenue model) are
  untouched — this session was scoped to the app's styling and correctness.
