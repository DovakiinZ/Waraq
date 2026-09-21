import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/models/lesson.dart';
import 'package:ayman_academy_app/shared/models/lesson_block.dart';
import 'package:ayman_academy_app/shared/models/lesson_progress.dart';

final lessonDetailProvider = FutureProvider.family<Lesson?, String>((ref, lessonId) async {
  final data = await supabase
      .from('lessons')
      .select('*, lesson_sections(*), lesson_blocks(*)')
      .eq('id', lessonId)
      .maybeSingle();
  if (data == null) return null;
  return Lesson.fromJson(data);
});

final lessonBlocksProvider = FutureProvider.family<List<LessonBlock>, String>((ref, lessonId) async {
  final data = await supabase
      .from('lesson_blocks')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('is_published', true)
      .order('sort_order');
  return (data as List).map((e) => LessonBlock.fromJson(e as Map<String, dynamic>)).toList();
});

final lessonProgressProvider = FutureProvider.family<LessonProgress?, String>((ref, lessonId) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return null;
  try {
    final data = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();
    if (data == null) return null;
    return LessonProgress.fromJson(data);
  } catch (_) {
    return null;
  }
});

final lessonNotesProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, lessonId) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  final data = await supabase
      .from('lesson_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .order('created_at', ascending: false);
  return List<Map<String, dynamic>>.from(data);
});

final lessonCommentsProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, lessonId) async {
  final data = await supabase
      .from('lesson_comments')
      .select('*, user:profiles!user_id(full_name, avatar_url)')
      .eq('lesson_id', lessonId)
      .order('created_at', ascending: false);
  return List<Map<String, dynamic>>.from(data);
});

class LessonProgressService {
  static Future<void> saveProgress({
    required String lessonId,
    required int progressPercent,
    int? lastPositionSeconds,
  }) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;

    try {
      await supabase.from('lesson_progress').upsert({
        'user_id': userId,
        'lesson_id': lessonId,
        'progress_percent': progressPercent,
        // Only write the resume position when we actually have one. The old
        // code hard-coded 0 here, which wiped the saved position on every
        // single progress tick so nothing ever resumed.
        if (lastPositionSeconds != null)
          'last_position_seconds': lastPositionSeconds,
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id,lesson_id');
    } catch (_) {
      // Progress is best-effort; never surface a write failure mid-lesson.
    }
  }

  static Future<bool> markComplete(String lessonId) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return false;

    try {
      final existing = await supabase
          .from('lesson_progress')
          .select('completed_at')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .maybeSingle();

      if (existing != null && existing['completed_at'] != null) return false;

      await supabase.from('lesson_progress').upsert({
        'user_id': userId,
        'lesson_id': lessonId,
        'progress_percent': 100,
        'completed_at': DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'user_id,lesson_id');

      // Award XP
      try {
        await supabase.from('student_xp').insert({
          'student_id': userId,
          'reason': 'lesson_complete',
          'amount': 50,
          'entity_id': lessonId,
        });
      } catch (_) {
        // XP table might not exist, ignore
      }

      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<void> addNote({
    required String lessonId,
    required String content,
  }) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    await supabase.from('lesson_notes').insert({
      'user_id': userId,
      'lesson_id': lessonId,
      'content': content,
    });
  }

  static Future<void> deleteNote(String noteId) async {
    await supabase.from('lesson_notes').delete().eq('id', noteId);
  }

  static Future<void> addComment({
    required String lessonId,
    required String content,
  }) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    await supabase.from('lesson_comments').insert({
      'user_id': userId,
      'lesson_id': lessonId,
      'content': content,
    });
  }

  static Future<void> rateLesson({
    required String lessonId,
    required int stars,
    String? comment,
  }) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    await supabase.from('ratings').upsert({
      'user_id': userId,
      'entity_id': lessonId,
      'entity_type': 'lesson',
      'stars': stars,
      'feedback': comment,
    }, onConflict: 'user_id,entity_id,entity_type');
  }
}
