import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/models/student_level.dart';

final studentLevelProvider = FutureProvider<StudentLevel?>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return null;
  try {
    final data = await supabase
        .from('student_levels')
        .select('*')
        .eq('student_id', userId)
        .maybeSingle();
    if (data == null) {
      return StudentLevel(studentId: userId);
    }
    return StudentLevel.fromJson(data);
  } catch (_) {
    return StudentLevel(studentId: userId);
  }
});

class ProfileService {
  static Future<void> updateStudentProfile({
    required String fullName,
    String? gender,
    String? studentStage,
    int? grade,
  }) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return;
    final updates = <String, dynamic>{
      'full_name': fullName,
      // Always written, unlike gender/studentStage below: the profile screen
      // clears the grade to null when the stage changes (a grade from the
      // previous stage is invalid under the new one), and a null-guard here
      // would silently keep the stale value instead of clearing it.
      'grade': grade,
    };
    if (gender != null) updates['gender'] = gender;
    if (studentStage != null) updates['student_stage'] = studentStage;
    await supabase.from('profiles').update(updates).eq('id', userId);
  }

  static Future<String?> uploadAvatar(String filePath) async {
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) return null;
    final fileName = 'avatar_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final storagePath = '$userId/$fileName';
    await supabase.storage.from('avatars').upload(storagePath, File(filePath));
    final url = supabase.storage.from('avatars').getPublicUrl(storagePath);
    await supabase.from('profiles').update({'avatar_url': url}).eq('id', userId);
    return url;
  }
}
