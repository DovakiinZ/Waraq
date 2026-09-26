import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/shared/widgets/star_rating.dart';
import 'package:ayman_academy_app/features/student/subjects/providers/subjects_provider.dart';

class SubjectDetailScreen extends ConsumerStatefulWidget {
  final String subjectId;

  const SubjectDetailScreen({super.key, required this.subjectId});

  @override
  ConsumerState<SubjectDetailScreen> createState() => _SubjectDetailScreenState();
}

class _SubjectDetailScreenState extends ConsumerState<SubjectDetailScreen> {
  final Set<int> _expandedSections = {0}; // First section expanded by default

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final subjectAsync = ref.watch(subjectDetailProvider(widget.subjectId));
    final lessonsAsync = ref.watch(subjectLessonsProvider(widget.subjectId));
    final progressAsync = ref.watch(lessonProgressMapProvider(widget.subjectId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : Colors.white,
        body: subjectAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (subject) {
            if (subject == null) {
              return Center(child: Text(t('المادة غير موجودة', 'Subject not found')));
            }

            final teacherData = subject.teacherName;

            return Stack(
              children: [
                CustomScrollView(
                  slivers: [
                    // Hero image — clean, no gradient overlay
                    SliverAppBar(
                      expandedHeight: 220,
                      pinned: true,
                      backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
                      foregroundColor: isDark ? Colors.white : AppColors.ink,
                      leading: IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      elevation: 0,
                      surfaceTintColor: Colors.transparent,
                      flexibleSpace: FlexibleSpaceBar(
                        background: subject.coverImageUrl != null && subject.coverImageUrl!.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: subject.coverImageUrl!,
                                fit: BoxFit.cover,
                                errorWidget: (_, __, ___) => _placeholderCover(isDark),
                              )
                            : _placeholderCover(isDark),
                      ),
                    ),

                    // Course info section
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Title
                            Text(
                              subject.title(lang),
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: isDark ? AppColors.inkDark : AppColors.ink,
                                height: 1.3,
                              ),
                            ),
                            const SizedBox(height: 8),

                            // Teacher name
                            if (teacherData != null)
                              Text(
                                teacherData,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AppColors.inkMuted,
                                ),
                              ),
                            const SizedBox(height: 10),

                            // Star rating row
                            const StarRating(rating: 4.5, reviewCount: 0),
                            const SizedBox(height: 10),

                            // Enrollment / lesson count row
                            Row(
                              children: [
                                Icon(Icons.people_outline, size: 15, color: AppColors.inkMuted),
                                const SizedBox(width: 4),
                                Text(
                                  t('0 طالب', '0 students'),
                                  style: const TextStyle(fontSize: 13, color: AppColors.inkMuted),
                                ),
                                const SizedBox(width: 16),
                                Icon(Icons.play_circle_outline, size: 15, color: AppColors.inkMuted),
                                const SizedBox(width: 4),
                                lessonsAsync.when(
                                  data: (l) => Text(
                                    '${l.length} ${t("درس", "lessons")}',
                                    style: const TextStyle(fontSize: 13, color: AppColors.inkMuted),
                                  ),
                                  loading: () => const Text('...', style: TextStyle(fontSize: 13, color: AppColors.inkMuted)),
                                  error: (_, __) => const Text('-', style: TextStyle(fontSize: 13, color: AppColors.inkMuted)),
                                ),
                                if (subject.stage != null) ...[
                                  const SizedBox(width: 16),
                                  Icon(Icons.school_outlined, size: 15, color: AppColors.inkMuted),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      subject.stage!.title(lang),
                                      style: const TextStyle(fontSize: 13, color: AppColors.inkMuted),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ],
                            ),

                            // Price tag
                            if (subject.isPaid == true) ...[
                              const SizedBox(height: 12),
                              Text(
                                '${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}',
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? AppColors.inkDark : AppColors.ink,
                                ),
                              ),
                            ],

                            // Description
                            if (subject.description(lang).isNotEmpty) ...[
                              const SizedBox(height: 20),
                              Divider(height: 1, thickness: 0.5, color: isDark ? AppColors.borderDark : AppColors.border),
                              const SizedBox(height: 20),
                              Text(
                                t('عن هذه المادة', 'About this course'),
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: isDark ? AppColors.inkDark : AppColors.ink,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                subject.description(lang),
                                style: const TextStyle(
                                  fontSize: 14,
                                  height: 1.7,
                                  color: AppColors.inkMuted,
                                ),
                              ),
                            ],

                            // Curriculum header
                            const SizedBox(height: 20),
                            Divider(height: 1, thickness: 0.5, color: isDark ? AppColors.borderDark : AppColors.border),
                            const SizedBox(height: 20),
                            Row(
                              children: [
                                Text(
                                  t('المنهج الدراسي', 'Course Curriculum'),
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? AppColors.inkDark : AppColors.ink,
                                  ),
                                ),
                                const Spacer(),
                                lessonsAsync.when(
                                  data: (l) => Text(
                                    '${l.length} ${t("درس", "lessons")}',
                                    style: const TextStyle(color: AppColors.inkMuted, fontSize: 13),
                                  ),
                                  loading: () => const SizedBox.shrink(),
                                  error: (_, __) => const SizedBox.shrink(),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                          ],
                        ),
                      ),
                    ),

                    // Lessons list — expandable section style
                    lessonsAsync.when(
                      loading: () => const SliverFillRemaining(child: LoadingShimmer(itemCount: 3)),
                      error: (e, _) => SliverToBoxAdapter(child: Center(child: Text('$e'))),
                      data: (lessons) {
                        final progressMap = progressAsync.valueOrNull ?? {};
                        if (lessons.isEmpty) {
                          return SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Center(
                                child: Column(
                                  children: [
                                    Icon(Icons.article_outlined, size: 48, color: AppColors.inkMuted),
                                    const SizedBox(height: 12),
                                    Text(
                                      t('لا توجد دروس بعد', 'No lessons yet'),
                                      style: const TextStyle(color: AppColors.inkMuted),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }

                        // Wrap all lessons in a single expandable "section"
                        return SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(0, 0, 0, 100),
                            child: _buildCurriculumSection(
                              context: context,
                              sectionIndex: 0,
                              sectionTitle: t('الدروس', 'Lessons'),
                              lessons: lessons,
                              progressMap: progressMap,
                              lang: lang,
                              t: t,
                              isDark: isDark,
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),

                // Sticky bottom CTA
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : Colors.white,
                      border: Border(
                        top: BorderSide(
                          color: isDark ? AppColors.borderDark : AppColors.border,
                          width: 0.5,
                        ),
                      ),
                    ),
                    child: SafeArea(
                      top: false,
                      child: Row(
                        children: [
                          // Price on left
                          if (subject.isPaid == true)
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w800,
                                      color: isDark ? AppColors.inkDark : AppColors.ink,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          else
                            Expanded(
                              child: Text(
                                t('مجاني', 'Free'),
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.success,
                                ),
                              ),
                            ),
                          const SizedBox(width: 16),
                          // CTA button on right
                          SizedBox(
                            height: 50,
                            child: ElevatedButton(
                              onPressed: () {
                                if (subject.isPaid == true) {
                                  context.push('/student/marketplace/checkout/${widget.subjectId}');
                                } else {
                                  context.push('/student/subjects/subject/${widget.subjectId}');
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.accent,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.zero,
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 32),
                              ),
                              child: Text(
                                subject.isPaid == true
                                    ? t('اشترِ الآن', 'Buy now')
                                    : t('ابدأ التعلم', 'Start Learning'),
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildCurriculumSection({
    required BuildContext context,
    required int sectionIndex,
    required String sectionTitle,
    required List lessons,
    required Map<String, int> progressMap,
    required String lang,
    required String Function(String, String) t,
    required bool isDark,
  }) {
    final isExpanded = _expandedSections.contains(sectionIndex);

    return Column(
      children: [
        // Section header — tap to expand/collapse
        InkWell(
          onTap: () {
            setState(() {
              if (isExpanded) {
                _expandedSections.remove(sectionIndex);
              } else {
                _expandedSections.add(sectionIndex);
              }
            });
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: BoxDecoration(
              color: isDark ? AppColors.secondaryDark : AppColors.secondary,
              border: Border(
                top: BorderSide(color: isDark ? AppColors.borderDark : AppColors.border, width: 0.5),
                bottom: BorderSide(color: isDark ? AppColors.borderDark : AppColors.border, width: 0.5),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  isExpanded ? Icons.remove : Icons.add,
                  size: 20,
                  color: isDark ? AppColors.inkDark : AppColors.ink,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    sectionTitle,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isDark ? AppColors.inkDark : AppColors.ink,
                    ),
                  ),
                ),
                Text(
                  '${lessons.length} ${t("درس", "lessons")}',
                  style: const TextStyle(fontSize: 13, color: AppColors.inkMuted),
                ),
              ],
            ),
          ),
        ),

        // Lesson items
        if (isExpanded)
          ...List.generate(lessons.length, (index) {
            final lesson = lessons[index];
            final progress = progressMap[lesson.id] ?? 0;
            final isCompleted = progress >= 100;

            return Column(
              children: [
                InkWell(
                  onTap: () => context.push('/student/subjects/subject/${widget.subjectId}/lesson/${lesson.id}'),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    child: Row(
                      children: [
                        // Numbered circle or check
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: isCompleted
                                ? AppColors.success.withValues(alpha: 0.12)
                                : progress > 0
                                    ? AppColors.accent.withValues(alpha: 0.12)
                                    : (isDark ? AppColors.secondaryDark : AppColors.secondary),
                            border: Border.all(color: context.arc.line, width: Arc.borderWidth),
                          ),
                          child: Center(
                            child: isCompleted
                                ? const Icon(Icons.check, color: AppColors.success, size: 16)
                                : Text(
                                    '${index + 1}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13,
                                      color: progress > 0 ? AppColors.accent : AppColors.inkMuted,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 14),

                        // Title + duration
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                lesson.title(lang),
                                style: TextStyle(
                                  fontWeight: FontWeight.w500,
                                  fontSize: 14,
                                  color: isDark ? AppColors.inkDark : AppColors.ink,
                                ),
                              ),
                              if (lesson.durationMinutes != null) ...[
                                const SizedBox(height: 3),
                                Text(
                                  '${lesson.durationMinutes} ${t("د", "min")}',
                                  style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                                ),
                              ],
                            ],
                          ),
                        ),

                        // Progress badge or lock/play icon
                        if (progress > 0 && !isCompleted)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.accent.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.zero,
                            ),
                            child: Text(
                              '$progress%',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.accent,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          )
                        else
                          Icon(
                            lesson.isPaid ? Icons.lock_outline : Icons.play_circle_outline,
                            size: 20,
                            color: lesson.isPaid ? AppColors.inkMuted : AppColors.accent,
                          ),
                      ],
                    ),
                  ),
                ),
                // Thin divider between lessons (not after last)
                if (index < lessons.length - 1)
                  Divider(
                    height: 1,
                    thickness: 0.5,
                    indent: 66,
                    color: isDark ? AppColors.borderDark : AppColors.border,
                  ),
              ],
            );
          }),
      ],
    );
  }

  Widget _placeholderCover(bool isDark) {
    return Container(
      color: isDark ? AppColors.secondaryDark : AppColors.secondary,
      child: Center(
        child: Icon(
          Icons.menu_book,
          size: 60,
          color: isDark ? AppColors.borderDark : AppColors.border,
        ),
      ),
    );
  }
}
