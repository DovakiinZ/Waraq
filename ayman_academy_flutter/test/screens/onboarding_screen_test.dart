import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/onboarding/screens/student_onboarding_screen.dart';
import 'package:ayman_academy_app/shared/widgets/arcade_auth_scaffold.dart';

import '../support/harness.dart';

void main() {
  late FakeAuthRepository repo;

  setUpAll(initTestHive);

  setUp(() async {
    await resetSettings();
    repo = FakeAuthRepository();
  });

  Future<void> pumpOnboarding(WidgetTester tester, {bool dark = false}) async {
    await pumpScreen(
      tester,
      const StudentOnboardingScreen(),
      dark: dark,
      overrides: [
        ...onlineOverrides,
        authRepositoryProvider.overrideWithValue(repo),
      ],
    );
    await tester.pumpAndSettle();
  }

  testWidgets('offers all four stages', (tester) async {
    await pumpOnboarding(tester);

    expect(find.text('رياض الأطفال'), findsOneWidget);
    expect(find.text('المرحلة الابتدائية'), findsOneWidget);
    expect(find.text('المرحلة الإعدادية'), findsOneWidget);
    expect(find.text('المرحلة الثانوية'), findsOneWidget);
  });

  testWidgets('Continue starts disabled — nothing is selected yet',
      (tester) async {
    await pumpOnboarding(tester);

    final button = tester.widget<ArcadeButton>(find.byKey(const Key('onboarding_continue')));
    expect(button.onPressed, isNull,
        reason: 'the student has not picked a stage, so there is nothing to submit');
  });

  testWidgets('picking a stage enables Continue', (tester) async {
    await pumpOnboarding(tester);

    await tester.tap(find.text('المرحلة الابتدائية'));
    await tester.pumpAndSettle();

    final button = tester.widget<ArcadeButton>(find.byKey(const Key('onboarding_continue')));
    expect(button.onPressed, isNotNull);
  });

  testWidgets('a disabled Continue has no shadow, an enabled one does',
      (tester) async {
    await pumpOnboarding(tester);

    BoxDecoration buttonDecoration() {
      final containers = tester.widgetList<Container>(
        find.descendant(
          of: find.byKey(const Key('onboarding_continue')),
          matching: find.byType(Container),
        ),
      );
      for (final c in containers) {
        if (c.decoration is BoxDecoration) return c.decoration! as BoxDecoration;
      }
      throw StateError('no decorated container in the button');
    }

    expect(buttonDecoration().boxShadow, isEmpty);

    await tester.tap(find.text('المرحلة الثانوية'));
    await tester.pumpAndSettle();

    expect(buttonDecoration().boxShadow, isNotEmpty,
        reason: 'the enabled button lifts off the page');
  });

  testWidgets('selection is exclusive — picking a second stage clears the first',
      (tester) async {
    await pumpOnboarding(tester);

    await tester.tap(find.text('المرحلة الابتدائية'));
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.check_rounded), findsOneWidget);

    await tester.tap(find.text('المرحلة الإعدادية'));
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.check_rounded), findsOneWidget,
        reason: 'exactly one stage can be current');
  });

  testWidgets('every stage is selectable', (tester) async {
    await pumpOnboarding(tester);

    for (final label in [
      'رياض الأطفال',
      'المرحلة الابتدائية',
      'المرحلة الإعدادية',
      'المرحلة الثانوية',
    ]) {
      await tester.tap(find.text(label));
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.check_rounded), findsOneWidget, reason: label);
    }
  });

  testWidgets('a failing submit reports in the page and leaves the button usable',
      (tester) async {
    // Supabase is not initialised under `flutter test`, so the write throws.
    // Which error it is does not matter here; what matters is the contract:
    // the failure lands in a persistent in-page alert rather than a snackbar
    // that vanishes after four seconds, and the student can try again.
    // A snackbar here would leave them staring at a button that "did nothing".
    await pumpOnboarding(tester);

    await tester.tap(find.text('المرحلة الابتدائية'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('onboarding_continue')));
    await tester.pumpAndSettle();

    expect(find.byType(ArcadeAlert), findsOneWidget);
    expect(find.byType(SnackBar), findsNothing);

    final button = tester.widget<ArcadeButton>(find.byKey(const Key('onboarding_continue')));
    expect(button.loading, isFalse, reason: 'the spinner must clear on failure');
    expect(button.onPressed, isNotNull, reason: 'the student must be able to retry');
  });

  testWidgets('translates to English', (tester) async {
    await pumpOnboarding(tester);

    await tester.tap(find.byKey(const Key('auth_language_toggle')));
    await tester.pumpAndSettle();

    expect(find.text('Welcome!'), findsOneWidget);
    expect(find.text('Kindergarten'), findsOneWidget);
    expect(find.text('High School'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
  });

  testWidgets('renders in dark mode with the stage list intact', (tester) async {
    await pumpOnboarding(tester, dark: true);

    final arc = tester.element(find.byType(StudentOnboardingScreen)).arc;
    expect(arc.bg, Arc.dark.bg);
    expect(find.text('المرحلة الابتدائية'), findsOneWidget);
    expect(find.byKey(const Key('onboarding_continue')), findsOneWidget);
  });
}
