import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/teacher/lessons/screens/teacher_lessons_screen.dart';
import 'package:ayman_academy_app/features/teacher/quizzes/screens/teacher_quizzes_screen.dart';

final teacherSubjectsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  final data = await supabase
      .from('subjects')
      .select('*, stage:stages(title_ar, title_en)')
      .eq('teacher_id', userId)
      .order('sort_order');

  List<Map<String, dynamic>> result = [];
  for (final s in (data as List)) {
    final subjectId = s['id'] as String;
    int lessonCount = 0;
    int studentCount = 0;
    try {
      final lessons = await supabase.from('lessons').select('id').eq('subject_id', subjectId);
      lessonCount = (lessons as List).length;
    } catch (_) {}
    try {
      final students = await supabase.from('student_subjects').select('id').eq('subject_id', subjectId);
      studentCount = (students as List).length;
    } catch (_) {}
    result.add({
      'subject': Subject.fromJson(s as Map<String, dynamic>),
      'lessons': lessonCount,
      'students': studentCount,
    });
  }
  return result;
});

class TeacherSubjectsScreen extends ConsumerWidget {
  const TeacherSubjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final subjectsAsync = ref.watch(teacherSubjectsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        body: CustomScrollView(
          slivers: [
            SliverAppBar(
              floating: true,
              leading: IconButton(
                icon: const Icon(Icons.menu_rounded),
                onPressed: () => Scaffold.of(context).openDrawer(),
              ),
              title: Text(t('موادي', 'My Courses')),
              actions: [
                IconButton(
                  icon: const Icon(Icons.add_rounded, size: 26),
                  onPressed: () async {
                    final result = await context.push('/teacher/course/new');
                    if (result == true) ref.invalidate(teacherSubjectsProvider);
                  },
                ),
              ],
            ),
            subjectsAsync.when(
              loading: () => const SliverFillRemaining(child: LoadingShimmer()),
              error: (e, _) => SliverFillRemaining(child: Center(child: Text('$e'))),
              data: (subjects) {
                if (subjects.isEmpty) {
                  return SliverFillRemaining(
                    child: _EmptyState(t: t, isDark: isDark, onCreateTap: () async {
                      final result = await context.push('/teacher/course/new');
                      if (result == true) ref.invalidate(teacherSubjectsProvider);
                    }),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate((context, index) {
                      if (index == 0) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: _SummaryBar(
                            courseCount: subjects.length,
                            totalLessons: subjects.fold(0, (sum, s) => sum + (s['lessons'] as int)),
                            totalStudents: subjects.fold(0, (sum, s) => sum + (s['students'] as int)),
                            t: t, isDark: isDark,
                          ),
                        );
                      }
                      final item = subjects[index - 1];
                      final s = item['subject'] as Subject;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _CourseCard(
                          subject: s, lang: lang, t: t,
                          lessonCount: item['lessons'] as int,
                          studentCount: item['students'] as int,
                          isDark: isDark,
                          onLessonsTap: () => Navigator.push(context, MaterialPageRoute(
                            builder: (_) => TeacherLessonsScreen(subjectId: s.id, subjectTitle: s.title(lang)),
                          )),
                          onQuizzesTap: () => Navigator.push(context, MaterialPageRoute(
                            builder: (_) => TeacherQuizzesScreen(subjectId: s.id, subjectTitle: s.title(lang)),
                          )),
                          onEditTap: () async {
                            final result = await context.push('/teacher/course/${s.id}/edit');
                            if (result == true) ref.invalidate(teacherSubjectsProvider);
                          },
                        ),
                      );
                    }, childCount: subjects.length + 1),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── Summary Bar (purple gradient) ──
class _SummaryBar extends StatelessWidget {
  final int courseCount, totalLessons, totalStudents;
  final Function t;
  final bool isDark;
  const _SummaryBar({required this.courseCount, required this.totalLessons, required this.totalStudents, required this.t, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        // The arcade band gradient, which already carries its own dark stops —
        // hence no `isDark` branch here any more.
        gradient: context.arc.gradient,
        border: Border.all(color: context.arc.line, width: Arc.borderWidth),
        boxShadow: context.arc.hard(Arc.cardRest),
      ),
      child: Row(
        children: [
          _MiniStat(value: '$courseCount', label: t('مواد', 'Courses') as String),
          _statDivider(),
          _MiniStat(value: '$totalLessons', label: t('دروس', 'Lessons') as String),
          _statDivider(),
          _MiniStat(value: '$totalStudents', label: t('طلاب', 'Students') as String),
        ],
      ),
    );
  }

  Widget _statDivider() => Container(
        width: Arc.borderWidth,
        height: 28,
        margin: const EdgeInsets.symmetric(horizontal: 14),
        color: Colors.white.withValues(alpha: 0.28),
      );
}

class _MiniStat extends StatelessWidget {
  final String value, label;
  const _MiniStat({required this.value, required this.label});
  @override
  Widget build(BuildContext context) {
    return Expanded(child: Column(children: [
      Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: context.arc.onInk)),
      const SizedBox(height: 2),
      Text(label, style: TextStyle(fontSize: 11, color: context.arc.onInkMuted, fontWeight: FontWeight.w500)),
    ]));
  }
}

// ── Course Card ──
class _CourseCard extends StatelessWidget {
  final Subject subject;
  final String lang;
  final Function t;
  final int lessonCount, studentCount;
  final bool isDark;
  final VoidCallback onLessonsTap, onQuizzesTap, onEditTap;

  const _CourseCard({
    required this.subject, required this.lang, required this.t,
    required this.lessonCount, required this.studentCount, required this.isDark,
    required this.onLessonsTap, required this.onQuizzesTap, required this.onEditTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: BorderRadius.zero,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Cover
          Stack(children: [
            if (subject.coverImageUrl != null && subject.coverImageUrl!.isNotEmpty)
              CachedNetworkImage(
                imageUrl: subject.coverImageUrl!, height: 150, width: double.infinity, fit: BoxFit.cover,
                errorWidget: (_, _, _) => _placeholder(context),
              )
            else _placeholder(context),
            Positioned(
              top: 12, right: 12, left: 12,
              child: Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: subject.isActive ? AppColors.success.withValues(alpha: 0.9) : AppColors.inkMuted.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.zero,
                  ),
                  child: Text(
                    subject.isActive ? t('نشط', 'Active') as String : t('غير نشط', 'Inactive') as String,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
                  ),
                ),
                const Spacer(),
                if (subject.isPaid == true)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.zero,
                    ),
                    child: Text(
                      '${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ),
              ]),
            ),
          ]),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Title
              Text(subject.title(lang), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800), maxLines: 2, overflow: TextOverflow.ellipsis),
              if (subject.stage != null) ...[
                const SizedBox(height: 4),
                Text(subject.stage!.title(lang), style: const TextStyle(fontSize: 13, color: AppColors.inkMuted)),
              ],
              const SizedBox(height: 14),

              // Stats
              Row(children: [
                _StatChip(icon: Icons.play_lesson_rounded, value: '$lessonCount', label: t('دروس', 'Lessons') as String, isDark: isDark),
                const SizedBox(width: 8),
                _StatChip(icon: Icons.people_rounded, value: '$studentCount', label: t('طلاب', 'Students') as String, isDark: isDark),
                const SizedBox(width: 8),
                _StatChip(icon: Icons.star_rounded, value: (subject.averageRating ?? 0).toStringAsFixed(1), label: t('تقييم', 'Rating') as String, isDark: isDark),
              ]),
              const SizedBox(height: 16),

              // Actions
              Row(children: [
                Expanded(child: _ActionBtn(icon: Icons.play_lesson_rounded, label: t('الدروس', 'Lessons') as String, color: AppColors.accent, onTap: onLessonsTap)),
                const SizedBox(width: 8),
                Expanded(child: _ActionBtn(icon: Icons.quiz_rounded, label: t('اختبارات', 'Quizzes') as String, color: AppColors.info, onTap: onQuizzesTap)),
                const SizedBox(width: 8),
                Expanded(child: _ActionBtn(icon: Icons.edit_rounded, label: t('تعديل', 'Edit') as String, color: AppColors.warning, onTap: onEditTap)),
              ]),
            ]),
          ),
        ],
      ),
    );
  }

  /// Stands in for a missing cover. A flat wash with the brand mark, so it
  /// reads as "no picture yet" rather than as a failed image load.
  Widget _placeholder(BuildContext context) => Container(
    height: 150,
    width: double.infinity,
    color: context.arc.wash,
    child: const Center(child: Opacity(opacity: 0.55, child: LogoMark(size: 44))),
  );
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String value, label;
  final bool isDark;
  const _StatChip({required this.icon, required this.value, required this.label, required this.isDark});
  @override
  Widget build(BuildContext context) {
    return Expanded(child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(color: isDark ? AppColors.secondaryDark : AppColors.background, borderRadius: BorderRadius.zero),
      child: Column(children: [
        Icon(icon, size: 16, color: AppColors.inkMuted),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.inkMuted)),
      ]),
    ));
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ActionBtn({required this.icon, required this.label, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.zero),
        child: Column(children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color), maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
      ),
    );
  }
}

// ── Empty State ──
class _EmptyState extends StatelessWidget {
  final Function t;
  final bool isDark;
  final VoidCallback onCreateTap;
  const _EmptyState({required this.t, required this.isDark, required this.onCreateTap});

  @override
  Widget build(BuildContext context) {
    return Center(child: Padding(
      padding: const EdgeInsets.all(40),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(color: AppColors.accent.withValues(alpha: 0.1), borderRadius: BorderRadius.zero),
          child: Icon(Icons.school_rounded, size: 40, color: AppColors.accent.withValues(alpha: 0.5)),
        ),
        const SizedBox(height: 24),
        Text(t('لا توجد مواد بعد', 'No courses yet') as String, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Text(
          t('ابدأ بإنشاء أول مادة دراسية لطلابك', 'Create your first course for students') as String,
          style: const TextStyle(fontSize: 15, color: AppColors.inkMuted, height: 1.5),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: 200, height: 48,
          child: ElevatedButton.icon(
            onPressed: onCreateTap,
            icon: const Icon(Icons.add_rounded),
            label: Text(t('إنشاء مادة', 'Create Course') as String),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero)),
          ),
        ),
      ]),
    ));
  }
}
