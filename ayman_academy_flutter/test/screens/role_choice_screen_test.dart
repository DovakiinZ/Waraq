import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/features/auth/screens/role_choice_screen.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

import '../support/harness.dart';

void main() {
  setUpAll(initTestHive);
  setUp(resetSettings);

  testWidgets('offers exactly the two roles', (tester) async {
    await pumpScreen(tester, const RoleChoiceScreen());
    await tester.pumpAndSettle();

    expect(find.text('من أنت؟'), findsOneWidget);
    expect(find.byKey(const Key('role_student')), findsOneWidget);
    expect(find.byKey(const Key('role_teacher')), findsOneWidget);
  });

  testWidgets('the student card routes to the student sign-up', (tester) async {
    final taps = <String>[];
    await pumpScreen(
      tester,
      RoleChoiceScreen(onStudent: () => taps.add('student'), onTeacher: () => taps.add('teacher')),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('role_student')));
    await tester.pumpAndSettle();
    expect(taps, ['student']);
  });

  testWidgets('the teacher card routes to the application', (tester) async {
    final taps = <String>[];
    await pumpScreen(
      tester,
      RoleChoiceScreen(onStudent: () => taps.add('student'), onTeacher: () => taps.add('teacher')),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('role_teacher')));
    await tester.pumpAndSettle();
    expect(taps, ['teacher'],
        reason: 'a teacher must not be dropped into the student form');
  });

  testWidgets('both roles are described, not just named', (tester) async {
    await pumpScreen(tester, const RoleChoiceScreen());
    await tester.pumpAndSettle();

    expect(find.textContaining('أدرس وأحتاج شرحاً'), findsOneWidget);
    expect(find.textContaining('أريد نشر موادّي'), findsOneWidget);
  });

  testWidgets('switches to English, including the role copy', (tester) async {
    final container = await pumpScreen(tester, const RoleChoiceScreen());
    await tester.pumpAndSettle();

    container.read(languageProvider.notifier).toggle();
    await tester.pumpAndSettle();

    expect(find.text('Who are you?'), findsOneWidget);
    expect(find.text('Student'), findsOneWidget);
    expect(find.text('Teacher'), findsOneWidget);
    expect(find.text('من أنت؟'), findsNothing);
  });

  testWidgets('renders in dark mode without throwing', (tester) async {
    await pumpScreen(tester, const RoleChoiceScreen(), dark: true);
    await tester.pumpAndSettle();
    expect(find.text('من أنت؟'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
