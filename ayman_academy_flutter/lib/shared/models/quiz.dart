class Quiz {
  final String id;
  final String? lessonId;
  final String? subjectId;
  final bool isEnabled;
  final bool isRequired;
  final int passingScore;
  final int attemptsAllowed;
  final int? unlockAfterPercent;
  final List<QuizQuestion>? questions;

  const Quiz({
    required this.id,
    this.lessonId,
    this.subjectId,
    this.isEnabled = true,
    this.isRequired = false,
    this.passingScore = 60,
    this.attemptsAllowed = 3,
    this.unlockAfterPercent,
    this.questions,
  });

  factory Quiz.fromJson(Map<String, dynamic> json) => Quiz(
    id: json['id'] as String? ?? '',
    lessonId: json['lesson_id'] as String?,
    subjectId: json['subject_id'] as String?,
    isEnabled: json['is_enabled'] as bool? ?? true,
    isRequired: json['is_required'] as bool? ?? false,
    passingScore: (json['passing_score'] as num?)?.toInt() ?? 60,
    attemptsAllowed: (json['attempts_allowed'] as num?)?.toInt() ?? 3,
    unlockAfterPercent: (json['unlock_after_percent'] as num?)?.toInt(),
    questions: (json['quiz_questions'] as List<dynamic>?)
        ?.map((e) => QuizQuestion.fromJson(e as Map<String, dynamic>))
        .toList()
      ?..sort((a, b) => a.sortOrder.compareTo(b.sortOrder)),
  );
}

class QuizQuestion {
  final String id;
  final String quizId;

  /// One of: mcq | true_false | multi_select
  final String type;
  final String questionAr;
  final String? questionEn;

  /// Answer choices, normalised into the `quiz_options` table.
  final List<QuizOption> options;
  final String? explanationAr;
  final String? explanationEn;
  final int sortOrder;

  const QuizQuestion({
    required this.id,
    required this.quizId,
    this.type = 'mcq',
    required this.questionAr,
    this.questionEn,
    this.options = const [],
    this.explanationAr,
    this.explanationEn,
    this.sortOrder = 0,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) => QuizQuestion(
    id: json['id'] as String? ?? '',
    quizId: json['quiz_id'] as String? ?? '',
    type: json['type'] as String? ?? 'mcq',
    questionAr: json['question_ar'] as String? ?? '',
    questionEn: json['question_en'] as String?,
    options: ((json['quiz_options'] as List<dynamic>?) ?? const [])
        .map((e) => QuizOption.fromJson(e as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder)),
    explanationAr: json['explanation_ar'] as String?,
    explanationEn: json['explanation_en'] as String?,
    sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
  );

  /// True when the student may pick more than one option.
  bool get isMultiSelect => type == 'multi_select';

  /// Ids of every option flagged `is_correct` in the database.
  Set<String> get correctOptionIds =>
      options.where((o) => o.isCorrect).map((o) => o.id).toSet();

  /// The correct answer(s) as display text, for the review screen.
  String correctText(String lang) => options
      .where((o) => o.isCorrect)
      .map((o) => o.text(lang))
      .join('، ');

  String question(String lang) =>
      lang == 'ar' ? questionAr : (questionEn?.isNotEmpty == true ? questionEn! : questionAr);

  String? explanation(String lang) =>
      lang == 'ar' ? explanationAr : (explanationEn?.isNotEmpty == true ? explanationEn : explanationAr);
}

class QuizOption {
  final String id;
  final String questionId;
  final String textAr;
  final String? textEn;
  final bool isCorrect;
  final int sortOrder;

  const QuizOption({
    required this.id,
    required this.questionId,
    required this.textAr,
    this.textEn,
    this.isCorrect = false,
    this.sortOrder = 0,
  });

  factory QuizOption.fromJson(Map<String, dynamic> json) => QuizOption(
    id: json['id'] as String? ?? '',
    questionId: json['question_id'] as String? ?? '',
    textAr: json['text_ar'] as String? ?? '',
    textEn: json['text_en'] as String?,
    isCorrect: json['is_correct'] as bool? ?? false,
    sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
  );

  String text(String lang) =>
      lang == 'ar' ? textAr : (textEn?.isNotEmpty == true ? textEn! : textAr);
}
