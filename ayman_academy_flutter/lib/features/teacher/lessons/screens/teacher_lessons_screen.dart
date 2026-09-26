import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/lesson.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/teacher/lessons/screens/lesson_editor_screen.dart';
import 'package:ayman_academy_app/features/teacher/quizzes/screens/quiz_builder_screen.dart';

final teacherLessonsProvider = FutureProvider.family<List<Lesson>, String>((ref, subjectId) async {
  final data = await supabase
      .from('lessons')
      .select('*')
      .eq('subject_id', subjectId)
      .order('sort_order');
  return (data as List).map((e) => Lesson.fromJson(e as Map<String, dynamic>)).toList();
});

class TeacherLessonsScreen extends ConsumerWidget {
  final String subjectId;
  final String subjectTitle;
  const TeacherLessonsScreen({super.key, required this.subjectId, required this.subjectTitle});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final lessonsAsync = ref.watch(teacherLessonsProvider(subjectId));

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          title: Text(subjectTitle),
          actions: [
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              tooltip: t('درس جديد', 'New Lesson'),
              onPressed: () async {
                final result = await Navigator.push(context, MaterialPageRoute(
                  builder: (_) => LessonEditorScreen(subjectId: subjectId),
                ));
                if (result == true) ref.invalidate(teacherLessonsProvider(subjectId));
              },
            ),
          ],
        ),
        body: lessonsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (lessons) {
            if (lessons.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.article, size: 64, color: AppColors.inkMuted),
                    const SizedBox(height: 16),
                    Text(t('لا توجد دروس', 'No lessons yet'), style: const TextStyle(color: AppColors.inkMuted)),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(teacherLessonsProvider(subjectId)),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: lessons.length,
                itemBuilder: (context, index) {
                  final l = lessons[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Container(
                        width: 36, height: 36,
                        decoration: BoxDecoration(
                          color: context.arc.wash,
                          border: Border.all(
                            color: l.isPublished ? AppColors.success : AppColors.inkMuted,
                            width: Arc.borderWidth,
                          ),
                        ),
                        child: Center(
                          child: Text('${index + 1}', style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: l.isPublished ? AppColors.success : AppColors.inkMuted,
                          )),
                        ),
                      ),
                      title: Text(l.title(lang), style: const TextStyle(fontWeight: FontWeight.w500)),
                      subtitle: Row(
                        children: [
                          Container(
                            margin: const EdgeInsets.only(top: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: l.isPublished ? AppColors.success.withValues(alpha: 0.1) : AppColors.inkMuted.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.zero,
                            ),
                            child: Text(
                              l.isPublished ? t('منشور', 'Published') : t('مسودة', 'Draft'),
                              style: TextStyle(fontSize: 10, color: l.isPublished ? AppColors.success : AppColors.inkMuted),
                            ),
                          ),
                          if (l.isPaid) ...[
                            const SizedBox(width: 6),
                            Container(
                              margin: const EdgeInsets.only(top: 4),
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                color: AppColors.gold.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.zero,
                              ),
                              child: Text(t('مدفوع', 'Paid'), style: const TextStyle(fontSize: 10, color: AppColors.gold)),
                            ),
                          ],
                          if (l.durationMinutes != null) ...[
                            const SizedBox(width: 6),
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text('${l.durationMinutes} ${t("د", "min")}', style: const TextStyle(fontSize: 10, color: AppColors.inkMuted)),
                            ),
                          ],
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.quiz, size: 18, color: AppColors.info),
                            tooltip: t('اختبار', 'Quiz'),
                            onPressed: () {
                              Navigator.push(context, MaterialPageRoute(
                                builder: (_) => QuizBuilderScreen(lessonId: l.id, lessonTitle: l.title(lang)),
                              ));
                            },
                          ),
                          Switch(
                            value: l.isPublished,
                            activeTrackColor: AppColors.success,
                            onChanged: (val) async {
                              await supabase.from('lessons').update({'is_published': val}).eq('id', l.id);
                              ref.invalidate(teacherLessonsProvider(subjectId));
                            },
                          ),
                        ],
                      ),
                      onTap: () async {
                        final result = await Navigator.push(context, MaterialPageRoute(
                          builder: (_) => LessonEditorScreen(subjectId: subjectId, lessonId: l.id),
                        ));
                        if (result == true) ref.invalidate(teacherLessonsProvider(subjectId));
                      },
                    ),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
