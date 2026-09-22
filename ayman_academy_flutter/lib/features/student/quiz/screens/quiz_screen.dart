import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/quiz.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/quiz/providers/quiz_provider.dart';

class QuizScreen extends ConsumerStatefulWidget {
  final String quizId;
  const QuizScreen({super.key, required this.quizId});

  @override
  ConsumerState<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends ConsumerState<QuizScreen> {
  /// question id -> the set of option ids the student picked.
  /// A set (not a single id) so `multi_select` questions work too.
  final Map<String, Set<String>> _answers = {};
  int _currentIndex = 0;
  bool _submitted = false;
  Map<String, dynamic>? _result;
  bool _submitting = false;

  Future<void> _submit(Quiz quiz) async {
    setState(() => _submitting = true);
    try {
      final result = await QuizService.submitQuiz(quiz: quiz, answers: _answers);
      setState(() { _result = result; _submitted = true; });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final quizAsync = ref.watch(quizDetailProvider(widget.quizId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back_ios_new_rounded,
              size: 20,
              color: isDark ? AppColors.inkDark : AppColors.ink,
            ),
            onPressed: () => Navigator.maybePop(context),
          ),
          title: Text(
            t('اختبار', 'Quiz'),
            style: TextStyle(
              fontFamily: 'IBMPlexSansArabic',
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.inkDark : AppColors.ink,
            ),
          ),
          centerTitle: true,
        ),
        body: quizAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (quiz) {
            if (quiz == null) return Center(child: Text(t('الاختبار غير موجود', 'Quiz not found')));
            final questions = quiz.questions ?? [];
            if (questions.isEmpty) return Center(child: Text(t('لا توجد أسئلة', 'No questions')));

            if (_submitted && _result != null) return _buildResult(quiz, questions, t, lang, isDark);

            final q = questions[_currentIndex];
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Progress bar - thin 3px
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: LinearProgressIndicator(
                      value: (_currentIndex + 1) / questions.length,
                      backgroundColor: isDark ? AppColors.secondaryDark : AppColors.secondary,
                      valueColor: const AlwaysStoppedAnimation(AppColors.accent),
                      minHeight: 3,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '${t("سؤال", "Question")} ${_currentIndex + 1} / ${questions.length}',
                    style: const TextStyle(
                      fontFamily: 'IBMPlexSansArabic',
                      color: AppColors.inkMuted,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Question text
                  Text(
                    q.question(lang),
                    style: TextStyle(
                      fontFamily: 'IBMPlexSansArabic',
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      height: 1.5,
                      color: isDark ? AppColors.inkDark : AppColors.ink,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Options
                  Expanded(
                    child: ListView.separated(
                      itemCount: q.options.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (_, i) {
                        final option = q.options[i];
                        final picked = _answers[q.id] ?? const <String>{};
                        final selected = picked.contains(option.id);
                        return GestureDetector(
                          onTap: () => setState(() {
                            if (q.isMultiSelect) {
                              final next = {...picked};
                              selected ? next.remove(option.id) : next.add(option.id);
                              _answers[q.id] = next;
                            } else {
                              _answers[q.id] = {option.id};
                            }
                          }),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: selected
                                  ? AppColors.accent.withValues(alpha: 0.08)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: selected
                                    ? AppColors.accent
                                    : (isDark ? AppColors.borderDark : AppColors.border),
                                width: selected ? 1.5 : 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                // Custom radio circle
                                Container(
                                  width: 22,
                                  height: 22,
                                  decoration: BoxDecoration(
                                    shape: q.isMultiSelect ? BoxShape.rectangle : BoxShape.circle,
                                    borderRadius: q.isMultiSelect ? BorderRadius.circular(5) : null,
                                    color: selected ? AppColors.accent : Colors.transparent,
                                    border: Border.all(
                                      color: selected ? AppColors.accent : AppColors.inkMuted,
                                      width: selected ? 0 : 1.5,
                                    ),
                                  ),
                                  child: selected
                                      ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
                                      : null,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    option.text(lang),
                                    style: TextStyle(
                                      fontFamily: 'IBMPlexSansArabic',
                                      fontSize: 15,
                                      fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                                      color: isDark ? AppColors.inkDark : AppColors.ink,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Navigation buttons
                  Row(
                    children: [
                      if (_currentIndex > 0)
                        Expanded(
                          child: SizedBox(
                            height: 50,
                            child: OutlinedButton(
                              onPressed: () => setState(() => _currentIndex--),
                              style: OutlinedButton.styleFrom(
                                side: BorderSide(
                                  color: isDark ? AppColors.borderDark : AppColors.border,
                                  width: 1,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                elevation: 0,
                              ),
                              child: Text(
                                t('السابق', 'Previous'),
                                style: TextStyle(
                                  fontFamily: 'IBMPlexSansArabic',
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.inkDark : AppColors.ink,
                                ),
                              ),
                            ),
                          ),
                        ),
                      if (_currentIndex > 0) const SizedBox(width: 12),
                      Expanded(
                        child: SizedBox(
                          height: 50,
                          child: ElevatedButton(
                            onPressed: _submitting ? null : () {
                              if (_currentIndex < questions.length - 1) {
                                setState(() => _currentIndex++);
                              } else {
                                _submit(quiz);
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.accent,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              elevation: 0,
                            ),
                            child: _submitting
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : Text(
                                    _currentIndex < questions.length - 1 ? t('التالي', 'Next') : t('إرسال', 'Submit'),
                                    style: const TextStyle(
                                      fontFamily: 'IBMPlexSansArabic',
                                      fontWeight: FontWeight.w700,
                                      fontSize: 15,
                                    ),
                                  ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildResult(Quiz quiz, List<QuizQuestion> questions, String Function(String, String) t, String lang, bool isDark) {
    final passed = _result!['passed'] as bool;
    final score = _result!['score'] as double;
    final correct = _result!['correct'] as int;
    final total = _result!['total'] as int;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const SizedBox(height: 32),

          // Large score circle
          Container(
            width: 140,
            height: 140,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: passed ? AppColors.accent : AppColors.error,
                width: 4,
              ),
            ),
            alignment: Alignment.center,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '${score.toInt()}%',
                  style: TextStyle(
                    fontFamily: 'IBMPlexSansArabic',
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    color: passed ? AppColors.accent : AppColors.error,
                  ),
                ),
                Icon(
                  passed ? Icons.check_rounded : Icons.close_rounded,
                  color: passed ? AppColors.accent : AppColors.error,
                  size: 24,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text(
            passed ? t('أحسنت! نجحت', 'Great! You passed') : t('لم تنجح هذه المرة', 'Not passed this time'),
            style: TextStyle(
              fontFamily: 'IBMPlexSansArabic',
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: isDark ? AppColors.inkDark : AppColors.ink,
            ),
          ),
          const SizedBox(height: 8),

          // Clean stats
          Text(
            '$correct / $total ${t("صحيح", "correct")}',
            style: const TextStyle(
              fontFamily: 'IBMPlexSansArabic',
              fontSize: 15,
              color: AppColors.inkMuted,
            ),
          ),

          if (passed) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '+100 XP',
                style: TextStyle(
                  fontFamily: 'IBMPlexSansArabic',
                  color: AppColors.gold,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
            ),
          ],
          const SizedBox(height: 36),

          // Review answers header
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Text(
              t('مراجعة الإجابات', 'Review Answers'),
              style: TextStyle(
                fontFamily: 'IBMPlexSansArabic',
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: isDark ? AppColors.inkDark : AppColors.ink,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Review list
          ...questions.asMap().entries.map((entry) {
            final i = entry.key;
            final q = entry.value;
            final picked = _answers[q.id] ?? const <String>{};
            final expected = q.correctOptionIds;
            final isCorrect = expected.isNotEmpty &&
                picked.length == expected.length &&
                picked.containsAll(expected);
            final userAnswer = q.options
                .where((o) => picked.contains(o.id))
                .map((o) => o.text(lang))
                .join('، ');
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.border,
                  width: 0.5,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        isCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                        color: isCorrect ? AppColors.success : AppColors.error,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${t("سؤال", "Q")} ${i + 1}',
                        style: TextStyle(
                          fontFamily: 'IBMPlexSansArabic',
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.inkDark : AppColors.ink,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    q.question(lang),
                    style: TextStyle(
                      fontFamily: 'IBMPlexSansArabic',
                      fontSize: 14,
                      color: isDark ? AppColors.inkDark : AppColors.ink,
                    ),
                  ),
                  if (!isCorrect) ...[
                    const SizedBox(height: 8),
                    Text(
                      '${t("إجابتك", "Your answer")}: $userAnswer',
                      style: const TextStyle(
                        fontFamily: 'IBMPlexSansArabic',
                        color: AppColors.error,
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      '${t("الصحيح", "Correct")}: ${q.correctText(lang)}',
                      style: const TextStyle(
                        fontFamily: 'IBMPlexSansArabic',
                        color: AppColors.success,
                        fontSize: 13,
                      ),
                    ),
                  ],
                  if (q.explanation(lang) != null && q.explanation(lang)!.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.info.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        q.explanation(lang)!,
                        style: const TextStyle(
                          fontFamily: 'IBMPlexSansArabic',
                          fontSize: 12,
                          color: AppColors.info,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            );
          }),
          const SizedBox(height: 20),

          // Go back button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                elevation: 0,
              ),
              child: Text(
                t('العودة', 'Go Back'),
                style: const TextStyle(
                  fontFamily: 'IBMPlexSansArabic',
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
