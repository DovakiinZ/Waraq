import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/teacher/application/screens/teacher_application_screen.dart';
import 'package:ayman_academy_app/shared/student_stages.dart';

import '../support/harness.dart';

void main() {
  late FakeAuthRepository repo;

  setUpAll(initTestHive);

  setUp(() async {
    await resetSettings();
    repo = FakeAuthRepository();
  });

  Future<void> pumpApply(WidgetTester tester, {bool dark = false}) async {
    await pumpScreen(
      tester,
      const TeacherApplicationScreen(),
      dark: dark,
      overrides: [
        ...onlineOverrides,
        authRepositoryProvider.overrideWithValue(repo),
      ],
    );
    await tester.pumpAndSettle();
  }

  testWidgets('asks for five things and not for a bio', (tester) async {
    await pumpApply(tester);

    expect(find.text('الاسم الكامل *'), findsOneWidget);
    expect(find.text('البريد الإلكتروني *'), findsOneWidget);
    expect(find.text('كلمة المرور *'), findsOneWidget);
    expect(find.text('رقم الهاتف *'), findsOneWidget);
    expect(find.text('المراحل التي تُدرّسها *'), findsOneWidget);

    // Bio, profession and major belong to the sandbox checklist. Asserted
    // with the same "<label> *" shape as the fields above, so a re-added
    // required field here would render the identical string and be caught.
    expect(find.text('نبذة عنك *'), findsNothing);
    expect(find.text('المهنة *'), findsNothing);
  });

  testWidgets('offers all four stages as toggles', (tester) async {
    await pumpApply(tester);

    // Labels come from kStages, so they are the app's wording, not the web's
    // four short labels.
    for (final stage in kStages) {
      expect(find.byKey(Key('apply_stage_${stage.key}')), findsOneWidget);
      expect(find.text(stage.ar), findsOneWidget);
    }
  });

  testWidgets('submit is refused until a stage is picked', (tester) async {
    await pumpApply(tester);

    await tester.enterText(find.byKey(const Key('apply_name')), 'بسام الأسد');
    await tester.enterText(find.byKey(const Key('apply_email')), 'b@example.com');
    await tester.enterText(find.byKey(const Key('apply_password')), 'password123');
    await tester.enterText(find.byKey(const Key('apply_phone')), '0912345678');

    await tester.ensureVisible(find.byKey(const Key('apply_submit')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('apply_submit')));
    await tester.pumpAndSettle();

    expect(find.text('اختر مرحلة واحدة على الأقل'), findsOneWidget);
    expect(repo.signUpCalls, isEmpty);
  });

  testWidgets('picking a stage clears the error and allows submit', (tester) async {
    repo.signUpSession = null; // confirmation-on branch: no router redirect to chase

    await pumpApply(tester);
    await tester.enterText(find.byKey(const Key('apply_name')), 'بسام الأسد');
    await tester.enterText(find.byKey(const Key('apply_email')), 'b@example.com');
    await tester.enterText(find.byKey(const Key('apply_password')), 'password123');
    await tester.enterText(find.byKey(const Key('apply_phone')), '0912345678');

    await tester.tap(find.byKey(const Key('apply_stage_primary')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const Key('apply_submit')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('apply_submit')));
    await tester.pumpAndSettle();

    expect(find.text('اختر مرحلة واحدة على الأقل'), findsNothing);
    expect(repo.signUpCalls, hasLength(1));
    expect(repo.signUpCalls.first['email'], 'b@example.com');
  });

  testWidgets('renders in dark mode', (tester) async {
    await pumpApply(tester, dark: true);
    expect(find.text('علّم معنا'), findsOneWidget);
  });
}
