import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/models/lesson.dart';


final mySubjectsProvider = FutureProvider<List<Subject>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];

  // Try RPC first
  try {
    final data = await supabase.rpc('get_student_subjects', params: {'p_student_id': userId});
    if (data is List && data.isNotEmpty) {
      return data.map((e) => Subject.fromJson(e as Map<String, dynamic>)).toList();
    }
  } catch (_) {
    // RPC unavailable, fall through
  }

  // Fallback: get student's stage, then subjects for that stage
  final profile = await supabase
      .from('profiles')
      .select('student_stage')
      .eq('id', userId)
      .maybeSingle();
  if (profile == null) return [];
  final stage = profile['student_stage'] as String?;
  if (stage == null) return [];

  // Get stage id from slug
  final stageRow = await supabase
      .from('stages')
      .select('id')
      .eq('slug', stage)
      .eq('is_active', true)
      .maybeSingle();
  if (stageRow == null) return [];

  final data = await supabase
      .from('subjects')
      .select('*, stage:stages(id, slug, title_ar, title_en), teacher:profiles!teacher_id(full_name, avatar_url)')
      .eq('stage_id', stageRow['id'])
      .eq('is_active', true)
      .order('sort_order');

  return (data as List).map((e) {
    final map = Map<String, dynamic>.from(e);
    if (map['teacher'] is Map) {
      map['teacher_name'] = map['teacher']['full_name'];
    }
    return Subject.fromJson(map);
  }).toList();
});

final discoverSubjectsProvider = FutureProvider<List<Subject>>((ref) async {
  final userId = supabase.auth.currentUser?.id;

  // Try RPC first
  if (userId != null) {
    try {
      final data = await supabase.rpc('get_discover_subjects', params: {'p_student_id': userId});
      if (data is List && data.isNotEmpty) {
        return data.map((e) => Subject.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
  }

  // Fallback: get all active subjects
  final data = await supabase
      .from('subjects')
      .select('*, stage:stages(id, slug, title_ar, title_en), teacher:profiles!teacher_id(full_name, avatar_url)')
      .eq('is_active', true)
      .order('sort_order');

  return (data as List).map((e) {
    final map = Map<String, dynamic>.from(e);
    if (map['teacher'] is Map) {
      map['teacher_name'] = map['teacher']['full_name'];
    }
    return Subject.fromJson(map);
  }).toList();
});

final subjectDetailProvider = FutureProvider.family<Subject?, String>((ref, subjectId) async {
  final data = await supabase
      .from('subjects')
      .select('*, stage:stages(id, slug, title_ar, title_en), teacher:profiles!teacher_id(full_name, avatar_url, bio_ar, bio_en)')
      .eq('id', subjectId)
      .maybeSingle();
  if (data == null) return null;
  final map = Map<String, dynamic>.from(data);
  if (map['teacher'] is Map) {
    map['teacher_name'] = map['teacher']['full_name'];
  }
  return Subject.fromJson(map);
});

final subjectLessonsProvider = FutureProvider.family<List<Lesson>, String>((ref, subjectId) async {
  final data = await supabase
      .from('lessons')
      .select(Lesson.columns)
      .eq('subject_id', subjectId)
      .eq('is_published', true)
      .order('sort_order');
  return (data as List).map((e) => Lesson.fromJson(e as Map<String, dynamic>)).toList();
});

final lessonProgressMapProvider = FutureProvider.family<Map<String, int>, String>((ref, subjectId) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return {};

  final lessons = await supabase
      .from('lessons')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('is_published', true);

  final lessonIds = (lessons as List).map((l) => l['id'] as String).toList();
  if (lessonIds.isEmpty) return {};

  final progressData = await supabase
      .from('lesson_progress')
      .select('lesson_id, progress_percent, completed_at')
      .eq('user_id', userId)
      .inFilter('lesson_id', lessonIds);

  final map = <String, int>{};
  for (final p in (progressData as List)) {
    map[p['lesson_id'] as String] = p['completed_at'] != null ? 100 : (p['progress_percent'] as int? ?? 0);
  }
  return map;
});

final checkSubjectAccessProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, subjectId) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return {'has_access': false};
  try {
    final result = await supabase.rpc('check_subject_access', params: {
      'p_student_id': userId,
      'p_subject_id': subjectId,
    });
    if (result is Map) return Map<String, dynamic>.from(result);
    // Fail closed: an unexpected (non-Map) result must not grant access.
    return {'has_access': false, 'reason': 'unknown'};
  } catch (_) {
    // Fail closed: on any RPC/network error, deny access rather than
    // leaking paid content. The UI can retry.
    return {'has_access': false, 'reason': 'error'};
  }
});
