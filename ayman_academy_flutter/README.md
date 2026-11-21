# Waraq Academy — Android app

The Flutter client for [Waraq Academy](https://www.waraq.academy) (students and teachers). It talks to the same Supabase project as the web app and shares its arcade design language (`lib/brand/arcade.dart` mirrors the `--arc-*` variables in `../src/index.css`).

> The package is still named `ayman_academy_app` on purpose — renaming it would change the Android application id and break updates for installed users.

## Run

```bash
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=sb_publishable_...
flutter test
```

Flutter **3.41.6** (Dart 3.11.4). Optional defines: `WEB_APP_URL` (default `https://www.waraq.academy`), `ONESIGNAL_APP_ID` (omit to disable push).

## Release

Releases are built by CI on a `vX.Y.Z-android` tag — see [Releasing the Android app](../README.md#releasing-the-android-app). Student-facing notes go in `release_notes/X.Y.Z.md`.

## More

Architecture, conventions and the test map: [`CLAUDE.md`](CLAUDE.md).
