import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/models/quiz.dart';
import 'package:ayman_academy_app/shared/models/quiz_attempt.dart';

final quizDetailProvider = FutureProvider.family<Quiz?, String>((ref, quizId) async {
  final data = await supabase
      .from('quizzes')
      .select('*, quiz_questions(*)')
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
        .select('*, quiz_questions(*)')
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
  static Future<Map<String, dynamic>> submitQuiz({
    required Quiz quiz,
    required Map<String, String> answers,
  }) async {
    final questions = quiz.questions ?? [];
    int correct = 0;
    for (final q in questions) {
      if (answers[q.id] == q.correctAnswer) correct++;
    }

    final scorePercent = questions.isEmpty ? 0.0 : (correct / questions.length * 100).roundToDouble();
    final passed = scorePercent >= quiz.passingScore;

    final userId = supabase.auth.currentUser?.id;
    if (userId == null) throw Exception('User not authenticated');

    await supabase.from('quiz_attempts').insert({
      'quiz_id': quiz.id,
      'student_id': userId,
      'score_percent': scorePercent,
      'answers': answers,
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
