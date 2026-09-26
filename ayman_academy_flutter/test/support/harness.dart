import 'dart:io';
import 'dart:typed_data';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive_flutter/hive_flutter.dart';
// Prefixed: gotrue also exports an `AuthState`, and this file needs both it
// (for the auth-event stream) and the app's own `AuthState` (for the notifier).
import 'package:supabase_flutter/supabase_flutter.dart' as sb;

import 'package:ayman_academy_app/core/theme/app_theme.dart';
import 'package:ayman_academy_app/features/auth/data/auth_repository.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/models/profile.dart';
import 'package:ayman_academy_app/shared/providers/connectivity_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

/// Shared setup for the widget tests.
///
/// Three things stand between a screen and a widget test in this app, and this
/// file removes all three:
///
///  1. `languageProvider` and `themeProvider` read `Hive.box('settings')` in
///     their constructors, so Hive has to be open before the first `pump`.
///     [initTestHive] uses `Hive.init` with a temp directory rather than
///     `initFlutter`, which would need the `path_provider` platform channel.
///  2. `authProvider` builds a real [AuthRepository], which touches the
///     Supabase singleton. [FakeAuthRepository] stands in and lets a test drive
///     sign-in success, failure and latency.
///  3. Screens wrap themselves in `Directionality` from the language provider
///     but still need `MaterialApp`'s localisations for tooltips and the
///     back-button label.
///
/// `NotificationService` needs no stub: every method early-returns when
/// `ONESIGNAL_APP_ID` is empty, which it always is under `flutter test`.
Future<void> initTestHive() async {
  TestWidgetsFlutterBinding.ensureInitialized();
  final dir = await Directory.systemTemp.createTemp('waraq_test_hive');
  Hive.init(dir.path);
  for (final name in ['settings', 'subjects_cache', 'lessons_cache', 'progress_cache']) {
    if (!Hive.isBoxOpen(name)) {
      // `bytes:` selects Hive's in-memory backend. This is not a tidiness
      // preference — it is required for the tests to terminate.
      //
      // A disk-backed box does real file I/O, and a `testWidgets` body runs in
      // a fake-async zone where real I/O futures never complete. `toggle()`
      // fires `box.put(...)` without awaiting it, so the write hangs pending
      // forever while holding Hive's per-box lock; the *next* box operation
      // (the `clear()` in [resetSettings]) then queues behind it and the suite
      // stalls for the full ten-minute test timeout.
      //
      // Symptom, if this ever regresses: the first test that toggles the
      // language passes, and the one after it times out with no useful stack.
      await Hive.openBox(name, bytes: Uint8List(0));
    }
  }
}

/// Resets persisted settings between tests so one test's language or theme
/// toggle cannot leak into the next.
Future<void> resetSettings() async {
  await Hive.box('settings').clear();
}

/// An [AuthRepository] that never talks to Supabase.
///
/// Defaults to a signed-out user with no auth events. Set [signInError] to make
/// `signIn` throw, or [delay] to hold a call open so a test can observe the
/// loading state.
class FakeAuthRepository implements AuthRepository {
  Object? signInError;
  Object? signUpError;
  Object? resetError;
  Duration delay;

  /// Records what the screen actually submitted, so a test can assert that the
  /// email was trimmed and the right password was sent.
  final List<List<String>> signInCalls = [];
  final List<Map<String, String>> signUpCalls = [];
  final List<String> resetCalls = [];
  int signOutCalls = 0;

  FakeAuthRepository({this.delay = Duration.zero});

  Future<void> _wait() async {
    if (delay > Duration.zero) await Future<void>.delayed(delay);
  }

  @override
  Future<sb.AuthResponse> signIn(String email, String password) async {
    signInCalls.add([email, password]);
    await _wait();
    if (signInError != null) throw signInError!;
    // No user on the response, so `AuthNotifier.signIn` raises
    // ProfileMissingException rather than trying to fetch a profile. That is
    // the realistic "credentials fine, profile missing" path and it keeps the
    // fake from having to fabricate a Supabase `User`.
    return sb.AuthResponse();
  }

  @override
  Future<sb.AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    signUpCalls.add({'email': email, 'password': password, 'fullName': fullName});
    await _wait();
    if (signUpError != null) throw signUpError!;
    return sb.AuthResponse();
  }

  @override
  Future<void> signOut() async {
    signOutCalls++;
    await _wait();
  }

  @override
  Future<void> resetPassword(String email) async {
    resetCalls.add(email);
    await _wait();
    if (resetError != null) throw resetError!;
  }

  @override
  Future<Profile?> fetchProfile(String userId) async => null;

  @override
  sb.User? get currentUser => null;

  @override
  sb.Session? get currentSession => null;

  @override
  Stream<sb.AuthState> get authStateChanges => const Stream<sb.AuthState>.empty();
}

/// A profile for screens that render one (the shells, the drawer).
Profile testProfile({
  String role = 'student',
  String name = 'سارة أحمد',
  String email = 'sara@example.com',
  String? stage = 'primary',
}) {
  return Profile(
    id: 'test-user',
    email: email,
    fullName: name,
    role: role,
    studentStage: stage,
    createdAt: '2026-01-01T00:00:00Z',
  );
}

/// An [AuthNotifier] parked in a fixed state, for screens that read
/// `auth.profile` but never call an auth method.
class StubAuthNotifier extends AuthNotifier {
  StubAuthNotifier(super.repo, AuthState initial) {
    state = initial;
  }
}

/// Pumps [child] inside the real app theme, Riverpod and localisations.
///
/// [dark] flips the theme so a test can assert the same screen in both modes —
/// dark-mode contrast is exactly where this app's colour bugs used to hide.
Future<ProviderContainer> pumpScreen(
  WidgetTester tester,
  Widget child, {
  bool dark = false,
  List<Override> overrides = const [],
  Size size = const Size(420, 900),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  final container = ProviderContainer(overrides: overrides);
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        locale: const Locale('ar'),
        supportedLocales: const [Locale('ar'), Locale('en')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: child,
      ),
    ),
  );
  await tester.pump();
  return container;
}

/// Overrides that keep the connectivity banner out of the way. The banner
/// renders above the navigator and would otherwise shift every hit-test
/// coordinate in a test that happens to start offline.
List<Override> get onlineOverrides => [
      connectivityProvider.overrideWith(
        (ref) => Stream.value(const [ConnectivityResult.wifi]),
      ),
    ];

/// Switches the language provider to English for the bilingual assertions.
void useEnglish(ProviderContainer container) {
  container.read(languageProvider.notifier).setLanguage('en');
}
