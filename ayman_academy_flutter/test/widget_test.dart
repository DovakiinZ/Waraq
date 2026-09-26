import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'package:ayman_academy_app/brand/brand_colors.dart';
import 'package:ayman_academy_app/core/theme/app_theme.dart';

/// Smoke tests for the brand wiring.
///
/// The detailed suites live next door:
///   * `test/brand/arcade_tokens_test.dart`  — palette and contrast rules
///   * `test/brand/app_theme_test.dart`      — ThemeData invariants
///   * `test/brand/arcade_widgets_test.dart` — the arcade primitives
///   * `test/screens/`                       — auth, onboarding, shell chrome
///   * `test/widgets/`                       — the shared widgets
void main() {
  test('the brand strings carry the Waraq identity', () {
    expect(BrandStrings.nameAr, 'ورق أكاديمي');
    expect(BrandStrings.nameEn, 'Waraq Academy');
    expect(BrandStrings.taglineAr, 'ورقة بعد ورقة.. نكبر');
    expect(BrandStrings.taglineEn, 'Page by page, we grow.');
  });

  test('both themes build without throwing', () {
    expect(AppTheme.light, isA<ThemeData>());
    expect(AppTheme.dark, isA<ThemeData>());
  });

  testWidgets('every brand SVG declared in pubspec actually loads',
      (tester) async {
    // A missing or misnamed asset fails silently at runtime — the mark simply
    // does not draw — so it is worth failing loudly here instead.
    for (final asset in [
      'assets/brand/mark.svg',
      'assets/brand/mark-on-dark.svg',
      'assets/brand/app-icon.svg',
    ]) {
      await tester.pumpWidget(
        MaterialApp(home: Center(child: SvgPicture.asset(asset, width: 40, height: 40))),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: asset);
    }
  });
}
