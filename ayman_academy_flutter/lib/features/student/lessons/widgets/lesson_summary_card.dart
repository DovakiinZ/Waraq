import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/features/student/lessons/providers/lesson_provider.dart';

/// The AI summary as a student meets it, above the lesson body.
///
/// The web counterpart is `src/components/student/LessonSummaryCard.tsx`;
/// keep the copy and the approved-only rule in step.
///
/// Renders NOTHING unless an approved summary with content came back. RLS
/// already limits students to approved rows, but the status is re-checked so
/// a teacher opening the student view does not see their own draft here —
/// their preview lives in the lesson editor.
class LessonSummaryCard extends ConsumerWidget {
  final String lessonId;

  const LessonSummaryCard({super.key, required this.lessonId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final async = ref.watch(lessonSummaryProvider(lessonId));

    final summary = async.valueOrNull;
    if (summary == null || !summary.isApproved || !summary.hasContent(lang)) {
      return const SizedBox.shrink();
    }

    final arc = context.arc;
    final rtl = summary.isRtlFor(lang);
    final keyPoints = summary.keyPoints(lang);
    final paragraphs = summary.paragraphs(lang);
    final slides = summary.slides(lang);

    return Directionality(
      textDirection: rtl ? TextDirection.rtl : TextDirection.ltr,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: ArcadeCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.auto_awesome, size: 18, color: arc.mid),
                  const SizedBox(width: 8),
                  Text(
                    t('الملخص الذكي', 'AI summary'),
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: arc.ink),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              for (final point in keyPoints)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• ', style: TextStyle(color: arc.mid, fontWeight: FontWeight.w700)),
                      Expanded(
                        child: Text(point,
                            style: TextStyle(fontSize: 14, height: 1.6, color: arc.ink)),
                      ),
                    ],
                  ),
                ),

              if (keyPoints.isNotEmpty && paragraphs.isNotEmpty) const SizedBox(height: 10),

              for (final para in paragraphs)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(para,
                      style: TextStyle(fontSize: 14, height: 1.7, color: arc.inkSoft)),
                ),

              if (slides.isNotEmpty) ...[
                const SizedBox(height: 4),
                const PixelDivider(),
                const SizedBox(height: 12),
                ArcadeButton.nav(
                  label: t('عرض كشرائح', 'View as slides'),
                  icon: Icons.slideshow_outlined,
                  onPressed: () => context.push('/student/subjects/lesson/$lessonId/slides'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
