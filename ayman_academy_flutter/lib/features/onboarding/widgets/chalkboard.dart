import 'dart:math' as math;

import 'package:flutter/material.dart';

/// The blackboard surface used by the first-run intro slides.
///
/// Deliberately **one fixed look**, not a themed surface: your deep green is
/// literally the colour of a classroom board, so the slides commit to it in
/// both light and dark mode. Everything else in the app still follows
/// `context.arc`; this is the one screen that does not, and that is a choice
/// rather than an oversight — a board that turns white is not a board.
///
/// Nothing here is an image asset. The texture is painted and the drawings are
/// stroked paths, so the APK does not grow by a single kilobyte.
///
/// Typography is untouched: IBM Plex Sans Arabic carries every word. There is
/// no chalk typeface, because no chalk-style Arabic face is bundled and adding
/// one would cost megabytes and break the brand rule. "Chalk" here is colour,
/// texture and drawing — never lettering.
class Chalkboard {
  Chalkboard._();

  /// The board itself. Matches the arcade `band` / brand deep green.
  static const board = Color(0xFF07301F);

  /// Chalk. The brand's paper cream, which reads as chalk dust on the board.
  static const chalk = Color(0xFFF7F2E8);

  /// Faded chalk, for supporting copy. Kept above 4.5:1 on [board].
  static const chalkSoft = Color(0xFFC2DCCF);

  /// The one accent. Text on it is always [board], never white.
  static const accent = Color(0xFF22DE7C);

  /// Text and icons sitting on [accent].
  static const onAccent = Color(0xFF07301F);
}

/// Paints the board: the deep green ground plus two very faint smudges of
/// wiped chalk, so the surface reads as used rather than as flat fill.
///
/// Kept subtle on purpose — the failure mode of this direction is a board that
/// looks grubby, and that comes from too much texture, not too little.
class _BoardPainter extends CustomPainter {
  const _BoardPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(rect, Paint()..color = Chalkboard.board);

    void smudge(Offset centre, double radius, double opacity) {
      canvas.drawCircle(
        centre,
        radius,
        Paint()
          ..shader = RadialGradient(
            colors: [
              Chalkboard.chalk.withValues(alpha: opacity),
              Chalkboard.chalk.withValues(alpha: 0),
            ],
          ).createShader(Rect.fromCircle(center: centre, radius: radius)),
      );
    }

    smudge(Offset(size.width * .22, size.height * .18), size.width * .55, .055);
    smudge(Offset(size.width * .80, size.height * .72), size.width * .48, .04);
  }

  @override
  bool shouldRepaint(_BoardPainter oldDelegate) => false;
}

/// Fills its parent with the board surface.
class BoardSurface extends StatelessWidget {
  final Widget child;
  const BoardSurface({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: const _BoardPainter(),
      child: child,
    );
  }
}

/// A chalk underline — a slightly uneven stroke, the way a line drawn by hand
/// against a board is never quite straight.
class ChalkUnderline extends StatelessWidget {
  final double width;
  final Color color;
  const ChalkUnderline({super.key, this.width = 120, this.color = Chalkboard.accent});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(width, 8),
      painter: _UnderlinePainter(color),
    );
  }
}

class _UnderlinePainter extends CustomPainter {
  final Color color;
  const _UnderlinePainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 3.2
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    final path = Path()
      ..moveTo(0, size.height * .62)
      ..quadraticBezierTo(size.width * .35, size.height * .18, size.width * .62, size.height * .52)
      ..quadraticBezierTo(size.width * .84, size.height * .78, size.width, size.height * .38);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_UnderlinePainter old) => old.color != color;
}

/// The Waraq mark, redrawn as open chalk strokes instead of solid fills.
///
/// Same geometry as `assets/brand/mark.svg` — the rounded leaf body, the folded
/// corner, the rising veins — so it reads as the brand mark and not as a
/// different drawing.
class ChalkMark extends StatelessWidget {
  final double size;
  const ChalkMark({super.key, this.size = 132});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(size: Size.square(size), painter: const _MarkPainter());
  }
}

class _MarkPainter extends CustomPainter {
  const _MarkPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 120.0;
    final stroke = Paint()
      ..color = Chalkboard.chalk
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    // Leaf body with the folded corner cut away, mirroring the SVG path.
    final body = Path()
      ..moveTo(10 * s, 80 * s)
      ..arcToPoint(Offset(80 * s, 10 * s), radius: Radius.circular(70 * s), clockwise: true)
      ..lineTo(88 * s, 10 * s)
      ..lineTo(110 * s, 32 * s)
      ..lineTo(110 * s, 40 * s)
      ..arcToPoint(Offset(40 * s, 110 * s), radius: Radius.circular(70 * s), clockwise: true)
      ..lineTo(10 * s, 110 * s)
      ..close();
    canvas.drawPath(body, stroke..strokeWidth = 3.4 * s);

    // The fold.
    final fold = Path()
      ..moveTo(88 * s, 10 * s)
      ..lineTo(88 * s, 32 * s)
      ..lineTo(110 * s, 32 * s);
    canvas.drawPath(fold, stroke..strokeWidth = 2.8 * s);

    // The central vein and the two rising branches.
    canvas.drawLine(Offset(24 * s, 96 * s), Offset(80 * s, 40 * s), stroke..strokeWidth = 3.6 * s);
    final veins = Path()
      ..moveTo(42 * s, 78 * s)..lineTo(42 * s, 62 * s)
      ..moveTo(42 * s, 78 * s)..lineTo(58 * s, 78 * s)
      ..moveTo(60 * s, 60 * s)..lineTo(60 * s, 47 * s)
      ..moveTo(60 * s, 60 * s)..lineTo(73 * s, 60 * s);
    canvas.drawPath(veins, stroke..strokeWidth = 2.8 * s);
  }

  @override
  bool shouldRepaint(_MarkPainter old) => false;
}

/// A hand-drawn ellipse around its child — the gesture a teacher makes when
/// circling the right answer on a board. Used instead of a selection fill.
class ChalkCircled extends StatelessWidget {
  final Widget child;
  final bool active;
  const ChalkCircled({super.key, required this.child, this.active = true});

  @override
  Widget build(BuildContext context) {
    if (!active) return child;
    return CustomPaint(
      foregroundPainter: const _CirclePainter(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        child: child,
      ),
    );
  }
}

class _CirclePainter extends CustomPainter {
  const _CirclePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Chalkboard.accent
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.6
      ..strokeCap = StrokeCap.round;

    // Start a little past the top and overshoot the full turn, so the ends
    // cross the way a quickly drawn circle does.
    final rect = Rect.fromLTWH(1, 1, size.width - 2, size.height - 2);
    final path = Path()
      ..addArc(rect, -math.pi * .72, math.pi * 2.12);
    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    canvas.rotate(-0.035);
    canvas.translate(-size.width / 2, -size.height / 2);
    canvas.drawPath(path, paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_CirclePainter old) => false;
}

/// A chalk dash, used as the bullet in the stage list.
class ChalkDash extends StatelessWidget {
  const ChalkDash({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 14,
      height: 3,
      decoration: const BoxDecoration(
        color: Chalkboard.chalkSoft,
        borderRadius: BorderRadius.all(Radius.circular(2)),
      ),
    );
  }
}

/// The slide progress indicator: squares, because the arcade system is radius
/// 0 everywhere, with the active one widened rather than recoloured alone.
class ChalkDots extends StatelessWidget {
  final int count;
  final int active;
  const ChalkDots({super.key, required this.count, required this.active});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(count, (i) {
        final on = i == active;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          margin: const EdgeInsetsDirectional.only(end: 6),
          width: on ? 26 : 9,
          height: 9,
          color: on ? Chalkboard.accent : Chalkboard.chalkSoft.withValues(alpha: .38),
        );
      }),
    );
  }
}

/// The primary action on a board screen. Accent fill with board-coloured text,
/// never white — electric green is a light colour.
class ChalkButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final bool filled;
  const ChalkButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.filled = true,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: Material(
        color: filled ? Chalkboard.accent : Colors.transparent,
        shape: const RoundedRectangleBorder(
          side: BorderSide(color: Chalkboard.accent, width: 2),
          borderRadius: BorderRadius.zero,
        ),
        child: InkWell(
          onTap: onPressed,
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: filled ? Chalkboard.onAccent : Chalkboard.chalk,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
