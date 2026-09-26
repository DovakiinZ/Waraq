import 'package:flutter/material.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';

/// "Bestseller" marker on a course card.
///
/// An arcade chip with the electric-green fill: this is the one place on a card
/// that earns the accent, so it has to be the accent and nothing else.
class BestsellerBadge extends StatelessWidget {
  final String lang;

  /// Accepted and ignored — [ArcadeChip] owns the chip type scale so every chip
  /// in the app is the same size. Kept so existing call sites still compile.
  final double fontSize;

  const BestsellerBadge({
    super.key,
    this.lang = 'ar',
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    return ArcadeChip(
      label: lang == 'ar' ? 'الأكثر مبيعاً' : 'BESTSELLER',
      icon: Icons.local_fire_department_rounded,
      filled: true,
    );
  }
}
