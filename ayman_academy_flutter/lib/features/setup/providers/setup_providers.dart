import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/services/setup_progress.dart';

/// Data for the setup guide («ابدأ هنا»). Each provider fetches only the
/// columns the rules in `shared/services/setup_progress.dart` need and hands
/// them over; nothing about progress is stored anywhere.
///
/// Both providers THROW on a failed query rather than returning a partial
/// result: a failure must hide the dashboard card and show a retry block on the
/// guide, never a wrong "not done".

class TeacherSetupData {
  final SetupProgress progress;

  /// `profiles.is_active == false` — may build, may not publish.
  final bool isPending;

  /// The teacher's most recently created subject, where «اكتب درساً» opens the
  /// lesson editor. Null when they have no subject yet.
  final String? latestSubjectId;

  const TeacherSetupData({
    required this.progress,
    required this.isPending,
    this.latestSubjectId,
  });
}

class StudentSetupData {
  final SetupProgress progress;

  /// Lesson player path for the most recently touched lesson, or null.
  final String? resumePath;

  const StudentSetupData({required this.progress, this.resumePath});
}

final teacherSetupProvider = FutureProvider.autoDispose<TeacherSetupData>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) throw StateError('not signed in');

  // Read fresh rather than from authProvider: the profile screen saves bio and
  // Sham Cash without necessarily refreshing the cached profile.
  final profile = await supabase
      .from('profiles')
      .select('bio_ar, shamcash_account_name, shamcash_account_number, is_active')
      .eq('id', userId)
      .single();

  final subjectRows = await supabase
      .from('subjects')
      .select('id, is_active, created_at')
      .eq('teacher_id', userId)
      .order('created_at', ascending: false);
  final subjects = [
    for (final s in subjectRows as List)
      TeacherSubjectFact(id: s['id'] as String, isActive: s['is_active'] as bool? ?? false),
  ];

  var lessons = <TeacherLessonFact>[];
  var withBlocks = <String>{};
  if (subjects.isNotEmpty) {
    // Explicit columns — never select('*') on lessons (video columns).
    final lessonRows = await supabase
        .from('lessons')
        .select('id, subject_id, is_published')
        .inFilter('subject_id', subjects.map((s) => s.id).toList());
    lessons = [
      for (final l in lessonRows as List)
        TeacherLessonFact(
          id: l['id'] as String,
          subjectId: l['subject_id'] as String,
          isPublished: l['is_published'] as bool? ?? false,
        ),
    ];
    if (lessons.isNotEmpty) {
      final blockRows = await supabase
          .from('lesson_blocks')
          .select('lesson_id')
          .inFilter('lesson_id', lessons.map((l) => l.id).toList());
      withBlocks = {for (final b in blockRows as List) b['lesson_id'] as String};
    }
  }

  final isActive = profile['is_active'] as bool? ?? true;
  final progress = teacherSetup(TeacherSetupInput(
    bioAr: profile['bio_ar'] as String?,
    shamcashAccountName: profile['shamcash_account_name'] as String?,
    shamcashAccountNumber: profile['shamcash_account_number'] as String?,
    isActive: isActive,
    subjects: subjects,
    lessons: lessons,
    lessonIdsWithBlocks: withBlocks,
  ));

  return TeacherSetupData(
    progress: progress,
    isPending: !isActive,
    latestSubjectId: subjects.isEmpty ? null : subjects.first.id,
  );
});

final studentSetupProvider = FutureProvider.autoDispose<StudentSetupData>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) throw StateError('not signed in');

  final orderRows = await supabase.from('orders').select('status').eq('student_id', userId);
  final enrolRows = await supabase
      .from('student_subjects')
      .select('subject_id')
      .eq('student_id', userId)
      .limit(1);
  final progressRows = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at, updated_at')
      .eq('user_id', userId);

  final progressFacts = [
    for (final p in progressRows as List)
      StudentProgressFact(
        lessonId: p['lesson_id'] as String,
        completed: p['completed_at'] != null,
        updatedAt: p['updated_at'] as String?,
      ),
  ];

  final progress = studentSetup(StudentSetupInput(
    orderStatuses: [for (final o in orderRows as List) (o['status'] as String?) ?? ''],
    enrollmentCount: (enrolRows as List).length,
    progress: progressFacts,
  ));

  // The lesson player route is nested under its subject, so the resume target
  // needs the lesson's subject_id. Optional: if it cannot be read, the button
  // falls back to «موادي».
  String? resumePath;
  final latest = latestLessonId(progressFacts);
  if (latest != null) {
    try {
      final lesson = await supabase
          .from('lessons')
          .select('id, subject_id')
          .eq('id', latest)
          .maybeSingle();
      final subjectId = lesson?['subject_id'] as String?;
      if (subjectId != null) {
        resumePath = '/student/subjects/subject/$subjectId/lesson/$latest';
      }
    } catch (_) {
      resumePath = null;
    }
  }

  return StudentSetupData(progress: progress, resumePath: resumePath);
});
