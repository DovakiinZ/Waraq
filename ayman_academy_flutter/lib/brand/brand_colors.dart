import 'package:flutter/material.dart';

/// Waraq Academy brand palette.
///
/// Mirrors the web tokens in src/styles/brand.css. Keep the two in sync.
/// Note: the Dart package is still named `ayman_academy_app` on purpose.
/// Renaming it would break every import, the Android applicationId and the
/// iOS bundle identifier, so only display strings carry the new brand.
class BrandColors {
  static const deep = Color(0xFF0B3B2C);
  static const green = Color(0xFF1E6B52);
  static const mint = Color(0xFF9FD3BE);
  static const paper = Color(0xFFF7F2E8);
  static const sun = Color(0xFFF4A340);
  static const coral = Color(0xFFEE6C4D);
  static const sky = Color(0xFF3A8FB7);
  static const ink = Color(0xFF23302B);
  static const muted = Color(0xFF5E6E67);

  // Stage colors
  static const kindergarten = coral;
  static const primaryStage = sun;
  static const middleStage = sky;
  static const secondaryStage = green;
}

class BrandStrings {
  static const nameAr = 'ورق أكاديمي';
  static const nameEn = 'Waraq Academy';
  static const taglineAr = 'ورقة بعد ورقة.. نكبر';
  static const taglineEn = 'Page by page, we grow.';
}
