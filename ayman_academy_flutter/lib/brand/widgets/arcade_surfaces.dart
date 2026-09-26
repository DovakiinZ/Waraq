import 'package:flutter/material.dart';
import 'package:ayman_academy_app/brand/arcade.dart';

/// Bordered panel with the hard offset shadow — the arcade's only container.
///
/// Set [flat] for a panel that sits *in* the page rather than on top of it:
/// list rows, nested sections, anything that would otherwise stack shadow on
/// shadow. Nesting two shadowed cards is the single easiest way to make an
/// arcade screen look broken.
class ArcadeCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;

  /// Drop the shadow but keep the border.
  final bool flat;

  /// Override the fill — use `context.arc.wash` for a recessed panel or
  /// `context.arc.band` for a deep green one (then pass [borderColor] too).
  final Color? fill;
  final Color? borderColor;

  /// Shadow throw. Defaults to [Arc.cardRest]; cards sit a little further off
  /// the page than buttons do.
  final double? shadowOffset;

  final VoidCallback? onTap;
  final double? width;
  final double? height;
  final Clip clipBehavior;

  const ArcadeCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.flat = false,
    this.fill,
    this.borderColor,
    this.shadowOffset,
    this.onTap,
    this.width,
    this.height,
    this.clipBehavior = Clip.none,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final n = flat ? 0.0 : (shadowOffset ?? Arc.cardRest);

    Widget body = Container(
      width: width,
      height: height,
      margin: margin,
      padding: padding,
      clipBehavior: clipBehavior,
      decoration: BoxDecoration(
        color: fill ?? arc.surface,
        border: Border.all(color: borderColor ?? arc.line, width: Arc.borderWidth),
        boxShadow: arc.hard(n),
      ),
      child: child,
    );

    if (onTap != null) {
      // A plain InkWell would paint a rounded Material ripple over a square
      // card. The card is the affordance here, so a bare tap region is right.
      body = GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: body,
      );
    }
    return body;
  }
}

/// Small uppercase chip. Stage names, counts, status markers, level labels.
///
/// [filled] gives it the electric green fill with [Arc.onAccent] text; unfilled
/// is a transparent chip with an ink label and the same 2px border.
class ArcadeChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool filled;

  /// Override the border and label colour — for a status chip that has to read
  /// as an error or a warning rather than as brand green.
  final Color? color;

  const ArcadeChip({
    super.key,
    required this.label,
    this.icon,
    this.filled = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final fg = filled ? arc.onAccent : (color ?? arc.ink);
    final line = color ?? arc.line;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: filled ? arc.accent : Colors.transparent,
        border: Border.all(color: line, width: Arc.borderWidth),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: fg),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: fg,
              height: 1.3,
              // Latin-only chips (level codes, counts) can take tracking; the
              // brand forbids it on Arabic, so it is applied per-string below
              // rather than blanket-set here.
              letterSpacing: _isArabic(label) ? 0 : 0.6,
            ),
          ),
        ],
      ),
    );
  }

  /// Arabic must never be letter-spaced — tracking breaks the joined
  /// letterforms. Range covers Arabic, Arabic Supplement and Presentation Forms.
  static bool _isArabic(String s) =>
      RegExp(r'[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]').hasMatch(s);
}

/// Label above, control, error or hint below.
///
/// Error text uses [Arc.danger] rather than a green, because an error rendered
/// in the brand colour would not read as an error.
class ArcadeField extends StatelessWidget {
  final String label;
  final Widget child;
  final String? error;
  final String? hint;

  /// Marks the field required in the label. The app's forms mix required and
  /// optional fields, and a bare asterisk is cheaper than a legend.
  final bool required;

  const ArcadeField({
    super.key,
    required this.label,
    required this.child,
    this.error,
    this.hint,
    this.required = false,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(
            text: label,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: arc.ink),
            children: required
                ? [TextSpan(text: ' *', style: TextStyle(color: arc.danger))]
                : null,
          ),
        ),
        const SizedBox(height: 8),
        child,
        if (hint != null && error == null) ...[
          const SizedBox(height: 6),
          Text(hint!, style: TextStyle(fontSize: 12, color: arc.inkSoft, height: 1.4)),
        ],
        if (error != null) ...[
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.error_outline_rounded, size: 14, color: arc.danger),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  error!,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: arc.danger, height: 1.4),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Loading placeholder shaped like the content it replaces.
///
/// A pulse, not a sweep: the shimmer package's diagonal highlight reads as a
/// gloss, which fights a system with no gradients and no blur.
class ArcadeSkeleton extends StatefulWidget {
  final double? width;
  final double height;

  const ArcadeSkeleton({super.key, this.width, this.height = 16});

  @override
  State<ArcadeSkeleton> createState() => _ArcadeSkeletonState();
}

class _ArcadeSkeletonState extends State<ArcadeSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return ExcludeSemantics(
      child: FadeTransition(
        opacity: Tween<double>(begin: 0.45, end: 1.0)
            .animate(CurvedAnimation(parent: _c, curve: Curves.easeInOut)),
        child: Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: arc.wash,
            border: Border.all(color: arc.line, width: Arc.borderWidth),
          ),
        ),
      ),
    );
  }
}

/// Composed empty state. Says how to populate, never just "no data" — which is
/// why [action] is a first-class slot rather than an afterthought.
class ArcadeEmpty extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? action;

  const ArcadeEmpty({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: DottedBorder(
          color: arc.line,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: arc.wash,
                    border: Border.all(color: arc.line, width: Arc.borderWidth),
                  ),
                  child: Icon(icon, size: 28, color: arc.mid),
                ),
                const SizedBox(height: 16),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: arc.ink, height: 1.4),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    subtitle!,
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: arc.inkSoft, height: 1.5),
                  ),
                ],
                if (action != null) ...[
                  const SizedBox(height: 20),
                  action!,
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A 2px dashed rectangle. Flutter has no dashed `BoxBorder`, and the empty
/// state's "nothing here yet" reading depends on the border being dashed rather
/// than solid, so it is painted by hand.
class DottedBorder extends StatelessWidget {
  final Widget child;
  final Color color;
  final double dash;
  final double gap;
  final double strokeWidth;

  const DottedBorder({
    super.key,
    required this.child,
    required this.color,
    this.dash = 7,
    this.gap = 5,
    this.strokeWidth = Arc.borderWidth,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DashedRectPainter(
        color: color,
        dash: dash,
        gap: gap,
        strokeWidth: strokeWidth,
      ),
      child: child,
    );
  }
}

class _DashedRectPainter extends CustomPainter {
  final Color color;
  final double dash;
  final double gap;
  final double strokeWidth;

  const _DashedRectPainter({
    required this.color,
    required this.dash,
    required this.gap,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    // Inset by half the stroke so the dashes land inside the box rather than
    // straddling its edge.
    final h = strokeWidth / 2;
    final rect = Rect.fromLTWH(h, h, size.width - strokeWidth, size.height - strokeWidth);
    final path = Path()..addRect(rect);

    for (final metric in path.computeMetrics()) {
      var d = 0.0;
      while (d < metric.length) {
        final end = (d + dash).clamp(0.0, metric.length);
        canvas.drawPath(metric.extractPath(d, end), paint);
        d = end + gap;
      }
    }
  }

  @override
  bool shouldRepaint(_DashedRectPainter old) =>
      old.color != color || old.dash != dash || old.gap != gap || old.strokeWidth != strokeWidth;
}

/// Pixel checker divider — the arcade's section break.
///
/// Mirrors `PIXEL_STRIP` on the web: 10px of line, 10px of nothing, repeating.
class PixelDivider extends StatelessWidget {
  final double height;
  final Color? color;

  const PixelDivider({super.key, this.height = 6, this.color});

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox(
        height: height,
        width: double.infinity,
        child: CustomPaint(painter: _PixelStripPainter(color ?? context.arc.line)),
      ),
    );
  }
}

class _PixelStripPainter extends CustomPainter {
  final Color color;
  const _PixelStripPainter(this.color);

  static const _cell = 10.0;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    for (var x = 0.0; x < size.width; x += _cell * 2) {
      canvas.drawRect(
        Rect.fromLTWH(x, 0, (_cell).clamp(0, size.width - x), size.height),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_PixelStripPainter old) => old.color != color;
}
