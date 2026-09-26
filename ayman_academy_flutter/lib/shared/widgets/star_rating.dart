import 'package:flutter/material.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';

/// Star rating with the numeric average first, the way a marketplace card reads.
///
/// Stars take the brand's darkened sun (`AppColors.gold`, 3.1:1 on white) rather
/// than the raw `#F4A340`, which only reaches 2.1:1 and fails the 3:1 floor for
/// a non-text graphic. Empty stars take `inkSoft`, not a faded gold, so the
/// filled/empty split stays legible at the 12px size the cards use.
class StarRating extends StatelessWidget {
  final double rating;
  final int? reviewCount;
  final double starSize;
  final bool showCount;
  final bool compact;

  const StarRating({
    super.key,
    required this.rating,
    this.reviewCount,
    this.starSize = 14,
    this.showCount = true,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;

    return Semantics(
      label: '${rating.toStringAsFixed(1)} / 5',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            rating.toStringAsFixed(1),
            style: TextStyle(
              fontSize: compact ? 11 : 13,
              fontWeight: FontWeight.w700,
              color: arc.ink,
            ),
          ),
          const SizedBox(width: 4),
          ...List.generate(5, (i) {
            final diff = rating - i;
            final (IconData icon, bool filled) = switch (diff) {
              >= 0.75 => (Icons.star_rounded, true),
              >= 0.25 => (Icons.star_half_rounded, true),
              _ => (Icons.star_outline_rounded, false),
            };
            return ExcludeSemantics(
              child: Icon(
                icon,
                size: starSize,
                color: filled ? AppColors.gold : arc.inkSoft,
              ),
            );
          }),
          if (showCount && reviewCount != null) ...[
            const SizedBox(width: 4),
            Text(
              '(${_formatCount(reviewCount!)})',
              style: TextStyle(fontSize: compact ? 10 : 12, color: arc.inkSoft),
            ),
          ],
        ],
      ),
    );
  }

  String _formatCount(int count) {
    if (count >= 1000) return '${(count / 1000).toStringAsFixed(1)}k';
    return count.toString();
  }
}
