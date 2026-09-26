import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/auth/screens/admin_web_only_screen.dart';
import 'package:ayman_academy_app/features/auth/screens/login_screen.dart';
import 'package:ayman_academy_app/features/auth/screens/register_screen.dart';
import 'package:ayman_academy_app/features/auth/screens/reset_password_screen.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/arcade_auth_scaffold.dart';

import '../support/harness.dart';

void main() {
  late FakeAuthRepository repo;

  setUpAll(initTestHive);

  setUp(() async {
    await resetSettings();
    repo = FakeAuthRepository();
  });

  List<Override> authOverride() => [
        ...onlineOverrides,
        authRepositoryProvider.overrideWithValue(repo),
      ];

  // ════════════════════════════════════════════════════════════
  //  LOGIN
  // ════════════════════════════════════════════════════════════
  group('LoginScreen', () {
    Future<ProviderContainer> pumpLogin(WidgetTester tester, {bool dark = false}) =>
        pumpScreen(tester, const LoginScreen(), dark: dark, overrides: authOverride());

    testWidgets('renders the brand band, both fields and both buttons',
        (tester) async {
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      expect(find.byType(ArcadeAuthHeader), findsOneWidget);
      expect(find.text('ورق أكاديمي'), findsOneWidget);
      expect(find.byKey(const Key('login_email')), findsOneWidget);
      expect(find.byKey(const Key('login_password')), findsOneWidget);
      expect(find.byKey(const Key('login_submit')), findsOneWidget);
      expect(find.byKey(const Key('login_go_register')), findsOneWidget);
    });

    testWidgets('submitting an empty form shows both required errors and does '
        'not call the repository', (tester) async {
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pumpAndSettle();

      expect(find.text('مطلوب'), findsNWidgets(2));
      expect(repo.signInCalls, isEmpty, reason: 'validation must run first');
    });

    testWidgets('rejects a malformed email', (tester) async {
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('login_email')), 'not-an-email');
      await tester.enterText(find.byKey(const Key('login_password')), 'secret123');
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pumpAndSettle();

      expect(find.text('بريد إلكتروني غير صالح'), findsOneWidget);
      expect(repo.signInCalls, isEmpty);
    });

    testWidgets('rejects a short password', (tester) async {
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('login_email')), 'a@b.com');
      await tester.enterText(find.byKey(const Key('login_password')), '123');
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pumpAndSettle();

      expect(find.text('6 أحرف على الأقل'), findsOneWidget);
      expect(repo.signInCalls, isEmpty);
    });

    testWidgets('a valid form submits the trimmed email and the password',
        (tester) async {
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('login_email')), '  sara@example.com  ');
      await tester.enterText(find.byKey(const Key('login_password')), 'secret123');
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pumpAndSettle();

      expect(repo.signInCalls.single, ['sara@example.com', 'secret123']);
    });

    testWidgets('a failed sign-in surfaces the message in an alert',
        (tester) async {
      repo.signInError = Exception('AuthException(message: Invalid credentials)');
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('login_email')), 'a@b.com');
      await tester.enterText(find.byKey(const Key('login_password')), 'secret123');
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pumpAndSettle();

      expect(find.byType(ArcadeAlert), findsOneWidget);
      expect(find.textContaining('Invalid credentials'), findsOneWidget);
    });

    testWidgets('shows a spinner while in flight and blocks a second submit',
        (tester) async {
      repo.delay = const Duration(milliseconds: 300);
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('login_email')), 'a@b.com');
      await tester.enterText(find.byKey(const Key('login_password')), 'secret123');
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsWidgets);

      // A second tap while loading must not fire another request. This is the
      // bug that produces duplicate sign-ups on a slow connection.
      await tester.tap(find.byKey(const Key('login_submit')), warnIfMissed: false);
      await tester.pump();
      expect(repo.signInCalls, hasLength(1));

      await tester.pumpAndSettle();
    });

    testWidgets('the eye button toggles password visibility both ways',
        (tester) async {
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      TextField field() => tester.widget<TextField>(
            find.descendant(
              of: find.byKey(const Key('login_password')),
              matching: find.byType(TextField),
            ),
          );

      expect(field().obscureText, isTrue);

      await tester.tap(find.byKey(const Key('login_toggle_password')));
      await tester.pumpAndSettle();
      expect(field().obscureText, isFalse);

      await tester.tap(find.byKey(const Key('login_toggle_password')));
      await tester.pumpAndSettle();
      expect(field().obscureText, isTrue);
    });

    testWidgets('the language toggle flips the whole screen to English and back',
        (tester) async {
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      expect(find.text('تسجيل الدخول'), findsWidgets);

      await tester.tap(find.byKey(const Key('auth_language_toggle')));
      await tester.pumpAndSettle();

      expect(find.text('Sign In'), findsWidgets);
      expect(find.text('Waraq Academy'), findsOneWidget);
      expect(find.text('Create new account'), findsOneWidget);

      await tester.tap(find.byKey(const Key('auth_language_toggle')));
      await tester.pumpAndSettle();
      expect(find.text('تسجيل الدخول'), findsWidgets);
    });

    testWidgets('lays out RTL in Arabic and LTR in English', (tester) async {
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      Directionality dir() => tester.widget<Directionality>(
            find.descendant(
              of: find.byType(LoginScreen),
              matching: find.byType(Directionality),
            ).first,
          );

      expect(dir().textDirection, TextDirection.rtl);

      await tester.tap(find.byKey(const Key('auth_language_toggle')));
      await tester.pumpAndSettle();
      expect(dir().textDirection, TextDirection.ltr);
    });

    testWidgets('renders in dark mode without losing the form', (tester) async {
      await pumpLogin(tester, dark: true);
      await tester.pumpAndSettle();

      final arc = tester.element(find.byType(LoginScreen)).arc;
      expect(arc.bg, Arc.dark.bg);
      expect(find.byKey(const Key('login_submit')), findsOneWidget);
      expect(find.byKey(const Key('login_email')), findsOneWidget);
    });

    testWidgets('has a route out to reset-password and to register',
        (tester) async {
      await pumpLogin(tester);
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('login_forgot')), findsOneWidget);
      expect(find.byKey(const Key('login_go_register')), findsOneWidget);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  REGISTER
  // ════════════════════════════════════════════════════════════
  group('RegisterScreen', () {
    Future<ProviderContainer> pumpRegister(WidgetTester tester, {bool dark = false}) =>
        pumpScreen(tester, const RegisterScreen(), dark: dark, overrides: authOverride());

    testWidgets('renders all four fields and the submit button', (tester) async {
      await pumpRegister(tester);
      await tester.pumpAndSettle();

      for (final k in ['register_name', 'register_email', 'register_password', 'register_confirm']) {
        expect(find.byKey(Key(k)), findsOneWidget, reason: k);
      }
      expect(find.byKey(const Key('register_submit')), findsOneWidget);
    });

    testWidgets('an empty form reports every required field', (tester) async {
      await pumpRegister(tester);
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('register_submit')));
      await tester.pumpAndSettle();

      expect(find.text('مطلوب'), findsNWidgets(4));
      expect(repo.signUpCalls, isEmpty);
    });

    testWidgets('mismatched passwords are caught before submit', (tester) async {
      await pumpRegister(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('register_name')), 'سارة');
      await tester.enterText(find.byKey(const Key('register_email')), 'sara@example.com');
      await tester.enterText(find.byKey(const Key('register_password')), 'secret123');
      await tester.enterText(find.byKey(const Key('register_confirm')), 'different');
      await tester.tap(find.byKey(const Key('register_submit')));
      await tester.pumpAndSettle();

      expect(find.text('كلمة المرور غير متطابقة'), findsOneWidget);
      expect(repo.signUpCalls, isEmpty);
    });

    testWidgets('an empty confirmation says "required", not "mismatch"',
        (tester) async {
      // The old validator compared against the password first, so leaving the
      // field blank produced "passwords do not match" — a confusing message
      // for a field the user simply had not filled in.
      await pumpRegister(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('register_name')), 'سارة');
      await tester.enterText(find.byKey(const Key('register_email')), 'sara@example.com');
      await tester.enterText(find.byKey(const Key('register_password')), 'secret123');
      await tester.tap(find.byKey(const Key('register_submit')));
      await tester.pumpAndSettle();

      expect(find.text('كلمة المرور غير متطابقة'), findsNothing);
      expect(find.text('مطلوب'), findsOneWidget);
    });

    testWidgets('a valid form submits the trimmed name and email',
        (tester) async {
      await pumpRegister(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('register_name')), '  سارة أحمد  ');
      await tester.enterText(find.byKey(const Key('register_email')), '  sara@example.com ');
      await tester.enterText(find.byKey(const Key('register_password')), 'secret123');
      await tester.enterText(find.byKey(const Key('register_confirm')), 'secret123');
      await tester.tap(find.byKey(const Key('register_submit')));
      await tester.pumpAndSettle();

      expect(repo.signUpCalls.single, {
        'email': 'sara@example.com',
        'password': 'secret123',
        'fullName': 'سارة أحمد',
      });
    });

    testWidgets('success swaps the form for the confirmation panel',
        (tester) async {
      await pumpRegister(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('register_name')), 'سارة');
      await tester.enterText(find.byKey(const Key('register_email')), 'sara@example.com');
      await tester.enterText(find.byKey(const Key('register_password')), 'secret123');
      await tester.enterText(find.byKey(const Key('register_confirm')), 'secret123');
      await tester.tap(find.byKey(const Key('register_submit')));
      await tester.pumpAndSettle();

      expect(find.text('تم إنشاء الحساب بنجاح!'), findsOneWidget);
      expect(find.byKey(const Key('register_name')), findsNothing);
      expect(find.byKey(const Key('register_success_login')), findsOneWidget);
    });

    testWidgets('a failed sign-up surfaces an alert and keeps the form',
        (tester) async {
      repo.signUpError = Exception('Email already registered');
      await pumpRegister(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('register_name')), 'سارة');
      await tester.enterText(find.byKey(const Key('register_email')), 'sara@example.com');
      await tester.enterText(find.byKey(const Key('register_password')), 'secret123');
      await tester.enterText(find.byKey(const Key('register_confirm')), 'secret123');
      await tester.tap(find.byKey(const Key('register_submit')));
      await tester.pumpAndSettle();

      expect(find.byType(ArcadeAlert), findsOneWidget);
      expect(find.byKey(const Key('register_name')), findsOneWidget,
          reason: 'the user must not lose what they typed');
    });

    testWidgets('both eye buttons toggle independently', (tester) async {
      await pumpRegister(tester);
      await tester.pumpAndSettle();

      TextField field(String key) => tester.widget<TextField>(
            find.descendant(of: find.byKey(Key(key)), matching: find.byType(TextField)),
          );

      expect(field('register_password').obscureText, isTrue);
      expect(field('register_confirm').obscureText, isTrue);

      await tester.tap(find.byKey(const Key('register_toggle_password')));
      await tester.pumpAndSettle();
      expect(field('register_password').obscureText, isFalse);
      expect(field('register_confirm').obscureText, isTrue,
          reason: 'the two fields must not share one toggle');

      await tester.tap(find.byKey(const Key('register_toggle_confirm')));
      await tester.pumpAndSettle();
      expect(field('register_confirm').obscureText, isFalse);
    });

    testWidgets('translates to English', (tester) async {
      await pumpRegister(tester);
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('auth_language_toggle')));
      await tester.pumpAndSettle();

      expect(find.text('Create account'), findsWidgets);
      // `ArcadeField` renders a required label as `Text.rich` so it can append
      // the asterisk, so the plain text carries the marker too.
      expect(find.textContaining('Full name'), findsOneWidget);
      expect(find.textContaining('Confirm password'), findsOneWidget);
    });

    testWidgets('renders in dark mode', (tester) async {
      await pumpRegister(tester, dark: true);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('register_submit')), findsOneWidget);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  RESET PASSWORD
  // ════════════════════════════════════════════════════════════
  group('ResetPasswordScreen', () {
    Future<ProviderContainer> pumpReset(WidgetTester tester, {bool dark = false}) =>
        pumpScreen(tester, const ResetPasswordScreen(), dark: dark, overrides: authOverride());

    testWidgets('an empty submit reports "required" rather than doing nothing',
        (tester) async {
      // Regression: the old screen returned early on an empty field, so the
      // button looked broken.
      await pumpReset(tester);
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('reset_submit')));
      await tester.pumpAndSettle();

      expect(find.text('مطلوب'), findsOneWidget);
      expect(repo.resetCalls, isEmpty);
    });

    testWidgets('rejects a malformed email', (tester) async {
      await pumpReset(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('reset_email')), 'nope');
      await tester.tap(find.byKey(const Key('reset_submit')));
      await tester.pumpAndSettle();

      expect(find.text('بريد إلكتروني غير صالح'), findsOneWidget);
      expect(repo.resetCalls, isEmpty);
    });

    testWidgets('sends the link and echoes the address back', (tester) async {
      await pumpReset(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('reset_email')), ' sara@example.com ');
      await tester.tap(find.byKey(const Key('reset_submit')));
      await tester.pumpAndSettle();

      expect(repo.resetCalls.single, 'sara@example.com');
      expect(find.text('تم إرسال رابط الاستعادة'), findsOneWidget);
      expect(find.textContaining('sara@example.com'), findsOneWidget,
          reason: 'a typo the user cannot see is the usual cause of '
              '"the email never arrived"');
    });

    testWidgets('"try again" returns to the form', (tester) async {
      await pumpReset(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('reset_email')), 'sara@example.com');
      await tester.tap(find.byKey(const Key('reset_submit')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('reset_email')), findsNothing);

      await tester.tap(find.byKey(const Key('reset_resend')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('reset_email')), findsOneWidget);
    });

    testWidgets('a failure shows an alert and keeps the form', (tester) async {
      repo.resetError = Exception('Rate limited');
      await pumpReset(tester);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('reset_email')), 'sara@example.com');
      await tester.tap(find.byKey(const Key('reset_submit')));
      await tester.pumpAndSettle();

      expect(find.byType(ArcadeAlert), findsOneWidget);
      expect(find.byKey(const Key('reset_email')), findsOneWidget);
    });

    testWidgets('renders in dark mode', (tester) async {
      await pumpReset(tester, dark: true);
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('reset_submit')), findsOneWidget);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  ADMIN WEB-ONLY
  // ════════════════════════════════════════════════════════════
  group('AdminWebOnlyScreen', () {
    testWidgets('offers the browser hand-off and a sign-out', (tester) async {
      await pumpScreen(tester, const AdminWebOnlyScreen(), overrides: authOverride());
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('admin_open_browser')), findsOneWidget);
      expect(find.byKey(const Key('admin_sign_out')), findsOneWidget);
      expect(find.text('لوحة الإدارة'), findsOneWidget);
    });

    testWidgets('sign-out is styled as destructive, not as another nav option',
        (tester) async {
      await pumpScreen(tester, const AdminWebOnlyScreen(), overrides: authOverride());
      await tester.pumpAndSettle();

      final button = tester.widget<ArcadeButton>(find.byKey(const Key('admin_sign_out')));
      expect(button.variant, ArcadeVariant.danger);
    });

    testWidgets('sign-out reaches the repository', (tester) async {
      final container = await pumpScreen(
        tester,
        const AdminWebOnlyScreen(),
        overrides: authOverride(),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('admin_sign_out')));
      await tester.pumpAndSettle();

      expect(repo.signOutCalls, 1);
      expect(container.read(authProvider).status, AuthStatus.unauthenticated);
    });

    testWidgets('translates to English', (tester) async {
      final container = await pumpScreen(
        tester,
        const AdminWebOnlyScreen(),
        overrides: authOverride(),
      );
      useEnglish(container);
      await tester.pumpWidget(const SizedBox.shrink());
      await pumpScreen(tester, const AdminWebOnlyScreen(), overrides: authOverride());
      await tester.pumpAndSettle();
      // Language is persisted in Hive, so the freshly pumped screen picks it up.
      expect(find.text('Admin Panel'), findsOneWidget);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  LANGUAGE PERSISTENCE
  // ════════════════════════════════════════════════════════════
  testWidgets('the language choice survives a screen rebuild', (tester) async {
    final container = await pumpScreen(
      tester,
      const LoginScreen(),
      overrides: authOverride(),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('auth_language_toggle')));
    await tester.pumpAndSettle();
    expect(container.read(languageProvider).languageCode, 'en');

    // A fresh container reads the persisted value back out of Hive.
    await pumpScreen(tester, const LoginScreen(), overrides: authOverride());
    await tester.pumpAndSettle();
    expect(find.text('Sign In'), findsWidgets);
  });
}
