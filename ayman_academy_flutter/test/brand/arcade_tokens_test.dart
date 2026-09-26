import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:ayman_academy_app/brand/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';

/// WCAG relative luminance.
double _luminance(Color c) {
  double channel(double v) {
    v = v / 255.0;
    return v <= 0.03928 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  }

  final r = channel((c.r * 255).roundToDouble());
  final g = channel((c.g * 255).roundToDouble());
  final b = channel((c.b * 255).roundToDouble());
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/// WCAG contrast ratio between two opaque colours, 1.0 to 21.0.
double contrast(Color a, Color b) {
  final la = _luminance(a);
  final lb = _luminance(b);
  final hi = math.max(la, lb);
  final lo = math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

void main() {
  // These are the rules stated in CLAUDE.md and in lib/brand/arcade.dart. They
  // are all things that look fine on a designer's screen and fail for a real
  // user, so they are asserted rather than trusted.
  group('arcade contrast rules', () {
    for (final entry in {'light': Arc.light, 'dark': Arc.dark}.entries) {
      final mode = entry.key;
      final arc = entry.value;

      test('$mode: text on accent is onAccent, and clears AA', () {
        // The single most repeated mistake in this system: white on the
        // electric green. It fails badly, which is why `onAccent` exists.
        expect(contrast(arc.onAccent, arc.accent), greaterThan(4.5),
            reason: 'onAccent must be readable on the accent fill');
        expect(contrast(const Color(0xFFFFFFFF), arc.accent), lessThan(3.0),
            reason: 'white on accent must stay obviously unusable, '
                'so nobody is tempted to reintroduce it');
      });

      test('$mode: body text clears AA on the ground and on surfaces', () {
        expect(contrast(arc.ink, arc.bg), greaterThan(4.5));
        expect(contrast(arc.ink, arc.surface), greaterThan(4.5));
        expect(contrast(arc.ink, arc.wash), greaterThan(4.5));
      });

      test('$mode: secondary text clears AA on the ground', () {
        expect(contrast(arc.inkSoft, arc.bg), greaterThan(4.5));
      });

      test('$mode: focus ring uses mid and clears the 3:1 non-text floor', () {
        // Why `mid` and not `accent`: accent only reaches ~1.9:1 on white.
        expect(contrast(arc.mid, arc.bg), greaterThan(3.0));
        expect(contrast(arc.mid, arc.surface), greaterThan(3.0));
      });

      test('$mode: borders are visible against the surfaces they enclose', () {
        expect(contrast(arc.line, arc.surface), greaterThan(3.0));
        expect(contrast(arc.line, arc.bg), greaterThan(3.0));
      });

      test('$mode: on-band text clears AA against the band and gradient', () {
        expect(contrast(arc.onInk, arc.band), greaterThan(4.5));
        for (final stop in arc.gradStops) {
          expect(contrast(arc.onInk, stop), greaterThan(4.5),
              reason: 'onInk must survive every gradient stop, not just the first');
        }
      });

      test('$mode: danger reads as an error on the ground', () {
        expect(contrast(arc.danger, arc.bg), greaterThan(4.0));
        // And it must not be a green, or it stops reading as an error at all.
        expect(arc.danger.r, greaterThan(arc.danger.g));
        expect(arc.danger.r, greaterThan(arc.danger.b));
      });
    }

    test('ink and line diverge in dark mode but coincide in light', () {
      // The rule this guards: `ink` is a TEXT colour and `line` a BORDER
      // colour. They happen to be equal in light mode, which is how they get
      // confused; in dark mode swapping them breaks the theme.
      expect(Arc.light.ink, equals(Arc.light.line));
      expect(Arc.dark.ink, isNot(equals(Arc.dark.line)));
    });

    test('band is a fill and does not invert like ink does', () {
      // `band` stays dark in both modes; `ink` flips to near-white.
      expect(_luminance(Arc.light.band), lessThan(0.1));
      expect(_luminance(Arc.dark.band), lessThan(0.1));
      expect(_luminance(Arc.dark.ink), greaterThan(0.5));
    });

    test('accent is the same electric green in both modes', () {
      expect(Arc.light.accent, equals(Arc.dark.accent));
    });
  });

  group('AppColors dual-safe tokens', () {
    // These are read unguarded from ~300 `const TextStyle(...)` sites, so each
    // has to work on the white ground AND the dark ground. A value tuned for
    // one and dropped in the other is how this palette breaks.
    const grounds = {'light': AppColors.background, 'dark': AppColors.backgroundDark};

    const dualSafeText = {
      'inkMuted': AppColors.inkMuted,
      'accent': AppColors.accent,
      'error': AppColors.error,
      'success': AppColors.success,
      'warning': AppColors.warning,
      'info': AppColors.info,
    };

    dualSafeText.forEach((name, colour) {
      for (final ground in grounds.entries) {
        test('$name is legible on the ${ground.key} ground', () {
          expect(contrast(colour, ground.value), greaterThan(3.5),
              reason: '$name is read without an isDark guard, so it must hold '
                  'up on both grounds');
        });
      }
    });

    test('gold clears the 3:1 non-text floor (it colours star icons)', () {
      for (final ground in grounds.values) {
        expect(contrast(AppColors.gold, ground), greaterThan(3.0));
      }
    });

    test('accentFill is a FILL only — it must fail as text on white', () {
      // Documents the reason `accent` and `accentFill` are different tokens.
      expect(contrast(AppColors.accentFill, AppColors.background), lessThan(3.0));
      expect(contrast(AppColors.onAccent, AppColors.accentFill), greaterThan(4.5));
    });

    test('paired tokens are legible on their own ground', () {
      expect(contrast(AppColors.ink, AppColors.background), greaterThan(4.5));
      expect(contrast(AppColors.inkDark, AppColors.backgroundDark), greaterThan(4.5));
      expect(contrast(AppColors.inkSecondary, AppColors.background), greaterThan(4.5));
      expect(contrast(AppColors.inkSecondaryDark, AppColors.backgroundDark), greaterThan(4.5));
    });

    test('lesson block washes keep block text readable in both modes', () {
      const pairs = {
        'tip': [AppColors.tipBackground, AppColors.tipBackgroundDark],
        'warning': [AppColors.warningBackground, AppColors.warningBackgroundDark],
        'example': [AppColors.exampleBackground, AppColors.exampleBackgroundDark],
        'exercise': [AppColors.exerciseBackground, AppColors.exerciseBackgroundDark],
        'equation': [AppColors.equationBackground, AppColors.equationBackgroundDark],
        'qa': [AppColors.qaBackground, AppColors.qaBackgroundDark],
      };
      pairs.forEach((name, wash) {
        expect(contrast(Arc.light.ink, wash[0]), greaterThan(4.5),
            reason: '$name light wash');
        expect(contrast(Arc.dark.ink, wash[1]), greaterThan(4.5),
            reason: '$name dark wash');
      });
    });

    test('stage accents are distinguishable from each other', () {
      const stages = [
        AppColors.stageKindergarten,
        AppColors.stagePrimary,
        AppColors.stageMiddle,
        AppColors.stageSecondary,
      ];
      for (var i = 0; i < stages.length; i++) {
        for (var j = i + 1; j < stages.length; j++) {
          expect(stages[i], isNot(equals(stages[j])));
        }
      }
      // And each has to survive being an icon on white.
      for (final s in stages) {
        expect(contrast(s, AppColors.background), greaterThan(3.0));
      }
    });
  });

  group('arcade geometry', () {
    test('radius is zero and borders are 2px', () {
      expect(Arc.radius, 0);
      expect(Arc.borderWidth, 2);
    });

    test('hard() is an offset shadow with no blur, down and to the right', () {
      final shadows = Arc.light.hard(5);
      expect(shadows, hasLength(1));
      expect(shadows.single.blurRadius, 0, reason: 'the arcade shadow never blurs');
      expect(shadows.single.offset, const Offset(5, 5));
      expect(shadows.single.color, Arc.light.shadow);
    });

    test('hard(0) produces no shadow at all', () {
      expect(Arc.light.hard(0), isEmpty);
    });

    test('lerp interpolates every channel without throwing', () {
      final mid = Arc.light.lerp(Arc.dark, 0.5);
      expect(mid.gradStops, hasLength(Arc.light.gradStops.length));
      expect(mid.ink, isNot(equals(Arc.light.ink)));
    });

    test('copyWith replaces only what it is given', () {
      final tweaked = Arc.light.copyWith(accent: const Color(0xFF123456));
      expect(tweaked.accent, const Color(0xFF123456));
      expect(tweaked.ink, Arc.light.ink);
    });
  });
}
