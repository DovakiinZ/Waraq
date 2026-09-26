import 'package:flutter/material.dart';

/// Flat colour constants, repointed onto the Waraq arcade palette.
///
/// **Prefer `context.arc` (see `lib/brand/arcade.dart`) in new code.** The
/// arcade tokens resolve per-brightness; these constants cannot, because they
/// are `const` and 46 files read them from inside `const TextStyle(...)`.
///
/// Why this file still exists: the app was built around an iOS-premium palette
/// (near-black primary, purple accent, old gold) referenced from ~700 call
/// sites, most of them `const`. Repointing the constants moves the whole app
/// onto the brand in one edit; converting every site to `context.arc` would
/// have meant un-`const`-ing hundreds of text styles for no visual gain.
///
/// Two classes of token live here, and the distinction matters:
///
///  * **Paired** tokens — [ink]/[inkDark], [border]/[borderDark],
///    [surface]/[surfaceDark] and friends. Call sites pick with
///    `isDark ? xDark : x`, so each value only has to work on its own ground
///    and can be the exact arcade token.
///  * **Dual-safe** tokens — [inkMuted], [accent], [error], [success],
///    [warning], [info], [gold]. These are read *unguarded* (200 sites for
///    `inkMuted` alone), so a value tuned for white would be invisible on the
///    dark ground. Each is tuned to clear roughly 4:1 against **both** the
///    light ground (#FFFFFF) and the dark ground (#061A11). They are therefore
///    deliberately *not* the raw arcade hexes — [accent] here is the readable
///    `mid`-family green, not electric `#22DE7C`, which only reaches 1.9:1 on
///    white and must never carry text or an icon.
///
/// For a real electric-green fill use [accentFill] with [onAccent] text, or
/// better, an `ArcadeButton` / `ArcadeChip` from `lib/brand/widgets/`.
class AppColors {
  // ══════════════════════════════════════════════════════════════
  //  Arcade core — paired, exact mirrors of --arc-* in src/index.css
  // ══════════════════════════════════════════════════════════════

  /// Page ground. Arcade `--arc-bg`.
  static const background = Color(0xFFFFFFFF);
  static const backgroundDark = Color(0xFF061A11);

  /// Card / panel fill. Arcade `--arc-surface`.
  static const surface = Color(0xFFFFFFFF);
  static const surfaceDark = Color(0xFF0B2A1C);

  /// Banded / washed fill, one step off the ground. Arcade `--arc-wash`.
  static const secondary = Color(0xFFEFFBF4);
  static const secondaryDark = Color(0xFF0E3625);

  /// Alias of the wash, kept for chip and tag call sites.
  static const tertiary = Color(0xFFEFFBF4);
  static const tertiaryDark = Color(0xFF0E3625);

  /// Border colour. Arcade `--arc-line`. Always drawn 2px, radius 0.
  static const border = Color(0xFF07301F);
  static const borderDark = Color(0xFF2F7C55);

  /// Hairline rules inside a panel — a divider is not a border, and a full
  /// `border` here would make every list look caged.
  static const separator = Color(0xFFC9E3D6);
  static const separatorDark = Color(0xFF1F5C3C);

  /// Primary TEXT colour. Arcade `--arc-ink`.
  static const ink = Color(0xFF07301F);
  static const inkDark = Color(0xFFE6F5EC);

  /// Secondary text, paired. Arcade `--arc-ink-soft`.
  static const inkSecondary = Color(0xFF4A6B5C);
  static const inkSecondaryDark = Color(0xFF9CBCAA);

  /// Deep-green band FILL. Not [ink]: this one does *not* invert.
  static const band = Color(0xFF07301F);
  static const bandDark = Color(0xFF04150D);

  /// Text on a band or the gradient.
  static const onBand = Color(0xFFFFFFFF);
  static const onBandMuted = Color(0xFFC2DCCF);

  // ══════════════════════════════════════════════════════════════
  //  Fills — electric green, the one fill in the system
  // ══════════════════════════════════════════════════════════════

  /// Electric green. A FILL ONLY — it reaches 1.9:1 on white, so it can never
  /// carry text or an icon. Pair it with [onAccent].
  static const accentFill = Color(0xFF22DE7C);

  /// The only text colour allowed on [accentFill]. Never white (8.4:1).
  static const onAccent = Color(0xFF07301F);

  // ══════════════════════════════════════════════════════════════
  //  Dual-safe tokens — read unguarded, tuned for BOTH grounds
  // ══════════════════════════════════════════════════════════════

  /// Secondary / supporting text. 4.3:1 on white, 4.1:1 on the dark ground.
  /// Sits between the arcade's `ink-soft` light (#4A6B5C) and dark (#9CBCAA).
  static const inkMuted = Color(0xFF5D8271);

  /// The readable green — the `mid` family, not electric green. Safe as text,
  /// as an icon, and as a fill under white text. 4.6:1 / 3.9:1.
  static const accent = Color(0xFF17864F);

  /// Slightly lifted green for dark-mode emphasis. Arcade `--arc-mid` dark.
  static const accentLight = Color(0xFF4FE39A);

  /// Brand sun, darkened until it clears 3:1 on white for icon use (stars,
  /// badges). The raw brand `#F4A340` only reaches 2.1:1.
  static const gold = Color(0xFFC0881F);

  // ── Star / rating ──
  static const starYellow = Color(0xFFC0881F);
  static const starFilled = Color(0xFFA8731A);

  // ── Bestseller badge — an arcade fill, so accent + onAccent ──
  static const bestsellerBg = Color(0xFF22DE7C);
  static const bestsellerText = Color(0xFF07301F);

  // ══════════════════════════════════════════════════════════════
  //  Semantic — the sanctioned exceptions to "green and white only"
  // ══════════════════════════════════════════════════════════════

  /// The one non-green colour in the system. An error rendered in the brand
  /// green would not read as an error. Dual-safe: 4.4:1 / 4.1:1.
  static const error = Color(0xFFD64545);

  /// Success is green, which is also the brand. Same value as [accent] on
  /// purpose — "done" and "brand" are the same idea here.
  static const success = Color(0xFF17864F);

  /// Brand sun, darkened to be dual-safe as text. 4.4:1 / 4.0:1.
  static const warning = Color(0xFFA96A12);

  /// Brand sky, darkened to be dual-safe as text. 4.5:1 / 3.9:1.
  static const info = Color(0xFF2E7F9E);

  // ══════════════════════════════════════════════════════════════
  //  Legacy aliases — kept so existing call sites keep compiling
  // ══════════════════════════════════════════════════════════════

  /// Was near-black `#1A1A1A`. Now deep green: the ink / line / band colour.
  /// Used for borders, selected states and deep-green button fills.
  static const primary = Color(0xFF07301F);

  /// Dark-mode counterpart of [primary].
  static const primaryLight = Color(0xFF2F7C55);

  /// Text on [primary]. Deep green is dark, so this stays white.
  static const primaryForeground = Color(0xFFFFFFFF);

  /// Input fill. Arcade inputs are surface-filled with a 2px border, not a
  /// tinted well, so this is the surface in both modes.
  static const inputFill = Color(0xFFFFFFFF);
  static const inputFillDark = Color(0xFF0B2A1C);

  // ══════════════════════════════════════════════════════════════
  //  Stage accents — the brand's four educational levels
  // ══════════════════════════════════════════════════════════════

  static const stageKindergarten = Color(0xFFD1563A); // coral, darkened
  static const stagePrimary = Color(0xFFC0881F); // sun, darkened
  static const stageMiddle = Color(0xFF2E7F9E); // sky, darkened
  static const stageSecondary = Color(0xFF17864F); // green

  // ══════════════════════════════════════════════════════════════
  //  Lesson block types
  // ══════════════════════════════════════════════════════════════
  //
  // Lesson content genuinely needs these to be distinguishable — a student has
  // to tell a warning from a worked example at a glance — so the block accents
  // are the brand's stage family (sun / sky / coral / green) rather than the
  // generic Tailwind ramp they used to be. The `*Background` values are light-
  // mode washes; `lesson_block_renderer.dart` swaps to the `*BackgroundDark`
  // washes under a dark theme rather than laying pale tints on a dark ground.

  static const tipBackground = Color(0xFFEAF4F9); // sky wash
  static const tipBackgroundDark = Color(0xFF0C2C38);
  static const tipBorder = Color(0xFF2E7F9E);

  static const warningBackground = Color(0xFFFDF3E3); // sun wash
  static const warningBackgroundDark = Color(0xFF33260D);
  static const warningBorder = Color(0xFFA96A12);

  static const exampleBackground = Color(0xFFEFFBF4); // arcade wash
  static const exampleBackgroundDark = Color(0xFF0E3625);
  static const exampleBorder = Color(0xFF17864F);

  static const exerciseBackground = Color(0xFFFDEDE8); // coral wash
  static const exerciseBackgroundDark = Color(0xFF3A1C14);
  static const exerciseBorder = Color(0xFFD1563A);

  static const equationBackground = Color(0xFFEFFBF4);
  static const equationBackgroundDark = Color(0xFF0E3625);
  static const equationBorder = Color(0xFF0F6B42);

  static const qaBackground = Color(0xFFF1F7F4); // mint wash
  static const qaBackgroundDark = Color(0xFF13302A);
  static const qaBorder = Color(0xFF4A8F73);
}
