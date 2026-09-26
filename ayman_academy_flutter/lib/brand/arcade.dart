import 'package:flutter/material.dart';

/// Arcade theme tokens — the green + white design language the web platform
/// uses on every public surface (Header, Footer, Register, Login, Marketplace,
/// LandingV10).
///
/// This is the Dart mirror of the `--arc-*` custom properties in
/// `src/index.css` and the `A` map in `src/components/arcade/theme.ts`. Keep the
/// three in sync: index.css is the source of truth for the hex values.
///
/// Rules that are easy to get wrong (identical to the web, repeated here so a
/// reader of this file does not have to go looking):
///
///  * [ink] is a TEXT colour, [line] is a BORDER colour, [band] is a deep-green
///    FILL. They coincide in light mode and diverge in dark. Never use [ink] as
///    a background or a border, or dark mode breaks.
///  * Text on [accent] is always [onAccent], never white. Electric green is a
///    light colour: white on it fails contrast, [onAccent] gives 8.4:1.
///  * Focus rings use [mid], not [accent]. Accent only reaches 1.9:1 against
///    white, below the 3:1 floor for a focus indicator.
///  * Radius is 0 everywhere and borders are 2px. See [radius] and [border].
///  * [danger] is the one non-green colour in the system, because an error
///    rendered in the brand green would not read as an error.
///
/// Resolve it with `context.arc` rather than reaching for the constants, so a
/// widget picks up the right brightness automatically.
@immutable
class Arc extends ThemeExtension<Arc> {
  /// Page ground.
  final Color bg;

  /// Card / panel fill.
  final Color surface;

  /// Banded section fill — a tinted wash, one step off the ground.
  final Color wash;

  /// Primary TEXT colour. Not a border, not a background.
  final Color ink;

  /// Secondary text.
  final Color inkSoft;

  /// Small marks, icons and focus rings sitting on the ground. The readable
  /// green: [accent] is too light to draw with.
  final Color mid;

  /// Border colour. 2px, radius 0.
  final Color line;

  /// The hard offset shadow colour.
  final Color shadow;

  /// The only fill in the system: electric green.
  final Color accent;

  /// Text on [accent]. Never white.
  final Color onAccent;

  /// Text on a deep green band or the gradient.
  final Color onInk;

  /// Secondary text on a deep green band or the gradient.
  final Color onInkMuted;

  /// Solid deep-green band FILL. Not the same as [ink], which is a text colour
  /// and inverts in dark mode.
  final Color band;

  /// Hairline inside a band.
  final Color bandLine;

  /// Full-bleed band gradient stops, 135°.
  final List<Color> gradStops;

  /// The one non-green colour: errors and destructive actions.
  final Color danger;

  const Arc({
    required this.bg,
    required this.surface,
    required this.wash,
    required this.ink,
    required this.inkSoft,
    required this.mid,
    required this.line,
    required this.shadow,
    required this.accent,
    required this.onAccent,
    required this.onInk,
    required this.onInkMuted,
    required this.band,
    required this.bandLine,
    required this.gradStops,
    required this.danger,
  });

  /// Mirrors the `:root` block in src/index.css.
  static const light = Arc(
    bg: Color(0xFFFFFFFF),
    surface: Color(0xFFFFFFFF),
    wash: Color(0xFFEFFBF4),
    ink: Color(0xFF07301F),
    inkSoft: Color(0xFF4A6B5C),
    mid: Color(0xFF0F6B42),
    line: Color(0xFF07301F),
    shadow: Color(0xFF07301F),
    accent: Color(0xFF22DE7C),
    onAccent: Color(0xFF07301F),
    onInk: Color(0xFFFFFFFF),
    onInkMuted: Color(0xFFC2DCCF),
    band: Color(0xFF07301F),
    bandLine: Color(0xFF1A4A35),
    gradStops: [Color(0xFF062A1B), Color(0xFF0B4F32), Color(0xFF0E603C)],
    danger: Color(0xFFB23434),
  );

  /// Mirrors the `.dark` block in src/index.css.
  static const dark = Arc(
    bg: Color(0xFF061A11),
    surface: Color(0xFF0B2A1C),
    wash: Color(0xFF0E3625),
    ink: Color(0xFFE6F5EC),
    inkSoft: Color(0xFF9CBCAA),
    mid: Color(0xFF4FE39A),
    line: Color(0xFF2F7C55),
    shadow: Color(0xFF2F7C55),
    accent: Color(0xFF22DE7C),
    onAccent: Color(0xFF05200F),
    onInk: Color(0xFFFFFFFF),
    onInkMuted: Color(0xFFC2DCCF),
    band: Color(0xFF04150D),
    bandLine: Color(0xFF1F5C3C),
    gradStops: [Color(0xFF04150D), Color(0xFF0A4028), Color(0xFF0C5133)],
    danger: Color(0xFFE06B6B),
  );

  // ── Geometry. Constants, not per-brightness. ──

  /// Radius is zero. Sharp is the system. Named so the intent is explicit at
  /// call sites rather than an unexplained absence of rounding.
  static const double radius = 0;

  /// Every border in the system is 2px.
  static const double borderWidth = 2;

  /// The hard offset shadow at rest, in px, for a large control or a card.
  static const double pressRest = 5;

  /// Cards sit a little further off the page than buttons do.
  static const double cardRest = 6;

  /// Small controls (chips, compact buttons) use a shorter throw.
  static const double pressRestSm = 3;

  // ── Derived helpers ──

  /// The arcade device: a hard offset shadow with no blur.
  ///
  /// Matches `hard(n)` in `src/components/arcade/theme.ts`. Offset runs down
  /// and to the right in both text directions — the shadow is a light-source
  /// cue, not a reading-order one, so it does not mirror under RTL.
  List<BoxShadow> hard([double n = pressRest]) {
    if (n <= 0) return const [];
    return [BoxShadow(color: shadow, offset: Offset(n, n), blurRadius: 0)];
  }

  /// A 2px border in [line].
  Border get border => Border.all(color: line, width: borderWidth);

  /// A 2px border in an arbitrary colour, for bands where [line] would vanish.
  Border borderOf(Color c) => Border.all(color: c, width: borderWidth);

  /// The full-bleed band gradient. 135° in the web maps to topLeft→bottomRight.
  LinearGradient get gradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: gradStops,
        stops: const [0.0, 0.6, 1.0],
      );

  @override
  Arc copyWith({
    Color? bg,
    Color? surface,
    Color? wash,
    Color? ink,
    Color? inkSoft,
    Color? mid,
    Color? line,
    Color? shadow,
    Color? accent,
    Color? onAccent,
    Color? onInk,
    Color? onInkMuted,
    Color? band,
    Color? bandLine,
    List<Color>? gradStops,
    Color? danger,
  }) {
    return Arc(
      bg: bg ?? this.bg,
      surface: surface ?? this.surface,
      wash: wash ?? this.wash,
      ink: ink ?? this.ink,
      inkSoft: inkSoft ?? this.inkSoft,
      mid: mid ?? this.mid,
      line: line ?? this.line,
      shadow: shadow ?? this.shadow,
      accent: accent ?? this.accent,
      onAccent: onAccent ?? this.onAccent,
      onInk: onInk ?? this.onInk,
      onInkMuted: onInkMuted ?? this.onInkMuted,
      band: band ?? this.band,
      bandLine: bandLine ?? this.bandLine,
      gradStops: gradStops ?? this.gradStops,
      danger: danger ?? this.danger,
    );
  }

  @override
  Arc lerp(covariant Arc? other, double t) {
    if (other == null) return this;
    return Arc(
      bg: Color.lerp(bg, other.bg, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      wash: Color.lerp(wash, other.wash, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      inkSoft: Color.lerp(inkSoft, other.inkSoft, t)!,
      mid: Color.lerp(mid, other.mid, t)!,
      line: Color.lerp(line, other.line, t)!,
      shadow: Color.lerp(shadow, other.shadow, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      onAccent: Color.lerp(onAccent, other.onAccent, t)!,
      onInk: Color.lerp(onInk, other.onInk, t)!,
      onInkMuted: Color.lerp(onInkMuted, other.onInkMuted, t)!,
      band: Color.lerp(band, other.band, t)!,
      bandLine: Color.lerp(bandLine, other.bandLine, t)!,
      gradStops: [
        for (var i = 0; i < gradStops.length; i++)
          Color.lerp(gradStops[i], other.gradStops[i], t)!,
      ],
      danger: Color.lerp(danger, other.danger, t)!,
    );
  }
}

/// `context.arc` — the arcade tokens for the ambient brightness.
///
/// Falls back to [Arc.light] / [Arc.dark] if the extension is missing, so a
/// widget rendered under a bare `MaterialApp` (a test, a `showDialog` with its
/// own theme) still draws on-brand instead of throwing.
extension ArcContext on BuildContext {
  Arc get arc {
    final theme = Theme.of(this);
    return theme.extension<Arc>() ??
        (theme.brightness == Brightness.dark ? Arc.dark : Arc.light);
  }
}
