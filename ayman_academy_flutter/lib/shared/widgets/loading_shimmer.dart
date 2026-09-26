import 'package:flutter/material.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';

/// A list of skeleton rows, shaped like the content they stand in for.
///
/// This used to use the `shimmer` package's diagonal sweep. The arcade system
/// has no gradients and no blur, so a moving gloss read as a rendering artefact
/// rather than as loading; [ArcadeSkeleton]'s opacity pulse carries the same
/// meaning without breaking the language. The `shimmer` dependency is still in
/// `pubspec.yaml` — remove it once nothing imports it.
class LoadingShimmer extends StatelessWidget {
  final int itemCount;

  /// Height of each placeholder row. Defaults to a list-row height; pass a
  /// taller value where the real content is a card.
  final double itemHeight;

  const LoadingShimmer({super.key, this.itemCount = 5, this.itemHeight = 80});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: itemCount,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, _) => ArcadeSkeleton(height: itemHeight),
    );
  }
}

/// A single skeleton block, for inline placeholders inside a screen.
class ShimmerBox extends StatelessWidget {
  final double width;
  final double height;

  /// Accepted and ignored: radius is 0 everywhere in the arcade system. Kept in
  /// the signature so the ~10 existing call sites still compile.
  final double borderRadius;

  const ShimmerBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 0,
  });

  @override
  Widget build(BuildContext context) {
    return ArcadeSkeleton(width: width, height: height);
  }
}
