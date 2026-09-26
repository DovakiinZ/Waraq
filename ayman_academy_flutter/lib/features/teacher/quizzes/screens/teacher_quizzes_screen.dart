import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/quiz.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';

final teacherQuizzesProvider = FutureProvider.family<List<Quiz>, String>((ref, subjectId) async {
  // Get all lessons for this subject, then their quizzes
  final lessons = await supabase
      .from('lessons')
      .select('id')
      .eq('subject_id', subjectId);
  final lessonIds = (lessons as List).map((l) => l['id'] as String).toList();
  if (lessonIds.isEmpty) return [];

  final data = await supabase
      .from('quizzes')
      .select('*, quiz_questions(*, quiz_options(*))')
      .inFilter('lesson_id', lessonIds);
  return (data as List).map((e) => Quiz.fromJson(e as Map<String, dynamic>)).toList();
});

class TeacherQuizzesScreen extends ConsumerWidget {
  final String subjectId;
  final String subjectTitle;
  const TeacherQuizzesScreen({super.key, required this.subjectId, required this.subjectTitle});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final quizzesAsync = ref.watch(teacherQuizzesProvider(subjectId));

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text('${t("اختبارات", "Quizzes")} - $subjectTitle')),
        body: quizzesAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (quizzes) {
            if (quizzes.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.quiz, size: 64, color: AppColors.inkMuted),
                    const SizedBox(height: 16),
                    Text(t('لا توجد اختبارات', 'No quizzes'), style: const TextStyle(color: AppColors.inkMuted)),
                  ],
                ),
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: quizzes.length,
              itemBuilder: (context, index) {
                final q = quizzes[index];
                final questionCount = q.questions?.length ?? 0;
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ExpansionTile(
                    leading: Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(
                        color: context.arc.wash,
                        border: Border.all(
                          color: q.isEnabled ? context.arc.line : AppColors.inkMuted,
                          width: Arc.borderWidth,
                        ),
                      ),
                      // `AppColors.primary` is the light-mode ink and does not
                      // invert; `arc.mid` is the readable green in both modes.
                      child: Center(child: Icon(Icons.quiz, color: q.isEnabled ? context.arc.mid : AppColors.inkMuted, size: 20)),
                    ),
                    title: Text('${t("اختبار", "Quiz")} ${index + 1}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      '$questionCount ${t("أسئلة", "questions")} | ${t("درجة النجاح", "Pass")}: ${q.passingScore}%',
                      style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                    ),
                    trailing: Switch(
                      value: q.isEnabled,
                      activeTrackColor: AppColors.success,
                      onChanged: (val) async {
                        await supabase.from('quizzes').update({'is_enabled': val}).eq('id', q.id);
                        ref.invalidate(teacherQuizzesProvider(subjectId));
                      },
                    ),
                    children: [
                      if (q.questions != null)
                        ...q.questions!.asMap().entries.map((entry) {
                          final i = entry.key;
                          final question = entry.value;
                          return ListTile(
                            dense: true,
                            leading: CircleAvatar(
                              radius: 12,
                              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                              child: Text('${i + 1}', style: const TextStyle(fontSize: 11, color: AppColors.primary)),
                            ),
                            title: Text(
                              question.question(lang),
                              style: const TextStyle(fontSize: 13),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              '${question.type == "true_false" ? t("صح/خطأ", "True/False") : question.type == "multi_select" ? t("متعدد الإجابات", "Multi-select") : t("اختيار متعدد", "MCQ")} | ${t("الجواب", "Answer")}: ${question.correctText(lang)}',
                              style: const TextStyle(fontSize: 11, color: AppColors.inkMuted),
                            ),
                          );
                        }),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
