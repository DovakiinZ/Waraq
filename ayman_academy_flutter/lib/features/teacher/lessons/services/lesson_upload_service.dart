import 'dart:io';

import 'package:ayman_academy_app/core/supabase_client.dart';

/// Uploads lesson attachments from the phone into the `public` bucket.
///
/// The Dart twin of `src/lib/lessonUploads.ts`. Keep the two in step — in
/// particular the path shape, which migration 117's INSERT policy enforces:
/// segment 1 must be `lessons` and segment 2 must equal `auth.uid()`, or
/// every upload fails RLS.
///
/// This is the whole reason a teacher can author on the phone at all: before
/// it, the image/video/file blocks were URL text fields on both clients, so a
/// photo of a worksheet sitting in the camera roll could not be attached
/// without first hosting it somewhere else.
///
/// NOTE the bucket is genuinely public — `getPublicUrl` needs no session to
/// read, exactly like lesson video URLs today. Nothing private belongs here.
class LessonUploadService {
  LessonUploadService._();

  static const bucket = 'public';

  /// 5 MB, matching the web image rule. Phone cameras routinely produce
  /// larger files than this, so `imageQuality` is capped at the picker.
  static const maxImageBytes = 5 * 1024 * 1024;

  /// Thrown with a message the caller shows directly; the caller supplies the
  /// bilingual wrapper, this carries only the reason.
  static Future<String> uploadImage({
    required String filePath,
    required String lessonId,
  }) async {
    final teacherId = supabase.auth.currentUser?.id;
    if (teacherId == null) {
      throw const LessonUploadException(LessonUploadError.noSession);
    }

    final file = File(filePath);
    final length = await file.length();
    if (length == 0) {
      throw const LessonUploadException(LessonUploadError.empty);
    }
    if (length > maxImageBytes) {
      throw const LessonUploadException(LessonUploadError.tooLarge);
    }

    final ext = _extensionOf(filePath);
    final storagePath =
        'lessons/$teacherId/$lessonId/${DateTime.now().millisecondsSinceEpoch}.$ext';

    await supabase.storage.from(bucket).upload(storagePath, file);
    return supabase.storage.from(bucket).getPublicUrl(storagePath);
  }

  static String _extensionOf(String path) {
    final dot = path.lastIndexOf('.');
    if (dot == -1 || dot == path.length - 1) return 'jpg';
    final ext = path.substring(dot + 1).toLowerCase();
    // image_picker hands back jpg/png/webp/heic; anything longer is not an
    // extension we should trust in a storage path.
    return ext.length <= 5 ? ext : 'jpg';
  }
}

enum LessonUploadError { noSession, empty, tooLarge }

class LessonUploadException implements Exception {
  final LessonUploadError reason;
  const LessonUploadException(this.reason);

  @override
  String toString() => 'LessonUploadException($reason)';
}
