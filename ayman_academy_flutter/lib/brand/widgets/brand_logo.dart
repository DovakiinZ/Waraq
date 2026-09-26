import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:ayman_academy_app/brand/arcade.dart';
import 'package:ayman_academy_app/brand/brand_colors.dart';

/// Which of the two mark artworks to draw.
enum MarkVariant {
  /// Deep green leaf, mint fold, white veins. For light grounds.
  light,

  /// Paper leaf, sun fold, deep green veins. For deep green bands and the
  /// gradient.
  dark,
}

/// The Waraq leaf mark — a leaf with a folded page corner, its veins pointing
/// upward for progress through the stages.
///
/// The two artworks are fixed-palette SVGs, so the mark does **not** follow the
/// app's dark mode on its own. Pick [variant] from the ground you are drawing
/// on, not from the theme brightness: a light mark on a deep green band is
/// correct even in light mode.
class LogoMark extends StatelessWidget {
  final double size;
  final MarkVariant variant;

  const LogoMark({super.key, this.size = 40, this.variant = MarkVariant.light});

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      variant == MarkVariant.dark
          ? 'assets/brand/mark-on-dark.svg'
          : 'assets/brand/mark.svg',
      width: size,
      height: size,
      semanticsLabel: BrandStrings.nameAr,
    );
  }
}

/// The brand lockup: the mark on a bordered plate, plus the name as **real
/// text** so it renders correctly in both RTL and LTR.
///
/// Two deliberate choices, mirroring `ArcadeBrand` on the web:
///
///  * The name is text, never baked into an image. An image wordmark cannot
///    switch between `ورق أكاديمي` and `Waraq Academy`, and would not pick up
///    the ambient text direction.
///  * On light grounds the mark sits on a **fixed** brand-paper plate rather
///    than a themed surface. The mark's own palette does not follow dark mode,
///    so a mode-independent backing keeps it legible in both, and the bordered
///    square matches the arcade's sharp treatment.
class BrandLogo extends StatelessWidget {
  /// Side length of the mark's plate.
  final double size;

  /// Set when the lockup sits on a deep green band or the gradient: the mark
  /// flips to its dark artwork and the wordmark to the on-band colour.
  final bool onDark;

  /// Hide the wordmark and draw the plate alone — for a compact app bar.
  final bool markOnly;

  /// `t('ورق أكاديمي', 'Waraq Academy')`. Passed in rather than read from a
  /// provider so the lockup stays usable from non-Riverpod contexts (the config
  /// error screen in `main.dart`, tests, previews).
  final String? name;

  /// Optional tagline under the name.
  final String? tagline;

  const BrandLogo({
    super.key,
    this.size = 40,
    this.onDark = false,
    this.markOnly = false,
    this.name,
    this.tagline,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final fg = onDark ? arc.onInk : arc.ink;

    final plate = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        // Fixed paper, not `arc.surface`: see the class doc.
        color: onDark ? Colors.transparent : BrandColors.paper,
        border: Border.all(color: onDark ? arc.onInk : arc.line, width: Arc.borderWidth),
      ),
      child: LogoMark(
        size: size - 12,
        variant: onDark ? MarkVariant.dark : MarkVariant.light,
      ),
    );

    if (markOnly) return plate;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        plate,
        const SizedBox(width: 10),
        Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name ?? BrandStrings.nameAr,
              style: TextStyle(
                fontSize: size * 0.44,
                fontWeight: FontWeight.w700,
                color: fg,
                height: 1.2,
              ),
            ),
            if (tagline != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  tagline!,
                  style: TextStyle(
                    fontSize: size * 0.28,
                    fontWeight: FontWeight.w500,
                    color: onDark ? arc.onInkMuted : arc.inkSoft,
                    height: 1.3,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
