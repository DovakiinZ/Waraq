import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_theme.dart';

/// Wraps [child] in the real theme so `context.arc` resolves the way it does in
/// the app. Not the full [pumpScreen] harness: these are leaf widgets with no
/// providers and no Hive.
Future<void> pumpArcade(WidgetTester tester, Widget child, {bool dark = false}) async {
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: dark ? ThemeMode.dark : ThemeMode.light,
      home: Scaffold(body: Center(child: child)),
    ),
  );
  await tester.pump();
}

/// The decoration of the first `Container` inside [finder] that actually has a
/// `BoxDecoration`. The primitives nest a few layout Containers, so picking the
/// first decorated one is more robust than indexing.
BoxDecoration decorationOf(WidgetTester tester, Finder finder) {
  final containers = tester.widgetList<Container>(
    find.descendant(of: finder, matching: find.byType(Container)),
  );
  for (final c in containers) {
    final d = c.decoration;
    if (d is BoxDecoration) return d;
  }
  final self = tester.widget<Container>(finder);
  return self.decoration! as BoxDecoration;
}

void main() {
  group('ArcadeButton', () {
    testWidgets('fires onPressed when tapped', (tester) async {
      var taps = 0;
      await pumpArcade(tester, ArcadeButton(onPressed: () => taps++, label: 'اضغط'));

      await tester.tap(find.byType(ArcadeButton));
      await tester.pump();

      expect(taps, 1);
    });

    testWidgets('a null onPressed makes the button inert', (tester) async {
      await pumpArcade(tester, const ArcadeButton(onPressed: null, label: 'معطّل'));

      // Tapping must not throw and must not fire anything. The real assertion
      // is the shadow: a disabled arcade control sits flat on the page.
      await tester.tap(find.byType(ArcadeButton), warnIfMissed: false);
      await tester.pump();

      final d = decorationOf(tester, find.byType(AnimatedContainer));
      expect(d.boxShadow, isEmpty, reason: 'disabled drops the shadow');
    });

    testWidgets('loading blocks the tap and shows a spinner', (tester) async {
      var taps = 0;
      await pumpArcade(
        tester,
        ArcadeButton(onPressed: () => taps++, label: 'جارٍ', loading: true),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      await tester.tap(find.byType(ArcadeButton), warnIfMissed: false);
      await tester.pump();
      expect(taps, 0, reason: 'a loading button must not submit twice');
    });

    testWidgets('press pushes the button into its shadow, release restores it',
        (tester) async {
      await pumpArcade(tester, ArcadeButton(onPressed: () {}, label: 'اضغط'));
      final target = find.byType(AnimatedContainer);

      final atRest = decorationOf(tester, target);
      expect(atRest.boxShadow!.single.offset, const Offset(Arc.pressRest, Arc.pressRest));

      final gesture = await tester.startGesture(tester.getCenter(find.byType(ArcadeButton)));
      await tester.pumpAndSettle();
      expect(decorationOf(tester, target).boxShadow, isEmpty,
          reason: 'pressed: the shadow collapses');
      expect(
        tester.widget<AnimatedContainer>(target).transform,
        isNotNull,
        reason: 'pressed: the button translates into where the shadow was',
      );

      await gesture.up();
      await tester.pumpAndSettle();
      expect(decorationOf(tester, target).boxShadow!.single.offset,
          const Offset(Arc.pressRest, Arc.pressRest));
    });

    testWidgets('small buttons use the shorter throw', (tester) async {
      await pumpArcade(
        tester,
        ArcadeButton(onPressed: () {}, label: 'صغير', size: ArcadeSize.sm),
      );
      final d = decorationOf(tester, find.byType(AnimatedContainer));
      expect(d.boxShadow!.single.offset, const Offset(Arc.pressRestSm, Arc.pressRestSm));
    });

    testWidgets('solid labels its text onAccent, never white', (tester) async {
      await pumpArcade(tester, ArcadeButton(onPressed: () {}, label: 'أساسي'));

      final ctx = tester.element(find.byType(ArcadeButton));
      final arc = ctx.arc;
      final d = decorationOf(tester, find.byType(AnimatedContainer));
      expect(d.color, arc.accent);

      final label = tester.widget<Text>(find.text('أساسي'));
      expect(label.style!.color, arc.onAccent);
      expect(label.style!.color, isNot(Colors.white),
          reason: 'white on electric green fails contrast');
    });

    testWidgets('every variant renders with a 2px border and no radius',
        (tester) async {
      for (final variant in ArcadeVariant.values) {
        await pumpArcade(
          tester,
          ArcadeButton(onPressed: () {}, label: 'زر', variant: variant),
        );
        final d = decorationOf(tester, find.byType(AnimatedContainer));
        expect((d.border as Border).top.width, Arc.borderWidth, reason: '$variant');
        expect(d.borderRadius, isNull, reason: '$variant must be square');
      }
    });

    testWidgets('danger uses the one non-green colour', (tester) async {
      await pumpArcade(
        tester,
        ArcadeButton(onPressed: () {}, label: 'حذف', variant: ArcadeVariant.danger),
      );
      final arc = tester.element(find.byType(ArcadeButton)).arc;
      expect(tester.widget<Text>(find.text('حذف')).style!.color, arc.danger);
    });

    testWidgets('onDark flips its border and shadow to the light colour',
        (tester) async {
      await pumpArcade(
        tester,
        ArcadeButton(onPressed: () {}, label: 'فوق', variant: ArcadeVariant.onDark),
      );
      final arc = tester.element(find.byType(ArcadeButton)).arc;
      final d = decorationOf(tester, find.byType(AnimatedContainer));
      expect((d.border as Border).top.color, arc.onInk);
      expect(d.boxShadow!.single.color, arc.onInk);
    });

    testWidgets('renders an icon alongside the label', (tester) async {
      await pumpArcade(
        tester,
        ArcadeButton(onPressed: () {}, label: 'لغة', icon: Icons.language_rounded),
      );
      expect(find.byIcon(Icons.language_rounded), findsOneWidget);
      expect(find.text('لغة'), findsOneWidget);
    });

    testWidgets('exposes itself to accessibility as a button', (tester) async {
      await pumpArcade(tester, ArcadeButton(onPressed: () {}, label: 'متابعة'));
      final semantics = tester.getSemantics(find.byType(ArcadeButton).first);
      expect(semantics.hasFlag(SemanticsFlag.isButton), isTrue);
      expect(semantics.hasFlag(SemanticsFlag.isEnabled), isTrue);
    });

    testWidgets('works in dark mode', (tester) async {
      await pumpArcade(tester, ArcadeButton(onPressed: () {}, label: 'ليلي'), dark: true);
      final arc = tester.element(find.byType(ArcadeButton)).arc;
      expect(arc.bg, Arc.dark.bg);
      final d = decorationOf(tester, find.byType(AnimatedContainer));
      expect(d.boxShadow!.single.color, Arc.dark.shadow);
    });
  });

  group('ArcadeCard', () {
    testWidgets('has a 2px border, square corners and the hard shadow',
        (tester) async {
      await pumpArcade(tester, const ArcadeCard(child: Text('محتوى')));
      final d = decorationOf(tester, find.byType(ArcadeCard));

      expect((d.border as Border).top.width, Arc.borderWidth);
      expect(d.borderRadius, isNull);
      expect(d.boxShadow!.single.blurRadius, 0);
      expect(d.boxShadow!.single.offset, const Offset(Arc.cardRest, Arc.cardRest));
    });

    testWidgets('flat keeps the border but drops the shadow', (tester) async {
      await pumpArcade(tester, const ArcadeCard(flat: true, child: Text('مسطح')));
      final d = decorationOf(tester, find.byType(ArcadeCard));
      expect(d.boxShadow, isEmpty);
      expect(d.border, isNotNull);
    });

    testWidgets('is tappable when given onTap', (tester) async {
      var taps = 0;
      await pumpArcade(
        tester,
        ArcadeCard(onTap: () => taps++, child: const Text('اضغط البطاقة')),
      );
      await tester.tap(find.byType(ArcadeCard));
      await tester.pump();
      expect(taps, 1);
    });
  });

  group('ArcadeChip', () {
    testWidgets('filled uses the accent fill with onAccent text', (tester) async {
      await pumpArcade(tester, const ArcadeChip(label: 'مجاني', filled: true));
      final arc = tester.element(find.byType(ArcadeChip)).arc;

      expect(decorationOf(tester, find.byType(ArcadeChip)).color, arc.accent);
      expect(tester.widget<Text>(find.text('مجاني')).style!.color, arc.onAccent);
    });

    testWidgets('unfilled is transparent with an ink label', (tester) async {
      await pumpArcade(tester, const ArcadeChip(label: 'جديد'));
      final arc = tester.element(find.byType(ArcadeChip)).arc;
      expect(decorationOf(tester, find.byType(ArcadeChip)).color, Colors.transparent);
      expect(tester.widget<Text>(find.text('جديد')).style!.color, arc.ink);
    });

    testWidgets('never letter-spaces Arabic, but does track Latin', (tester) async {
      await pumpArcade(tester, const ArcadeChip(label: 'مستوى'));
      expect(tester.widget<Text>(find.text('مستوى')).style!.letterSpacing, 0,
          reason: 'tracking breaks the joined Arabic letterforms');

      await pumpArcade(tester, const ArcadeChip(label: 'LEVEL 01'));
      expect(
        tester.widget<Text>(find.text('LEVEL 01')).style!.letterSpacing,
        greaterThan(0),
      );
    });
  });

  group('ArcadeField', () {
    testWidgets('stacks label, control and hint', (tester) async {
      await pumpArcade(
        tester,
        const ArcadeField(
          label: 'البريد الإلكتروني',
          hint: '6 أحرف على الأقل',
          child: TextField(),
        ),
      );
      expect(find.text('البريد الإلكتروني'), findsOneWidget);
      expect(find.text('6 أحرف على الأقل'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('an error replaces the hint and uses the danger colour',
        (tester) async {
      await pumpArcade(
        tester,
        const ArcadeField(
          label: 'كلمة المرور',
          hint: 'تلميح',
          error: 'مطلوب',
          child: TextField(),
        ),
      );
      final arc = tester.element(find.byType(ArcadeField)).arc;

      expect(find.text('تلميح'), findsNothing,
          reason: 'the error takes the hint slot, so they never stack');
      expect(tester.widget<Text>(find.text('مطلوب')).style!.color, arc.danger);
      expect(find.byIcon(Icons.error_outline_rounded), findsOneWidget);
    });

    testWidgets('required marks the label', (tester) async {
      await pumpArcade(
        tester,
        const ArcadeField(label: 'الاسم', required: true, child: TextField()),
      );
      final rich = tester.widget<Text>(find.byType(Text).first);
      expect(rich.textSpan!.toPlainText(), contains('*'));
    });
  });

  group('ArcadeEmpty', () {
    testWidgets('shows the icon, title, subtitle and an action', (tester) async {
      var taps = 0;
      await pumpArcade(
        tester,
        ArcadeEmpty(
          icon: Icons.book_rounded,
          title: 'لا توجد مواد بعد',
          subtitle: 'تصفّح المتجر لتبدأ',
          action: ArcadeButton(onPressed: () => taps++, label: 'المتجر'),
        ),
      );

      expect(find.byIcon(Icons.book_rounded), findsOneWidget);
      expect(find.text('لا توجد مواد بعد'), findsOneWidget);
      expect(find.text('تصفّح المتجر لتبدأ'), findsOneWidget);

      await tester.tap(find.text('المتجر'));
      await tester.pump();
      expect(taps, 1, reason: 'the empty state has to be a way forward, not a dead end');
    });
  });

  group('ArcadeSkeleton and PixelDivider', () {
    testWidgets('the skeleton pulses without throwing', (tester) async {
      await pumpArcade(tester, const ArcadeSkeleton(width: 200, height: 20));
      await tester.pump(const Duration(milliseconds: 550));
      await tester.pump(const Duration(milliseconds: 550));
      expect(find.byType(ArcadeSkeleton), findsOneWidget);
      // Leaves the repeating controller running; the test framework will
      // complain about a pending timer if dispose is ever missed.
      await tester.pumpWidget(const SizedBox.shrink());
    });

    testWidgets('the pixel divider paints and stays out of the semantics tree',
        (tester) async {
      await pumpArcade(tester, const SizedBox(width: 300, child: PixelDivider()));
      expect(find.byType(PixelDivider), findsOneWidget);
      expect(
        tester.getSemantics(find.byType(PixelDivider)).label,
        isEmpty,
        reason: 'a decorative strip must not be announced',
      );
    });
  });

  group('brand lockup', () {
    testWidgets('BrandLogo renders the mark and the name as real text',
        (tester) async {
      await pumpArcade(tester, const BrandLogo(size: 40, name: 'ورق أكاديمي'));
      await tester.pumpAndSettle();

      expect(find.byType(LogoMark), findsOneWidget);
      expect(find.text('ورق أكاديمي'), findsOneWidget,
          reason: 'the wordmark is text so it can switch language and direction');
    });

    testWidgets('BrandLogo switches the wordmark with the language', (tester) async {
      await pumpArcade(tester, const BrandLogo(size: 40, name: 'Waraq Academy'));
      await tester.pumpAndSettle();
      expect(find.text('Waraq Academy'), findsOneWidget);
    });

    testWidgets('markOnly drops the wordmark', (tester) async {
      await pumpArcade(tester, const BrandLogo(size: 40, markOnly: true, name: 'ورق أكاديمي'));
      await tester.pumpAndSettle();
      expect(find.byType(LogoMark), findsOneWidget);
      expect(find.text('ورق أكاديمي'), findsNothing);
    });

    testWidgets('onDark uses the light-on-dark artwork and the on-band colour',
        (tester) async {
      await pumpArcade(tester, const BrandLogo(size: 40, onDark: true, name: 'ورق أكاديمي'));
      await tester.pumpAndSettle();

      final arc = tester.element(find.byType(BrandLogo)).arc;
      expect(tester.widget<LogoMark>(find.byType(LogoMark)).variant, MarkVariant.dark);
      expect(tester.widget<Text>(find.text('ورق أكاديمي')).style!.color, arc.onInk);
    });

    testWidgets('the plate is square and bordered', (tester) async {
      await pumpArcade(tester, const BrandLogo(size: 48, markOnly: true));
      await tester.pumpAndSettle();
      final d = decorationOf(tester, find.byType(BrandLogo));
      expect(d.borderRadius, isNull);
      expect((d.border as Border).top.width, Arc.borderWidth);
    });
  });
}
