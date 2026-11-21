import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/setup/providers/setup_providers.dart';
import 'package:ayman_academy_app/features/setup/screens/setup_guide_screen.dart';
import 'package:ayman_academy_app/features/setup/widgets/setup_widgets.dart';
import 'package:ayman_academy_app/shared/services/setup_progress.dart';

import '../support/harness.dart';

/// The setup guide view, driven with fixed data in place of Supabase.
void main() {
  setUpAll(initTestHive);
  setUp(resetSettings);

  TeacherSetupData teacherData(TeacherSetupInput input, {String? latestSubjectId}) => TeacherSetupData(
        progress: teacherSetup(input),
        isPending: input.isPending,
        latestSubjectId: latestSubjectId,
      );

  const complete = TeacherSetupInput(
    isActive: true,
    bioAr: 'نبذة',
    shamcashAccountName: 'أحمد',
    shamcashAccountNumber: '0999',
    subjects: [TeacherSubjectFact(id: 's1', isActive: true)],
    lessons: [TeacherLessonFact(id: 'l1', subjectId: 's1', isPublished: true)],
    lessonIdsWithBlocks: {'l1'},
  );

  Finder actionButtons() => find.byWidgetPredicate(
        (w) => w.key is ValueKey<String> && (w.key as ValueKey<String>).value.startsWith('setup_action_'),
      );

  Future<void> pumpTeacher(WidgetTester tester, TeacherSetupData data, {bool dark = false}) async {
    await pumpScreen(
      tester,
      const SetupGuideScreen(role: SetupRole.teacher),
      dark: dark,
      overrides: [
        ...onlineOverrides,
        teacherSetupProvider.overrideWith((ref) async => data),
      ],
    );
    await tester.pumpAndSettle();
  }

  testWidgets('a new pending teacher: step 1 of 4, profile open, one button', (tester) async {
    await pumpTeacher(tester, teacherData(const TeacherSetupInput(isActive: false)));

    expect(find.text('ابدأ هنا'), findsWidgets);
    expect(find.text('الخطوة 1 من 4'), findsOneWidget);
    expect(find.textContaining('حسابك قيد المراجعة'), findsOneWidget);
    expect(find.byKey(const Key('setup_action_profile')), findsOneWidget);
    expect(actionButtons(), findsOneWidget, reason: 'exactly one open step, one primary button');
    expect(find.textContaining('يمكنك المغادرة والعودة'), findsOneWidget);
  });

  testWidgets('pending publish step explains instead of offering a button', (tester) async {
    await pumpTeacher(tester, teacherData(const TeacherSetupInput(isActive: false)));

    await tester.ensureVisible(find.byKey(const Key('setup_step_header_publish')));
    await tester.tap(find.byKey(const Key('setup_step_header_publish')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('setup_publish_blocked')), findsOneWidget);
    expect(find.textContaining('يُفتح النشر بعد موافقة الإدارة'), findsOneWidget);
    expect(find.byKey(const Key('setup_action_publish')), findsNothing);
    expect(find.byKey(const Key('setup_action_profile')), findsNothing,
        reason: 'opening one step closes the other');
  });

  testWidgets('an approved teacher gets the approved line and a publish button', (tester) async {
    await pumpTeacher(tester, teacherData(const TeacherSetupInput(isActive: true)));

    expect(find.text('حسابك معتمد.'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const Key('setup_step_header_publish')));
    await tester.tap(find.byKey(const Key('setup_step_header_publish')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('setup_action_publish')), findsOneWidget);
    expect(find.byKey(const Key('setup_publish_blocked')), findsNothing);
  });

  testWidgets('closed done steps show their summary; the current step opens', (tester) async {
    await pumpTeacher(
      tester,
      teacherData(const TeacherSetupInput(
        isActive: true,
        bioAr: 'نبذة',
        shamcashAccountName: 'أحمد',
        shamcashAccountNumber: '0999',
        subjects: [TeacherSubjectFact(id: 's1', isActive: false)],
      )),
    );

    expect(find.text('الخطوة 3 من 4'), findsOneWidget);
    expect(find.text('النبذة وحساب شام كاش: 2 من 2'), findsOneWidget);
    expect(find.text('موادك: 1'), findsOneWidget);
    expect(find.byKey(const Key('setup_action_lesson')), findsOneWidget);
  });

  testWidgets('a refetch does not re-open a step the user closed', (tester) async {
    final container = await pumpScreen(
      tester,
      const SetupGuideScreen(role: SetupRole.teacher),
      overrides: [
        ...onlineOverrides,
        teacherSetupProvider.overrideWith((ref) async => teacherData(const TeacherSetupInput(isActive: true))),
      ],
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('setup_step_header_profile')));
    await tester.pumpAndSettle();
    expect(actionButtons(), findsNothing);

    container.invalidate(teacherSetupProvider);
    await tester.pumpAndSettle();
    expect(actionButtons(), findsNothing);
  });

  testWidgets('everything done shows the done card and folds the list', (tester) async {
    await pumpTeacher(tester, teacherData(complete));

    expect(find.byKey(const Key('setup_done')), findsOneWidget);
    expect(find.text('اكتمل الإعداد'), findsOneWidget);
    expect(find.text('الخطوة 4 من 4'), findsOneWidget);
    expect(find.byKey(const Key('setup_step_profile')), findsNothing);
    expect(find.byKey(const Key('setup_done_primary')), findsOneWidget);
    expect(find.byKey(const Key('setup_done_secondary')), findsOneWidget);
  });

  testWidgets('a failed query shows a retry block', (tester) async {
    await pumpScreen(
      tester,
      const SetupGuideScreen(role: SetupRole.teacher),
      overrides: [
        ...onlineOverrides,
        teacherSetupProvider.overrideWith((ref) async => throw Exception('offline')),
      ],
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('setup_error')), findsOneWidget);
    expect(find.byKey(const Key('setup_retry')), findsOneWidget);
    expect(find.byKey(const Key('setup_step_profile')), findsNothing);
  });

  testWidgets('English and dark mode render without overflow', (tester) async {
    final container = await pumpScreen(
      tester,
      const SetupGuideScreen(role: SetupRole.teacher),
      dark: true,
      size: const Size(360, 780),
      overrides: [
        ...onlineOverrides,
        teacherSetupProvider.overrideWith((ref) async => teacherData(const TeacherSetupInput(isActive: false))),
      ],
    );
    useEnglish(container);
    await tester.pumpAndSettle();

    expect(find.text('Step 1 of 4'), findsOneWidget);
    expect(find.text('Get your profile ready for students'), findsOneWidget);
    expect(find.text('Open my profile'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  group('student', () {
    Future<void> pumpStudent(WidgetTester tester, StudentSetupInput input) async {
      final repo = FakeAuthRepository()
        ..user = testUser()
        ..profile = testProfile(stage: 'primary');
      final container = await pumpScreen(
        tester,
        const SetupGuideScreen(role: SetupRole.student),
        overrides: [
          ...onlineOverrides,
          authRepositoryProvider.overrideWithValue(repo),
          studentSetupProvider.overrideWith(
            (ref) async => StudentSetupData(progress: studentSetup(input)),
          ),
        ],
      );
      await container.read(authProvider.notifier).refreshProfile();
      await tester.pumpAndSettle();
    }

    testWidgets('a pending order: choose shows the waiting line, start is open', (tester) async {
      await pumpStudent(tester, const StudentSetupInput(orderStatuses: ['pending_payment']));

      expect(find.text('الخطوة 2 من 3'), findsOneWidget);
      expect(find.text('بانتظار تأكيد المعلّم للدفع'), findsOneWidget);
      expect(find.byKey(const Key('setup_action_start')), findsOneWidget);
      expect(actionButtons(), findsOneWidget);
    });

    testWidgets('shows the stage with a change link', (tester) async {
      await pumpStudent(tester, const StudentSetupInput());

      expect(find.text('مرحلتك: المرحلة الابتدائية'), findsOneWidget);
      expect(find.byKey(const Key('setup_change_stage')), findsOneWidget);
      expect(find.byKey(const Key('setup_action_choose')), findsOneWidget);
    });

    testWidgets('a finished lesson shows the student done card', (tester) async {
      await pumpStudent(
        tester,
        const StudentSetupInput(progress: [StudentProgressFact(lessonId: 'l1', completed: true)]),
      );

      expect(find.text('أحسنت! أكملت أول درس'), findsOneWidget);
      expect(find.text('تابع التعلّم'), findsOneWidget);
      expect(find.text('المتجر'), findsOneWidget);
    });
  });

  group('SetupDashboardCard', () {
    Future<void> pumpCard(WidgetTester tester, Future<TeacherSetupData> Function() data) async {
      await pumpScreen(
        tester,
        const Scaffold(body: SetupDashboardCard(role: SetupRole.teacher)),
        overrides: [
          ...onlineOverrides,
          teacherSetupProvider.overrideWith((ref) => data()),
        ],
      );
      await tester.pumpAndSettle();
    }

    testWidgets('shows the count, the next step and one button', (tester) async {
      await pumpCard(tester, () async => teacherData(const TeacherSetupInput(isActive: true, bioAr: 'x')));

      expect(find.text('الإعداد: 0 من 4'), findsOneWidget);
      expect(find.text('جهّز ملفك للطلاب'), findsOneWidget);
      expect(find.text('تابع الإعداد'), findsOneWidget);
    });

    testWidgets('hidden when setup is complete', (tester) async {
      await pumpCard(tester, () async => teacherData(complete));
      expect(find.byKey(const Key('setup_dashboard_card')), findsNothing);
    });

    testWidgets('hidden, not wrong, when the query fails', (tester) async {
      await pumpCard(tester, () async => throw Exception('offline'));
      expect(find.byKey(const Key('setup_dashboard_card')), findsNothing);
    });
  });
}
