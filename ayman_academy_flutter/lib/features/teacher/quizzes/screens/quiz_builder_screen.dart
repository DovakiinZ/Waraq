import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/quiz.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class QuizBuilderScreen extends ConsumerStatefulWidget {
  final String lessonId;
  final String lessonTitle;
  const QuizBuilderScreen({super.key, required this.lessonId, required this.lessonTitle});

  @override
  ConsumerState<QuizBuilderScreen> createState() => _QuizBuilderScreenState();
}

class _QuizBuilderScreenState extends ConsumerState<QuizBuilderScreen> {
  Quiz? _quiz;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadQuiz();
  }

  Future<void> _loadQuiz() async {
    setState(() => _loading = true);
    try {
      final data = await supabase
          .from('quizzes')
          .select('*, quiz_questions(*, quiz_options(*))')
          .eq('lesson_id', widget.lessonId)
          .maybeSingle();
      if (data != null) {
        _quiz = Quiz.fromJson(data);
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _createQuiz() async {
    setState(() => _saving = true);
    try {
      final data = await supabase.from('quizzes').insert({
        'lesson_id': widget.lessonId,
        'is_enabled': true,
        'is_required': false,
        'passing_score': 60,
        'attempts_allowed': 3,
      }).select().single();
      _quiz = Quiz.fromJson(data);
      setState(() {});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showAddQuestionDialog() {
    final t = ref.read(languageProvider.notifier).t;
    final questionArController = TextEditingController();
    final questionEnController = TextEditingController();
    final explanationController = TextEditingController();
    String type = 'mcq';

    // Editable choices. `true_false` uses a fixed pair; the others start blank.
    List<TextEditingController> optionAr =
        List.generate(4, (_) => TextEditingController());
    List<TextEditingController> optionEn =
        List.generate(4, (_) => TextEditingController());
    Set<int> correctIndexes = {0};

    void applyType(String next, void Function(void Function()) setDialogState) {
      setDialogState(() {
        type = next;
        if (type == 'true_false') {
          optionAr = [TextEditingController(text: 'صح'), TextEditingController(text: 'خطأ')];
          optionEn = [TextEditingController(text: 'True'), TextEditingController(text: 'False')];
        } else {
          optionAr = List.generate(4, (_) => TextEditingController());
          optionEn = List.generate(4, (_) => TextEditingController());
        }
        correctIndexes = {0};
      });
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(t('سؤال جديد', 'New Question')),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<String>(
                  segments: [
                    ButtonSegment(value: 'mcq', label: Text(t('اختيار', 'MCQ'))),
                    ButtonSegment(value: 'true_false', label: Text(t('صح/خطأ', 'T/F'))),
                    ButtonSegment(value: 'multi_select', label: Text(t('متعدد', 'Multi'))),
                  ],
                  selected: {type},
                  onSelectionChanged: (v) => applyType(v.first, setDialogState),
                ),
                const SizedBox(height: 16),

                TextField(
                  controller: questionArController,
                  maxLines: 2,
                  decoration: InputDecoration(labelText: t('نص السؤال (عربي)', 'Question (Arabic)')),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: questionEnController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: t('نص السؤال (إنجليزي - اختياري)', 'Question (English - optional)'),
                  ),
                ),
                const SizedBox(height: 16),

                if (type == 'multi_select')
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      t('اختر كل الإجابات الصحيحة', 'Mark every correct answer'),
                      style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                    ),
                  ),

                ...List.generate(optionAr.length, (i) {
                  final isCorrect = correctIndexes.contains(i);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Single-answer types keep one correct choice; multi_select toggles.
                        type == 'multi_select'
                            ? Checkbox(
                                value: isCorrect,
                                activeColor: AppColors.success,
                                onChanged: (v) => setDialogState(() {
                                  if (v == true) {
                                    correctIndexes.add(i);
                                  } else {
                                    correctIndexes.remove(i);
                                  }
                                }),
                              )
                            : Radio<int>(
                                value: i,
                                groupValue: correctIndexes.isEmpty ? -1 : correctIndexes.first,
                                activeColor: AppColors.success,
                                onChanged: (v) => setDialogState(() => correctIndexes = {v!}),
                              ),
                        Expanded(
                          child: Column(
                            children: [
                              TextField(
                                controller: optionAr[i],
                                readOnly: type == 'true_false',
                                decoration: InputDecoration(
                                  hintText: '${t("خيار", "Option")} ${i + 1}',
                                  isDense: true,
                                ),
                              ),
                              if (type != 'true_false')
                                TextField(
                                  controller: optionEn[i],
                                  decoration: InputDecoration(
                                    hintText: t('بالإنجليزية (اختياري)', 'English (optional)'),
                                    isDense: true,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),

                const SizedBox(height: 12),
                TextField(
                  controller: explanationController,
                  maxLines: 2,
                  decoration: InputDecoration(labelText: t('شرح الإجابة (اختياري)', 'Explanation (optional)')),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t('إلغاء', 'Cancel'))),
            ElevatedButton(
              onPressed: _saving
                  ? null
                  : () => _saveQuestion(
                        ctx: ctx,
                        type: type,
                        questionAr: questionArController.text.trim(),
                        questionEn: questionEnController.text.trim(),
                        explanation: explanationController.text.trim(),
                        optionAr: optionAr.map((c) => c.text.trim()).toList(),
                        optionEn: optionEn.map((c) => c.text.trim()).toList(),
                        correctIndexes: correctIndexes,
                      ),
              child: Text(t('إضافة', 'Add')),
            ),
          ],
        ),
      ),
    );
  }

  /// Writes the question, then its choices into `quiz_options`.
  /// The two inserts are not a transaction, so a failed options insert rolls
  /// the question back by hand -- otherwise the quiz keeps a question that can
  /// never be answered.
  Future<void> _saveQuestion({
    required BuildContext ctx,
    required String type,
    required String questionAr,
    required String questionEn,
    required String explanation,
    required List<String> optionAr,
    required List<String> optionEn,
    required Set<int> correctIndexes,
  }) async {
    final t = ref.read(languageProvider.notifier).t;
    final messenger = ScaffoldMessenger.of(context);

    void fail(String message) =>
        messenger.showSnackBar(SnackBar(content: Text(message), backgroundColor: AppColors.error));

    if (questionAr.isEmpty) {
      fail(t('الرجاء إدخال نص السؤال', 'Please enter the question text'));
      return;
    }

    // Keep only filled choices, preserving which of them are correct.
    final choices = <Map<String, dynamic>>[];
    for (var i = 0; i < optionAr.length; i++) {
      if (optionAr[i].isEmpty) continue;
      choices.add({
        'text_ar': optionAr[i],
        'text_en': optionEn[i].isNotEmpty ? optionEn[i] : null,
        'is_correct': correctIndexes.contains(i),
        'sort_order': choices.length,
      });
    }

    if (choices.length < 2) {
      fail(t('أضف خيارين على الأقل', 'Add at least two options'));
      return;
    }
    if (!choices.any((c) => c['is_correct'] == true)) {
      fail(t('حدد الإجابة الصحيحة', 'Mark the correct answer'));
      return;
    }

    setState(() => _saving = true);
    String? questionId;
    try {
      final inserted = await supabase.from('quiz_questions').insert({
        'quiz_id': _quiz!.id,
        'type': type,
        'question_ar': questionAr,
        'question_en': questionEn.isNotEmpty ? questionEn : null,
        'explanation_ar': explanation.isNotEmpty ? explanation : null,
        'sort_order': (_quiz?.questions?.length ?? 0) + 1,
      }).select().single();

      questionId = inserted['id'] as String;

      await supabase.from('quiz_options').insert([
        for (final c in choices) {...c, 'question_id': questionId},
      ]);

      if (ctx.mounted) Navigator.pop(ctx);
      await _loadQuiz();
    } catch (e) {
      if (questionId != null) {
        // The options failed -- don't leave an unanswerable question behind.
        try {
          await supabase.from('quiz_questions').delete().eq('id', questionId);
        } catch (_) {}
      }
      fail('$e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deleteQuestion(String questionId) async {
    // Remove the choices first in case the FK is not ON DELETE CASCADE.
    try {
      await supabase.from('quiz_options').delete().eq('question_id', questionId);
    } catch (_) {}
    await supabase.from('quiz_questions').delete().eq('id', questionId);
    _loadQuiz();
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text('${t("اختبار", "Quiz")} - ${widget.lessonTitle}')),
        floatingActionButton: _quiz != null ? FloatingActionButton(
          onPressed: _showAddQuestionDialog,
          child: const Icon(Icons.add),
        ) : null,
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _quiz == null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.quiz, size: 64, color: AppColors.inkMuted),
                        const SizedBox(height: 16),
                        Text(t('لا يوجد اختبار لهذا الدرس', 'No quiz for this lesson'), style: const TextStyle(color: AppColors.inkMuted)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _saving ? null : _createQuiz,
                          icon: const Icon(Icons.add),
                          label: Text(t('إنشاء اختبار', 'Create Quiz')),
                        ),
                      ],
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Quiz settings
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.04),
                          borderRadius: BorderRadius.zero,
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.quiz, color: AppColors.primary),
                                const SizedBox(width: 8),
                                Text(t('إعدادات الاختبار', 'Quiz Settings'), style: const TextStyle(fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text('${t("درجة النجاح", "Pass score")}: ${_quiz!.passingScore}% | ${t("المحاولات", "Attempts")}: ${_quiz!.attemptsAllowed}',
                                style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      Text('${t("الأسئلة", "Questions")} (${_quiz!.questions?.length ?? 0})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),

                      if (_quiz!.questions == null || _quiz!.questions!.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(32),
                          alignment: Alignment.center,
                          child: Text(t('اضغط + لإضافة سؤال', 'Tap + to add a question'), style: const TextStyle(color: AppColors.inkMuted)),
                        )
                      else
                        ...List.generate(_quiz!.questions!.length, (i) {
                          final q = _quiz!.questions![i];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 14,
                                        backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                                        child: Text('${i + 1}', style: const TextStyle(fontSize: 12, color: AppColors.primary)),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.info.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.zero,
                                        ),
                                        child: Text(
                                          q.type == 'true_false'
                                              ? t('صح/خطأ', 'T/F')
                                              : q.type == 'multi_select'
                                                  ? t('متعدد', 'Multi')
                                                  : t('اختيار', 'MCQ'),
                                          style: const TextStyle(fontSize: 10, color: AppColors.info),
                                        ),
                                      ),
                                      const Spacer(),
                                      IconButton(
                                        icon: const Icon(Icons.delete, size: 18, color: AppColors.error),
                                        onPressed: () => _deleteQuestion(q.id),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(q.question(lang), style: const TextStyle(fontWeight: FontWeight.w500)),
                                  const SizedBox(height: 8),
                                  ...q.options.map((opt) => Padding(
                                    padding: const EdgeInsets.only(bottom: 4),
                                    child: Row(
                                      children: [
                                        Icon(
                                          opt.isCorrect ? Icons.check_circle : Icons.radio_button_unchecked,
                                          size: 16,
                                          color: opt.isCorrect ? AppColors.success : AppColors.inkMuted,
                                        ),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(opt.text(lang), style: TextStyle(
                                            fontSize: 13,
                                            color: opt.isCorrect ? AppColors.success : null,
                                            fontWeight: opt.isCorrect ? FontWeight.w600 : null,
                                          )),
                                        ),
                                      ],
                                    ),
                                  )),
                                ],
                              ),
                            ),
                          );
                        }),
                    ],
                  ),
      ),
    );
  }
}
