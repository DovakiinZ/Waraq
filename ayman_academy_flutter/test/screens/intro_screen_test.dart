import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/features/onboarding/data/intro_prefs.dart';
import 'package:ayman_academy_app/features/onboarding/screens/intro_screen.dart';
import 'package:ayman_academy_app/features/onboarding/widgets/chalkboard.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

import '../support/harness.dart';

void main() {
  setUpAll(initTestHive);
  setUp(() async {
    await resetSettings();
    await IntroPrefs.reset();
  });

  /// The intro navigates with `context.go`, which asserts without a router in
  /// scope, so every test injects its own finish callback.
  Future<List<String>> pumpIntro(WidgetTester tester, {bool dark = false}) async {
    final calls = <String>[];
    await pumpScreen(
      tester,
      IntroScreen(onFinish: () => calls.add('finished')),
      dark: dark,
    );
    await tester.pumpAndSettle();
    return calls;
  }

  group('IntroPrefs', () {
    test('a fresh install has not seen the intro', () {
      expect(IntroPrefs.seen, isFalse);
    });

    test('markSeen sticks, so the intro shows once', () async {
      await IntroPrefs.markSeen();
      expect(IntroPrefs.seen, isTrue);
    });

    test('reset puts it back to a first run', () async {
      await IntroPrefs.markSeen();
      await IntroPrefs.reset();
      expect(IntroPrefs.seen, isFalse);
    });
  });

  group('slides', () {
    testWidgets('opens on the brand slide', (tester) async {
      await pumpIntro(tester);
      expect(find.text('ورقة بعد ورقة.. نكبر'), findsOneWidget);
      expect(find.byType(ChalkMark), findsOneWidget);
    });

    testWidgets('there are exactly four slides', (tester) async {
      await pumpIntro(tester);
      final dots = tester.widget<ChalkDots>(find.byType(ChalkDots));
      expect(dots.count, 4);
      expect(dots.active, 0);
    });

    testWidgets('Next advances, and the dot follows', (tester) async {
      await pumpIntro(tester);
      await tester.tap(find.text('التالي'));
      await tester.pumpAndSettle();

      expect(find.text('مرحلتك وحدها'), findsOneWidget);
      expect(tester.widget<ChalkDots>(find.byType(ChalkDots)).active, 1);
    });

    testWidgets('the stage slide names the four real stages', (tester) async {
      await pumpIntro(tester);
      await tester.tap(find.text('التالي'));
      await tester.pumpAndSettle();

      for (final stage in ['كتاب تمهيدي', 'ابتدائي', 'متوسط', 'ثانوي']) {
        expect(find.text(stage), findsOneWidget, reason: 'missing stage $stage');
      }
    });

    testWidgets('the last slide swaps the label and drops Skip', (tester) async {
      await pumpIntro(tester);
      for (var i = 0; i < 3; i++) {
        await tester.tap(find.text('التالي'));
        await tester.pumpAndSettle();
      }

      expect(find.text('شهادة عند الإنجاز'), findsOneWidget);
      expect(find.text('هيّا نبدأ'), findsOneWidget);
      expect(find.text('التالي'), findsNothing);
      // Skip would be a second way out of a screen that already has one.
      expect(find.text('تخطّي'), findsNothing);
    });
  });

  group('leaving the intro', () {
    testWidgets('Skip finishes and records that it was seen', (tester) async {
      final calls = await pumpIntro(tester);
      expect(IntroPrefs.seen, isFalse);

      await tester.tap(find.text('تخطّي'));
      await tester.pumpAndSettle();

      expect(calls, ['finished']);
      expect(IntroPrefs.seen, isTrue,
          reason: 'skipping must not make the intro reappear next launch');
    });

    testWidgets('finishing the last slide also records it', (tester) async {
      final calls = await pumpIntro(tester);
      for (var i = 0; i < 3; i++) {
        await tester.tap(find.text('التالي'));
        await tester.pumpAndSettle();
      }
      await tester.tap(find.text('هيّا نبدأ'));
      await tester.pumpAndSettle();

      expect(calls, ['finished']);
      expect(IntroPrefs.seen, isTrue);
    });
  });

  group('language and direction', () {
    testWidgets('English copy replaces Arabic', (tester) async {
      final container = await pumpScreen(tester, const IntroScreen());
      container.read(languageProvider.notifier).toggle();
      await tester.pumpAndSettle();

      expect(find.text('Page by page, we grow'), findsOneWidget);
      expect(find.text('ورقة بعد ورقة.. نكبر'), findsNothing);
      expect(find.text('Next'), findsOneWidget);
    });

    testWidgets('direction follows the language', (tester) async {
      final container = await pumpScreen(tester, const IntroScreen());
      await tester.pumpAndSettle();

      Directionality dirOf() => tester.widget<Directionality>(
            find.descendant(
              of: find.byType(IntroScreen),
              matching: find.byType(Directionality),
            ).first,
          );

      expect(dirOf().textDirection, TextDirection.rtl);

      container.read(languageProvider.notifier).toggle();
      await tester.pumpAndSettle();
      expect(dirOf().textDirection, TextDirection.ltr);
    });

    testWidgets('the forward arrow flips with the language', (tester) async {
      final container = await pumpScreen(tester, const IntroScreen());
      await tester.pumpAndSettle();
      // Arabic reads right-to-left, so "forward" points left.
      expect(find.byIcon(Icons.arrow_back_rounded), findsOneWidget);

      container.read(languageProvider.notifier).toggle();
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.arrow_forward_rounded), findsOneWidget);
    });
  });

  group('the board is one fixed look', () {
    testWidgets('renders on the board colour in light mode', (tester) async {
      await pumpIntro(tester);
      final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
      expect(scaffold.backgroundColor, Chalkboard.board);
    });

    testWidgets('and the same in dark mode — a board does not invert',
        (tester) async {
      await pumpIntro(tester, dark: true);
      final scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
      expect(scaffold.backgroundColor, Chalkboard.board);
    });

    testWidgets('text on the accent button is board green, never white',
        (tester) async {
      await pumpIntro(tester);
      final label = tester.widget<Text>(
        find.descendant(of: find.byType(ChalkButton), matching: find.byType(Text)),
      );
      expect(label.style?.color, Chalkboard.onAccent);
      expect(label.style?.color, isNot(Colors.white));
    });
  });
}
