import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/models/quiz.dart';
import 'package:ayman_academy_app/shared/models/quiz_attempt.dart';

/// Answers are normalised: `quiz_questions` holds the question, `quiz_options`
/// holds the choices with an `is_correct` flag. Never select a denormalised
/// `options` / `correct_answer` column — they do not exist.
const _quizSelect = '*, quiz_questions(*, quiz_options(*))';

final quizDetailProvider = FutureProvider.family<Quiz?, String>((ref, quizId) async {
  final data = await supabase
      .from('quizzes')
      .select(_quizSelect)
      .eq('id', quizId)
      .maybeSingle();
  if (data == null) return null;
  return Quiz.fromJson(data);
});

final quizAttemptsProvider = FutureProvider.family<List<QuizAttempt>, String>((ref, quizId) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  final data = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', userId)
      .order('completed_at', ascending: false);
  return (data as List).map((e) => QuizAttempt.fromJson(e as Map<String, dynamic>)).toList();
});

final lessonQuizProvider = FutureProvider.family<Quiz?, String>((ref, lessonId) async {
  try {
    final data = await supabase
        .from('quizzes')
        .select(_quizSelect)
        .eq('lesson_id', lessonId)
        .eq('is_enabled', true)
        .maybeSingle();
    if (data == null) return null;
    return Quiz.fromJson(data);
  } catch (_) {
    return null;
  }
});

class QuizService {
  /// [answers] maps a question id to the set of option ids the student picked.
  ///
  /// Grading is done by the `submit_quiz_attempt` RPC so the score is computed
  /// in the database and cannot be forged by the client. If that function is
  /// not deployed yet, we fall back to grading locally — the same thing the app
  /// did before — so quizzes keep working either way.
  static Future<Map<String, dynamic>> submitQuiz({
    required Quiz quiz,
    required Map<String, Set<String>> answers,
  }) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) throw Exception('User not authenticated');

    // jsonb payload: {question_id: [option_id, ...]}
    final answersJson = answers.map((k, v) => MapEntry(k, v.toList()));

    try {
      final result = await supabase.rpc('submit_quiz_attempt', params: {
        'p_quiz_id': quiz.id,
        'p_answers': answersJson,
      });

      if (result is Map) {
        return {
          'score': (result['score_percent'] as num?)?.toDouble() ?? 0.0,
          'passed': result['passed'] as bool? ?? false,
          'correct': (result['correct'] as num?)?.toInt() ?? 0,
          'total': (result['total'] as num?)?.toInt() ?? (quiz.questions?.length ?? 0),
        };
      }
    } on PostgrestException catch (e) {
      // PGRST202 = the function does not exist on this database yet.
      // Anything else is a real failure (no attempts left, not authenticated).
      if (e.code != 'PGRST202') rethrow;
    }

    return _submitLocally(quiz: quiz, answers: answers, answersJson: answersJson, userId: userId);
  }

  /// Legacy path, used only until `103_submit_quiz_attempt.sql` is applied.
  static Future<Map<String, dynamic>> _submitLocally({
    required Quiz quiz,
    required Map<String, Set<String>> answers,
    required Map<String, List<String>> answersJson,
    required String userId,
  }) async {
    final questions = quiz.questions ?? [];
    int correct = 0;
    for (final q in questions) {
      final picked = answers[q.id] ?? const <String>{};
      final expected = q.correctOptionIds;
      if (expected.isNotEmpty && picked.length == expected.length && picked.containsAll(expected)) {
        correct++;
      }
    }

    final scorePercent =
        questions.isEmpty ? 0.0 : (correct / questions.length * 100).roundToDouble();
    final passed = scorePercent >= quiz.passingScore;

    await supabase.from('quiz_attempts').insert({
      'quiz_id': quiz.id,
      'student_id': userId,
      'score_percent': scorePercent,
      'answers': answersJson,
      'passed': passed,
      'completed_at': DateTime.now().toIso8601String(),
    });

    if (passed) {
      try {
        await supabase.from('student_xp').insert({
          'student_id': userId,
          'reason': 'quiz_pass',
          'amount': 100,
          'entity_id': quiz.id,
        });
      } catch (_) {}
    }

    return {
      'score': scorePercent,
      'passed': passed,
      'correct': correct,
      'total': questions.length,
    };
  }
}
