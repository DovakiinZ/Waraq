import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ayman_academy_app/brand/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_theme.dart';

/// Pulls every `BorderRadius` this theme hands out, so the "radius is 0"
/// rule can be asserted once rather than trusted across forty theme fields.
Iterable<BorderRadiusGeometry> _radii(ThemeData t) sync* {
  BorderRadiusGeometry? fromShape(ShapeBorder? s) =>
      s is RoundedRectangleBorder ? s.borderRadius : null;

  final shapes = <ShapeBorder?>[
    t.cardTheme.shape,
    t.dialogTheme.shape,
    t.chipTheme.shape,
    t.popupMenuTheme.shape,
    t.floatingActionButtonTheme.shape,
    t.listTileTheme.shape,
    t.navigationBarTheme.indicatorShape,
  ];
  for (final s in shapes) {
    final r = fromShape(s);
    if (r != null) yield r;
  }

  final inputBorders = <InputBorder?>[
    t.inputDecorationTheme.border,
    t.inputDecorationTheme.enabledBorder,
    t.inputDecorationTheme.focusedBorder,
    t.inputDecorationTheme.errorBorder,
    t.inputDecorationTheme.focusedErrorBorder,
    t.inputDecorationTheme.disabledBorder,
  ];
  for (final b in inputBorders) {
    if (b is OutlineInputBorder) yield b.borderRadius;
  }
}

void main() {
  final themes = {'light': AppTheme.light, 'dark': AppTheme.dark};

  themes.forEach((mode, theme) {
    group('$mode theme', () {
      test('registers the Arc extension so context.arc resolves', () {
        final arc = theme.extension<Arc>();
        expect(arc, isNotNull);
        expect(arc, mode == 'dark' ? Arc.dark : Arc.light);
      });

      test('every radius it hands out is zero', () {
        final radii = _radii(theme).toList();
        expect(radii, isNotEmpty, reason: 'the probe itself must find something');
        for (final r in radii) {
          expect(r, BorderRadius.zero, reason: 'radius is 0 everywhere');
        }
      });

      test('uses the bundled Arabic face and never fetches a font', () {
        expect(theme.textTheme.bodyMedium!.fontFamily, 'IBMPlexSansArabic');
        expect(theme.appBarTheme.titleTextStyle!.fontFamily, 'IBMPlexSansArabic');
      });

      test('no text style exceeds weight 700 or tracks Arabic', () {
        final styles = [
          theme.textTheme.displayLarge,
          theme.textTheme.displayMedium,
          theme.textTheme.displaySmall,
          theme.textTheme.headlineLarge,
          theme.textTheme.headlineMedium,
          theme.textTheme.bodyLarge,
          theme.textTheme.bodyMedium,
          theme.textTheme.bodySmall,
          theme.textTheme.labelLarge,
          theme.textTheme.labelMedium,
          theme.textTheme.labelSmall,
        ];
        for (final s in styles) {
          // The family ships nothing heavier than 700; w800/w900 get synthesised.
          expect(s!.fontWeight!.index, lessThanOrEqualTo(FontWeight.w700.index));
          expect(s.letterSpacing, anyOf(isNull, 0),
              reason: 'tracking breaks the joined Arabic letterforms');
        }
      });

      test('material elevation is off everywhere — depth is the hard shadow', () {
        expect(theme.appBarTheme.elevation, 0);
        expect(theme.appBarTheme.scrolledUnderElevation, 0);
        expect(theme.cardTheme.elevation, 0);
        expect(theme.dialogTheme.elevation, 0);
        expect(theme.bottomSheetTheme.elevation, 0);
        expect(theme.navigationBarTheme.elevation, 0);
        expect(theme.popupMenuTheme.elevation, 0);
        expect(theme.floatingActionButtonTheme.elevation, 0);
        expect(theme.snackBarTheme.elevation, 0);
      });

      test('borders are 2px on the surfaces that carry them', () {
        final arc = theme.extension<Arc>()!;
        final card = theme.cardTheme.shape! as RoundedRectangleBorder;
        expect(card.side.width, Arc.borderWidth);
        expect(card.side.color, arc.line);

        final input = theme.inputDecorationTheme.enabledBorder! as OutlineInputBorder;
        expect(input.borderSide.width, Arc.borderWidth);
        expect(input.borderSide.color, arc.line);

        final chip = theme.chipTheme.shape! as RoundedRectangleBorder;
        expect(chip.side.width, Arc.borderWidth);
      });

      test('the primary button fills with accent and labels with onAccent', () {
        final arc = theme.extension<Arc>()!;
        final style = theme.elevatedButtonTheme.style!;
        const pressed = <WidgetState>{};

        expect(style.backgroundColor!.resolve(pressed), arc.accent);
        expect(style.foregroundColor!.resolve(pressed), arc.onAccent);
        expect(style.foregroundColor!.resolve(pressed), isNot(Colors.white),
            reason: 'white on electric green fails contrast');
      });

      test('the selected nav destination sits on accent and takes onAccent', () {
        final arc = theme.extension<Arc>()!;
        expect(theme.navigationBarTheme.indicatorColor, arc.accent);

        final selected = theme.navigationBarTheme.iconTheme!
            .resolve({WidgetState.selected})!;
        expect(selected.color, arc.onAccent);

        final unselected = theme.navigationBarTheme.iconTheme!.resolve({})!;
        expect(unselected.color, arc.inkSoft);
      });

      test('the focused input border uses mid, not accent', () {
        final arc = theme.extension<Arc>()!;
        final focused = theme.inputDecorationTheme.focusedBorder! as OutlineInputBorder;
        expect(focused.borderSide.color, arc.mid);
        expect(focused.borderSide.color, isNot(arc.accent),
            reason: 'accent only reaches 1.9:1 on white — too weak for a focus cue');
      });

      test('errors use the danger token, not a green', () {
        final arc = theme.extension<Arc>()!;
        expect(theme.colorScheme.error, arc.danger);
        expect(theme.inputDecorationTheme.errorStyle!.color, arc.danger);
      });

      test('spinners use mid so they are actually visible', () {
        final arc = theme.extension<Arc>()!;
        expect(theme.progressIndicatorTheme.color, arc.mid);
      });

      test('the app bar is separated by a rule, not a shadow', () {
        final shape = theme.appBarTheme.shape! as Border;
        expect(shape.bottom.width, Arc.borderWidth);
        expect(shape.bottom.color, theme.extension<Arc>()!.line);
      });

      test('the scaffold paints the arcade ground', () {
        final arc = theme.extension<Arc>()!;
        expect(theme.scaffoldBackgroundColor, arc.bg);
      });
    });
  });

  test('the two themes differ where they must and agree where they should', () {
    // The accent is the one colour that does not change between modes.
    expect(AppTheme.light.extension<Arc>()!.accent,
        AppTheme.dark.extension<Arc>()!.accent);
    // Everything grounded flips.
    expect(AppTheme.light.scaffoldBackgroundColor,
        isNot(AppTheme.dark.scaffoldBackgroundColor));
    expect(AppTheme.light.brightness, Brightness.light);
    expect(AppTheme.dark.brightness, Brightness.dark);
  });

  testWidgets('context.arc falls back gracefully outside a themed app',
      (tester) async {
    // A dialog or a test can render under a bare MaterialApp with no Arc
    // registered; the getter must still draw on-brand instead of throwing.
    late Arc resolved;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(builder: (context) {
          resolved = context.arc;
          return const SizedBox.shrink();
        }),
      ),
    );
    expect(resolved, Arc.light);
  });

  testWidgets('context.arc falls back to the dark tokens under a dark app',
      (tester) async {
    late Arc resolved;
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(brightness: Brightness.dark),
        home: Builder(builder: (context) {
          resolved = context.arc;
          return const SizedBox.shrink();
        }),
      ),
    );
    expect(resolved, Arc.dark);
  });
}
