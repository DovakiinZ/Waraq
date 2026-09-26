import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/widgets/star_rating.dart';
import 'package:ayman_academy_app/shared/widgets/bestseller_badge.dart';

/// A course tile: cover, title, teacher, rating, price.
///
/// The whole card is the tap target, so it is an [ArcadeCard] with the hard
/// shadow rather than a bare column — a card the user can open has to look
/// liftable. It is deliberately **flat inside**: the cover, the chips and the
/// progress bar all sit on the card's own surface, because stacking a second
/// hard shadow inside the first is what makes an arcade grid look broken.
class SubjectCard extends StatelessWidget {
  final Subject subject;
  final String lang;
  final VoidCallback? onTap;
  final bool showProgress;

  const SubjectCard({
    super.key,
    required this.subject,
    required this.lang,
    this.onTap,
    this.showProgress = false,
  });

  bool get _isAr => lang == 'ar';

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final ratingCount = subject.ratingCount ?? 0;

    return ArcadeCard(
      onTap: onTap,
      clipBehavior: Clip.hardEdge,
      shadowOffset: Arc.pressRest,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Cover(subject: subject),

          // The cover is separated from the body by a real rule, not by a gap.
          Container(height: Arc.borderWidth, color: arc.line),

          Padding(
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject.title(lang),
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.3, color: arc.ink),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),

                if (subject.teacherName != null) ...[
                  const SizedBox(height: 3),
                  Text(
                    subject.teacherName!,
                    style: TextStyle(fontSize: 11, color: arc.inkSoft, height: 1.2),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],

                const SizedBox(height: 6),

                // Ratings only appear once there are enough of them to mean
                // something. A single bad review would otherwise sink a brand
                // new course, and "4.5" invented for a course nobody has rated
                // is worse than showing nothing.
                if (ratingCount >= 3)
                  StarRating(
                    rating: subject.averageRating ?? 0,
                    reviewCount: ratingCount,
                    starSize: 12,
                    compact: true,
                  )
                else
                  ArcadeChip(label: _isAr ? 'جديد' : 'NEW'),

                const SizedBox(height: 8),
                _price(context),

                if (ratingCount > 10) ...[
                  const SizedBox(height: 6),
                  BestsellerBadge(lang: lang),
                ],

                if (showProgress && subject.progressPercent != null) ...[
                  const SizedBox(height: 10),
                  _Progress(percent: subject.progressPercent!, isAr: _isAr),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _price(BuildContext context) {
    final arc = context.arc;

    if (subject.isPaid != true) {
      // Free is the strongest thing a card can say, so it gets the one fill.
      return ArcadeChip(label: _isAr ? 'مجاني' : 'FREE', filled: true);
    }

    final amount = subject.priceAmount;
    return Text(
      '${amount?.toStringAsFixed(0) ?? '0'} ${subject.priceCurrency ?? (_isAr ? 'ل.س' : 'SYP')}',
      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: arc.ink),
    );
  }
}

class _Cover extends StatelessWidget {
  final Subject subject;
  const _Cover({required this.subject});

  static const _height = 124.0;

  @override
  Widget build(BuildContext context) {
    final url = subject.coverImageUrl;
    if (url != null && url.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: url,
        height: _height,
        width: double.infinity,
        fit: BoxFit.cover,
        placeholder: (_, _) => const _CoverFallback(),
        errorWidget: (_, _, _) => const _CoverFallback(),
      );
    }
    return const _CoverFallback();
  }
}

/// Stands in for a missing cover. A washed panel with the brand mark reads as
/// "this course has no picture yet" rather than as a failed image.
class _CoverFallback extends StatelessWidget {
  const _CoverFallback();

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return Container(
      height: _Cover._height,
      width: double.infinity,
      alignment: Alignment.center,
      color: arc.wash,
      child: Opacity(opacity: 0.55, child: LogoMark(size: 40)),
    );
  }
}

class _Progress extends StatelessWidget {
  /// Whole percent, 0-100. `Subject.progressPercent` is an `int` on the wire.
  final int percent;
  final bool isAr;

  const _Progress({required this.percent, required this.isAr});

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final done = percent >= 100;
    final value = (percent / 100).clamp(0.0, 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // A bordered track with a square fill: the arcade's progress bar. A
        // rounded LinearProgressIndicator would be the only curve on the card.
        Container(
          height: 10,
          decoration: BoxDecoration(
            color: arc.wash,
            border: Border.all(color: arc.line, width: Arc.borderWidth),
          ),
          child: FractionallySizedBox(
            alignment: AlignmentDirectional.centerStart,
            widthFactor: value,
            child: Container(color: done ? arc.mid : arc.accent),
          ),
        ),
        const SizedBox(height: 5),
        Text(
          done
              ? (isAr ? 'اكتمل' : 'Completed')
              : '$percent% ${isAr ? "مكتمل" : "complete"}',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: arc.inkSoft),
        ),
      ],
    );
  }
}
