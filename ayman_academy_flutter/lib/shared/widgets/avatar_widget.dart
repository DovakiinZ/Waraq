import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';

/// A user avatar: a **square** bordered plate, not a circle.
///
/// Radius is 0 everywhere in the arcade system, avatars included — a lone
/// circle in a screen of square panels is the detail that makes the rest look
/// accidental. [radius] keeps its old meaning (half the side length) so the
/// ~15 existing call sites size correctly without being touched.
class AvatarWidget extends StatelessWidget {
  final String? imageUrl;
  final String name;
  final double radius;

  const AvatarWidget({
    super.key,
    this.imageUrl,
    required this.name,
    this.radius = 20,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final side = radius * 2;
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : '?';
    final hasImage = imageUrl != null && imageUrl!.isNotEmpty && imageUrl!.startsWith('http');

    Widget fallback() => Container(
          width: side,
          height: side,
          alignment: Alignment.center,
          color: arc.wash,
          child: Text(
            initial,
            style: TextStyle(
              fontSize: radius * 0.85,
              fontWeight: FontWeight.w700,
              color: arc.mid,
              height: 1,
            ),
          ),
        );

    return Semantics(
      label: name,
      image: hasImage,
      child: Container(
        width: side,
        height: side,
        decoration: BoxDecoration(
          color: arc.wash,
          border: Border.all(color: arc.line, width: Arc.borderWidth),
        ),
        clipBehavior: Clip.hardEdge,
        child: hasImage
            ? CachedNetworkImage(
                imageUrl: imageUrl!,
                width: side,
                height: side,
                fit: BoxFit.cover,
                placeholder: (_, _) => fallback(),
                errorWidget: (_, _, _) => fallback(),
              )
            : fallback(),
      ),
    );
  }
}
